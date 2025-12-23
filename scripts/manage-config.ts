#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

// Set table name before importing db module
process.env.TABLE_NAME = process.env.TABLE_NAME || 'hotukdeals';

import {
  // Channel operations
  getAllChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  // Config operations
  getAllConfigs,
  getConfigsByChannel,
  getConfigBySearchTerm,
  upsertConfig,
  deleteConfig,
  deleteConfigsByChannel,
  // Types
  Channel,
  SearchTermConfig,
} from '../src/db';

// Helper function to find channel by name
async function findChannelByName(name: string): Promise<Channel | null> {
  const channels = await getAllChannels();
  return channels.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null;
}

// Helper function to format webhook URL for display
const formatWebhookUrl = (url: string): string => {
  return url.length > 50 ? url.substring(0, 50) + '...' : url;
};

// ============================================================================
// Channel Commands
// ============================================================================

async function createChannelCommand(name: string, webhookUrl: string): Promise<void> {
  const spinner = ora('Creating channel...').start();

  try {
    const channel = await createChannel({ name, webhookUrl });
    spinner.succeed(chalk.green(`Created channel: ${chalk.bold(name)}`));
    console.log(chalk.dim(`   ID: ${channel.channelId}`));
    console.log(chalk.dim(`   Webhook: ${formatWebhookUrl(webhookUrl)}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error creating channel: ${name}`));
    console.error(chalk.red(error));
  }
}

