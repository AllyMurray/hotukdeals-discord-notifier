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
  originalPrice?: string;
  merchant?: string;
  merchantUrl?: string;
  timestamp?: number;
  score?: number;
  temperature?: 'hot' | 'warm' | 'cold';
  commentCount?: number;
  savings?: string;
  savingsPercentage?: number;
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

// Helper function to get random deal color
const getDealColor = (): number => {
  const colors = [
    0x4CAF50, // Green
    0x2196F3, // Blue
    0xFF9800, // Orange
    0x9C27B0, // Purple
    0xF44336, // Red
    0x00BCD4, // Cyan
    0x8BC34A, // Light Green
    0x3F51B5, // Indigo
    0xFF5722, // Deep Orange
    0x607D8B  // Blue Grey
  ];

  return colors[Math.floor(Math.random() * colors.length)];
};

// Format price display with savings
const formatPrice = (deal: DealWithSearchTerm): string => {
  let priceText = '';

  if (deal.price) {
    priceText += `💰 **${deal.price}**`;

    if (deal.originalPrice && deal.savings) {
      priceText += ` ~~${deal.originalPrice}~~`;
      priceText += ` (Save ${deal.savings}`;
      if (deal.savingsPercentage) {
        priceText += ` - ${deal.savingsPercentage}% off`;
      }
      priceText += ')';
    }
  }

  return priceText;
};

// Create Discord embed for a single deal
const createDealEmbed = (deal: DealWithSearchTerm): any => {
  const embed: any = {
    title: deal.title,
    url: deal.link,
    color: getDealColor(),
    fields: [],
    footer: {
      text: `Search Term: ${deal.searchTerm}`,
    },
    timestamp: new Date().toISOString()
  };

  // Add price information
  const priceInfo = formatPrice(deal);
  if (priceInfo) {
    embed.fields.push({
      name: 'Price',
      value: priceInfo,
      inline: true
    });
  }

  // Add merchant information
  if (deal.merchant) {
    let merchantText = `🏪 ${deal.merchant}`;
    if (deal.merchantUrl) {
      merchantText = `🏪 [${deal.merchant}](${deal.merchantUrl})`;
    }
    embed.fields.push({
      name: 'Merchant',
      value: merchantText,
      inline: true
    });
  }


  return embed;
};


// Send combined Discord message for all new deals using rich embeds
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

    // Discord allows up to 10 embeds per message, so we need to batch them
    const maxEmbedsPerMessage = 10;
    const dealChunks: DealWithSearchTerm[][] = [];

    for (let i = 0; i < deals.length; i += maxEmbedsPerMessage) {
      dealChunks.push(deals.slice(i, i + maxEmbedsPerMessage));
    }

    for (let chunkIndex = 0; chunkIndex < dealChunks.length; chunkIndex++) {
      const chunk = dealChunks[chunkIndex];
      const embeds = chunk.map(createDealEmbed);

      // Create summary content for the first message
      let content = '';
      if (chunkIndex === 0) {
        const hotDealsCount = deals.filter(d => d.temperature === 'hot' || (d.score && d.score >= 100)).length;
        const warmDealsCount = deals.filter(d => d.temperature === 'warm' || (d.score && d.score >= 50 && d.score < 100)).length;

        content = `🆕 **${totalDeals} new deal${totalDeals > 1 ? 's' : ''}** found for: **${searchTerms.join(', ')}**`;

        if (hotDealsCount > 0) {
          content += `\n🔥 ${hotDealsCount} hot deal${hotDealsCount > 1 ? 's' : ''}`;
        }
        if (warmDealsCount > 0) {
          content += `${hotDealsCount > 0 ? ' • ' : '\n'}⭐ ${warmDealsCount} warm deal${warmDealsCount > 1 ? 's' : ''}`;
        }
      }

      const payload: any = { embeds };
      if (content) payload.content = content;

      await request(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Small delay between messages to avoid rate limiting
      if (chunkIndex < dealChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('Enhanced Discord message sent successfully', {
      webhookUrl: webhookUrl.substring(0, 50) + '...',
      dealCount: totalDeals,
      searchTerms,
      messageChunks: dealChunks.length
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
