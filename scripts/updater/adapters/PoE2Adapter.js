import { BaseAdapter } from './BaseAdapter.js';

export class PoE2Adapter extends BaseAdapter {
  constructor() {
    super('path-of-exile-2');
  }

  async fetchAndNormalize(gameConfig, existingGame) {
    const cache = await this.getCache();
    const appId = gameConfig.appId || 2694490;
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=30&maxlength=4000&format=json`;

    try {
      const rawData = await this.fetchUrl(url);
      const data = JSON.parse(rawData);
      const rawItems = data.appnews?.newsitems || [];

      if (rawItems.length === 0) {
        throw new Error('No news items found in Steam API for PoE 2');
      }

      const items = rawItems.map(item => ({
        title: item.title || '',
        link: item.url || '',
        guid: item.gid || '',
        description: this.cleanHtml(item.contents || ''),
        pubDate: item.date ? new Date(item.date * 1000).toISOString() : ''
      }));

      const filteredItems = this.filterRelevantNews(items, ['poe 2', 'league', 'early access', 'exilecon', 'gamescom', 'release', 'showcase', 'onl']);
      const targetItems = filteredItems.length > 0 ? filteredItems.slice(0, 10) : items.slice(0, 5);

      const firstItem = targetItems[0] || items[0];
      const latestNewsId = firstItem.guid || firstItem.link || this.hashString(firstItem.title + firstItem.pubDate);

      if (existingGame && existingGame.latestNews && existingGame.latestNews.id === latestNewsId) {
        console.log(`[Orchestrator] [Path of Exile 2] Latest news unchanged (id=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [Path of Exile 2] New Steam article detected (id=${latestNewsId}: "${firstItem.title}"). Calling Gemini...`);

      const feedContent = targetItems
        .map(item => `Title: ${item.title}\nDate: ${item.pubDate}\nDescription: ${this.cleanHtml(item.description)}`)
        .join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season/league and timeline event details for Path of Exile 2:
1. Current Season/League details (name EN/RU, startDate, endDate).
2. Next Season/League or Major Event details (name EN/RU, startDate, endDate, verification).
3. Major events (ExileCon, Early Access updates, Livestreams) with EN/RU titles and dates.
4. Game status: "early-access", "active", "in-development".
5. Key features list EN/RU.

Formatting rule: All dates MUST be YYYY-MM-DD or full ISO strings.`;

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
                type: { type: 'STRING', description: 'One of: convention, livestream, season_start, expansion, ptr' },
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

      const extracted = await this.callGemini(feedContent, systemInstruction, schema);

      const parsedEvents = (extracted.events || []).map(ev => ({
        id: ev.id || `${ev.type}-${this.hashString(ev.titleEn + ev.startDate).slice(0, 6)}`,
        type: ev.type || 'convention',
        title: { en: ev.titleEn || '', ru: ev.titleRu || ev.titleEn || '' },
        startDate: this.normalizeAndValidateDate(ev.startDate),
        endDate: this.normalizeAndValidateDate(ev.endDate),
        verification: ev.verification || 'official'
      })).filter(ev => ev.startDate !== '');

      const normalized = {
        id: this.gameId,
        name: { en: 'Path of Exile 2', ru: 'Path of Exile 2' },
        developer: 'Grinding Gear Games',
        logo: 'path-of-exile-2.png',
        color: '#4b6e9c',
        icon: 'sparkles',
        website: 'https://pathofexile2.com',
        latestNews: {
          id: latestNewsId,
          title: firstItem.title || 'Path of Exile News Update',
          url: firstItem.link || 'https://www.pathofexile.com/news',
          publishDate: firstItem.pubDate ? new Date(firstItem.pubDate).toISOString() : new Date().toISOString(),
          source: 'Path of Exile Official RSS'
        },
        status: {
          ...this.normalizeStatus(extracted.status),
          updatedAt: new Date().toISOString()
        },
        currentSeason: {
          name: {
            en: extracted.currentSeasonNameEn || '0.5.0: Return of the Ancients',
            ru: extracted.currentSeasonNameRu || extracted.currentSeasonNameEn || '0.5.0: Return of the Ancients'
          },
          startDate: this.normalizeAndValidateDate(extracted.currentSeasonStartDate),
          endDate: this.normalizeAndValidateDate(extracted.currentSeasonEndDate),
          isActive: ['active', 'in-progress', 'just-started', 'ending'].includes(extracted.status),
          verification: 'official',
          sourceUrl: firstItem.link || 'https://www.pathofexile.com/news'
        },
        nextSeason: {
          name: {
            en: extracted.nextSeasonNameEn || 'ExileCon 2026 (League & 1.0 Reveal)',
            ru: extracted.nextSeasonNameRu || extracted.nextSeasonNameEn || 'ExileCon 2026 (Анонс лиги и 1.0)'
          },
          startDate: this.normalizeAndValidateDate(extracted.nextSeasonStartDate),
          endDate: this.normalizeAndValidateDate(extracted.nextSeasonEndDate),
          isActive: false,
          verification: extracted.nextSeasonVerification === 'official' ? 'official' : (existingGame?.nextSeason?.verification || 'estimated'),
          verificationNote: existingGame?.nextSeason?.verificationNote || {
            en: "Official ExileCon 2026 presentation & 1.0 reveal dates",
            ru: "Официальные даты проведения ExileCon 2026 и презентации версии 1.0"
          },
          sourceUrl: firstItem.link || 'https://www.pathofexile.com/news'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
        ptr: existingGame?.ptr || null,
        events: parsedEvents.length > 0 ? parsedEvents : (existingGame?.events || []),
        featureCategories: existingGame?.featureCategories || null,
        links: { official: 'https://pathofexile2.com', wiki: '', community: '' },
        metadata: { region: 'Global', platforms: ['PC', 'Console'], tags: ['ARPG', 'Early Access'] }
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
