import { BaseEventAdapter, EVENT_SCHEMA } from './BaseEventAdapter.js';

export class PoE2EventAdapter extends BaseEventAdapter {
  constructor() {
    super('path-of-exile-2');
  }

  async fetchAndExtract(existingGameEvents = []) {
    console.log(`[Events Updater] [PoE 2] Fetching Steam News...`);
    const appId = 2694490;
    const urlPoE2 = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=35&maxlength=0&format=json`;
    const urlPoE1 = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=238960&count=20&maxlength=0&format=json`;

    try {
      const [rawPoE2, rawPoE1] = await Promise.allSettled([
        this.fetchUrl(urlPoE2),
        this.fetchUrl(urlPoE1)
      ]);

      const itemsPoE2 = rawPoE2.status === 'fulfilled' ? (JSON.parse(rawPoE2.value).appnews?.newsitems || []) : [];
      const itemsPoE1 = rawPoE1.status === 'fulfilled' ? (JSON.parse(rawPoE1.value).appnews?.newsitems || []) : [];

      // Include PoE 1 news that explicitly mention PoE 2 / Return of the Ancients / Fan Art
      const crossPoE1 = itemsPoE1.filter(item => {
        const text = `${item.title || ''} ${item.contents || ''}`;
        return /\b(poe\s?2|path of exile 2|return of the ancients|fan art)\b/i.test(text);
      });

      const combinedItems = [...itemsPoE2, ...crossPoE1];

      if (combinedItems.length === 0) {
        console.warn(`[PoE 2] No Steam news items found. Keeping existing events.`);
        return existingGameEvents;
      }

      const filteredItems = this.filterNoiseItems(combinedItems);
      const feedContent = filteredItems.slice(0, 20)
        .map(item => `Title: ${item.title}\nDate: ${item.date ? new Date(item.date * 1000).toISOString() : ''}\nURL: ${item.url || ''}\nContent: ${this.cleanHtml(item.contents || '')}`)
        .join('\n\n---\n\n');

      console.log(`[Events Updater] [PoE 2] Calling Gemini Flash (${filteredItems.length} filtered items)...`);
      const extracted = await this.callGemini(feedContent, this.getSystemInstruction(), EVENT_SCHEMA);
      const events = extracted?.events || [];
      console.log(`[Events Updater] [PoE 2] Extracted ${events.length} event(s).`);

      return this.mergeEvents(existingGameEvents, events);
    } catch (err) {
      console.error(`[Events Updater] [PoE 2] Error: ${err.message}. Keeping existing events.`);
      return existingGameEvents;
    }
  }
}
