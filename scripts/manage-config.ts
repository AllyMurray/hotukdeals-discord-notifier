#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

// Set table name before importing db module
process.env.TABLE_NAME = process.env.TABLE_NAME || 'hotukdeals';

import {
  getAllConfigs,
  getConfigsByWebhook,
  getConfigBySearchTerm,
  upsertConfig,
  deleteConfig,
  deleteConfigsByWebhook,
  SearchTermConfig,
} from '../src/db';

interface GroupedWebhookConfig {
  webhookUrl: string;
  searchTerms: string[];
  enabledCount: number;
  disabledCount: number;
}

// Helper function to format webhook URL for display
const formatWebhookUrl = (url: string): string => {
  return url.length > 50 ? url.substring(0, 50) + '...' : url;
};

// Add or update a search term configuration
export async function addSearchTermConfig(config: {
  searchTerm: string;
  webhookUrl: string;
  enabled?: boolean;
  excludeKeywords?: string[];
  includeKeywords?: string[];
  caseSensitive?: boolean;
}): Promise<void> {
  const spinner = ora('Adding/updating search term configuration...').start();

  try {
    await upsertConfig({
      searchTerm: config.searchTerm,
      webhookUrl: config.webhookUrl,
      enabled: config.enabled !== false,
      excludeKeywords: config.excludeKeywords || [],
      includeKeywords: config.includeKeywords || [],
      caseSensitive: config.caseSensitive || false,
    });

    spinner.succeed(chalk.green(`Added/updated config for search term: ${chalk.bold(config.searchTerm)}`));

    if (config.excludeKeywords && config.excludeKeywords.length > 0) {
      console.log(chalk.red(`   Excluding: ${config.excludeKeywords.join(', ')}`));
    }
    if (config.includeKeywords && config.includeKeywords.length > 0) {
      console.log(chalk.green(`   Including: ${config.includeKeywords.join(', ')}`));
    }
    if (config.caseSensitive) {
      console.log(chalk.blue(`   Case sensitive: enabled`));
    }
  } catch (error) {
    spinner.fail(chalk.red(`Error adding config for ${config.searchTerm}`));
    console.error(chalk.red(error));
  }
}

