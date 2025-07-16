# HotUKDeals Discord Notifier

A Discord bot that monitors HotUKDeals and sends deal notifications to Discord channels with support for multiple search terms, filtering, and webhook management.

## Features

- 🔍 **Multiple Search Terms**: Monitor multiple keywords per Discord webhook
- 📢 **Discord Notifications**: Send real-time deal notifications to Discord channels
- 🎯 **Smart Filtering**: Include/exclude deals based on keywords to avoid unwanted results
- 💰 **Deal Information**: Extract prices, merchant details, and direct links
- 🔧 **Easy Configuration**: Professional CLI tool for managing search terms and webhooks
- 📊 **Grouped Messages**: Combine multiple search results into organized Discord messages
- ⚡ **AWS Lambda**: Serverless deployment with automatic scheduling

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Deploy to AWS (optional for local testing):**
   ```bash
   npx sst deploy
   ```

## Configuration Management

The CLI tool provides a comprehensive interface for managing search terms, webhooks, and filters.

### Basic Commands

#### Add a Search Term
```bash
# Add a single search term to a webhook
pnpm run manage-config add <searchTerm> <webhookUrl>

# Add a search term in disabled state
pnpm run manage-config add <searchTerm> <webhookUrl> --disabled
```

#### Add Multiple Search Terms
```bash
# Add multiple search terms to the same webhook
pnpm run manage-config add-multiple <webhookUrl> <term1> <term2> <term3>

# Add them in disabled state
pnpm run manage-config add-multiple <webhookUrl> <term1> <term2> --disabled
```

#### List Configurations
```bash
# List all search term configurations
pnpm run manage-config list

# List configurations grouped by webhook URL
pnpm run manage-config list-grouped
```

#### Remove Configurations
```bash
# Remove a single search term
pnpm run manage-config remove <searchTerm>

# Remove all search terms for a webhook
pnpm run manage-config remove-webhook <webhookUrl>
```

#### Toggle Search Terms
```bash
# Enable/disable a search term
pnpm run manage-config toggle <searchTerm>
```

### Filtering System

The filtering system helps you get more relevant results by excluding unwanted deals or requiring specific keywords.

#### Add Filters
```bash
# Exclude deals containing specific keywords
pnpm run manage-config add-filter <searchTerm> --exclude "keyword1,keyword2,keyword3"

# Only include deals containing ALL specified keywords
pnpm run manage-config add-filter <searchTerm> --include "keyword1,keyword2"

# Combine include and exclude filters
pnpm run manage-config add-filter <searchTerm> --exclude "unwanted" --include "required"

# Enable case-sensitive filtering
pnpm run manage-config add-filter <searchTerm> --exclude "keywords" --case-sensitive
```

#### Filter Examples
```bash
# Fix "steam" to only show gaming deals, not appliances
pnpm run manage-config add-filter steam --exclude "washing,iron,kettle,boiler,machine"

# Only show new laptops, not refurbished ones
pnpm run manage-config add-filter laptop --exclude "refurbished,used,second hand"

# Gaming consoles only
pnpm run manage-config add-filter gaming --include "console,ps5,xbox,nintendo"
```

## Common Usage Examples

### 1. Gaming Setup
```bash
# Add gaming-related search terms to your Discord webhook
WEBHOOK="https://discord.com/api/webhooks/your-webhook-url"

pnpm run manage-config add-multiple $WEBHOOK steam-deck ps5 xbox nintendo-switch

# Filter out non-gaming steam results
pnpm run manage-config add-filter steam --exclude "washing,iron,kettle,boiler"
```

### 2. Tech Deals Setup
```bash
# Monitor various tech categories
pnpm run manage-config add-multiple $WEBHOOK laptop phone tablet headphones

# Filter laptop deals to exclude refurbished items
pnpm run manage-config add-filter laptop --exclude "refurbished,used,second hand"
```

