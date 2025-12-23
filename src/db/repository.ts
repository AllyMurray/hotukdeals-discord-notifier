import { HotUKDealsService, SearchTermConfig, Deal } from './service';

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
 * Get all configs for a specific webhook URL (no scan - uses primary key)
 */
export async function getConfigsByWebhook(webhookUrl: string): Promise<SearchTermConfig[]> {
  const result = await HotUKDealsService.entities.searchTermConfig.query
    .byWebhook({ webhookUrl })
    .go();
  return result.data as SearchTermConfig[];
}

/**
 * Get a specific config by webhook URL and search term
 */
export async function getConfig(webhookUrl: string, searchTerm: string): Promise<SearchTermConfig | null> {
  const result = await HotUKDealsService.entities.searchTermConfig.query
    .byWebhook({ webhookUrl, searchTerm })
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
 * Get all configs for a search term (multiple webhooks could use same term)
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
  webhookUrl: string;
  searchTerm: string;
  enabled?: boolean;
  excludeKeywords?: string[];
  includeKeywords?: string[];
  caseSensitive?: boolean;
}): Promise<SearchTermConfig> {
  const result = await HotUKDealsService.entities.searchTermConfig
    .upsert({
      webhookUrl: config.webhookUrl,
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
 * Delete a config by webhook URL and search term
 */
export async function deleteConfig(webhookUrl: string, searchTerm: string): Promise<void> {
  await HotUKDealsService.entities.searchTermConfig
    .delete({ webhookUrl, searchTerm })
    .go();
}

/**
 * Delete all configs for a webhook URL
 */
export async function deleteConfigsByWebhook(webhookUrl: string): Promise<string[]> {
  const configs = await getConfigsByWebhook(webhookUrl);
  const searchTerms = configs.map((c) => c.searchTerm);

  await Promise.all(
    configs.map((config) =>
      HotUKDealsService.entities.searchTermConfig
        .delete({ webhookUrl, searchTerm: config.searchTerm })
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
// Grouped Config Helpers
// ============================================================================

export interface GroupedWebhookConfig {
  webhookUrl: string;
  configs: SearchTermConfig[];
}

/**
 * Get all enabled configs grouped by webhook URL
 */
export async function getEnabledConfigsGroupedByWebhook(): Promise<GroupedWebhookConfig[]> {
  const configs = await getEnabledConfigs();

  const grouped = configs.reduce(
    (acc, config) => {
      if (!acc[config.webhookUrl]) {
        acc[config.webhookUrl] = [];
      }
      acc[config.webhookUrl].push(config);
      return acc;
    },
    {} as Record<string, SearchTermConfig[]>
  );

  return Object.entries(grouped).map(([webhookUrl, configs]) => ({
    webhookUrl,
    configs,
  }));
}
