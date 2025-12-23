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
 *
 * Usage:
 *   npx tsx scripts/migrate-to-single-table.ts [--dry-run]
 *
 * Options:
 *   --dry-run  Show what would be migrated without actually writing to the new table
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
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

// Transform old deal to new format for ElectroDB
function transformDeal(oldDeal: OldDeal): Record<string, any> {
  return {
    pk: `DEAL#${oldDeal.id}`,
    sk: `DEAL#${oldDeal.id}`,
    dealId: oldDeal.id,
    searchTerm: oldDeal.searchTerm || 'unknown',
    title: oldDeal.title || '',
    link: oldDeal.link || '',
    price: oldDeal.price,
    merchant: oldDeal.merchant,
    timestamp: oldDeal.timestamp || Date.now(),
    createdAt: new Date().toISOString(),
    __edb_e__: 'Deal',
    __edb_v__: '1',
  };
}

// Transform old config to new format for ElectroDB
function transformConfig(oldConfig: OldConfig): Record<string, any> {
  const now = new Date().toISOString();
  return {
    pk: `WEBHOOK#${oldConfig.webhookUrl}`,
    sk: `CONFIG#${oldConfig.searchTerm}`,
    gsi1pk: 'CONFIGS',
    gsi1sk: `${oldConfig.webhookUrl}#${oldConfig.searchTerm}`,
    gsi2pk: `SEARCHTERM#${oldConfig.searchTerm}`,
    gsi2sk: `WEBHOOK#${oldConfig.webhookUrl}`,
    webhookUrl: oldConfig.webhookUrl,
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
  let lastEvaluatedKey: Record<string, any> | undefined;

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
      migrateSpinner.warn(
        chalk.yellow(`Migrated ${migrated} deals, ${failed} failed`)
      );
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

async function migrateConfigs(): Promise<number> {
  const spinner = ora('Scanning old config table...').start();

  try {
    const oldConfigs = await scanTable<OldConfig>(OLD_CONFIG_TABLE);
    spinner.succeed(`Found ${oldConfigs.length} configs to migrate`);

    if (oldConfigs.length === 0) {
      return 0;
    }

    const migrateSpinner = ora('Migrating configs...').start();
    let migrated = 0;
    let failed = 0;

    for (const oldConfig of oldConfigs) {
      try {
        const newConfig = transformConfig(oldConfig);

        if (isDryRun) {
          console.log(
            chalk.dim(
              `  [DRY RUN] Would migrate config: ${oldConfig.searchTerm} -> ${oldConfig.webhookUrl.substring(0, 50)}...`
            )
          );
        } else {
          await ddb.send(
            new PutCommand({
              TableName: NEW_TABLE,
              Item: newConfig,
            })
          );
        }
        migrated++;
      } catch (error) {
        failed++;
        console.error(
          chalk.red(`  Failed to migrate config ${oldConfig.searchTerm}:`, error)
        );
      }
    }

    if (failed > 0) {
      migrateSpinner.warn(
        chalk.yellow(`Migrated ${migrated} configs, ${failed} failed`)
      );
    } else {
      migrateSpinner.succeed(
        chalk.green(`Successfully migrated ${migrated} configs${isDryRun ? ' (dry run)' : ''}`)
      );
    }

    return migrated;
  } catch (error) {
    spinner.fail(chalk.red('Error scanning old config table'));
    console.error(error);
    return 0;
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

  // Migrate configs
  console.log(chalk.bold('\n Migrating Configs'));
  console.log(chalk.dim('-'.repeat(30)));
  const configsCount = await migrateConfigs();

  // Summary
  console.log(chalk.bold.blue('\n Migration Summary'));
  console.log(chalk.dim('='.repeat(50)));
  console.log(`  Deals migrated:   ${chalk.green(dealsCount)}`);
  console.log(`  Configs migrated: ${chalk.green(configsCount)}`);

  if (isDryRun) {
    console.log(chalk.yellow('\n This was a dry run. Run without --dry-run to perform the actual migration.'));
  } else {
    console.log(chalk.green('\n Migration complete!'));
    console.log(chalk.dim('\n Next steps:'));
    console.log(chalk.dim('  1. Verify the data in the new table'));
    console.log(chalk.dim('  2. Deploy the updated Lambda with: sst deploy'));
    console.log(chalk.dim('  3. Monitor the application for any issues'));
    console.log(chalk.dim('  4. Once verified, you can delete the old tables'));
  }
}

main().catch(console.error);
