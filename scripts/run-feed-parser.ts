#!/usr/bin/env node

import { fetchDeals } from '../src/feed-parser';

async function main() {
  // Get search term from command line arguments or use default
  const searchTerm = process.argv[2] || 'laptop';

  console.log(`🔍 Searching for deals with term: "${searchTerm}"`);
  console.log('─'.repeat(50));

  try {
    const deals = await fetchDeals(searchTerm);

    if (deals.length === 0) {
      console.log('❌ No deals found for this search term');
      return;
    }

    console.log(`✅ Found ${deals.length} deals:`);
    console.log('');

    deals.forEach((deal, index) => {
      console.log(`${index + 1}. ${deal.title}`);
      console.log(`   🔗 ${deal.link}`);
      console.log(`   💰 Price: ${deal.price || 'N/A'}`);
      console.log(`   🏪 Merchant: ${deal.merchant || 'N/A'}`);
      console.log(`   🆔 ID: ${deal.id}`);
      console.log('');
    });

    console.log(`📊 Total deals found: ${deals.length}`);

  } catch (error) {
    console.error('❌ Error fetching deals:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);