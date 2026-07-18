import { BaseAdapter } from './BaseAdapter.js';

export class TorchlightAdapter extends BaseAdapter {
  constructor() {
    super('torchlight-infinite');
  }

  async fetchAndNormalize(gameConfig) {
    const cache = await this.getCache();
    const appId = gameConfig.appId || 1974050;
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=3&maxlength=4000&format=json`;

    try {
      const rawData = await this.fetchUrl(url);
      const data = JSON.parse(rawData);
      const newsitems = data.appnews?.newsitems || [];

      if (newsitems.length === 0) {
        throw new Error('No news items found in Steam API');
      }

      const latestNewsId = newsitems[0].gid;

      if (cache && cache.latestNewsId === latestNewsId) {
        console.log(`[Torchlight Infinite] No new news detected (ID: ${latestNewsId}). Using cached data.`);
        return cache;
      }

      console.log(`[Torchlight Infinite] New news detected! Analyzing with Gemini...`);

      const newsText = newsitems
        .map(item => `Title: ${item.title}\nDate: ${new Date(item.date * 1000).toISOString()}\nContent: ${this.cleanHtml(item.contents)}`)
        .join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season details from the provided Steam news items for Torchlight Infinite.
Currently, the year is ${new Date().getFullYear()}. Determine:
1. Current Season name (e.g. "Twinightmare"). If none, use empty string.
2. Current Season start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
3. Next Season name, start date (YYYY-MM-DD), and end date (YYYY-MM-DD). Use empty string if unknown.
4. Game status: "active" (if a season is running), "in-development" (if in beta/dev), "maintenance" (if offline).
5. A list of 3-5 key features introduced or planned.

Ensure all dates are formatted strictly as YYYY-MM-DD or empty string. Do not invent dates. Use the news article timestamps to calibrate what "current" or "next" season means relative to today.`;

      const schema = {
        type: 'OBJECT',
        properties: {
          currentSeasonName: { type: 'STRING' },
          currentSeasonStartDate: { type: 'STRING' },
          currentSeasonEndDate: { type: 'STRING' },
          nextSeasonName: { type: 'STRING' },
          nextSeasonStartDate: { type: 'STRING' },
          nextSeasonEndDate: { type: 'STRING' },
          status: { type: 'STRING' },
          features: {
            type: 'ARRAY',
            items: { type: 'STRING' }
          }
        },
        required: ['currentSeasonName', 'currentSeasonStartDate', 'currentSeasonEndDate', 'nextSeasonName', 'nextSeasonStartDate', 'nextSeasonEndDate', 'status', 'features']
      };

      const extracted = await this.callGemini(newsText, systemInstruction, schema);

      const normalized = {
        id: this.gameId,
        name: 'Torchlight: Infinite',
        developer: 'Perfect World Entertainment',
        logo: '',
        color: '#c27a2b',
        icon: '⚡',
        website: 'https://torchlightinfinite.com/',
        latestNewsId: latestNewsId,
        status: {
          code: extracted.status || 'active',
          label: extracted.status === 'active' ? 'Active' : (extracted.status === 'in-development' ? 'In Development' : 'Maintenance'),
          updatedAt: new Date().toISOString()
        },
        currentSeason: {
          name: extracted.currentSeasonName || 'TBA',
          startDate: extracted.currentSeasonStartDate || '',
          endDate: extracted.currentSeasonEndDate || '',
          isActive: extracted.status === 'active',
          verification: extracted.currentSeasonStartDate ? 'ai' : 'official',
          sourceUrl: newsitems[0].url || 'https://torchlightinfinite.com/'
        },
        nextSeason: {
          name: extracted.nextSeasonName || 'TBA',
          startDate: extracted.nextSeasonStartDate || '',
          endDate: extracted.nextSeasonEndDate || '',
          isActive: false,
          verification: extracted.nextSeasonStartDate ? 'ai' : 'official',
          sourceUrl: newsitems[0].url || 'https://torchlightinfinite.com/'
        },
        features: extracted.features || [],
        links: {
          official: 'https://torchlightinfinite.com/',
          wiki: '',
          community: ''
        },
        metadata: {
          region: 'Global',
          platforms: ['PC'],
          tags: ['ARPG', 'Free-to-play']
        }
      };

      await this.writeCache(normalized);
      return normalized;
    } catch (e) {
      console.warn(`[Torchlight Infinite] Update failed: ${e.message}. Using cache fallback.`);
      if (cache) {
        return cache;
      }
      throw e;
    }
  }
}