### 3. Multiple Discord Channels
```bash
# Gaming channel
pnpm run manage-config add-multiple $GAMING_WEBHOOK steam-deck ps5 xbox nintendo

# Tech channel
pnpm run manage-config add-multiple $TECH_WEBHOOK laptop phone tablet

# Home appliances channel
pnpm run manage-config add-multiple $HOME_WEBHOOK washing-machine dishwasher
```

### 4. View Your Setup
```bash
# See all configurations grouped by webhook
pnpm run manage-config list-grouped

# See individual configurations with filters
pnpm run manage-config list
```

## CLI Help

```bash
# Show all available commands
pnpm run manage-config --help

# Show usage examples
pnpm run manage-config examples

# Get help for a specific command
pnpm run manage-config add --help
```

## Discord Message Format

The bot sends organized messages to Discord with deal information:

### Single Search Term
```
🆕 New steam-deck deal: **Steam Deck OLED 512GB** - £459.99 at Amazon
https://www.hotukdeals.com/deals/steam-deck-oled-512gb-4641234
```

### Multiple Search Terms
```
🆕 **3 new deals** found for: **steam-deck, ps5**

**steam-deck:**
• **Steam Deck OLED 512GB** - £459.99 at Amazon
  https://www.hotukdeals.com/deals/steam-deck-oled-512gb-4641234

**ps5:**
• **PlayStation 5 Console** - £399.99 at Very
  https://www.hotukdeals.com/deals/ps5-console-4641235
• **PS5 DualSense Controller** - £54.99 at Currys
  https://www.hotukdeals.com/deals/ps5-dualsense-controller-4641236
```

## Feed Parser (Development)

For testing and development, you can use the feed parser directly:

```bash
# Search for deals by keyword
pnpm run feed-parser laptop
pnpm run feed-parser "gaming chair"
pnpm run feed-parser phone
```

### Example Output
```
🔍 Searching for deals with term: "laptop"
──────────────────────────────────────────────────
✅ Found 30 deals:

1. Refurbished Lenovo Thinkpad X280 Core i7-8550U 16GB Ram 256GB
   🔗 https://www.hotukdeals.com/deals/lenovo-thinkpad-x280-4640028
   💰 Price: £149.99
   🏪 Merchant: eBay
   🆔 ID: 4640028

📊 Total deals found: 30
```

## API Reference

### `fetchDeals(searchTerm: string): Promise<Deal[]>`

Fetches deals from HotUKDeals for the given search term.

#### Parameters
- `searchTerm` - The keyword to search for (e.g., "laptop", "phone", "gaming")

#### Returns
An array of `Deal` objects:

```typescript
interface Deal {
  id: string;        // Unique deal ID
  title: string;     // Deal title
  link: string;      // Direct link to deal
  price?: string;    // Deal price (if available)
  merchant?: string; // Merchant name (if available)
  timestamp?: number; // When the deal was fetched
}
```

#### Example
```typescript
import { fetchDeals } from './src/feed-parser';

const deals = await fetchDeals('laptop');
console.log(`Found ${deals.length} deals`);
```

## Configuration Structure

Search term configurations are stored in DynamoDB with the following structure:

```typescript
interface SearchTermConfig {
  searchTerm: string;        // Primary key
  webhookUrl: string;        // Discord webhook URL
  enabled?: boolean;         // Enable/disable notifications
  excludeKeywords?: string[]; // Keywords to exclude from results
  includeKeywords?: string[]; // Keywords that must be present
  caseSensitive?: boolean;   // Case-sensitive filtering
}
```

## Architecture

- **AWS Lambda**: Serverless function that runs on a schedule
- **DynamoDB**: Stores processed deals and configuration
- **Discord Webhooks**: Sends notifications to Discord channels
- **HotUKDeals Scraping**: Parses deal data from the website
- **SST Framework**: Infrastructure as Code deployment

## Development

- Built with **TypeScript**
- Uses **Cheerio** for HTML parsing
- Uses **Undici** for HTTP requests
- Uses **Commander.js** for CLI interface
- Uses **Chalk** for colored terminal output
- Uses **Ora** for loading spinners
- Targets **AWS Lambda** deployment with **SST**

## License

ISC