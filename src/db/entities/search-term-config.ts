import { Entity } from 'electrodb';

export const SearchTermConfigEntity = new Entity({
  model: {
    entity: 'SearchTermConfig',
    version: '1',
    service: 'hotukdeals',
  },
  attributes: {
    channelId: {
      type: 'string',
      required: true,
    },
    searchTerm: {
      type: 'string',
      required: true,
    },
    enabled: {
      type: 'boolean',
      default: true,
    },
    excludeKeywords: {
      type: 'list',
      items: {
        type: 'string',
      },
      default: [],
    },
    includeKeywords: {
      type: 'list',
      items: {
        type: 'string',
      },
      default: [],
    },
    caseSensitive: {
      type: 'boolean',
      default: false,
    },
    createdAt: {
      type: 'string',
      default: () => new Date().toISOString(),
      readOnly: true,
    },
    updatedAt: {
      type: 'string',
      watch: '*',
      set: () => new Date().toISOString(),
    },
  },
  indexes: {
    // Primary access pattern: Get all configs for a channel
    byChannel: {
      pk: {
        field: 'pk',
        composite: ['channelId'],
        template: 'CHANNEL#${channelId}',
      },
      sk: {
        field: 'sk',
        composite: ['searchTerm'],
        template: 'CONFIG#${searchTerm}',
      },
    },
    // GSI for listing all configs (avoids scan)
    allConfigs: {
      index: 'gsi1',
      pk: {
        field: 'gsi1pk',
        composite: [],
        template: 'CONFIGS',
      },
      sk: {
        field: 'gsi1sk',
        composite: ['channelId', 'searchTerm'],
        template: '${channelId}#${searchTerm}',
      },
    },
    // GSI for looking up config by search term
    bySearchTerm: {
      index: 'gsi2',
      pk: {
        field: 'gsi2pk',
        composite: ['searchTerm'],
        template: 'SEARCHTERM#${searchTerm}',
      },
      sk: {
        field: 'gsi2sk',
        composite: ['channelId'],
        template: 'CHANNEL#${channelId}',
      },
    },
  },
});

export type SearchTermConfig = {
  channelId: string;
  searchTerm: string;
  enabled: boolean;
  excludeKeywords: string[];
  includeKeywords: string[];
  caseSensitive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
