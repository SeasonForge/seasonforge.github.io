import { BaseEventAdapter, EVENT_SCHEMA } from './BaseEventAdapter.js';

export class TorchlightEventAdapter extends BaseEventAdapter {
  constructor() {
    super('torchlight-infinite');
  }

  async fetchAndExtract(existingGameEvents = []) {
    console.log(`[Events Updater] [Torchlight: Infinite] Fetching Steam News...`);
    const appId = 1974050;
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=40&maxlength=0&format=json`;

    try {
      const rawData = await this.fetchUrl(url);
      const data = JSON.parse(rawData);
      const items = data.appnews?.newsitems || [];

      if (items.length === 0) {
        console.warn(`[Torchlight: Infinite] No Steam news items found. Keeping existing events.`);
        return existingGameEvents;
      }

      const filteredItems = this.filterNoiseItems(items);
      const feedContent = filteredItems.slice(0, 20)
        .map(item => `Title: ${item.title}\nDate: ${item.date ? new Date(item.date * 1000).toISOString() : ''}\nURL: ${item.url || ''}\nContent: ${this.cleanHtml(item.contents || '')}`)
        .join('\n\n---\n\n');

      console.log(`[Events Updater] [Torchlight: Infinite] Calling Gemini Flash (${filteredItems.length} filtered items)...`);
      const extracted = await this.callGemini(feedContent, this.getSystemInstruction(), EVENT_SCHEMA);
      const events = extracted?.events || [];
      console.log(`[Events Updater] [Torchlight: Infinite] Extracted ${events.length} event(s).`);

      return this.mergeEvents(existingGameEvents, events);
    } catch (err) {
      console.error(`[Events Updater] [Torchlight: Infinite] Error: ${err.message}. Keeping existing events.`);
      return existingGameEvents;
    }
  }
}
