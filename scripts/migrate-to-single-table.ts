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
 *   npx tsx scripts/migrate-to-single-table.ts [--dry-run] [--reset]
 *
 * Options:
 *   --dry-run  Show what would be migrated without actually writing to the new table
 *   --reset    Clear the state file and start migration from scratch
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

// Table names
const OLD_DEALS_TABLE = 'hotukdeals-processed-deals';
const OLD_CONFIG_TABLE = 'hotukdeals-config';
const NEW_TABLE = 'hotukdeals';

// State file path
const STATE_FILE_PATH = join(process.cwd(), '.migration-state.json');

// Check for flags
const isDryRun = process.argv.includes('--dry-run');
const shouldReset = process.argv.includes('--reset');

// ============================================================================
// Types
// ============================================================================

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

interface MigrationState {
  version: number;
  startedAt: string;
  lastUpdatedAt: string;
  migratedDealIds: string[];
  channels: Record<string, { channelId: string; name: string }>;
  migratedConfigKeys: string[];
}

// ============================================================================
// State Management
// ============================================================================

function createEmptyState(): MigrationState {
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    migratedDealIds: [],
    channels: {},
    migratedConfigKeys: [],
  };
}

function loadState(): MigrationState {
  if (!existsSync(STATE_FILE_PATH)) {
    return createEmptyState();
  }

  try {
    const content = readFileSync(STATE_FILE_PATH, 'utf-8');
    return JSON.parse(content) as MigrationState;
  } catch {
    console.log(chalk.yellow('Warning: Could not parse state file, starting fresh'));
    return createEmptyState();
  }
}

function saveState(state: MigrationState): void {
  if (isDryRun) {
    return; // Don't save state during dry run
  }

  state.lastUpdatedAt = new Date().toISOString();
  writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2));
}

function resetState(): void {
  if (existsSync(STATE_FILE_PATH)) {
    unlinkSync(STATE_FILE_PATH);
    console.log(chalk.green('State file cleared'));
  }
}

function configKey(searchTerm: string, webhookUrl: string): string {
  return `${searchTerm}::${webhookUrl}`;
}

// ============================================================================
// Migration State
// ============================================================================

let state: MigrationState;

// Known webhook URL to channel name mappings
const WEBHOOK_NAME_MAP: Record<string, string> = {
  'https://discord.com/api/webhooks/1395011107726426183/WqZ7TgSk4ztmZQtRP45Dsnfh_l6gaVRRNVy7oKAxu4PeurJlMMwIwuIOtg8NVfNWT_gi': 'Processors',
  'https://discord.com/api/webhooks/1421152200410923101/zAwxfglVZF_E-5NywaDMNBh4gxreLtVSapKwznn0XyzFoFn_tlWEfcRlEJ0O2AHO1y90': 'Epic Games',
  'https://discord.com/api/webhooks/1395009941089161298/Cb3XntSFTiMnoGqcC4hlnG5GaD0FWHjXcNW-K844TwtVz5KwGFeaR4DG520duRW46QhX': 'Graphics Cards',
  'https://discord.com/api/webhooks/1395011788201922600/kLsiHLlwGDNE8QayPYE7z14XiiainnJXMhbaOdGUg6R7WooSU1PYhDYPtTTP9ffdO633': 'Steam Games',
};

