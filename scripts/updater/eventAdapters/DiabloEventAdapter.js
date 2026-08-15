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

      if (items.length === 0) {
        console.warn(`[Diablo IV] No news items found in Blizzard feed. Keeping existing events.`);
        return existingGameEvents;
      }

      const feedContent = items.slice(0, 15)
        .map(item => {
          const props = item.properties || {};
          return `Title: ${props.title || ''}\nDate: ${props.lastUpdated || ''}\nSummary: ${this.cleanHtml(props.summary || '')}\nURL: https://news.blizzard.com/en-us/diablo4/${props.newsId || ''}`;
        })
        .join('\n\n---\n\n');

      console.log(`[Events Updater] [Diablo IV] Calling Gemini Flash...`);
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
