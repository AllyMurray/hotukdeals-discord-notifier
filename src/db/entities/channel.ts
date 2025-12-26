import { Entity } from 'electrodb';
import { randomUUID } from 'crypto';

// Type is defined via Zod schema in ../schemas.ts
export const ChannelEntity = new Entity({
  model: {
    entity: 'Channel',
    version: '1',
    service: 'hotukdeals',
  },
  attributes: {
    channelId: {
      type: 'string',
      required: true,
      default: () => randomUUID(),
    },
    name: {
      type: 'string',
      required: true,
    },
    webhookUrl: {
      type: 'string',
      required: true,
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
    // Primary access: Get channel by ID
    byChannelId: {
      pk: {
        field: 'pk',
        composite: ['channelId'],
        template: 'CHANNEL#${channelId}',
      },
      sk: {
        field: 'sk',
        composite: ['channelId'],
        template: 'CHANNEL#${channelId}',
      },
    },
    // GSI for listing all channels
    allChannels: {
      index: 'gsi1',
      pk: {
        field: 'gsi1pk',
        composite: [],
        template: 'CHANNELS',
      },
      sk: {
        field: 'gsi1sk',
        composite: ['channelId'],
        template: 'CHANNEL#${channelId}',
      },
    },
  },
});
