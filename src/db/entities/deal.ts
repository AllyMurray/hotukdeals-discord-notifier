import { Entity } from 'electrodb';

/**
 * Deal entity tracks processed deals to prevent duplicate notifications.
 *
 * Note: No TTL is configured intentionally. If deals expire and reappear in
 * search results (common for unpopular search terms), it would cause duplicate
 * notifications. Storage cost is negligible (~$0.01/month per 100k deals).
 */
export const DealEntity = new Entity({
  model: {
    entity: 'Deal',
    version: '1',
    service: 'hotukdeals',
  },
  attributes: {
    dealId: {
      type: 'string',
      required: true,
    },
    searchTerm: {
      type: 'string',
      required: true,
    },
    title: {
      type: 'string',
      required: true,
    },
    link: {
      type: 'string',
      required: true,
    },
    price: {
      type: 'string',
    },
    merchant: {
      type: 'string',
    },
    timestamp: {
      type: 'number',
      default: () => Date.now(),
    },
    createdAt: {
      type: 'string',
      default: () => new Date().toISOString(),
      readOnly: true,
    },
  },
  indexes: {
    // Primary access pattern: Check if deal exists by ID
    byDealId: {
      pk: {
        field: 'pk',
        composite: ['dealId'],
        template: 'DEAL#${dealId}',
      },
      sk: {
        field: 'sk',
        composite: ['dealId'],
        template: 'DEAL#${dealId}',
      },
    },
  },
});

export type Deal = {
  dealId: string;
  searchTerm: string;
  title: string;
  link: string;
  price?: string;
  merchant?: string;
  timestamp?: number;
  createdAt?: string;
};
