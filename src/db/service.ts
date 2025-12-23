import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Service, EntityConfiguration } from 'electrodb';
import { SearchTermConfigEntity, DealEntity } from './entities';

// Create DynamoDB client
const client = new DynamoDBClient({});

// Get table name from environment
const tableName = process.env.TABLE_NAME || 'hotukdeals';

// Service configuration
const configuration: EntityConfiguration = {
  client,
  table: tableName,
};

// Create the service with both entities
export const HotUKDealsService = new Service(
  {
    searchTermConfig: SearchTermConfigEntity,
    deal: DealEntity,
  },
  configuration
);

// Re-export entities for direct access if needed
export { SearchTermConfigEntity, DealEntity };

// Type exports
export type { SearchTermConfig } from './entities/search-term-config';
export type { Deal } from './entities/deal';
