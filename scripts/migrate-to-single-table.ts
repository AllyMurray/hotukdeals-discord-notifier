#!/usr/bin/env node

/**
 * Migration script to move data from the two old tables to the new single table
 *
 * Old tables:
 * - hotukdeals-processed-deals (DealsTable): { id, timestamp, searchTerm, title, link, price, merchant }
 * - hotukdeals-config (ConfigTable): { searchTerm, webhookUrl, enabled, excludeKeywords, includeKeywords, caseSensitive }
 *
 * New table:
 * - hotukdeals (HotUKDealsTable): Single table design with ElectroDB
 *   - Channel entity: Groups search terms by webhook URL with a friendly name
 *   - SearchTermConfig entity: References channelId instead of webhookUrl
 *   - Deal entity: Tracks processed deals
 *
 * Usage:
 *   npx tsx scripts/migrate-to-single-table.ts [--dry-run]
 *
 * Options:
 *   --dry-run  Show what would be migrated without actually writing to the new table
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import chalk from 'chalk';
import ora from 'ora';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

// Table names
const OLD_DEALS_TABLE = 'hotukdeals-processed-deals';
const OLD_CONFIG_TABLE = 'hotukdeals-config';
const NEW_TABLE = 'hotukdeals';

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run');

interface OldDeal {
  id: string;
  timestamp?: number;
  searchTerm?: string;
  title?: string;
  link?: string;
  price?: string;
  merchant?: string;
}

interface OldConfig {
  searchTerm: string;
  webhookUrl: string;
  enabled?: boolean;
  excludeKeywords?: string[];
  includeKeywords?: string[];
  caseSensitive?: boolean;
  updatedAt?: string;
}

// Map webhookUrl -> channelId for migration
const webhookToChannelMap = new Map<string, string>();

// Generate a channel name from webhook URL
function generateChannelName(webhookUrl: string, index: number): string {
  // Try to extract something meaningful from the webhook URL
  // Discord webhooks look like: https://discord.com/api/webhooks/{id}/{token}
  const match = webhookUrl.match(/webhooks\/(\d+)\//);
  if (match) {
    return `Channel ${match[1].slice(-4)}`;
  }
  return `Channel ${index + 1}`;
}

// 12 months TTL in seconds (matching Deal entity)
const TWELVE_MONTHS_IN_SECONDS = 365 * 24 * 60 * 60;

// Transform old deal to new format for ElectroDB
function transformDeal(oldDeal: OldDeal): Record<string, unknown> {
  const now = Date.now();
  return {
    pk: `DEAL#${oldDeal.id}`,
    sk: `DEAL#${oldDeal.id}`,
    dealId: oldDeal.id,
    searchTerm: oldDeal.searchTerm || 'unknown',
    title: oldDeal.title || '',
    link: oldDeal.link || '',
    price: oldDeal.price,
    merchant: oldDeal.merchant,
    timestamp: oldDeal.timestamp || now,
    createdAt: new Date().toISOString(),
    ttl: Math.floor(now / 1000) + TWELVE_MONTHS_IN_SECONDS,
    __edb_e__: 'Deal',
    __edb_v__: '1',
  };
}

// Create a Channel entity from webhook URL
function createChannel(webhookUrl: string, name: string): Record<string, unknown> {
  const channelId = randomUUID();
  webhookToChannelMap.set(webhookUrl, channelId);

  const now = new Date().toISOString();
  return {
    pk: `CHANNEL#${channelId}`,
    sk: `CHANNEL#${channelId}`,
    gsi1pk: 'CHANNELS',
    gsi1sk: `CHANNEL#${channelId}`,
    channelId,
    name,
    webhookUrl,
    createdAt: now,
    updatedAt: now,
    __edb_e__: 'Channel',
    __edb_v__: '1',
  };
}

// Transform old config to new format for ElectroDB (using channelId)
function transformConfig(oldConfig: OldConfig, channelId: string): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    pk: `CHANNEL#${channelId}`,
    sk: `CONFIG#${oldConfig.searchTerm}`,
    gsi1pk: 'CONFIGS',
    gsi1sk: `${channelId}#${oldConfig.searchTerm}`,
    gsi2pk: `SEARCHTERM#${oldConfig.searchTerm}`,
    gsi2sk: `CHANNEL#${channelId}`,
    channelId,
    searchTerm: oldConfig.searchTerm,
    enabled: oldConfig.enabled !== false,
    excludeKeywords: oldConfig.excludeKeywords || [],
    includeKeywords: oldConfig.includeKeywords || [],
    caseSensitive: oldConfig.caseSensitive || false,
    createdAt: oldConfig.updatedAt || now,
    updatedAt: now,
    __edb_e__: 'SearchTermConfig',
    __edb_v__: '1',
  };
}

async function scanTable<T>(tableName: string): Promise<T[]> {
  const items: T[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    if (result.Items) {
      items.push(...(result.Items as T[]));
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function migrateDeals(): Promise<number> {
  const spinner = ora('Scanning old deals table...').start();

  try {
    const oldDeals = await scanTable<OldDeal>(OLD_DEALS_TABLE);
    spinner.succeed(`Found ${oldDeals.length} deals to migrate`);

    if (oldDeals.length === 0) {
      return 0;
    }

    const migrateSpinner = ora('Migrating deals...').start();
    let migrated = 0;
    let failed = 0;

    for (const oldDeal of oldDeals) {
      try {
        const newDeal = transformDeal(oldDeal);

        if (isDryRun) {
          console.log(chalk.dim(`  [DRY RUN] Would migrate deal: ${oldDeal.id}`));
        } else {
          await ddb.send(
            new PutCommand({
              TableName: NEW_TABLE,
              Item: newDeal,
            })
          );
        }
        migrated++;
      } catch (error) {
        failed++;
        console.error(chalk.red(`  Failed to migrate deal ${oldDeal.id}:`, error));
      }
    }

    if (failed > 0) {
      migrateSpinner.warn(chalk.yellow(`Migrated ${migrated} deals, ${failed} failed`));
    } else {
      migrateSpinner.succeed(
        chalk.green(`Successfully migrated ${migrated} deals${isDryRun ? ' (dry run)' : ''}`)
      );
    }

    return migrated;
  } catch (error) {
    spinner.fail(chalk.red('Error scanning old deals table'));
    console.error(error);
    return 0;
  }
}

async function migrateConfigs(): Promise<{ channels: number; configs: number }> {
  const spinner = ora('Scanning old config table...').start();

  try {
    const oldConfigs = await scanTable<OldConfig>(OLD_CONFIG_TABLE);
    spinner.succeed(`Found ${oldConfigs.length} configs to migrate`);

    if (oldConfigs.length === 0) {
      return { channels: 0, configs: 0 };
    }

    // Step 1: Create channels for each unique webhook URL
    const uniqueWebhooks = Array.from(new Set(oldConfigs.map((c) => c.webhookUrl)));
    const channelSpinner = ora(`Creating ${uniqueWebhooks.length} channels...`).start();
    let channelsCreated = 0;

    for (let i = 0; i < uniqueWebhooks.length; i++) {
      const webhookUrl = uniqueWebhooks[i];
      const channelName = generateChannelName(webhookUrl, i);

      try {
        // createChannel generates a UUID and adds it to webhookToChannelMap
        // This happens for both dry-run and real runs so config migration works
        const channel = createChannel(webhookUrl, channelName);

        if (isDryRun) {
          const channelId = channel.channelId as string;
          console.log(chalk.dim(`  [DRY RUN] Would create channel: ${channelName} (ID: ${channelId.slice(0, 8)}...)`));
        } else {
          await ddb.send(
            new PutCommand({
              TableName: NEW_TABLE,
              Item: channel,
            })
          );
        }
        channelsCreated++;
      } catch (error) {
        console.error(chalk.red(`  Failed to create channel for webhook:`, error));
      }
    }

    channelSpinner.succeed(
      chalk.green(`Created ${channelsCreated} channels${isDryRun ? ' (dry run)' : ''}`)
    );

    // Step 2: Migrate configs with channelId
    const configSpinner = ora('Migrating configs...').start();
    let configsMigrated = 0;
    let configsFailed = 0;

    for (const oldConfig of oldConfigs) {
      try {
        const channelId = webhookToChannelMap.get(oldConfig.webhookUrl);
        if (!channelId) {
          console.error(chalk.red(`  No channel found for webhook: ${oldConfig.webhookUrl}`));
          configsFailed++;
          continue;
        }

        const newConfig = transformConfig(oldConfig, channelId);

        if (isDryRun) {
          console.log(
            chalk.dim(`  [DRY RUN] Would migrate config: ${oldConfig.searchTerm} -> channel ${channelId.slice(0, 8)}...`)
          );
        } else {
          await ddb.send(
            new PutCommand({
              TableName: NEW_TABLE,
              Item: newConfig,
            })
          );
        }
        configsMigrated++;
      } catch (error) {
        configsFailed++;
        console.error(chalk.red(`  Failed to migrate config ${oldConfig.searchTerm}:`, error));
      }
    }

    if (configsFailed > 0) {
      configSpinner.warn(chalk.yellow(`Migrated ${configsMigrated} configs, ${configsFailed} failed`));
    } else {
      configSpinner.succeed(
        chalk.green(`Successfully migrated ${configsMigrated} configs${isDryRun ? ' (dry run)' : ''}`)
      );
    }

    return { channels: channelsCreated, configs: configsMigrated };
  } catch (error) {
    spinner.fail(chalk.red('Error scanning old config table'));
    console.error(error);
    return { channels: 0, configs: 0 };
  }
}

async function main() {
  console.log(chalk.bold.blue('\n HotUKDeals DynamoDB Migration'));
  console.log(chalk.dim('='.repeat(50)));

  if (isDryRun) {
    console.log(chalk.yellow('\n DRY RUN MODE - No data will be written\n'));
  }

  console.log(chalk.dim(`Source tables:`));
  console.log(chalk.dim(`  - Deals: ${OLD_DEALS_TABLE}`));
  console.log(chalk.dim(`  - Config: ${OLD_CONFIG_TABLE}`));
  console.log(chalk.dim(`Target table: ${NEW_TABLE}\n`));

  // Migrate deals
  console.log(chalk.bold('\n Migrating Deals'));
  console.log(chalk.dim('-'.repeat(30)));
  const dealsCount = await migrateDeals();

  // Migrate configs (creates channels first)
  console.log(chalk.bold('\n Migrating Channels & Configs'));
  console.log(chalk.dim('-'.repeat(30)));
  const { channels: channelsCount, configs: configsCount } = await migrateConfigs();

  // Summary
  console.log(chalk.bold.blue('\n Migration Summary'));
  console.log(chalk.dim('='.repeat(50)));
  console.log(`  Deals migrated:    ${chalk.green(dealsCount)}`);
  console.log(`  Channels created:  ${chalk.green(channelsCount)}`);
  console.log(`  Configs migrated:  ${chalk.green(configsCount)}`);

  if (isDryRun) {
    console.log(chalk.yellow('\n This was a dry run. Run without --dry-run to perform the actual migration.'));
  } else {
    console.log(chalk.green('\n Migration complete!'));
    console.log(chalk.dim('\n Next steps:'));
    console.log(chalk.dim('  1. Verify the data in the new table'));
    console.log(chalk.dim('  2. Rename channels using: npx tsx scripts/manage-config.ts channel update "Channel XXXX" --name "My Channel"'));
    console.log(chalk.dim('  3. Deploy the updated Lambda with: sst deploy'));
    console.log(chalk.dim('  4. Monitor the application for any issues'));
    console.log(chalk.dim('  5. Once verified, you can delete the old tables'));
  }
}

main().catch(console.error);
