import { BaseAdapter } from './BaseAdapter.js';

export class DiabloAdapter extends BaseAdapter {
  constructor() {
    super('diablo-iv');
  }

  async fetchAndNormalize(gameConfig, existingGame) {
    const cache = await this.getCache();
    const url = 'https://news.blizzard.com/api/news/diablo-4';

    try {
      console.log(`[Diablo IV] Fetching official Blizzard news JSON: ${url}`);
      const rawJson = await this.fetchUrl(url);
      const data = JSON.parse(rawJson);
      const items = data.feed?.contentItems || [];

      if (items.length === 0) {
        throw new Error('No news items found in Blizzard News API');
      }

      // Pre-filter up to 30 news items by timeline keywords to capture PTR, BlizzCon, Livestreams & Season launches
      const filteredItems = this.filterRelevantNews(items.slice(0, 30), ['season', 'expansion', 'campfire', 'ptr', 'blizzcon']);
      const targetItems = filteredItems.length > 0 ? filteredItems.slice(0, 10) : items.slice(0, 5);

      const firstItem = targetItems[0] || items[0];
      const latestNewsId = firstItem.properties?.newsId || this.hashString(firstItem.properties?.title + firstItem.properties?.lastUpdated);

      if (existingGame && existingGame.latestNews && existingGame.latestNews.id === latestNewsId) {
        console.log(`[Orchestrator] [Diablo IV] Latest news unchanged (id=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [Diablo IV] New article detected (id=${latestNewsId}). Calling Gemini...`);

      const newsText = targetItems.map(item => 
        `Title: ${item.properties.title}\nDate: ${item.properties.lastUpdated}\nSummary: ${item.properties.summary}`
      ).join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Focus strictly on extracting timeline dates for Diablo IV:
1. Current Season details (name EN/RU, startDate, endDate).
2. Next Season details (name EN/RU, startDate, endDate, verification: "official" or "estimated").
3. Public Test Realm (PTR) dates if mentioned (startDate, endDate, patch version/title EN/RU).
4. Major events (BlizzCon, developer livestreams, expansion reveals, season launches) with dates and titles.
5. Game status: "active", "in-development", "maintenance", "ending".
6. Key features list (EN and RU).

Formatting rule: Format all dates strictly as YYYY-MM-DD or full ISO-8601 strings. Do not guess non-existent dates. Use empty strings for unknown dates.`;

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
          ptr: {
            type: 'OBJECT',
            properties: {
              startDate: { type: 'STRING' },
              endDate: { type: 'STRING' },
              titleEn: { type: 'STRING' },
              titleRu: { type: 'STRING' }
            }
          },
          events: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                type: { type: 'STRING', description: 'One of: ptr, convention, livestream, season_start, expansion' },
                titleEn: { type: 'STRING' },
                titleRu: { type: 'STRING' },
                startDate: { type: 'STRING' },
                endDate: { type: 'STRING' },
                verification: { type: 'STRING', description: 'official, estimated, or announcement' }
              },
              required: ['type', 'titleEn', 'startDate']
            }
          }
        },
        required: [
          'currentSeasonNameEn', 'currentSeasonNameRu', 'currentSeasonStartDate', 'currentSeasonEndDate', 
          'nextSeasonNameEn', 'nextSeasonNameRu', 'nextSeasonStartDate', 'nextSeasonEndDate', 
          'nextSeasonVerification', 'status', 'featuresEn', 'featuresRu'
        ]
      };

      const extracted = await this.callGemini(newsText, systemInstruction, schema);

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
        name: { en: 'Diablo IV', ru: 'Diablo IV' },
        developer: 'Blizzard Entertainment',
        logo: 'diablo-iv.png',
        color: '#8b1f1f',
        icon: 'flame',
        website: 'https://diablo4.blizzard.com/',
        latestNews: {
          id: latestNewsId,
          title: firstItem.properties.title,
          url: firstItem.properties.newsUrl || 'https://diablo4.blizzard.com/',
          publishDate: firstItem.properties.lastUpdated || '',
          source: 'Official Diablo IV News'
        },
        status: {
          ...this.normalizeStatus(extracted.status),
          updatedAt: new Date().toISOString()
        },
        currentSeason: {
          name: {
            en: extracted.currentSeasonNameEn || existingGame?.currentSeason?.name?.en || 'TBA',
            ru: extracted.currentSeasonNameRu || existingGame?.currentSeason?.name?.ru || 'TBA'
          },
          startDate: this.normalizeAndValidateDate(extracted.currentSeasonStartDate),
          endDate: this.normalizeAndValidateDate(extracted.currentSeasonEndDate),
          isActive: ['active', 'in-progress', 'just-started', 'ending'].includes(extracted.status),
          verification: 'official',
          sourceUrl: firstItem.properties.newsUrl || 'https://diablo4.blizzard.com/'
        },
        nextSeason: {
          name: {
            en: extracted.nextSeasonNameEn || existingGame?.nextSeason?.name?.en || 'TBA',
            ru: extracted.nextSeasonNameRu || existingGame?.nextSeason?.name?.ru || 'TBA'
          },
          startDate: this.normalizeAndValidateDate(extracted.nextSeasonStartDate),
          endDate: this.normalizeAndValidateDate(extracted.nextSeasonEndDate),
          isActive: false,
          verification: extracted.nextSeasonVerification === 'official' ? 'official' : (existingGame?.nextSeason?.verification || 'estimated'),
          verificationNote: existingGame?.nextSeason?.verificationNote || null,
          sourceUrl: firstItem.properties.newsUrl || 'https://diablo4.blizzard.com/'
        },
        features: {
          en: (extracted.featuresEn && extracted.featuresEn.length > 0) ? extracted.featuresEn : (existingGame?.features?.en || []),
          ru: (extracted.featuresRu && extracted.featuresRu.length > 0) ? extracted.featuresRu : (existingGame?.features?.ru || [])
        },
        ptr: existingGame?.ptr || (extracted.ptr?.startDate ? {
          startDate: this.normalizeAndValidateDate(extracted.ptr.startDate),
          endDate: this.normalizeAndValidateDate(extracted.ptr.endDate),
          title: { en: extracted.ptr.titleEn || 'PTR', ru: extracted.ptr.titleRu || 'PTR' }
        } : null),
        events: parsedEvents.length > 0 ? parsedEvents : (existingGame?.events || []),
        featureCategories: existingGame?.featureCategories || null,
        links: { official: 'https://diablo4.blizzard.com/', wiki: '', community: '' },
        metadata: { region: 'Global', platforms: ['PC', 'Console'], tags: ['ARPG', 'Action'] }
      };

      return normalized;
    } catch (e) {
      console.warn(`[Diablo IV] Update failed: ${e.message}. Using cache fallback.`);
      if (cache) {
        return cache;
      }
      throw e;
    }
  }
}