// Generate a channel name from webhook URL
function generateChannelName(webhookUrl: string, index: number): string {
  // Check if we have a known name for this webhook
  if (WEBHOOK_NAME_MAP[webhookUrl]) {
    return WEBHOOK_NAME_MAP[webhookUrl];
  }

  // Warn about unknown webhook URL
  console.log(chalk.yellow(`\n⚠️  Unknown webhook URL found - using auto-generated name`));
  console.log(chalk.yellow(`   Add this to WEBHOOK_NAME_MAP in the migration script:`));
  console.log(chalk.dim(`   '${webhookUrl}': 'Your Channel Name',\n`));

  // Fallback: Try to extract something meaningful from the webhook URL
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
function createChannelItem(webhookUrl: string, name: string, channelId: string): Record<string, unknown> {
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

async function migrateDeals(): Promise<{ migrated: number; skipped: number }> {
  const spinner = ora('Scanning old deals table...').start();

  try {
    const oldDeals = await scanTable<OldDeal>(OLD_DEALS_TABLE);
    const migratedSet = new Set(state.migratedDealIds);
    const toMigrate = oldDeals.filter((d) => !migratedSet.has(d.id));

    spinner.succeed(`Found ${oldDeals.length} deals (${toMigrate.length} to migrate, ${oldDeals.length - toMigrate.length} already done)`);

    if (toMigrate.length === 0) {
      return { migrated: 0, skipped: oldDeals.length };
    }

    const migrateSpinner = ora('Migrating deals...').start();
    let migrated = 0;
    let failed = 0;

    for (const oldDeal of toMigrate) {
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
          // Record successful migration
          state.migratedDealIds.push(oldDeal.id);
          saveState(state);
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

    return { migrated, skipped: oldDeals.length - toMigrate.length };
  } catch (error) {
    spinner.fail(chalk.red('Error scanning old deals table'));
    console.error(error);
    return { migrated: 0, skipped: 0 };
  }
}

async function migrateConfigs(): Promise<{ channels: number; configs: number; skippedConfigs: number }> {
  const spinner = ora('Scanning old config table...').start();

  try {
    const oldConfigs = await scanTable<OldConfig>(OLD_CONFIG_TABLE);
    spinner.succeed(`Found ${oldConfigs.length} configs to process`);

    if (oldConfigs.length === 0) {
      return { channels: 0, configs: 0, skippedConfigs: 0 };
    }

    // Step 1: Create channels for each unique webhook URL (if not already created)
    const uniqueWebhooks = Array.from(new Set(oldConfigs.map((c) => c.webhookUrl)));
    const newWebhooks = uniqueWebhooks.filter((url) => !state.channels[url]);

    let channelsCreated = 0;

    if (newWebhooks.length > 0) {
      const channelSpinner = ora(`Creating ${newWebhooks.length} new channels...`).start();

      for (let i = 0; i < newWebhooks.length; i++) {
        const webhookUrl = newWebhooks[i];
        const channelName = generateChannelName(webhookUrl, Object.keys(state.channels).length + i);
        const channelId = randomUUID();

        try {
          const channel = createChannelItem(webhookUrl, channelName, channelId);

          if (isDryRun) {
            console.log(chalk.dim(`  [DRY RUN] Would create channel: ${channelName} (ID: ${channelId.slice(0, 8)}...)`));
          } else {
            await ddb.send(
              new PutCommand({
                TableName: NEW_TABLE,
                Item: channel,
              })
            );
            // Record successful channel creation
            state.channels[webhookUrl] = { channelId, name: channelName };
            saveState(state);
          }
          channelsCreated++;
        } catch (error) {
          console.error(chalk.red(`  Failed to create channel for webhook:`, error));
        }
      }

      channelSpinner.succeed(
        chalk.green(`Created ${channelsCreated} channels${isDryRun ? ' (dry run)' : ''}`)
      );
    } else {
      console.log(chalk.dim(`  All ${uniqueWebhooks.length} channels already exist`));
    }

    // Step 2: Migrate configs with channelId
    const migratedSet = new Set(state.migratedConfigKeys);
    const toMigrate = oldConfigs.filter((c) => !migratedSet.has(configKey(c.searchTerm, c.webhookUrl)));

    if (toMigrate.length === 0) {
      console.log(chalk.dim(`  All ${oldConfigs.length} configs already migrated`));
      return { channels: channelsCreated, configs: 0, skippedConfigs: oldConfigs.length };
    }

    const configSpinner = ora(`Migrating ${toMigrate.length} configs...`).start();
    let configsMigrated = 0;
    let configsFailed = 0;

    for (const oldConfig of toMigrate) {
      try {
        const channelInfo = state.channels[oldConfig.webhookUrl];
        if (!channelInfo) {
          console.error(chalk.red(`  No channel found for webhook: ${oldConfig.webhookUrl}`));
          configsFailed++;
          continue;
        }

        const newConfig = transformConfig(oldConfig, channelInfo.channelId);

        if (isDryRun) {
          console.log(
            chalk.dim(`  [DRY RUN] Would migrate config: ${oldConfig.searchTerm} -> channel ${channelInfo.channelId.slice(0, 8)}...`)
          );
        } else {
          await ddb.send(
            new PutCommand({
              TableName: NEW_TABLE,
              Item: newConfig,
            })
          );
          // Record successful config migration
          state.migratedConfigKeys.push(configKey(oldConfig.searchTerm, oldConfig.webhookUrl));
          saveState(state);
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

    return {
      channels: channelsCreated,
      configs: configsMigrated,
      skippedConfigs: oldConfigs.length - toMigrate.length,
    };
  } catch (error) {
    spinner.fail(chalk.red('Error scanning old config table'));
    console.error(error);
    return { channels: 0, configs: 0, skippedConfigs: 0 };
  }
}

async function main() {
  console.log(chalk.bold.blue('\n HotUKDeals DynamoDB Migration'));
  console.log(chalk.dim('='.repeat(50)));

  // Handle reset flag
  if (shouldReset) {
    resetState();
  }

  // Load state
  state = loadState();

  if (isDryRun) {
    console.log(chalk.yellow('\n DRY RUN MODE - No data will be written\n'));
  }

  // Show resumption info if we have prior state
  if (state.migratedDealIds.length > 0 || Object.keys(state.channels).length > 0) {
    console.log(chalk.cyan('\n Resuming from previous run:'));
    console.log(chalk.dim(`   Started: ${state.startedAt}`));
    console.log(chalk.dim(`   Last updated: ${state.lastUpdatedAt}`));
    console.log(chalk.dim(`   Deals already migrated: ${state.migratedDealIds.length}`));
    console.log(chalk.dim(`   Channels already created: ${Object.keys(state.channels).length}`));
    console.log(chalk.dim(`   Configs already migrated: ${state.migratedConfigKeys.length}`));
    console.log(chalk.dim(`   Use --reset to start fresh\n`));
  }

  console.log(chalk.dim(`Source tables:`));
  console.log(chalk.dim(`  - Deals: ${OLD_DEALS_TABLE}`));
  console.log(chalk.dim(`  - Config: ${OLD_CONFIG_TABLE}`));
  console.log(chalk.dim(`Target table: ${NEW_TABLE}`));
  console.log(chalk.dim(`State file: ${STATE_FILE_PATH}\n`));

  // Migrate deals
  console.log(chalk.bold('\n Migrating Deals'));
  console.log(chalk.dim('-'.repeat(30)));
  const { migrated: dealsCount, skipped: dealsSkipped } = await migrateDeals();

  // Migrate configs (creates channels first)
  console.log(chalk.bold('\n Migrating Channels & Configs'));
  console.log(chalk.dim('-'.repeat(30)));
  const { channels: channelsCount, configs: configsCount, skippedConfigs } = await migrateConfigs();

  // Summary
  console.log(chalk.bold.blue('\n Migration Summary'));
  console.log(chalk.dim('='.repeat(50)));
  console.log(`  Deals migrated:    ${chalk.green(dealsCount)}${dealsSkipped > 0 ? chalk.dim(` (${dealsSkipped} skipped)`) : ''}`);
  console.log(`  Channels created:  ${chalk.green(channelsCount)}${Object.keys(state.channels).length > channelsCount ? chalk.dim(` (${Object.keys(state.channels).length} total)`) : ''}`);
  console.log(`  Configs migrated:  ${chalk.green(configsCount)}${skippedConfigs > 0 ? chalk.dim(` (${skippedConfigs} skipped)`) : ''}`);

  if (isDryRun) {
    console.log(chalk.yellow('\n This was a dry run. Run without --dry-run to perform the actual migration.'));
  } else {
    const totalDeals = state.migratedDealIds.length;
    const totalConfigs = state.migratedConfigKeys.length;
    const totalChannels = Object.keys(state.channels).length;

    console.log(chalk.green('\n Migration complete!'));
    console.log(chalk.dim(`\n Total migrated: ${totalDeals} deals, ${totalChannels} channels, ${totalConfigs} configs`));
    console.log(chalk.dim('\n Next steps:'));
    console.log(chalk.dim('  1. Verify the data in the new table'));
    console.log(chalk.dim('  2. Deploy the updated Lambda with: sst deploy'));
    console.log(chalk.dim('  3. Monitor the application for any issues'));
    console.log(chalk.dim('  4. Once verified, you can delete the old tables and the state file'));
  }
}

main().catch(console.error);
