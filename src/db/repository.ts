import { HotUKDealsService, Channel, SearchTermConfig, Deal } from './service';

// ============================================================================
// Channel Repository
// ============================================================================

/**
 * Get all channels (using GSI - no scan)
 */
export async function getAllChannels(): Promise<Channel[]> {
  const result = await HotUKDealsService.entities.channel.query
    .allChannels({})
    .go();
  return result.data as Channel[];
}

/**
 * Get a channel by ID
 */
export async function getChannel(channelId: string): Promise<Channel | null> {
  const result = await HotUKDealsService.entities.channel.query
    .byChannelId({ channelId })
    .go();
  return result.data[0] as Channel | null;
}

/**
 * Create a new channel
 */
export async function createChannel(channel: {
  name: string;
  webhookUrl: string;
}): Promise<Channel> {
  const result = await HotUKDealsService.entities.channel
    .put({
      name: channel.name,
      webhookUrl: channel.webhookUrl,
    })
    .go();
  return result.data as Channel;
}

/**
 * Update a channel
 */
export async function updateChannel(
  channelId: string,
  updates: {
    name?: string;
    webhookUrl?: string;
  }
): Promise<Channel> {
  const result = await HotUKDealsService.entities.channel
    .patch({ channelId })
    .set(updates)
    .go();
  return result.data as Channel;
}

/**
 * Delete a channel and all its configs
 */
export async function deleteChannel(channelId: string): Promise<void> {
  // First delete all configs for this channel
  await deleteConfigsByChannel(channelId);

  // Then delete the channel
  await HotUKDealsService.entities.channel
    .delete({ channelId })
    .go();
}

// ============================================================================
// SearchTermConfig Repository
// ============================================================================

/**
 * Get all search term configs (using GSI - no scan)
 */
export async function getAllConfigs(): Promise<SearchTermConfig[]> {
  const result = await HotUKDealsService.entities.searchTermConfig.query
    .allConfigs({})
    .go();
  return result.data as SearchTermConfig[];
}

/**
 * Get all enabled search term configs
 */
export async function getEnabledConfigs(): Promise<SearchTermConfig[]> {
  const configs = await getAllConfigs();
  return configs.filter((config) => config.enabled);
}

/**
 * Get all configs for a specific channel (no scan - uses primary key)
 */
export async function getConfigsByChannel(channelId: string): Promise<SearchTermConfig[]> {
  const result = await HotUKDealsService.entities.searchTermConfig.query
    .byChannel({ channelId })
    .go();
  return result.data as SearchTermConfig[];
}

/**
 * Get a specific config by channel ID and search term
 */
export async function getConfig(channelId: string, searchTerm: string): Promise<SearchTermConfig | null> {
  const result = await HotUKDealsService.entities.searchTermConfig.query
    .byChannel({ channelId, searchTerm })
    .go();
  return result.data[0] as SearchTermConfig | null;
}

/**
 * Get a config by search term (uses GSI)
 */
export async function getConfigBySearchTerm(searchTerm: string): Promise<SearchTermConfig | null> {
  const result = await HotUKDealsService.entities.searchTermConfig.query
    .bySearchTerm({ searchTerm })
    .go();
  return result.data[0] as SearchTermConfig | null;
}

/**
 * Get all configs for a search term (multiple channels could use same term)
 */
export async function getAllConfigsForSearchTerm(searchTerm: string): Promise<SearchTermConfig[]> {
  const result = await HotUKDealsService.entities.searchTermConfig.query
    .bySearchTerm({ searchTerm })
    .go();
  return result.data as SearchTermConfig[];
}

/**
 * Create or update a search term config
 */
export async function upsertConfig(config: {
  channelId: string;
  searchTerm: string;
  enabled?: boolean;
  excludeKeywords?: string[];
  includeKeywords?: string[];
  caseSensitive?: boolean;
}): Promise<SearchTermConfig> {
  const result = await HotUKDealsService.entities.searchTermConfig
    .upsert({
      channelId: config.channelId,
      searchTerm: config.searchTerm,
      enabled: config.enabled ?? true,
      excludeKeywords: config.excludeKeywords ?? [],
      includeKeywords: config.includeKeywords ?? [],
      caseSensitive: config.caseSensitive ?? false,
    })
    .go();
  return result.data as SearchTermConfig;
}

/**
 * Delete a config by channel ID and search term
 */
export async function deleteConfig(channelId: string, searchTerm: string): Promise<void> {
  await HotUKDealsService.entities.searchTermConfig
    .delete({ channelId, searchTerm })
    .go();
}

/**
 * Delete all configs for a channel
 */
export async function deleteConfigsByChannel(channelId: string): Promise<string[]> {
  const configs = await getConfigsByChannel(channelId);
  const searchTerms = configs.map((c) => c.searchTerm);

  await Promise.all(
    configs.map((config) =>
      HotUKDealsService.entities.searchTermConfig
        .delete({ channelId, searchTerm: config.searchTerm })
        .go()
    )
  );

  return searchTerms;
}

// ============================================================================
// Deal Repository
// ============================================================================

/**
 * Check if a deal exists by ID
 */
export async function dealExists(dealId: string): Promise<boolean> {
  const result = await HotUKDealsService.entities.deal.query
    .byDealId({ dealId })
    .go();
  return result.data.length > 0;
}

/**
 * Get a deal by ID
 */
export async function getDeal(dealId: string): Promise<Deal | null> {
  const result = await HotUKDealsService.entities.deal.query
    .byDealId({ dealId })
    .go();
  return result.data[0] as Deal | null;
}

/**
 * Create a new deal record
 */
export async function createDeal(deal: {
  dealId: string;
  searchTerm: string;
  title: string;
  link: string;
  price?: string;
  merchant?: string;
}): Promise<Deal> {
  const result = await HotUKDealsService.entities.deal
    .put({
      dealId: deal.dealId,
      searchTerm: deal.searchTerm,
      title: deal.title,
      link: deal.link,
      price: deal.price,
      merchant: deal.merchant,
      timestamp: Date.now(),
    })
    .go();
  return result.data as Deal;
}

// ============================================================================
// Grouped Config Helpers (for notifier)
// ============================================================================

export interface ChannelWithConfigs {
  channel: Channel;
  configs: SearchTermConfig[];
}

/**
 * Get all enabled configs grouped by channel (with channel details)
 */
export async function getEnabledConfigsGroupedByChannel(): Promise<ChannelWithConfigs[]> {
  // Get all enabled configs and all channels in parallel
  const [configs, channels] = await Promise.all([
    getEnabledConfigs(),
    getAllChannels(),
  ]);

  // Create a map of channelId -> Channel for quick lookup
  const channelMap = new Map(channels.map((c) => [c.channelId, c]));

  // Group configs by channelId
  const grouped = configs.reduce(
    (acc, config) => {
      if (!acc[config.channelId]) {
        acc[config.channelId] = [];
      }
      acc[config.channelId].push(config);
      return acc;
    },
    {} as Record<string, SearchTermConfig[]>
  );

  // Build result with channel details
  return Object.entries(grouped)
    .map(([channelId, configs]) => {
      const channel = channelMap.get(channelId);
      if (!channel) {
        // Skip configs for channels that no longer exist
        return null;
      }
      return { channel, configs };
    })
    .filter((item): item is ChannelWithConfigs => item !== null);
}
