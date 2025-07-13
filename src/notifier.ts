import { Handler } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import middy from '@middy/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { request } from 'undici';
import { fetchDeals } from './feed-parser';

const logger = new Logger({ serviceName: 'HotUKDealsNotifier' });

const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL!;
const tableName = process.env.DYNAMODB_TABLE_NAME!;
const searchTerms = process.env.SEARCH_TERMS?.split(',').map(term => term.trim()) || ['steam-deck'];

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Helper function to process a single search term
const processFeed = async (searchTerm: string): Promise<void> => {
  logger.info('Fetching deals for search term', { searchTerm });

  try {
    const deals = await fetchDeals(searchTerm);

    for (const deal of deals) {
      const dealId = deal.id;

      const exists = await ddb.send(new GetCommand({
        TableName: tableName,
        Key: { id: dealId }
      }));

      if (!exists.Item) {
        logger.info('New deal found, posting to Discord', {
          title: deal.title,
          link: deal.link,
          price: deal.price,
          merchant: deal.merchant,
          searchTerm
        });

        // Format Discord message with price and merchant info if available
        let message = `🆕 New **${searchTerm}** deal: **${deal.title}**`;
        if (deal.price) {
          message += ` - ${deal.price}`;
        }
        if (deal.merchant) {
          message += ` at ${deal.merchant}`;
        }
        message += `\n${deal.link}`;

        await request(discordWebhookUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            content: message
          })
        });

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
  } catch (error) {
    logger.error('Error processing deals', { error, searchTerm });
  }
};

// Base Lambda handler
const baseHandler: Handler = async () => {
  logger.info('Processing deals for search terms', { searchTerms });

  // Process all search terms concurrently
  await Promise.all(searchTerms.map(processFeed));
};

export const handler = middy(baseHandler).use(injectLambdaContext(logger));
