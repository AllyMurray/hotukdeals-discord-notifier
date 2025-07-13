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
