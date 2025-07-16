import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Get table name from environment or use default
const configTableName = process.env.CONFIG_TABLE_NAME || 'hotukdeals-config';

interface SearchTermConfig {
  searchTerm: string;
  webhookUrl: string;
  enabled?: boolean;
}

interface GroupedWebhookConfig {
  webhookUrl: string;
  searchTerms: string[];
  enabledCount: number;
  disabledCount: number;
}

// Add or update a search term configuration
export async function addSearchTermConfig(config: SearchTermConfig): Promise<void> {
  try {
    await ddb.send(new PutCommand({
      TableName: configTableName,
      Item: {
        searchTerm: config.searchTerm,
        webhookUrl: config.webhookUrl,
        enabled: config.enabled !== false, // default to true
        updatedAt: new Date().toISOString()
      }
    }));
    console.log(`✅ Added/updated config for search term: ${config.searchTerm}`);
  } catch (error) {
    console.error(`❌ Error adding config for ${config.searchTerm}:`, error);
  }
}

// Add multiple search terms to a single webhook URL
export async function addMultipleSearchTerms(webhookUrl: string, searchTerms: string[], enabled: boolean = true): Promise<void> {
  console.log(`📝 Adding ${searchTerms.length} search terms to webhook...`);

  const results = await Promise.allSettled(
    searchTerms.map(searchTerm =>
      addSearchTermConfig({ searchTerm, webhookUrl, enabled })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`✅ Successfully added ${successful} search terms`);
  if (failed > 0) {
    console.log(`❌ Failed to add ${failed} search terms`);
  }
}

// List all search term configurations
export async function listSearchTermConfigs(): Promise<SearchTermConfig[]> {
  try {
    const result = await ddb.send(new ScanCommand({
      TableName: configTableName
    }));

    const configs = (result.Items || []).map(item => ({
      searchTerm: item.searchTerm,
      webhookUrl: item.webhookUrl,
      enabled: item.enabled
    }));

    console.log('\n📋 Current search term configurations:');
    console.log('=' .repeat(60));

    configs.forEach(config => {
      const status = config.enabled ? '✅ enabled' : '❌ disabled';
      console.log(`🔍 ${config.searchTerm} (${status})`);
      console.log(`   📡 Webhook: ${config.webhookUrl.substring(0, 50)}...`);
      console.log('');
    });

    console.log(`📊 Total configurations: ${configs.length}`);
    return configs;
  } catch (error) {
    console.error('❌ Error listing configs:', error);
    return [];
  }
}

// List configurations grouped by webhook URL
export async function listGroupedConfigs(): Promise<GroupedWebhookConfig[]> {
  try {
    const result = await ddb.send(new ScanCommand({
      TableName: configTableName
    }));

    const configs = (result.Items || []).map(item => ({
      searchTerm: item.searchTerm,
      webhookUrl: item.webhookUrl,
      enabled: item.enabled
    }));

    // Group by webhook URL
    const grouped = configs.reduce((acc, config) => {
      if (!acc[config.webhookUrl]) {
        acc[config.webhookUrl] = {
          webhookUrl: config.webhookUrl,
          searchTerms: [],
          enabledCount: 0,
          disabledCount: 0
        };
      }
      acc[config.webhookUrl].searchTerms.push(config.searchTerm);
      if (config.enabled) {
        acc[config.webhookUrl].enabledCount++;
      } else {
        acc[config.webhookUrl].disabledCount++;
      }
      return acc;
    }, {} as Record<string, GroupedWebhookConfig>);

    const groupedConfigs = Object.values(grouped);

    console.log('\n📋 Configurations grouped by webhook URL:');
    console.log('=' .repeat(60));

    groupedConfigs.forEach((group, index) => {
      console.log(`\n🌐 Webhook ${index + 1}:`);
      console.log(`   📡 URL: ${group.webhookUrl.substring(0, 50)}...`);
      console.log(`   📊 Search terms: ${group.searchTerms.length} total (${group.enabledCount} enabled, ${group.disabledCount} disabled)`);
      console.log(`   🔍 Terms: ${group.searchTerms.join(', ')}`);
    });

    console.log(`\n📊 Total webhooks: ${groupedConfigs.length}`);
    console.log(`📊 Total search terms: ${configs.length}`);

    return groupedConfigs;
  } catch (error) {
    console.error('❌ Error listing grouped configs:', error);
    return [];
  }
}

// Remove a search term configuration
export async function removeSearchTermConfig(searchTerm: string): Promise<void> {
  try {
    await ddb.send(new DeleteCommand({
      TableName: configTableName,
      Key: { searchTerm }
    }));
    console.log(`✅ Removed config for search term: ${searchTerm}`);
  } catch (error) {
    console.error(`❌ Error removing config for ${searchTerm}:`, error);
  }
}

// Remove all search terms for a specific webhook URL
export async function removeWebhookConfigs(webhookUrl: string): Promise<void> {
  try {
    // First, get all search terms for this webhook
    const result = await ddb.send(new ScanCommand({
      TableName: configTableName,
      FilterExpression: 'webhookUrl = :webhook',
      ExpressionAttributeValues: {
        ':webhook': webhookUrl
      }
    }));

    const searchTerms = (result.Items || []).map(item => item.searchTerm);

    if (searchTerms.length === 0) {
      console.log('⚠️  No search terms found for this webhook URL');
      return;
    }

    console.log(`📝 Removing ${searchTerms.length} search terms for webhook...`);

    // Remove all search terms for this webhook
    const results = await Promise.allSettled(
      searchTerms.map(searchTerm => removeSearchTermConfig(searchTerm))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Successfully removed ${successful} search terms`);
    if (failed > 0) {
      console.log(`❌ Failed to remove ${failed} search terms`);
    }
  } catch (error) {
    console.error('❌ Error removing webhook configs:', error);
  }
}

// Toggle enabled status for a search term
export async function toggleSearchTermConfig(searchTerm: string): Promise<void> {
  try {
    // First get the current config
    const result = await ddb.send(new ScanCommand({
      TableName: configTableName,
      FilterExpression: 'searchTerm = :term',
      ExpressionAttributeValues: {
        ':term': searchTerm
      }
    }));

    const config = result.Items?.[0];
    if (!config) {
      console.log(`❌ Search term '${searchTerm}' not found`);
      return;
    }

    const newEnabled = !config.enabled;

    await ddb.send(new PutCommand({
      TableName: configTableName,
      Item: {
        searchTerm: config.searchTerm,
        webhookUrl: config.webhookUrl,
        enabled: newEnabled,
        updatedAt: new Date().toISOString()
      }
    }));

    const status = newEnabled ? 'enabled' : 'disabled';
    console.log(`✅ ${status} search term: ${searchTerm}`);
  } catch (error) {
    console.error(`❌ Error toggling config for ${searchTerm}:`, error);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'add':
      if (args.length < 3) {
        console.log('Usage: pnpm run manage-config add <searchTerm> <webhookUrl> [enabled]');
        process.exit(1);
      }
      await addSearchTermConfig({
        searchTerm: args[1],
        webhookUrl: args[2],
        enabled: args[3] !== 'false'
      });
      break;

    case 'add-multiple':
      if (args.length < 3) {
        console.log('Usage: pnpm run manage-config add-multiple <webhookUrl> <searchTerm1> [searchTerm2] [searchTerm3] ...');
        process.exit(1);
      }
      await addMultipleSearchTerms(args[1], args.slice(2));
      break;

    case 'list':
      await listSearchTermConfigs();
      break;

    case 'list-grouped':
      await listGroupedConfigs();
      break;

    case 'remove':
      if (args.length < 2) {
        console.log('Usage: pnpm run manage-config remove <searchTerm>');
        process.exit(1);
      }
      await removeSearchTermConfig(args[1]);
      break;

    case 'remove-webhook':
      if (args.length < 2) {
        console.log('Usage: pnpm run manage-config remove-webhook <webhookUrl>');
        process.exit(1);
      }
      await removeWebhookConfigs(args[1]);
      break;

    case 'toggle':
      if (args.length < 2) {
        console.log('Usage: pnpm run manage-config toggle <searchTerm>');
        process.exit(1);
      }
      await toggleSearchTermConfig(args[1]);
      break;

    default:
      console.log('🛠️  HotUKDeals Discord Notifier - Configuration Management');
      console.log('=' .repeat(60));
      console.log('');
      console.log('Available commands:');
      console.log('');
      console.log('📝 Configuration Management:');
      console.log('  add <searchTerm> <webhookUrl> [enabled]        - Add/update a single search term');
      console.log('  add-multiple <webhookUrl> <term1> [term2] ...  - Add multiple search terms to one webhook');
      console.log('  toggle <searchTerm>                            - Toggle enabled/disabled status');
      console.log('');
      console.log('📋 Listing:');
      console.log('  list                                           - List all configurations');
      console.log('  list-grouped                                   - List configurations grouped by webhook');
      console.log('');
      console.log('🗑️  Removal:');
      console.log('  remove <searchTerm>                            - Remove a single search term');
      console.log('  remove-webhook <webhookUrl>                    - Remove all search terms for a webhook');
      console.log('');
      console.log('💡 Examples:');
      console.log('  pnpm run manage-config add steam-deck https://discord.com/api/webhooks/...');
      console.log('  pnpm run manage-config add-multiple https://discord.com/api/webhooks/... steam-deck nintendo-switch xbox');
      console.log('  pnpm run manage-config list-grouped');
      console.log('  pnpm run manage-config toggle steam-deck');
      console.log('  pnpm run manage-config remove-webhook https://discord.com/api/webhooks/...');
  }
}

if (require.main === module) {
  main().catch(console.error);
}