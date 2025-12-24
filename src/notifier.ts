import { Handler } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import middy from '@middy/core';
import { request } from 'undici';
import { fetchDeals, Deal } from './feed-parser';
import {
  getEnabledConfigsGroupedByChannel,
  dealExists,
  createDeal,
  ChannelWithConfigs,
  SearchTermConfig,
} from './db';
import { DiscordEmbed, DiscordWebhookPayload } from './discord-types';

const logger = new Logger({ serviceName: 'HotUKDealsNotifier' });

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
  configs: ChannelWithConfigs[];
  lastFetch: number;
  ttl: number;
} = {
  configs: [],
  lastFetch: 0,
  ttl: 5 * 60 * 1000, // 5 minutes cache
};

// Get all search term configurations from DynamoDB (grouped by channel)
const getGroupedConfigs = async (): Promise<ChannelWithConfigs[]> => {
  // Optional: Use cache to reduce DynamoDB calls
  const now = Date.now();
  if (configCache.configs.length > 0 && now - configCache.lastFetch < configCache.ttl) {
    logger.debug('Using cached search term configs');
    return configCache.configs;
  }

  try {
    const groupedConfigs = await getEnabledConfigsGroupedByChannel();

    // Update cache
    configCache.configs = groupedConfigs;
    configCache.lastFetch = now;

    return groupedConfigs;
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
      : config.excludeKeywords.map((keyword) => keyword.toLowerCase());

    if (excludeWords.some((keyword) => searchText.includes(keyword))) {
      logger.debug('Deal filtered out by exclude keywords', {
        dealTitle: deal.title,
        excludeKeywords: config.excludeKeywords,
        searchTerm: config.searchTerm,
      });
      return false;
    }
  }

  // Check include keywords (all must be present if specified)
  if (config.includeKeywords && config.includeKeywords.length > 0) {
    const includeWords = config.caseSensitive
      ? config.includeKeywords
      : config.includeKeywords.map((keyword) => keyword.toLowerCase());

    if (!includeWords.every((keyword) => searchText.includes(keyword))) {
      logger.debug('Deal filtered out by include keywords', {
        dealTitle: deal.title,
        includeKeywords: config.includeKeywords,
        searchTerm: config.searchTerm,
      });
      return false;
    }
  }

  return true;
};

// Helper function to process multiple search terms for a channel
const processChannelFeeds = async (channelWithConfigs: ChannelWithConfigs): Promise<void> => {
  const { channel, configs } = channelWithConfigs;
  const searchTerms = configs.map((c) => c.searchTerm);
  logger.info('Processing search terms for channel', {
    channelName: channel.name,
    channelId: channel.channelId,
    searchTerms,
  });

  try {
    // Collect all deals from all search terms first
    const allDealsWithConfig: Array<{ deal: Deal; searchConfig: SearchTermConfig }> = [];

    for (const searchConfig of configs) {
      const { searchTerm } = searchConfig;
      logger.info('Fetching deals for search term', { searchTerm });

      const deals = await fetchDeals(searchTerm);
      for (const deal of deals) {
        allDealsWithConfig.push({ deal, searchConfig });
      }
    }

    if (allDealsWithConfig.length === 0) {
      logger.info('No deals found for channel', {
        channelName: channel.name,
        searchTerms,
      });
      return;
    }

    // Batch check existence for all deals
    const existenceChecks = await Promise.all(
      allDealsWithConfig.map(async ({ deal }) => ({
        dealId: deal.id,
        exists: await dealExists({ id: deal.id }),
      }))
    );

    const existsMap = new Map(existenceChecks.map((check) => [check.dealId, check.exists]));

    // Process deals that don't exist
    const allNewDeals: DealWithSearchTerm[] = [];

    for (const { deal, searchConfig } of allDealsWithConfig) {
      const dealId = deal.id;

      if (existsMap.get(dealId)) {
        logger.debug('Deal already exists, skipping', { dealId, searchTerm: searchConfig.searchTerm });
        continue;
      }

      // Apply filtering logic
      if (!filterDeal(deal, searchConfig)) {
        logger.debug('Deal filtered out', {
          dealId,
          title: deal.title,
          searchTerm: searchConfig.searchTerm,
        });
        continue;
      }

      logger.info('New deal found', {
        title: deal.title,
        link: deal.link,
        price: deal.price,
        merchant: deal.merchant,
        searchTerm: searchConfig.searchTerm,
      });

      allNewDeals.push({
        ...deal,
        searchTerm: searchConfig.searchTerm,
      });
    }

    // Batch create all new deals
    if (allNewDeals.length > 0) {
      await Promise.all(
        allNewDeals.map((deal) =>
          createDeal({
            id: deal.id,
            searchTerm: deal.searchTerm,
            title: deal.title,
            link: deal.link,
            price: deal.price,
            merchant: deal.merchant,
          })
        )
      );

      await sendCombinedDiscordMessage(channel.webhookUrl, allNewDeals);
    } else {
      logger.info('No new deals found for channel', {
        channelName: channel.name,
        searchTerms,
      });
    }
  } catch (error) {
    logger.error('Error processing deals for channel', {
      error,
      channelName: channel.name,
      channelId: channel.channelId,
      searchTerms,
    });
  }
};

