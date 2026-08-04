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

      console.log(`[Orchestrator] [Last Epoch] New article detected (id=${latestNewsId}). Calling Gemini...`);

      const filteredItems = this.filterRelevantNews(newsitems, ['cycle', 'patch', 'ptr', 'beta', 'launch']);
      const targetItems = filteredItems.length > 0 ? filteredItems.slice(0, 8) : newsitems.slice(0, 5);

      const newsText = targetItems.map(item => 
        `Title: ${item.title}\nDate: ${new Date(item.date * 1000).toISOString()}\nSummary: ${this.cleanHtml(item.contents)}`
      ).join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game cycle/season details for Last Epoch:
1. Current Cycle name EN/RU, startDate, endDate.
2. Next Cycle name EN/RU, startDate, endDate, verification.
3. Timeline events (Beta, EHG Livestreams, Cycle launches, PTR) with EN/RU titles and dates.
4. Game status: "active", "in-development", "maintenance".
5. Key features list EN/RU.

Formatting rule: Dates MUST be YYYY-MM-DD or full ISO strings.`;

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
          nextSeasonVerification: { type: 'STRING' },
          status: { type: 'STRING' },
          featuresEn: { type: 'ARRAY', items: { type: 'STRING' } },
          featuresRu: { type: 'ARRAY', items: { type: 'STRING' } },
          events: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                type: { type: 'STRING', description: 'One of: ptr, livestream, season_start, expansion' },
                titleEn: { type: 'STRING' },
                titleRu: { type: 'STRING' },
                startDate: { type: 'STRING' },
                endDate: { type: 'STRING' },
                verification: { type: 'STRING' }
              },
              required: ['type', 'titleEn', 'startDate']
            }
          }
        },
        required: [
          'currentSeasonNameEn', 'currentSeasonNameRu', 'currentSeasonStartDate',
          'nextSeasonNameEn', 'nextSeasonNameRu', 'nextSeasonStartDate',
          'nextSeasonVerification', 'status', 'featuresEn', 'featuresRu'
        ]
      };

      const extracted = await this.callGemini(newsText, systemInstruction, schema);

      const parsedEvents = (extracted.events || []).map(ev => ({
        id: ev.id || `${ev.type}-${this.hashString(ev.titleEn + ev.startDate).slice(0, 6)}`,
        type: ev.type || 'season_start',
        title: { en: ev.titleEn || '', ru: ev.titleRu || ev.titleEn || '' },
        startDate: this.normalizeAndValidateDate(ev.startDate),
        endDate: this.normalizeAndValidateDate(ev.endDate),
        verification: ev.verification || 'official'
      })).filter(ev => ev.startDate !== '');

      const normalized = {
        id: this.gameId,
        name: { en: 'Last Epoch', ru: 'Last Epoch' },
        developer: 'Eleventh Hour Games',
        logo: 'last-epoch.png',
        color: '#6b3fa0',
        icon: 'hourglass',
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
            ru: extracted.currentSeasonNameRu || extracted.currentSeasonNameEn || 'TBA'
          },
          startDate: this.normalizeAndValidateDate(extracted.currentSeasonStartDate),
          endDate: this.normalizeAndValidateDate(extracted.currentSeasonEndDate),
          isActive: ['active', 'in-progress', 'just-started', 'ending'].includes(extracted.status),
          verification: 'official',
          sourceUrl: newsitems[0].url || 'https://www.lastepoch.com/'
        },
        nextSeason: {
          name: {
            en: extracted.nextSeasonNameEn || 'TBA',
            ru: extracted.nextSeasonNameRu || extracted.nextSeasonNameEn || 'TBA'
          },
          startDate: this.normalizeAndValidateDate(extracted.nextSeasonStartDate),
          endDate: this.normalizeAndValidateDate(extracted.nextSeasonEndDate),
          isActive: false,
          verification: extracted.nextSeasonVerification === 'official' ? 'official' : (existingGame?.nextSeason?.verification || 'estimated'),
          verificationNote: existingGame?.nextSeason?.verificationNote || {
            en: "Estimated launch date based on ~3-4 month EHG Cycle cadence after Cycle 4",
            ru: "Расчётная дата запуска на основе стандартного цикла EHG (~3–4 месяца) после Цикла 4"
          },
          sourceUrl: newsitems[0].url || 'https://www.lastepoch.com/'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
        ptr: existingGame?.ptr || null,
        events: parsedEvents.length > 0 ? parsedEvents : (existingGame?.events || []),
        links: { official: 'https://www.lastepoch.com/', wiki: '', community: '' },
        metadata: { region: 'Global', platforms: ['PC'], tags: ['ARPG', 'Crafting'] }
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