// Add multiple search terms to a single webhook URL
export async function addMultipleSearchTerms(
  webhookUrl: string,
  searchTerms: string[],
  enabled: boolean = true
): Promise<void> {
  const spinner = ora(`Adding ${searchTerms.length} search terms to webhook...`).start();

  try {
    const results = await Promise.allSettled(
      searchTerms.map((searchTerm) =>
        upsertConfig({ searchTerm, webhookUrl, enabled })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed === 0) {
      spinner.succeed(chalk.green(`Successfully added ${successful} search terms`));
    } else {
      spinner.warn(chalk.yellow(`Added ${successful} search terms, ${failed} failed`));
    }
  } catch (error) {
    spinner.fail(chalk.red('Error adding multiple search terms'));
    console.error(chalk.red(error));
  }
}

// List all search term configurations
export async function listSearchTermConfigs(): Promise<SearchTermConfig[]> {
  const spinner = ora('Fetching search term configurations...').start();

  try {
    const configs = await getAllConfigs();

    spinner.succeed(chalk.green('Configurations retrieved'));

    console.log(chalk.bold.blue('\n Current search term configurations:'));
    console.log(chalk.dim('='.repeat(60)));

    if (configs.length === 0) {
      console.log(chalk.yellow('   No configurations found'));
      return configs;
    }

    configs.forEach((config) => {
      const status = config.enabled ? chalk.green('enabled') : chalk.red('disabled');
      console.log(`${chalk.cyan('Search:')} ${chalk.bold(config.searchTerm)} (${status})`);
      console.log(chalk.dim(`   Webhook: ${formatWebhookUrl(config.webhookUrl)}`));

      if (config.excludeKeywords && config.excludeKeywords.length > 0) {
        console.log(chalk.red(`   Excluding: ${config.excludeKeywords.join(', ')}`));
      }
      if (config.includeKeywords && config.includeKeywords.length > 0) {
        console.log(chalk.green(`   Including: ${config.includeKeywords.join(', ')}`));
      }
      if (config.caseSensitive) {
        console.log(chalk.blue(`   Case sensitive: enabled`));
      }

      console.log('');
    });

    console.log(chalk.dim(`Total configurations: ${configs.length}`));
    return configs;
  } catch (error) {
    spinner.fail(chalk.red('Error listing configurations'));
    console.error(chalk.red(error));
    return [];
  }
}

// List configurations grouped by webhook URL
export async function listGroupedConfigs(): Promise<GroupedWebhookConfig[]> {
  const spinner = ora('Fetching grouped configurations...').start();

  try {
    const configs = await getAllConfigs();

    // Group by webhook URL
    const grouped = configs.reduce(
      (acc, config) => {
        if (!acc[config.webhookUrl]) {
          acc[config.webhookUrl] = {
            webhookUrl: config.webhookUrl,
            searchTerms: [],
            enabledCount: 0,
            disabledCount: 0,
          };
        }
        acc[config.webhookUrl].searchTerms.push(config.searchTerm);
        if (config.enabled) {
          acc[config.webhookUrl].enabledCount++;
        } else {
          acc[config.webhookUrl].disabledCount++;
        }
        return acc;
      },
      {} as Record<string, GroupedWebhookConfig>
    );

    const groupedConfigs = Object.values(grouped);

    spinner.succeed(chalk.green('Grouped configurations retrieved'));

    console.log(chalk.bold.blue('\n Configurations grouped by webhook URL:'));
    console.log(chalk.dim('='.repeat(60)));

    if (groupedConfigs.length === 0) {
      console.log(chalk.yellow('   No configurations found'));
      return groupedConfigs;
    }

    groupedConfigs.forEach((group, index) => {
      console.log(chalk.magenta(`\n Webhook ${index + 1}:`));
      console.log(chalk.dim(`   URL: ${formatWebhookUrl(group.webhookUrl)}`));
      console.log(
        chalk.dim(
          `   Search terms: ${group.searchTerms.length} total (${chalk.green(group.enabledCount)} enabled, ${chalk.red(group.disabledCount)} disabled)`
        )
      );
      console.log(chalk.cyan(`   Terms: ${group.searchTerms.join(', ')}`));
    });

    console.log(chalk.dim(`\n Total webhooks: ${groupedConfigs.length}`));
    console.log(chalk.dim(`Total search terms: ${configs.length}`));

    return groupedConfigs;
  } catch (error) {
    spinner.fail(chalk.red('Error listing grouped configurations'));
    console.error(chalk.red(error));
    return [];
  }
}

// Remove a search term configuration
export async function removeSearchTermConfig(searchTerm: string): Promise<void> {
  const spinner = ora(`Removing search term: ${searchTerm}...`).start();

  try {
    // First find the config to get the webhookUrl
    const config = await getConfigBySearchTerm(searchTerm);

    if (!config) {
      spinner.fail(chalk.red(`Search term '${searchTerm}' not found`));
      return;
    }

    await deleteConfig(config.webhookUrl, searchTerm);

    spinner.succeed(chalk.green(`Removed config for search term: ${chalk.bold(searchTerm)}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error removing config for ${searchTerm}`));
    console.error(chalk.red(error));
  }
}

// Remove all search terms for a specific webhook URL
export async function removeWebhookConfigs(webhookUrl: string): Promise<void> {
  const spinner = ora('Finding search terms for webhook...').start();

  try {
    const configs = await getConfigsByWebhook(webhookUrl);

    if (configs.length === 0) {
      spinner.warn(chalk.yellow('No search terms found for this webhook URL'));
      return;
    }

    spinner.text = `Removing ${configs.length} search terms for webhook...`;

    const searchTerms = await deleteConfigsByWebhook(webhookUrl);

    spinner.succeed(chalk.green(`Successfully removed ${searchTerms.length} search terms`));
  } catch (error) {
    spinner.fail(chalk.red('Error removing webhook configurations'));
    console.error(chalk.red(error));
  }
}

// Toggle enabled status for a search term
export async function toggleSearchTermConfig(searchTerm: string): Promise<void> {
  const spinner = ora(`Toggling search term: ${searchTerm}...`).start();

  try {
    const config = await getConfigBySearchTerm(searchTerm);

    if (!config) {
      spinner.fail(chalk.red(`Search term '${searchTerm}' not found`));
      return;
    }

    const newEnabled = !config.enabled;

    await upsertConfig({
      ...config,
      enabled: newEnabled,
    });

    const status = newEnabled ? chalk.green('enabled') : chalk.red('disabled');
    spinner.succeed(chalk.green(`${status} search term: ${chalk.bold(searchTerm)}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error toggling config for ${searchTerm}`));
    console.error(chalk.red(error));
  }
}

// Remove specific filters from a search term
export async function removeFiltersFromSearchTerm(
  searchTerm: string,
  removeExcludeKeywords?: string[],
  removeIncludeKeywords?: string[]
): Promise<void> {
  const spinner = ora(`Removing filters from search term: ${searchTerm}...`).start();

  try {
    const config = await getConfigBySearchTerm(searchTerm);

    if (!config) {
      spinner.fail(chalk.red(`Search term '${searchTerm}' not found`));
      return;
    }

    let newExcludeKeywords = config.excludeKeywords || [];
    let newIncludeKeywords = config.includeKeywords || [];

    // Remove specific exclusions
    if (removeExcludeKeywords && removeExcludeKeywords.length > 0) {
      newExcludeKeywords = newExcludeKeywords.filter(
        (keyword) => !removeExcludeKeywords.includes(keyword)
      );
    }

    // Remove specific inclusions
    if (removeIncludeKeywords && removeIncludeKeywords.length > 0) {
      newIncludeKeywords = newIncludeKeywords.filter(
        (keyword) => !removeIncludeKeywords.includes(keyword)
      );
    }

    await upsertConfig({
      ...config,
      excludeKeywords: newExcludeKeywords,
      includeKeywords: newIncludeKeywords,
    });

    spinner.succeed(chalk.green(`Removed filters from search term: ${chalk.bold(searchTerm)}`));

    // Show what was removed
    if (removeExcludeKeywords && removeExcludeKeywords.length > 0) {
      console.log(chalk.red(`   Removed exclusions: ${removeExcludeKeywords.join(', ')}`));
    }
    if (removeIncludeKeywords && removeIncludeKeywords.length > 0) {
      console.log(chalk.green(`   Removed inclusions: ${removeIncludeKeywords.join(', ')}`));
    }

    // Show current filters
    if (newExcludeKeywords.length > 0) {
      console.log(chalk.red(`   Still excluding: ${newExcludeKeywords.join(', ')}`));
    }
    if (newIncludeKeywords.length > 0) {
      console.log(chalk.green(`   Still including: ${newIncludeKeywords.join(', ')}`));
    }
  } catch (error) {
    spinner.fail(chalk.red(`Error removing filters from ${searchTerm}`));
    console.error(chalk.red(error));
  }
}

// Add or update filters for a search term
export async function addFiltersToSearchTerm(
  searchTerm: string,
  excludeKeywords?: string[],
  includeKeywords?: string[],
  caseSensitive?: boolean
): Promise<void> {
  const spinner = ora(`Updating filters for search term: ${searchTerm}...`).start();

  try {
    const config = await getConfigBySearchTerm(searchTerm);

    if (!config) {
      spinner.fail(chalk.red(`Search term '${searchTerm}' not found`));
      return;
    }

    // Merge filtering fields with existing ones
    const newExcludeKeywords = excludeKeywords
      ? [...new Set([...(config.excludeKeywords || []), ...excludeKeywords])]
      : config.excludeKeywords || [];

    const newIncludeKeywords = includeKeywords
      ? [...new Set([...(config.includeKeywords || []), ...includeKeywords])]
      : config.includeKeywords || [];

    const newCaseSensitive = caseSensitive !== undefined ? caseSensitive : config.caseSensitive;

    await upsertConfig({
      ...config,
      excludeKeywords: newExcludeKeywords,
      includeKeywords: newIncludeKeywords,
      caseSensitive: newCaseSensitive,
    });

    spinner.succeed(chalk.green(`Updated filters for search term: ${chalk.bold(searchTerm)}`));

    // Show all current exclusions/inclusions (both existing + new)
    if (newExcludeKeywords.length > 0) {
      console.log(chalk.red(`   Excluding: ${newExcludeKeywords.join(', ')}`));
    }
    if (newIncludeKeywords.length > 0) {
      console.log(chalk.green(`   Including: ${newIncludeKeywords.join(', ')}`));
    }
    if (caseSensitive !== undefined) {
      console.log(chalk.blue(`   Case sensitive: ${caseSensitive ? 'enabled' : 'disabled'}`));
    }
  } catch (error) {
    spinner.fail(chalk.red(`Error updating filters for ${searchTerm}`));
    console.error(chalk.red(error));
  }
}

// Create the CLI application
const program = new Command();

program
  .name('manage-config')
  .description(chalk.blue('HotUKDeals Discord Notifier - Configuration Management'))
  .version('1.0.0');

// Add command
program
  .command('add')
  .description('Add or update a single search term configuration')
  .argument('<searchTerm>', 'The search term to monitor')
  .argument('<webhookUrl>', 'Discord webhook URL')
  .option('--disabled', 'Add the search term in disabled state', false)
  .action(async (searchTerm: string, webhookUrl: string, options: { disabled?: boolean }) => {
    await addSearchTermConfig({
      searchTerm,
      webhookUrl,
      enabled: !options.disabled,
    });
  });

// Add multiple command
program
  .command('add-multiple')
  .description('Add multiple search terms to a single webhook URL')
  .argument('<webhookUrl>', 'Discord webhook URL')
  .argument('<searchTerms...>', 'Space-separated list of search terms')
  .option('--disabled', 'Add search terms in disabled state', false)
  .action(async (webhookUrl: string, searchTerms: string[], options: { disabled?: boolean }) => {
    await addMultipleSearchTerms(webhookUrl, searchTerms, !options.disabled);
  });

// List command
program
  .command('list')
  .description('List all search term configurations')
  .action(async () => {
    await listSearchTermConfigs();
  });

// List grouped command
program
  .command('list-grouped')
  .description('List configurations grouped by webhook URL')
  .action(async () => {
    await listGroupedConfigs();
  });

// Remove command
program
  .command('remove')
  .description('Remove a single search term configuration')
  .argument('<searchTerm>', 'The search term to remove')
  .action(async (searchTerm: string) => {
    await removeSearchTermConfig(searchTerm);
  });

// Remove webhook command
program
  .command('remove-webhook')
  .description('Remove all search terms for a specific webhook URL')
  .argument('<webhookUrl>', 'Discord webhook URL')
  .action(async (webhookUrl: string) => {
    await removeWebhookConfigs(webhookUrl);
  });

// Toggle command
program
  .command('toggle')
  .description('Toggle enabled/disabled status for a search term')
  .argument('<searchTerm>', 'The search term to toggle')
  .action(async (searchTerm: string) => {
    await toggleSearchTermConfig(searchTerm);
  });

// Add filter command
program
  .command('add-filter')
  .description('Add filters to a search term (merges with existing filters)')
  .argument('<searchTerm>', 'The search term to add filters to')
  .option('--exclude <keywords>', 'Comma-separated list of keywords to exclude')
  .option('--include <keywords>', 'Comma-separated list of keywords to include (ALL must be present)')
  .option('--case-sensitive', 'Enable case-sensitive filtering', false)
  .action(
    async (
      searchTerm: string,
      options: { exclude?: string; include?: string; caseSensitive?: boolean }
    ) => {
      const excludeKeywords = options.exclude
        ? options.exclude.split(',').map((k: string) => k.trim())
        : undefined;
      const includeKeywords = options.include
        ? options.include.split(',').map((k: string) => k.trim())
        : undefined;

      await addFiltersToSearchTerm(searchTerm, excludeKeywords, includeKeywords, options.caseSensitive);
    }
  );

// Remove filter command
program
  .command('remove-filter')
  .description('Remove specific filters from a search term')
  .argument('<searchTerm>', 'The search term to remove filters from')
  .option('--exclude <keywords>', 'Comma-separated list of exclude keywords to remove')
  .option('--include <keywords>', 'Comma-separated list of include keywords to remove')
  .action(async (searchTerm: string, options: { exclude?: string; include?: string }) => {
    const removeExcludeKeywords = options.exclude
      ? options.exclude.split(',').map((k: string) => k.trim())
      : undefined;
    const removeIncludeKeywords = options.include
      ? options.include.split(',').map((k: string) => k.trim())
      : undefined;

    if (!removeExcludeKeywords && !removeIncludeKeywords) {
      console.log(chalk.red('Please specify at least one filter to remove with --exclude or --include'));
      return;
    }

    await removeFiltersFromSearchTerm(searchTerm, removeExcludeKeywords, removeIncludeKeywords);
  });

// Add examples command
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log(chalk.bold.blue('\n Usage Examples:\n'));

    console.log(chalk.yellow('Basic Configuration:'));
    console.log(chalk.dim('  manage-config add steam-deck https://discord.com/api/webhooks/...'));
    console.log(
      chalk.dim('  manage-config add-multiple https://discord.com/api/webhooks/... steam-deck nintendo-switch xbox\n')
    );

    console.log(chalk.yellow('Filtering:'));
    console.log(chalk.dim('  manage-config add-filter steam --exclude "washing,iron,kettle"'));
    console.log(chalk.dim('  manage-config add-filter steam --exclude "Hisense" --include "game,gaming"'));
    console.log(chalk.dim('  manage-config add-filter laptop --exclude "refurbished,used" --case-sensitive'));
    console.log(chalk.dim('  manage-config remove-filter steam --exclude "iron"'));
    console.log(chalk.dim('  manage-config remove-filter laptop --exclude "refurbished" --include "used"\n'));

    console.log(chalk.yellow('Management:'));
    console.log(chalk.dim('  manage-config list-grouped'));
    console.log(chalk.dim('  manage-config toggle steam-deck'));
    console.log(chalk.dim('  manage-config remove-webhook https://discord.com/api/webhooks/...'));
  });

// Parse command line arguments
program.parse();
