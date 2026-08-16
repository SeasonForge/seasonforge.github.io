import { BaseEventAdapter, EVENT_SCHEMA } from './BaseEventAdapter.js';

export class LastEpochEventAdapter extends BaseEventAdapter {
  constructor() {
    super('last-epoch');
  }

  async fetchAndExtract(existingGameEvents = []) {
    console.log(`[Events Updater] [Last Epoch] Fetching Steam News...`);
    const appId = 899770;
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=20&maxlength=4000&format=json`;

    try {
      const rawData = await this.fetchUrl(url);
      const data = JSON.parse(rawData);
      const items = data.appnews?.newsitems || [];

      if (items.length === 0) {
        console.warn(`[Last Epoch] No Steam news items found. Keeping existing events.`);
        return existingGameEvents;
      }

      const feedContent = items.slice(0, 15)
        .map(item => `Title: ${item.title}\nDate: ${item.date ? new Date(item.date * 1000).toISOString() : ''}\nURL: ${item.url || ''}\nContent: ${this.cleanHtml(item.contents || '')}`)
        .join('\n\n---\n\n');

      console.log(`[Events Updater] [Last Epoch] Calling Gemini Flash...`);
      const extracted = await this.callGemini(feedContent, this.getSystemInstruction(), EVENT_SCHEMA);
      const events = extracted?.events || [];
      console.log(`[Events Updater] [Last Epoch] Extracted ${events.length} event(s).`);

      return this.mergeEvents(existingGameEvents, events);
    } catch (err) {
      console.error(`[Events Updater] [Last Epoch] Error: ${err.message}. Keeping existing events.`);
      return existingGameEvents;
    }
  }
}
