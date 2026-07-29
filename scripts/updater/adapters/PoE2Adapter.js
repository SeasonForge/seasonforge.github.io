import { BaseAdapter } from './BaseAdapter.js';

export class PoE2Adapter extends BaseAdapter {
  constructor() {
    super('path-of-exile-2');
  }

  async fetchAndNormalize(gameConfig, existingGame) {
    const cache = await this.getCache();
    const appId = gameConfig.appId || 2694490;
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=3&maxlength=4000&format=json`;

    try {
      const rawData = await this.fetchUrl(url);
      const data = JSON.parse(rawData);
      const newsitems = data.appnews?.newsitems || [];

      if (newsitems.length === 0) {
        throw new Error('No news items found in Steam API');
      }

      const latestNewsId = newsitems[0].gid;

      if (existingGame && existingGame.latestNews && existingGame.latestNews.id === latestNewsId) {
        console.log(`[Orchestrator] [Path of Exile 2] Latest news unchanged (gid=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [Path of Exile 2] New article detected (gid=${latestNewsId}). Calling Gemini...`);

      const newsText = newsitems
        .map(item => `Title: ${item.title}\nDate: ${new Date(item.date * 1000).toISOString()}\nContent: ${this.cleanHtml(item.contents)}`)
        .join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season/league details from the provided Steam news items for Path of Exile 2. Path of Exile 2 calls seasons "leagues".
Currently, the year is ${new Date().getFullYear()}. Determine:
1. Current Season/League name in English (e.g. "0.5.0: Return of the Ancients") in currentSeasonNameEn, and translated to Russian in currentSeasonNameRu.
2. Current Season/League start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
3. Next Season/League name in English in nextSeasonNameEn, and translated to Russian in nextSeasonNameRu.
4. Next Season/League start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
5. Game status: "active" (if a league is running), "in-development" (if in early access/beta/dev), "maintenance" (if offline), "early-access" (if in early access).
6. A list of 3-5 key features introduced or planned. Store the original English list in featuresEn, and translate it to Russian in featuresRu.
7. Whether the next season/league start date is officially confirmed by developers (use "official") or estimated/predicted based on patterns/intervals (use "estimated").

Ensure all dates are formatted strictly as YYYY-MM-DD or empty string. Do not invent dates. Use the news article timestamps to calibrate what "current" or "next" league means relative to today.`;

      const schema = {
        type: 'OBJECT',
        properties: {
          currentSeasonNameEn: { type: 'STRING' },
          currentSeasonNameRu: { type: 'STRING' },
          currentSeasonStartDate: { type: 'STRING' },
          currentSeasonEndDate: { type: 'STRING' },
          nextSeasonNameEn: { type: 'STRING' },
          nextSeasonNameRu: { type: 'STRING' },
          nextSeasonStartDate: { type: 'STRING' },
          nextSeasonEndDate: { type: 'STRING' },
          nextSeasonVerification: { type: 'STRING', description: 'Must be "official" if date is officially announced, or "estimated" if it is a prediction/forecast.' },
          status: { type: 'STRING' },
          featuresEn: {
            type: 'ARRAY',
            items: { type: 'STRING' }
          },
          featuresRu: {
            type: 'ARRAY',
            items: { type: 'STRING' }
          }
        },
        required: [
          'currentSeasonNameEn', 'currentSeasonNameRu', 'currentSeasonStartDate', 'currentSeasonEndDate', 
          'nextSeasonNameEn', 'nextSeasonNameRu', 'nextSeasonStartDate', 'nextSeasonEndDate', 
          'nextSeasonVerification', 'status', 'featuresEn', 'featuresRu'
        ]
      };

      const extracted = await this.callGemini(newsText, systemInstruction, schema);

      const normalized = {
        id: this.gameId,
        name: {
          en: 'Path of Exile 2',
          ru: 'Path of Exile 2'
        },
        developer: 'Grinding Gear Games',
        logo: 'path-of-exile-2.png',
        color: '#4b6e9c',
        icon: '✨',
        website: 'https://pathofexile2.com',
        latestNews: {
          id: latestNewsId,
          title: newsitems[0].title || 'Path of Exile 2 Steam Update',
          url: newsitems[0].url || 'https://pathofexile2.com',
          publishDate: new Date(newsitems[0].date * 1000).toISOString(),
          source: 'Path of Exile 2 Steam News'
        },
        status: {
          ...this.normalizeStatus(extracted.status),
          updatedAt: new Date().toISOString()
        },
        currentSeason: {
          name: {
            en: extracted.currentSeasonNameEn || 'TBA',
            ru: extracted.currentSeasonNameRu || extracted.currentSeasonNameEn || 'TBA'
          },
          startDate: extracted.currentSeasonStartDate || '',
          endDate: extracted.currentSeasonEndDate || '',
          isActive: ['active', 'in-progress', 'just-started', 'ending'].includes(extracted.status),
          verification: 'official',
          sourceUrl: newsitems[0].url || 'https://pathofexile2.com'
        },
        nextSeason: {
          name: {
            en: extracted.nextSeasonNameEn || 'TBA',
            ru: extracted.nextSeasonNameRu || extracted.nextSeasonNameEn || 'TBA'
          },
          startDate: extracted.nextSeasonStartDate || '',
          endDate: extracted.nextSeasonEndDate || '',
          isActive: false,
          verification: extracted.nextSeasonVerification === 'official' ? 'official' : 'estimated',
          sourceUrl: newsitems[0].url || 'https://pathofexile2.com'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
        links: {
          official: 'https://pathofexile2.com',
          wiki: '',
          community: ''
        },
        metadata: {
          region: 'Global',
          platforms: ['PC', 'PlayStation 5', 'Xbox Series X/S'],
          tags: ['ARPG', 'Dark Fantasy']
        }
      };

      return normalized;
    } catch (e) {
      console.warn(`[Path of Exile 2] Update failed: ${e.message}. Using cache fallback.`);
      if (cache) {
        return cache;
      }
      throw e;
    }
  }
}
