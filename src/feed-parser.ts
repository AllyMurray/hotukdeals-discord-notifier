import { request } from 'undici';
import * as cheerio from 'cheerio';

export interface Deal {
  id: string; // unique per deal
  title: string;
  link: string;
  price?: string;
  merchant?: string;
  timestamp?: number;
}

export async function fetchDeals(searchTerm: string): Promise<Deal[]> {
  const url = `https://www.hotukdeals.com/search?q=${encodeURIComponent(searchTerm)}`;
  const res = await request(url, {
    method: 'GET',
    headers: {
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    }
  });

  if (res.statusCode !== 200) {
    throw new Error(`Failed to fetch search page for '${searchTerm}', status: ${res.statusCode}`);
  }

  const body = await res.body.text();
  const $ = cheerio.load(body);
  const deals: Deal[] = [];

  // Find all deal articles
  $('article.thread').each((_, el) => {
    const linkEl = $(el).find('a.thread-link');
    const link = linkEl.attr('href');
    const title = linkEl.text().trim();

    if (!link || !title) {
      return;
    }

    // Extract ID from the thread ID attribute
    const threadId = $(el).attr('id')?.replace('thread_', '');
    const id = threadId || link;

    let price: string | undefined;
    let merchant: string | undefined;

    // Try to extract price and merchant from Vue.js data
    try {
      const vueDataEl = $(el).find('[data-vue2]').first();
      const vueDataStr = vueDataEl.attr('data-vue2');

      if (vueDataStr) {
        const vueData = JSON.parse(vueDataStr);
        const thread = vueData.props?.thread;

        if (thread) {
          if (thread.price) {
            price = `£${thread.price}`;
          }
          if (thread.merchant?.merchantName) {
            merchant = thread.merchant.merchantName;
          }
        }
      }
    } catch (error) {
      // Silently continue if Vue data parsing fails
    }

    // Fallback: Try to extract price from text content if not found in Vue data
    if (!price) {
      // Look for price in the deal title or nearby text
      const priceText = $(el).find('.thread-price, .price, [class*="price"]').text().trim();
      if (priceText) {
        price = priceText;
      } else {
        // Try to find price pattern in the title (£X.XX, £X, $X.XX, etc.)
        const titleText = title;
        const priceMatch = titleText.match(/[£$€][\d,]+(?:\.\d{2})?|\b\d+(?:\.\d{2})?\s*(?:£|GBP|pounds?)\b/i);
        if (priceMatch) {
          price = priceMatch[0];
        } else {
          // Look for price patterns like "£X off", "X% off", "save £X", "from £X"
          const priceOfferMatch = titleText.match(/(?:from|save|off|was)\s*[£$€][\d,]+(?:\.\d{2})?|[£$€][\d,]+(?:\.\d{2})?\s*(?:off|discount)/i);
          if (priceOfferMatch) {
            price = priceOfferMatch[0];
          }
        }
      }
    }

    // Fallback: Try to extract merchant from text if not found in Vue data
    if (!merchant) {
      const merchantText = $(el).find('.thread-merchant, .merchant, [class*="merchant"]').text().trim();
      if (merchantText) {
        merchant = merchantText;
      }
    }

    deals.push({
      id,
      title,
      link: link.startsWith('http') ? link : `https://www.hotukdeals.com${link}`,
      price,
      merchant,
      timestamp: Date.now()
    });
  });

  return deals;
}
