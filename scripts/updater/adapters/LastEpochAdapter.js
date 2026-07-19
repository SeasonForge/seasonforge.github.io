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
1. Current Season/Cycle name (e.g. "Harbingers of Ruin"). If none, use empty string.
2. Current Season/Cycle start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
3. Next Season/Cycle name, start date (YYYY-MM-DD), and end date (YYYY-MM-DD). Use empty string if unknown.
4. Game status: "active" (if a season is running), "in-development" (if in beta/dev), "maintenance" (if offline).
5. A list of 3-5 key features introduced or planned (e.g. "Local Co-op", "New Factions").

Ensure all dates are formatted strictly as YYYY-MM-DD or empty string. Do not invent dates. Use the news article timestamps to calibrate what "current" or "next" cycle means relative to today.`;

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
        name: 'Last Epoch',
        developer: 'Eleventh Hour Games',
        logo: '',
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
          sourceUrl: newsitems[0].url || 'https://www.lastepoch.com/'
        },
        nextSeason: {
          name: extracted.nextSeasonName || 'TBA',
          startDate: extracted.nextSeasonStartDate || '',
          endDate: extracted.nextSeasonEndDate || '',
          isActive: false,
          verification: extracted.nextSeasonStartDate ? 'ai' : 'official',
          sourceUrl: newsitems[0].url || 'https://www.lastepoch.com/'
        },
        features: extracted.features || [],
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