// Helper function to get random deal color
const getDealColor = (): number => {
  const colors = [
    0x4caf50, // Green
    0x2196f3, // Blue
    0xff9800, // Orange
    0x9c27b0, // Purple
    0xf44336, // Red
    0x00bcd4, // Cyan
    0x8bc34a, // Light Green
    0x3f51b5, // Indigo
    0xff5722, // Deep Orange
    0x607d8b, // Blue Grey
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
const createDealEmbed = (deal: DealWithSearchTerm): DiscordEmbed => {
  const fields: DiscordEmbed['fields'] = [];

  // Add price information
  const priceInfo = formatPrice(deal);
  if (priceInfo) {
    fields.push({
      name: 'Price',
      value: priceInfo,
      inline: true,
    });
  }

  // Add merchant information
  if (deal.merchant) {
    let merchantText = `🏪 ${deal.merchant}`;
    if (deal.merchantUrl) {
      merchantText = `🏪 [${deal.merchant}](${deal.merchantUrl})`;
    }
    fields.push({
      name: 'Merchant',
      value: merchantText,
      inline: true,
    });
  }

  return {
    title: deal.title,
    url: deal.link,
    color: getDealColor(),
    fields,
    footer: {
      text: `Search Term: ${deal.searchTerm}`,
    },
    timestamp: new Date().toISOString(),
  };
};

// Send combined Discord message for all new deals using rich embeds
const sendCombinedDiscordMessage = async (
  webhookUrl: string,
  deals: DealWithSearchTerm[]
): Promise<void> => {
  try {
    const totalDeals = deals.length;
    const searchTerms = Array.from(new Set(deals.map((d) => d.searchTerm)));

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
        const hotDealsCount = deals.filter(
          (d) => d.temperature === 'hot' || (d.score && d.score >= 100)
        ).length;
        const warmDealsCount = deals.filter(
          (d) => d.temperature === 'warm' || (d.score && d.score >= 50 && d.score < 100)
        ).length;

        content = `🆕 **${totalDeals} new deal${totalDeals > 1 ? 's' : ''}** found for: **${searchTerms.join(', ')}**`;

        if (hotDealsCount > 0) {
          content += `\n🔥 ${hotDealsCount} hot deal${hotDealsCount > 1 ? 's' : ''}`;
        }
        if (warmDealsCount > 0) {
          content += `${hotDealsCount > 0 ? ' • ' : '\n'}⭐ ${warmDealsCount} warm deal${warmDealsCount > 1 ? 's' : ''}`;
        }
      }

      const payload: DiscordWebhookPayload = { embeds };
      if (content) payload.content = content;

      await request(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Small delay between messages to avoid rate limiting
      if (chunkIndex < dealChunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    logger.info('Enhanced Discord message sent successfully', {
      webhookUrl: webhookUrl.substring(0, 50) + '...',
      dealCount: totalDeals,
      searchTerms,
      messageChunks: dealChunks.length,
    });
  } catch (error) {
    logger.error('Error sending Discord message', {
      error,
      webhookUrl: webhookUrl.substring(0, 50) + '...',
    });
  }
};

// Base Lambda handler
const baseHandler: Handler = async () => {
  // Get all search term configurations grouped by channel
  const groupedConfigs = await getGroupedConfigs();

  if (groupedConfigs.length === 0) {
    logger.warn('No search term configurations found');
    return;
  }

  const totalSearchTerms = groupedConfigs.reduce((acc, g) => acc + g.configs.length, 0);

  logger.info('Processing deals for grouped channel configurations', {
    channelCount: groupedConfigs.length,
    totalSearchTerms,
    channels: groupedConfigs.map((g) => ({
      name: g.channel.name,
      searchTerms: g.configs.map((c) => c.searchTerm),
    })),
  });

  // Process all channels concurrently
  await Promise.all(groupedConfigs.map(processChannelFeeds));
};

export const handler = middy(baseHandler).use(injectLambdaContext(logger));
