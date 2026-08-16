import { BaseEventAdapter, EVENT_SCHEMA } from './BaseEventAdapter.js';

export class DiabloEventAdapter extends BaseEventAdapter {
  constructor() {
    super('diablo-4');
  }

  async fetchAndExtract(existingGameEvents = []) {
    console.log(`[Events Updater] [Diablo IV] Fetching Blizzard News API...`);
    const url = 'https://news.blizzard.com/api/news/diablo-4';

    try {
      const rawJson = await this.fetchUrl(url);
      const data = JSON.parse(rawJson);
      const items = data.feed?.contentItems || [];

      const now = Date.now();
      const fortyFiveDaysMs = 45 * 86400000;

      // 1. Filter by 45-day freshness
      const freshItems = items.filter(item => {
        const ts = new Date(item.properties?.lastUpdated || 0).getTime();
        return (now - ts) <= fortyFiveDaysMs;
      });

      // 2. Pre-filter noise (shop, bugfixes)
      const targetItems = this.filterNoiseItems(freshItems);

      if (targetItems.length === 0) {
        console.log(`[Diablo IV] No active event/PTR news items in recent 45 days.`);
        return existingGameEvents;
      }

      // 3. Fetch full article body for relevant event news to get exact dates
      const processedItems = await Promise.all(targetItems.slice(0, 8).map(async (item) => {
        const props = item.properties || {};
        const newsId = props.newsId || '';
        const articleUrl = `https://news.blizzard.com/en-us/diablo4/${newsId}`;
        let articleBody = props.summary || '';

        // If title suggests a PTR or time-limited event, fetch full article HTML
        if (/\b(ptr|drops|event|goblin|blessing|anniversary|collab)\b/i.test(props.title || '')) {
          try {
            const rawHtml = await this.fetchUrl(articleUrl, { timeout: 8000 });
            const cleaned = this.cleanHtml(rawHtml);
            if (cleaned.length > 100) {
              articleBody = cleaned.slice(0, 3500); // Top 3500 chars contain dates, schedule & rewards
            }
          } catch (e) {
            // fallback to summary
          }
        }

        return `Title: ${props.title || ''}\nPublished: ${props.lastUpdated || ''}\nURL: ${articleUrl}\nContent: ${articleBody}`;
      }));

      const feedContent = processedItems.join('\n\n---\n\n');

      console.log(`[Events Updater] [Diablo IV] Calling Gemini Flash (${processedItems.length} articles with full text)...`);
      const extracted = await this.callGemini(feedContent, this.getSystemInstruction(), EVENT_SCHEMA);
      const events = extracted?.events || [];
      console.log(`[Events Updater] [Diablo IV] Extracted ${events.length} event(s).`);

      return this.mergeEvents(existingGameEvents, events);
    } catch (err) {
      console.error(`[Events Updater] [Diablo IV] Error: ${err.message}. Keeping existing events.`);
      return existingGameEvents;
    }
  }
}
