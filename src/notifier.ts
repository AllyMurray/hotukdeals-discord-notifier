import { Handler } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import middy from '@middy/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { request } from 'undici';
import { fetchDeals, Deal } from './feed-parser';

const logger = new Logger({ serviceName: 'HotUKDealsNotifier' });

const tableName = process.env.DYNAMODB_TABLE_NAME!;
const configTableName = process.env.CONFIG_TABLE_NAME!;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface SearchTermConfig {
  searchTerm: string;
  webhookUrl: string;
  enabled?: boolean;
  excludeKeywords?: string[];
  includeKeywords?: string[];
  caseSensitive?: boolean;
}

interface GroupedWebhookConfig {
  webhookUrl: string;
  configs: SearchTermConfig[];
}

interface DealWithSearchTerm {
  id: string;
  title: string;
  link: string;
  price?: string;
  merchant?: string;
  timestamp?: number;
  searchTerm: string;
}

// Simple in-memory cache (optional optimization)
let configCache: {
  configs: SearchTermConfig[];
  lastFetch: number;
  ttl: number;
} = {
  configs: [],
  lastFetch: 0,
  ttl: 5 * 60 * 1000 // 5 minutes cache
};

// Get all search term configurations from DynamoDB
const getSearchTermConfigs = async (): Promise<SearchTermConfig[]> => {
  // Optional: Use cache to reduce DynamoDB calls
  const now = Date.now();
  if (configCache.configs.length > 0 && (now - configCache.lastFetch) < configCache.ttl) {
    logger.debug('Using cached search term configs');
    return configCache.configs;
  }

  try {
    const result = await ddb.send(new ScanCommand({
      TableName: configTableName
    }));

    const configs = (result.Items || []).map(item => ({
      searchTerm: item.searchTerm,
      webhookUrl: item.webhookUrl,
      enabled: item.enabled !== false, // default to true if not specified
      excludeKeywords: item.excludeKeywords || [],
      includeKeywords: item.includeKeywords || [],
      caseSensitive: item.caseSensitive || false
    })).filter(config => config.enabled);

    // Update cache
    configCache.configs = configs;
    configCache.lastFetch = now;

    return configs;
  } catch (error) {
    logger.error('Error fetching search term configs', { error });
    // Return cached configs if available, otherwise empty array
    return configCache.configs.length > 0 ? configCache.configs : [];
  }
};

// Filter deals based on include/exclude keywords
const filterDeal = (deal: Deal, config: SearchTermConfig): boolean => {
  const title = config.caseSensitive ? deal.title : deal.title.toLowerCase();
  const merchant = config.caseSensitive ? (deal.merchant || '') : (deal.merchant || '').toLowerCase();

  // Combine title and merchant for filtering
  const searchText = `${title} ${merchant}`.trim();

  // Check exclude keywords
  if (config.excludeKeywords && config.excludeKeywords.length > 0) {
    const excludeWords = config.caseSensitive
      ? config.excludeKeywords
      : config.excludeKeywords.map(keyword => keyword.toLowerCase());

    if (excludeWords.some(keyword => searchText.includes(keyword))) {
      logger.debug('Deal filtered out by exclude keywords', {
        dealTitle: deal.title,
        excludeKeywords: config.excludeKeywords,
        searchTerm: config.searchTerm
      });
      return false;
    }
  }

  // Check include keywords (all must be present if specified)
  if (config.includeKeywords && config.includeKeywords.length > 0) {
    const includeWords = config.caseSensitive
      ? config.includeKeywords
      : config.includeKeywords.map(keyword => keyword.toLowerCase());

    if (!includeWords.every(keyword => searchText.includes(keyword))) {
      logger.debug('Deal filtered out by include keywords', {
        dealTitle: deal.title,
        includeKeywords: config.includeKeywords,
        searchTerm: config.searchTerm
      });
      return false;
    }
  }

  return true;
};

// Group search terms by webhook URL
const groupConfigsByWebhook = (configs: SearchTermConfig[]): GroupedWebhookConfig[] => {
  const grouped = configs.reduce((acc, config) => {
    if (!acc[config.webhookUrl]) {
      acc[config.webhookUrl] = [];
    }
    acc[config.webhookUrl].push(config);
    return acc;
  }, {} as Record<string, SearchTermConfig[]>);

  return Object.entries(grouped).map(([webhookUrl, configs]) => ({
    webhookUrl,
    configs
  }));
};

