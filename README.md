# HotUKDeals Discord Notifier

A Discord bot that monitors HotUKDeals and sends deal notifications to Discord channels.

## Features

- 🔍 Search for deals by keyword on HotUKDeals
- 💰 Extract deal prices and merchant information
- 🔗 Get direct links to deals
- 📊 Parse deal data from the website

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

## Usage

### Feed Parser

The feed parser can search for deals on HotUKDeals by keyword:

```bash
# Search for laptop deals
pnpm run feed-parser laptop

# Search for other terms
pnpm run feed-parser "gaming chair"
pnpm run feed-parser phone
```

### Example Output

```
🔍 Searching for deals with term: "laptop"
──────────────────────────────────────────────────
✅ Found 30 deals:

1. Refurbished Lenovo Thinkpad X280 Core i7-8550U 16GB Ram 256GB Touchscreen Laptop
   🔗 https://www.hotukdeals.com/deals/lenovo-thinkpad-x280-core-i7-8550u-16gb-ram-256gb-touchscreen-windows-11-laptop-12-months-guarantee-4640028
   💰 Price: £149.99
   🏪 Merchant: eBay
   🆔 ID: 4640028

2. Asus ROG Strix G16 Gaming Laptop - GeForce RTX 5070 Ti - AMD Ryzen 9
   🔗 https://www.hotukdeals.com/deals/asus-rog-strix-g16-gaming-laptop-geforce-rtx-5070-ti-amd-ryzen-9-4639922
   💰 Price: £1709.1
   🏪 Merchant: Very
   🆔 ID: 4639922

📊 Total deals found: 30
```

## API

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

## Development

- Built with TypeScript
- Uses Cheerio for HTML parsing
- Uses Undici for HTTP requests
- Targets AWS Lambda deployment with SST

## License

ISC