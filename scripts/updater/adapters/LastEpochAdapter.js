import { BaseAdapter } from './BaseAdapter.js';

export class LastEpochAdapter extends BaseAdapter {
  constructor() {
    super('last-epoch');
  }

  async fetchAndNormalize(gameConfig, existingGame) {
    const cache = await this.getCache();
    const appId = gameConfig.appId || 899770;
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=3&maxlength=4000&format=json`;

    try {
      const rawData = await this.fetchUrl(url);
      const data = JSON.parse(rawData);
      const newsitems = data.appnews?.newsitems || [];

      if (newsitems.length === 0) {
        throw new Error('No news items found in Steam API');
      }

      // Track the latest news item ID for caching to avoid calling Gemini when there is no new news
      const latestNewsId = newsitems[0].gid;

      if (existingGame && existingGame.latestNews && existingGame.latestNews.id === latestNewsId) {
        console.log(`[Orchestrator] [Last Epoch] Latest news unchanged (gid=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [Last Epoch] New article detected (gid=${latestNewsId}). Calling Gemini...`);

      // Combine headlines and body text to extract info
      const newsText = newsitems
        .map(item => `Title: ${item.title}\nDate: ${new Date(item.date * 1000).toISOString()}\nContent: ${this.cleanHtml(item.contents)}`)
        .join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season/cycle details from the provided Steam news items. Last Epoch seasons are called "Cycles".
Currently, the year is ${new Date().getFullYear()}. Determine:
1. Current Season/Cycle name in English (e.g. "Harbingers of Ruin") in currentSeasonNameEn, and translated to Russian in currentSeasonNameRu.
2. Current Season/Cycle start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
3. Next Season/Cycle name in English in nextSeasonNameEn, and translated to Russian in nextSeasonNameRu.
4. Next Season/Cycle start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
5. Game status: "active" (if a season is running), "in-development" (if in beta/dev), "maintenance" (if offline).
6. A list of 3-5 key features introduced or planned. Store the original English list in featuresEn, and translate it to Russian in featuresRu.
7. Whether the next season start date is officially confirmed by developers (use "official") or estimated/predicted based on patterns/intervals (use "estimated").

Ensure all dates are formatted strictly as YYYY-MM-DD or empty string. Do not invent dates. Use the news article timestamps to calibrate what "current" or "next" cycle means relative to today.`;

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
          en: 'Last Epoch',
          ru: 'Last Epoch'
        },
        developer: 'Eleventh Hour Games',
        logo: 'last-epoch.png',
        color: '#6b3fa0',
        icon: '⏳',
        website: 'https://www.lastepoch.com/',
        latestNews: {
          id: latestNewsId,
          title: newsitems[0].title || 'Last Epoch Steam Update',
          url: newsitems[0].url || 'https://www.lastepoch.com/',
          publishDate: new Date(newsitems[0].date * 1000).toISOString(),
          source: 'Last Epoch Steam News'
        },
        status: {
          ...this.normalizeStatus(extracted.status),
          updatedAt: new Date().toISOString()
        },
        currentSeason: {
          name: {
            en: extracted.currentSeasonNameEn || 'TBA',
            ru: extracted.currentSeasonNameEn || 'TBA'
          },
          startDate: extracted.currentSeasonStartDate || '',
          endDate: extracted.currentSeasonEndDate || '',
          isActive: extracted.status === 'active',
          verification: 'official',
          sourceUrl: newsitems[0].url || 'https://www.lastepoch.com/'
        },
        nextSeason: {
          name: {
            en: extracted.nextSeasonNameEn || 'TBA',
            ru: extracted.nextSeasonNameEn || 'TBA'
          },
          startDate: extracted.nextSeasonStartDate || '',
          endDate: extracted.nextSeasonEndDate || '',
          isActive: false,
          verification: extracted.nextSeasonVerification === 'official' ? 'official' : 'estimated',
          sourceUrl: newsitems[0].url || 'https://www.lastepoch.com/'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
        links: {
          official: 'https://www.lastepoch.com/',
          wiki: '',
          community: ''
        },
        metadata: {
          region: 'Global',
          platforms: ['PC'],
          tags: ['ARPG', 'Crafting']
        }
      };

      return normalized;
    } catch (e) {
      console.warn(`[Last Epoch] Update failed: ${e.message}. Using cache fallback.`);
      if (cache) {
        return cache;
      }
      throw e;
    }
  }
}