// Helper function to process multiple search terms for a webhook
const processWebhookFeeds = async (config: GroupedWebhookConfig): Promise<void> => {
  const { webhookUrl, configs } = config;
  const searchTerms = configs.map(c => c.searchTerm);
  logger.info('Processing search terms for webhook', {
    webhookUrl: webhookUrl.substring(0, 50) + '...',
    searchTerms
  });

  try {
    const allNewDeals: DealWithSearchTerm[] = [];

    // Process each search term and collect new deals
    for (const searchConfig of configs) {
      const { searchTerm } = searchConfig;
      logger.info('Fetching deals for search term', { searchTerm });

      const deals = await fetchDeals(searchTerm);

      for (const deal of deals) {
        const dealId = deal.id;

        const exists = await ddb.send(new GetCommand({
          TableName: tableName,
          Key: { id: dealId }
        }));

        if (!exists.Item) {
          // Apply filtering logic
          if (!filterDeal(deal, searchConfig)) {
            logger.debug('Deal filtered out', {
              dealId,
              title: deal.title,
              searchTerm
            });
            continue;
          }

          logger.info('New deal found', {
            title: deal.title,
            link: deal.link,
            price: deal.price,
            merchant: deal.merchant,
            searchTerm
          });

          allNewDeals.push({
            ...deal,
            searchTerm
          });

          // Store the deal in the processed deals table
          await ddb.send(new PutCommand({
            TableName: tableName,
            Item: {
              id: dealId,
              timestamp: Date.now(),
              searchTerm,
              title: deal.title,
              link: deal.link,
              price: deal.price,
              merchant: deal.merchant
            }
          }));
        } else {
          logger.debug('Deal already exists, skipping', { dealId, searchTerm });
        }
      }
    }

    // Send combined message if we have new deals
    if (allNewDeals.length > 0) {
      await sendCombinedDiscordMessage(webhookUrl, allNewDeals);
    } else {
      logger.info('No new deals found for webhook', {
        webhookUrl: webhookUrl.substring(0, 50) + '...',
        searchTerms
      });
    }

  } catch (error) {
    logger.error('Error processing deals for webhook', {
      error,
      webhookUrl: webhookUrl.substring(0, 50) + '...',
      searchTerms
    });
  }
};

// Send combined Discord message for all new deals
const sendCombinedDiscordMessage = async (webhookUrl: string, deals: DealWithSearchTerm[]): Promise<void> => {
  try {
    // Group deals by search term for better organization
    const dealsBySearchTerm = deals.reduce((acc, deal) => {
      if (!acc[deal.searchTerm]) {
        acc[deal.searchTerm] = [];
      }
      acc[deal.searchTerm].push(deal);
      return acc;
    }, {} as Record<string, DealWithSearchTerm[]>);

    const totalDeals = deals.length;
    const searchTerms = Object.keys(dealsBySearchTerm);

    let message = `🆕 **${totalDeals} new deal${totalDeals > 1 ? 's' : ''}** found for: **${searchTerms.join(', ')}**\n\n`;

    // Add deals grouped by search term
    for (const [searchTerm, searchDeals] of Object.entries(dealsBySearchTerm)) {
      if (searchTerms.length > 1) {
        message += `**${searchTerm}:**\n`;
      }

      for (const deal of searchDeals) {
        message += `• **${deal.title}**`;
        if (deal.price) {
          message += ` - ${deal.price}`;
        }
        if (deal.merchant) {
          message += ` at ${deal.merchant}`;
        }
        message += `\n  ${deal.link}\n`;
      }

      if (searchTerms.length > 1) {
        message += '\n';
      }
    }

    // Discord has a 2000 character limit, so we might need to split large messages
    if (message.length > 2000) {
      // Send a summary message first
      const summaryMessage = `🆕 **${totalDeals} new deal${totalDeals > 1 ? 's' : ''}** found for: **${searchTerms.join(', ')}**`;

      await request(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: summaryMessage
        })
      });

      // Then send individual deals
      for (const deal of deals) {
        let individualMessage = `🔍 **${deal.searchTerm}**: **${deal.title}**`;
        if (deal.price) {
          individualMessage += ` - ${deal.price}`;
        }
        if (deal.merchant) {
          individualMessage += ` at ${deal.merchant}`;
        }
        individualMessage += `\n${deal.link}`;

        await request(webhookUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            content: individualMessage
          })
        });
      }
    } else {
      // Send the combined message
      await request(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: message
        })
      });
    }

    logger.info('Combined Discord message sent successfully', {
      webhookUrl: webhookUrl.substring(0, 50) + '...',
      dealCount: totalDeals,
      searchTerms
    });

  } catch (error) {
    logger.error('Error sending Discord message', {
      error,
      webhookUrl: webhookUrl.substring(0, 50) + '...'
    });
  }
};

// Base Lambda handler
const baseHandler: Handler = async () => {
  // Get all search term configurations
  const configs = await getSearchTermConfigs();

  if (configs.length === 0) {
    logger.warn('No search term configurations found');
    return;
  }

  // Group search terms by webhook URL
  const groupedConfigs = groupConfigsByWebhook(configs);

  logger.info('Processing deals for grouped webhook configurations', {
    webhookCount: groupedConfigs.length,
    totalSearchTerms: configs.length,
    groups: groupedConfigs.map(g => ({
      webhook: g.webhookUrl.substring(0, 50) + '...',
      searchTerms: g.configs.map(c => c.searchTerm)
    }))
  });

  // Process all webhook groups concurrently
  await Promise.all(groupedConfigs.map(processWebhookFeeds));
};

export const handler = middy(baseHandler).use(injectLambdaContext(logger));
