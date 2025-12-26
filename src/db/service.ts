import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Service, EntityConfiguration } from 'electrodb';
import { ChannelEntity, SearchTermConfigEntity, DealEntity } from './entities';

// Create DynamoDB client
const client = new DynamoDBClient({});

// Get table name from environment
const tableName = process.env.TABLE_NAME || 'hotukdeals';

// Service configuration
const configuration: EntityConfiguration = {
  client,
  table: tableName,
};

// Create the service with all entities
export const HotUKDealsService = new Service(
  {
    channel: ChannelEntity,
    searchTermConfig: SearchTermConfigEntity,
    deal: DealEntity,
  },
  configuration
);

// Re-export entities for direct access if needed
export { ChannelEntity, SearchTermConfigEntity, DealEntity };

// Type exports from Zod schemas
export type { Channel, SearchTermConfig, Deal } from './schemas';
