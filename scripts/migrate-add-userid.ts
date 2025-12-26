#!/usr/bin/env node

/**
 * Migration script to add userId to existing Channel and SearchTermConfig entities
 *
 * This migration:
 * 1. Scans existing Channels and SearchTermConfigs in the hotukdeals table
 * 2. Adds a default userId to records that don't have one
 * 3. Updates GSI keys to support user-scoped queries (GSI1) and global queries (GSI3)
 *
 * Usage:
 *   npx tsx scripts/migrate-add-userid.ts [--dry-run] [--reset] [--user-id=<discord-user-id>]
 *
 * Options:
 *   --dry-run          Show what would be migrated without actually writing
 *   --reset            Clear the state file and start migration from scratch
 *   --user-id=<id>     Discord user ID to assign as owner (required for actual run)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

// Table name
const TABLE_NAME = 'hotukdeals';

// State file path
const STATE_FILE_PATH = join(process.cwd(), '.migration-userid-state.json');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldReset = args.includes('--reset');
const userIdArg = args.find(arg => arg.startsWith('--user-id='));
const DEFAULT_USER_ID = userIdArg?.split('=')[1];

// ============================================================================
// Types
// ============================================================================

interface ExistingChannel {
  pk: string;
  sk: string;
  channelId: string;
  name: string;
  webhookUrl: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  __edb_e__: string;
  __edb_v__: string;
  // Old GSI keys
  gsi1pk?: string;
  gsi1sk?: string;
}

interface ExistingConfig {
  pk: string;
  sk: string;
  channelId: string;
  searchTerm: string;
  userId?: string;
  enabled?: boolean;
  excludeKeywords?: string[];
  includeKeywords?: string[];
  caseSensitive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  __edb_e__: string;
  __edb_v__: string;
  // Old GSI keys
  gsi1pk?: string;
  gsi1sk?: string;
  gsi2pk?: string;
  gsi2sk?: string;
}

interface MigrationState {
  version: number;
  startedAt: string;
  lastUpdatedAt: string;
  migratedChannelIds: string[];
  migratedConfigKeys: string[];
  defaultUserId: string | null;
}

// ============================================================================
// State Management
// ============================================================================

function createEmptyState(): MigrationState {
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    migratedChannelIds: [],
    migratedConfigKeys: [],
    defaultUserId: null,
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

function configKey(channelId: string, searchTerm: string): string {
  return `${channelId}::${searchTerm}`;
}

// ============================================================================
// Migration Functions
// ============================================================================

async function scanEntities<T>(entityType: string): Promise<T[]> {
  const items: T[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: '#type = :type',
        ExpressionAttributeNames: {
          '#type': '__edb_e__',
        },
        ExpressionAttributeValues: {
          ':type': entityType,
        },
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

function transformChannel(channel: ExistingChannel, userId: string): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    pk: channel.pk,
    sk: channel.sk,
    // GSI1: User-scoped queries
    gsi1pk: `user#${userId}#channels`,
    gsi1sk: `channel#${channel.channelId}`,
    // GSI3: Global queries (for notifier)
    gsi3pk: 'all#channels',
    gsi3sk: `channel#${channel.channelId}`,
    channelId: channel.channelId,
    userId: userId,
    name: channel.name,
    webhookUrl: channel.webhookUrl,
    createdAt: channel.createdAt || now,
    updatedAt: now,
    __edb_e__: 'Channel',
    __edb_v__: '2',
  };
}

function transformConfig(config: ExistingConfig, userId: string): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    pk: config.pk,
    sk: config.sk,
    // GSI1: User-scoped queries
    gsi1pk: `user#${userId}#configs`,
    gsi1sk: `${config.channelId}#${config.searchTerm}`,
    // GSI2: By search term (unchanged)
    gsi2pk: `searchterm#${config.searchTerm}`,
    gsi2sk: `channel#${config.channelId}`,
    // GSI3: Global queries (for notifier)
    gsi3pk: 'all#configs',
    gsi3sk: `${config.channelId}#${config.searchTerm}`,
    channelId: config.channelId,
    userId: userId,
    searchTerm: config.searchTerm,
    enabled: config.enabled !== false,
    excludeKeywords: config.excludeKeywords || [],
    includeKeywords: config.includeKeywords || [],
    caseSensitive: config.caseSensitive || false,
    createdAt: config.createdAt || now,
    updatedAt: now,
    __edb_e__: 'SearchTermConfig',
    __edb_v__: '2',
  };
}

async function migrateChannels(state: MigrationState, userId: string): Promise<{ migrated: number; skipped: number; alreadyHasUserId: number }> {
  const spinner = ora('Scanning channels...').start();

  try {
    const channels = await scanEntities<ExistingChannel>('Channel');
    const migratedSet = new Set(state.migratedChannelIds);

    // Separate channels that already have userId from those that need migration
    const alreadyHasUserId = channels.filter(c => c.userId && c.userId === userId);
    const needsMigration = channels.filter(c => !c.userId || c.userId !== userId);
    const toMigrate = needsMigration.filter(c => !migratedSet.has(c.channelId));

    spinner.succeed(`Found ${channels.length} channels (${toMigrate.length} to migrate, ${alreadyHasUserId.length} already have userId, ${needsMigration.length - toMigrate.length} in progress)`);

    if (toMigrate.length === 0) {
      return { migrated: 0, skipped: channels.length - toMigrate.length, alreadyHasUserId: alreadyHasUserId.length };
    }

    const migrateSpinner = ora('Migrating channels...').start();
    let migrated = 0;
    let failed = 0;

    for (const channel of toMigrate) {
      try {
        const transformed = transformChannel(channel, userId);

        if (isDryRun) {
          console.log(chalk.dim(`  [DRY RUN] Would migrate channel: ${channel.name} (${channel.channelId.slice(0, 8)}...)`));
        } else {
          await ddb.send(
            new PutCommand({
              TableName: TABLE_NAME,
              Item: transformed,
            })
          );
          state.migratedChannelIds.push(channel.channelId);
          saveState(state);
        }
        migrated++;
      } catch (error) {
        failed++;
        console.error(chalk.red(`  Failed to migrate channel ${channel.name}:`, error));
      }
    }

    if (failed > 0) {
      migrateSpinner.warn(chalk.yellow(`Migrated ${migrated} channels, ${failed} failed`));
    } else {
      migrateSpinner.succeed(
        chalk.green(`Successfully migrated ${migrated} channels${isDryRun ? ' (dry run)' : ''}`)
      );
    }

    return { migrated, skipped: channels.length - toMigrate.length - alreadyHasUserId.length, alreadyHasUserId: alreadyHasUserId.length };
  } catch (error) {
    spinner.fail(chalk.red('Error scanning channels'));
    console.error(error);
    return { migrated: 0, skipped: 0, alreadyHasUserId: 0 };
  }
}

async function migrateConfigs(state: MigrationState, userId: string): Promise<{ migrated: number; skipped: number; alreadyHasUserId: number }> {
  const spinner = ora('Scanning configs...').start();

  try {
    const configs = await scanEntities<ExistingConfig>('SearchTermConfig');
    const migratedSet = new Set(state.migratedConfigKeys);

    // Separate configs that already have userId from those that need migration
    const alreadyHasUserId = configs.filter(c => c.userId && c.userId === userId);
    const needsMigration = configs.filter(c => !c.userId || c.userId !== userId);
    const toMigrate = needsMigration.filter(c => !migratedSet.has(configKey(c.channelId, c.searchTerm)));

    spinner.succeed(`Found ${configs.length} configs (${toMigrate.length} to migrate, ${alreadyHasUserId.length} already have userId, ${needsMigration.length - toMigrate.length} in progress)`);

    if (toMigrate.length === 0) {
      return { migrated: 0, skipped: configs.length - toMigrate.length, alreadyHasUserId: alreadyHasUserId.length };
    }

    const migrateSpinner = ora('Migrating configs...').start();
    let migrated = 0;
    let failed = 0;

    for (const config of toMigrate) {
      try {
        const transformed = transformConfig(config, userId);

        if (isDryRun) {
          console.log(chalk.dim(`  [DRY RUN] Would migrate config: ${config.searchTerm} (channel: ${config.channelId.slice(0, 8)}...)`));
        } else {
          await ddb.send(
            new PutCommand({
              TableName: TABLE_NAME,
              Item: transformed,
            })
          );
          state.migratedConfigKeys.push(configKey(config.channelId, config.searchTerm));
          saveState(state);
        }
        migrated++;
      } catch (error) {
        failed++;
        console.error(chalk.red(`  Failed to migrate config ${config.searchTerm}:`, error));
      }
    }

    if (failed > 0) {
      migrateSpinner.warn(chalk.yellow(`Migrated ${migrated} configs, ${failed} failed`));
    } else {
      migrateSpinner.succeed(
        chalk.green(`Successfully migrated ${migrated} configs${isDryRun ? ' (dry run)' : ''}`)
      );
    }

    return { migrated, skipped: configs.length - toMigrate.length - alreadyHasUserId.length, alreadyHasUserId: alreadyHasUserId.length };
  } catch (error) {
    spinner.fail(chalk.red('Error scanning configs'));
    console.error(error);
    return { migrated: 0, skipped: 0, alreadyHasUserId: 0 };
  }
}

async function main() {
  console.log(chalk.bold.blue('\n HotUKDeals User ID Migration'));
  console.log(chalk.dim('='.repeat(50)));

  // Handle reset flag
  if (shouldReset) {
    resetState();
  }

  // Load state
  const state = loadState();

  // Validate user ID
  const userId = DEFAULT_USER_ID || state.defaultUserId;

  if (!userId && !isDryRun) {
    console.log(chalk.red('\n Error: --user-id=<discord-user-id> is required for actual migration'));
    console.log(chalk.dim('\n To find your Discord user ID:'));
    console.log(chalk.dim('  1. Enable Developer Mode in Discord settings'));
    console.log(chalk.dim('  2. Right-click your profile and select "Copy User ID"'));
    console.log(chalk.dim('\n Example:'));
    console.log(chalk.dim('  npx tsx scripts/migrate-add-userid.ts --user-id=123456789012345678'));
    console.log(chalk.dim('\n Or run with --dry-run to see what would be migrated:'));
    console.log(chalk.dim('  npx tsx scripts/migrate-add-userid.ts --dry-run'));
    process.exit(1);
  }

  const effectiveUserId = userId || 'dry-run-user-id';

  // Save the user ID in state for resume
  if (!isDryRun && userId) {
    state.defaultUserId = userId;
    saveState(state);
  }

  if (isDryRun) {
    console.log(chalk.yellow('\n DRY RUN MODE - No data will be written\n'));
  }

  // Show resumption info if we have prior state
  if (state.migratedChannelIds.length > 0 || state.migratedConfigKeys.length > 0) {
    console.log(chalk.cyan('\n Resuming from previous run:'));
    console.log(chalk.dim(`   Started: ${state.startedAt}`));
    console.log(chalk.dim(`   Last updated: ${state.lastUpdatedAt}`));
    console.log(chalk.dim(`   Channels already migrated: ${state.migratedChannelIds.length}`));
    console.log(chalk.dim(`   Configs already migrated: ${state.migratedConfigKeys.length}`));
    if (state.defaultUserId) {
      console.log(chalk.dim(`   Default user ID: ${state.defaultUserId}`));
    }
    console.log(chalk.dim(`   Use --reset to start fresh\n`));
  }

  console.log(chalk.dim(`Table: ${TABLE_NAME}`));
  console.log(chalk.dim(`User ID: ${effectiveUserId}`));
  console.log(chalk.dim(`State file: ${STATE_FILE_PATH}\n`));

  // Migrate channels
  console.log(chalk.bold('\n Migrating Channels'));
  console.log(chalk.dim('-'.repeat(30)));
  const channelResult = await migrateChannels(state, effectiveUserId);

  // Migrate configs
  console.log(chalk.bold('\n Migrating Configs'));
  console.log(chalk.dim('-'.repeat(30)));
  const configResult = await migrateConfigs(state, effectiveUserId);

  // Summary
  console.log(chalk.bold.blue('\n Migration Summary'));
  console.log(chalk.dim('='.repeat(50)));
  console.log(`  Channels migrated:  ${chalk.green(channelResult.migrated)}${channelResult.skipped > 0 ? chalk.dim(` (${channelResult.skipped} skipped)`) : ''}${channelResult.alreadyHasUserId > 0 ? chalk.dim(` (${channelResult.alreadyHasUserId} already done)`) : ''}`);
  console.log(`  Configs migrated:   ${chalk.green(configResult.migrated)}${configResult.skipped > 0 ? chalk.dim(` (${configResult.skipped} skipped)`) : ''}${configResult.alreadyHasUserId > 0 ? chalk.dim(` (${configResult.alreadyHasUserId} already done)`) : ''}`);

  if (isDryRun) {
    console.log(chalk.yellow('\n This was a dry run. Run without --dry-run to perform the actual migration.'));
    console.log(chalk.dim('\n Example:'));
    console.log(chalk.dim(`  npx tsx scripts/migrate-add-userid.ts --user-id=${effectiveUserId}`));
  } else {
    console.log(chalk.green('\n Migration complete!'));
    console.log(chalk.dim('\n Next steps:'));
    console.log(chalk.dim('  1. Deploy the updated application: npx sst deploy --stage prod'));
    console.log(chalk.dim('  2. Test the application to verify data isolation'));
    console.log(chalk.dim('  3. Delete the state file when satisfied: rm .migration-userid-state.json'));
  }
}

main().catch(console.error);