async function listChannelsCommand(): Promise<void> {
  const spinner = ora('Fetching channels...').start();

  try {
    const [channels, configs] = await Promise.all([getAllChannels(), getAllConfigs()]);

    spinner.succeed(chalk.green('Channels retrieved'));

    console.log(chalk.bold.blue('\n Channels:'));
    console.log(chalk.dim('='.repeat(60)));

    if (channels.length === 0) {
      console.log(chalk.yellow('   No channels found'));
      return;
    }

    // Count configs per channel
    const configCounts = configs.reduce(
      (acc, config) => {
        acc[config.channelId] = (acc[config.channelId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    channels.forEach((channel) => {
      const configCount = configCounts[channel.channelId] || 0;
      console.log(`${chalk.cyan('#')} ${chalk.bold(channel.name)}`);
      console.log(chalk.dim(`   ID: ${channel.channelId}`));
      console.log(chalk.dim(`   Webhook: ${formatWebhookUrl(channel.webhookUrl)}`));
      console.log(chalk.dim(`   Search terms: ${configCount}`));
      console.log('');
    });

    console.log(chalk.dim(`Total channels: ${channels.length}`));
  } catch (error) {
    spinner.fail(chalk.red('Error listing channels'));
    console.error(chalk.red(error));
  }
}

async function updateChannelCommand(
  channelName: string,
  options: { name?: string; webhook?: string }
): Promise<void> {
  const spinner = ora(`Finding channel: ${channelName}...`).start();

  try {
    const channel = await findChannelByName(channelName);

    if (!channel) {
      spinner.fail(chalk.red(`Channel '${channelName}' not found`));
      return;
    }

    const updates: { name?: string; webhookUrl?: string } = {};
    if (options.name) updates.name = options.name;
    if (options.webhook) updates.webhookUrl = options.webhook;

    if (Object.keys(updates).length === 0) {
      spinner.warn(chalk.yellow('No updates specified'));
      return;
    }

    spinner.text = 'Updating channel...';
    await updateChannel(channel.channelId, updates);

    spinner.succeed(chalk.green(`Updated channel: ${chalk.bold(channelName)}`));
    if (options.name) console.log(chalk.dim(`   New name: ${options.name}`));
    if (options.webhook) console.log(chalk.dim(`   New webhook: ${formatWebhookUrl(options.webhook)}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error updating channel: ${channelName}`));
    console.error(chalk.red(error));
  }
}

async function deleteChannelCommand(channelName: string): Promise<void> {
  const spinner = ora(`Finding channel: ${channelName}...`).start();

  try {
    const channel = await findChannelByName(channelName);

    if (!channel) {
      spinner.fail(chalk.red(`Channel '${channelName}' not found`));
      return;
    }

    spinner.text = 'Deleting channel and all its configs...';
    await deleteChannel(channel.channelId);

    spinner.succeed(chalk.green(`Deleted channel: ${chalk.bold(channelName)}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error deleting channel: ${channelName}`));
    console.error(chalk.red(error));
  }
}

// ============================================================================
// Search Term Config Commands
// ============================================================================

async function addSearchTermConfig(
  channelName: string,
  searchTerm: string,
  options: { disabled?: boolean }
): Promise<void> {
  const spinner = ora(`Finding channel: ${channelName}...`).start();

  try {
    const channel = await findChannelByName(channelName);

    if (!channel) {
      spinner.fail(chalk.red(`Channel '${channelName}' not found`));
      return;
    }

    spinner.text = 'Adding search term...';
    await upsertConfig({
      channelId: channel.channelId,
      searchTerm,
      enabled: !options.disabled,
    });

    spinner.succeed(
      chalk.green(`Added search term: ${chalk.bold(searchTerm)} to channel: ${chalk.bold(channelName)}`)
    );
  } catch (error) {
    spinner.fail(chalk.red(`Error adding search term: ${searchTerm}`));
    console.error(chalk.red(error));
  }
}

async function addMultipleSearchTerms(
  channelName: string,
  searchTerms: string[],
  options: { disabled?: boolean }
): Promise<void> {
  const spinner = ora(`Finding channel: ${channelName}...`).start();

  try {
    const channel = await findChannelByName(channelName);

    if (!channel) {
      spinner.fail(chalk.red(`Channel '${channelName}' not found`));
      return;
    }

    spinner.text = `Adding ${searchTerms.length} search terms...`;

    const results = await Promise.allSettled(
      searchTerms.map((searchTerm) =>
        upsertConfig({
          channelId: channel.channelId,
          searchTerm,
          enabled: !options.disabled,
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed === 0) {
      spinner.succeed(chalk.green(`Successfully added ${successful} search terms to ${channelName}`));
    } else {
      spinner.warn(chalk.yellow(`Added ${successful} search terms, ${failed} failed`));
    }
  } catch (error) {
    spinner.fail(chalk.red('Error adding search terms'));
    console.error(chalk.red(error));
  }
}

async function listSearchTermConfigs(): Promise<void> {
  const spinner = ora('Fetching configurations...').start();

  try {
    const [configs, channels] = await Promise.all([getAllConfigs(), getAllChannels()]);

    spinner.succeed(chalk.green('Configurations retrieved'));

    console.log(chalk.bold.blue('\n Search Term Configurations:'));
    console.log(chalk.dim('='.repeat(60)));

    if (configs.length === 0) {
      console.log(chalk.yellow('   No configurations found'));
      return;
    }

    // Create channel lookup
    const channelMap = new Map(channels.map((c) => [c.channelId, c]));

    // Group by channel
    const grouped = configs.reduce(
      (acc, config) => {
        if (!acc[config.channelId]) {
          acc[config.channelId] = [];
        }
        acc[config.channelId].push(config);
        return acc;
      },
      {} as Record<string, SearchTermConfig[]>
    );

    Object.entries(grouped).forEach(([channelId, channelConfigs]) => {
      const channel = channelMap.get(channelId);
      const channelName = channel?.name || 'Unknown Channel';

      console.log(chalk.magenta(`\n# ${channelName}`));
      console.log(chalk.dim(`  ID: ${channelId}`));

      channelConfigs.forEach((config) => {
        const status = config.enabled ? chalk.green('enabled') : chalk.red('disabled');
        console.log(`  ${chalk.cyan('Search:')} ${chalk.bold(config.searchTerm)} (${status})`);

        if (config.excludeKeywords && config.excludeKeywords.length > 0) {
          console.log(chalk.red(`     Excluding: ${config.excludeKeywords.join(', ')}`));
        }
        if (config.includeKeywords && config.includeKeywords.length > 0) {
          console.log(chalk.green(`     Including: ${config.includeKeywords.join(', ')}`));
        }
        if (config.caseSensitive) {
          console.log(chalk.blue(`     Case sensitive: enabled`));
        }
      });
    });

    console.log(chalk.dim(`\nTotal: ${configs.length} search terms across ${Object.keys(grouped).length} channels`));
  } catch (error) {
    spinner.fail(chalk.red('Error listing configurations'));
    console.error(chalk.red(error));
  }
}

async function removeSearchTermConfig(searchTerm: string): Promise<void> {
  const spinner = ora(`Finding search term: ${searchTerm}...`).start();

  try {
    const config = await getConfigBySearchTerm(searchTerm);

    if (!config) {
      spinner.fail(chalk.red(`Search term '${searchTerm}' not found`));
      return;
    }

    spinner.text = 'Removing search term...';
    await deleteConfig(config.channelId, searchTerm);

    spinner.succeed(chalk.green(`Removed search term: ${chalk.bold(searchTerm)}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error removing search term: ${searchTerm}`));
    console.error(chalk.red(error));
  }
}

async function toggleSearchTermConfig(searchTerm: string): Promise<void> {
  const spinner = ora(`Finding search term: ${searchTerm}...`).start();

  try {
    const config = await getConfigBySearchTerm(searchTerm);

    if (!config) {
      spinner.fail(chalk.red(`Search term '${searchTerm}' not found`));
      return;
    }

    const newEnabled = !config.enabled;

    spinner.text = 'Updating search term...';
    await upsertConfig({
      ...config,
      enabled: newEnabled,
    });

    const status = newEnabled ? chalk.green('enabled') : chalk.red('disabled');
    spinner.succeed(`${status} search term: ${chalk.bold(searchTerm)}`);
  } catch (error) {
    spinner.fail(chalk.red(`Error toggling search term: ${searchTerm}`));
    console.error(chalk.red(error));
  }
}

async function addFiltersToSearchTerm(
  searchTerm: string,
  options: { exclude?: string; include?: string; caseSensitive?: boolean }
): Promise<void> {
  const spinner = ora(`Finding search term: ${searchTerm}...`).start();

  try {
    const config = await getConfigBySearchTerm(searchTerm);

    if (!config) {
      spinner.fail(chalk.red(`Search term '${searchTerm}' not found`));
      return;
    }

    const excludeKeywords = options.exclude
      ? options.exclude.split(',').map((k) => k.trim())
      : undefined;
    const includeKeywords = options.include
      ? options.include.split(',').map((k) => k.trim())
      : undefined;

    // Merge with existing
    const newExcludeKeywords = excludeKeywords
      ? [...new Set([...(config.excludeKeywords || []), ...excludeKeywords])]
      : config.excludeKeywords || [];

    const newIncludeKeywords = includeKeywords
      ? [...new Set([...(config.includeKeywords || []), ...includeKeywords])]
      : config.includeKeywords || [];

    const newCaseSensitive =
      options.caseSensitive !== undefined ? options.caseSensitive : config.caseSensitive;

    spinner.text = 'Updating filters...';
    await upsertConfig({
      ...config,
      excludeKeywords: newExcludeKeywords,
      includeKeywords: newIncludeKeywords,
      caseSensitive: newCaseSensitive,
    });

    spinner.succeed(chalk.green(`Updated filters for: ${chalk.bold(searchTerm)}`));

    if (newExcludeKeywords.length > 0) {
      console.log(chalk.red(`   Excluding: ${newExcludeKeywords.join(', ')}`));
    }
    if (newIncludeKeywords.length > 0) {
      console.log(chalk.green(`   Including: ${newIncludeKeywords.join(', ')}`));
    }
    if (options.caseSensitive !== undefined) {
      console.log(chalk.blue(`   Case sensitive: ${newCaseSensitive ? 'enabled' : 'disabled'}`));
    }
  } catch (error) {
    spinner.fail(chalk.red(`Error updating filters for: ${searchTerm}`));
    console.error(chalk.red(error));
  }
}

async function removeFiltersFromSearchTerm(
  searchTerm: string,
  options: { exclude?: string; include?: string }
): Promise<void> {
  const spinner = ora(`Finding search term: ${searchTerm}...`).start();

  try {
    const config = await getConfigBySearchTerm(searchTerm);

    if (!config) {
      spinner.fail(chalk.red(`Search term '${searchTerm}' not found`));
      return;
    }

    const removeExcludeKeywords = options.exclude
      ? options.exclude.split(',').map((k) => k.trim())
      : [];
    const removeIncludeKeywords = options.include
      ? options.include.split(',').map((k) => k.trim())
      : [];

    let newExcludeKeywords = config.excludeKeywords || [];
    let newIncludeKeywords = config.includeKeywords || [];

    if (removeExcludeKeywords.length > 0) {
      newExcludeKeywords = newExcludeKeywords.filter((k) => !removeExcludeKeywords.includes(k));
    }
    if (removeIncludeKeywords.length > 0) {
      newIncludeKeywords = newIncludeKeywords.filter((k) => !removeIncludeKeywords.includes(k));
    }

    spinner.text = 'Updating filters...';
    await upsertConfig({
      ...config,
      excludeKeywords: newExcludeKeywords,
      includeKeywords: newIncludeKeywords,
    });

    spinner.succeed(chalk.green(`Removed filters from: ${chalk.bold(searchTerm)}`));

    if (removeExcludeKeywords.length > 0) {
      console.log(chalk.red(`   Removed exclusions: ${removeExcludeKeywords.join(', ')}`));
    }
    if (removeIncludeKeywords.length > 0) {
      console.log(chalk.green(`   Removed inclusions: ${removeIncludeKeywords.join(', ')}`));
    }
  } catch (error) {
    spinner.fail(chalk.red(`Error removing filters from: ${searchTerm}`));
    console.error(chalk.red(error));
  }
}

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program
  .name('manage-config')
  .description(chalk.blue('HotUKDeals Discord Notifier - Configuration Management'))
  .version('2.0.0');

// Channel commands
const channelCmd = program.command('channel').description('Manage notification channels');

channelCmd
  .command('create')
  .description('Create a new channel')
  .argument('<name>', 'Channel name (e.g., "Gaming Deals")')
  .argument('<webhookUrl>', 'Discord webhook URL')
  .action(createChannelCommand);

channelCmd
  .command('list')
  .description('List all channels')
  .action(listChannelsCommand);

channelCmd
  .command('update')
  .description('Update a channel')
  .argument('<name>', 'Current channel name')
  .option('--name <newName>', 'New channel name')
  .option('--webhook <url>', 'New webhook URL')
  .action(updateChannelCommand);

channelCmd
  .command('delete')
  .description('Delete a channel and all its search terms')
  .argument('<name>', 'Channel name')
  .action(deleteChannelCommand);

// Search term commands
program
  .command('add')
  .description('Add a search term to a channel')
  .argument('<channelName>', 'Channel name')
  .argument('<searchTerm>', 'Search term to monitor')
  .option('--disabled', 'Add in disabled state', false)
  .action(addSearchTermConfig);

program
  .command('add-multiple')
  .description('Add multiple search terms to a channel')
  .argument('<channelName>', 'Channel name')
  .argument('<searchTerms...>', 'Search terms to monitor')
  .option('--disabled', 'Add in disabled state', false)
  .action(addMultipleSearchTerms);

program
  .command('list')
  .description('List all search term configurations')
  .action(listSearchTermConfigs);

program
  .command('remove')
  .description('Remove a search term')
  .argument('<searchTerm>', 'Search term to remove')
  .action(removeSearchTermConfig);

program
  .command('toggle')
  .description('Toggle enabled/disabled status')
  .argument('<searchTerm>', 'Search term to toggle')
  .action(toggleSearchTermConfig);

program
  .command('add-filter')
  .description('Add filters to a search term')
  .argument('<searchTerm>', 'Search term')
  .option('--exclude <keywords>', 'Comma-separated keywords to exclude')
  .option('--include <keywords>', 'Comma-separated keywords to include')
  .option('--case-sensitive', 'Enable case-sensitive filtering', false)
  .action(addFiltersToSearchTerm);

program
  .command('remove-filter')
  .description('Remove filters from a search term')
  .argument('<searchTerm>', 'Search term')
  .option('--exclude <keywords>', 'Comma-separated exclusions to remove')
  .option('--include <keywords>', 'Comma-separated inclusions to remove')
  .action((searchTerm, options) => {
    if (!options.exclude && !options.include) {
      console.log(chalk.red('Please specify --exclude or --include'));
      return;
    }
    return removeFiltersFromSearchTerm(searchTerm, options);
  });

program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log(chalk.bold.blue('\n Usage Examples:\n'));

    console.log(chalk.yellow('Channel Management:'));
    console.log(chalk.dim('  manage-config channel create "Gaming Deals" https://discord.com/api/webhooks/...'));
    console.log(chalk.dim('  manage-config channel list'));
    console.log(chalk.dim('  manage-config channel update "Gaming Deals" --name "Game Deals"'));
    console.log(chalk.dim('  manage-config channel update "Gaming Deals" --webhook https://new-webhook-url...'));
    console.log(chalk.dim('  manage-config channel delete "Gaming Deals"\n'));

    console.log(chalk.yellow('Search Terms:'));
    console.log(chalk.dim('  manage-config add "Gaming Deals" steam-deck'));
    console.log(chalk.dim('  manage-config add-multiple "Gaming Deals" steam-deck nintendo-switch xbox'));
    console.log(chalk.dim('  manage-config list'));
    console.log(chalk.dim('  manage-config toggle steam-deck'));
    console.log(chalk.dim('  manage-config remove steam-deck\n'));

    console.log(chalk.yellow('Filters:'));
    console.log(chalk.dim('  manage-config add-filter steam --exclude "washing,iron,kettle"'));
    console.log(chalk.dim('  manage-config add-filter laptop --include "gaming" --case-sensitive'));
    console.log(chalk.dim('  manage-config remove-filter steam --exclude "iron"'));
  });

program.parse();
