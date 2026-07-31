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

      const firstItem = items[0];
      const latestNewsId = firstItem.properties?.newsId || this.hashString(firstItem.properties?.title + firstItem.properties?.lastUpdated);

      if (existingGame && existingGame.latestNews && existingGame.latestNews.id === latestNewsId) {
        console.log(`[Orchestrator] [Diablo IV] Latest news unchanged (id=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [Diablo IV] New article detected (id=${latestNewsId}). Calling Gemini...`);

      const newsText = items.slice(0, 5).map(item => 
        `Title: ${item.properties.title}\nDate: ${item.properties.lastUpdated}\nSummary: ${item.properties.summary}`
      ).join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season details from the provided Diablo IV Blizzard news titles and summaries.
Currently, the year is ${new Date().getFullYear()}. Determine:
1. Current Season name in English (e.g. "Season of the Hatred") in currentSeasonNameEn, and translated to Russian in currentSeasonNameRu.
2. Current Season start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
3. Next Season name in English in nextSeasonNameEn, and translated to Russian in nextSeasonNameRu.
4. Next Season start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
5. Game status: "active" (if a season is running), "in-development" (if between seasons), "maintenance" (if offline).
6. A list of 3-5 key features introduced or planned. Store the original English list in featuresEn, and translate it to Russian in featuresRu.
7. Whether the next season start date is officially confirmed by developers (use "official") or estimated/predicted based on patterns/intervals (use "estimated").

Ensure all dates are formatted strictly as YYYY-MM-DD or empty string. Do not invent dates. Reference news headlines and publication dates in the text to understand when events happen.`;

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
          en: 'Diablo IV',
          ru: 'Diablo IV'
        },
        developer: 'Blizzard Entertainment',
        logo: 'diablo-iv.png',
        color: '#8b1f1f',
        icon: '🔥',
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
            en: extracted.currentSeasonNameEn || 'TBA',
            ru: extracted.currentSeasonNameEn || 'TBA'
          },
          startDate: extracted.currentSeasonStartDate || '',
          endDate: extracted.currentSeasonEndDate || '',
          isActive: ['active', 'in-progress', 'just-started', 'ending'].includes(extracted.status),
          verification: 'official',
          sourceUrl: firstItem.properties.newsUrl || 'https://diablo4.blizzard.com/'
        },
        nextSeason: {
          name: {
            en: extracted.nextSeasonNameEn || 'TBA',
            ru: extracted.nextSeasonNameEn || 'TBA'
          },
          startDate: extracted.nextSeasonStartDate || '',
          endDate: extracted.nextSeasonEndDate || '',
          isActive: false,
          verification: extracted.nextSeasonVerification === 'official' ? 'official' : (existingGame?.nextSeason?.verification || 'estimated'),
          verificationNote: existingGame?.nextSeason?.verificationNote || null,
          sourceUrl: firstItem.properties.newsUrl || 'https://diablo4.blizzard.com/'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
        ptr: existingGame?.ptr || null,
        events: (existingGame?.events && existingGame.events.length > 0) ? existingGame.events : [
          {
            id: "ptr-3.2.0",
            type: "ptr",
            title: { en: "PTR Patch 3.2.0", ru: "PTR Патч 3.2.0" },
            startDate: "2026-08-04T17:00:00Z",
            endDate: "2026-08-11T17:00:00Z",
            verification: "official",
            platformNote: { en: "PC Only (Battle.net & Game Pass)", ru: "Только ПК (Battle.net / Game Pass)" }
          },
          {
            id: "blizzcon-2026",
            type: "convention",
            title: { en: "BlizzCon 2026 (Season 15 Reveal)", ru: "BlizzCon 2026 (Анонс Сезона 15)" },
            startDate: "2026-09-12T17:00:00Z",
            endDate: "2026-09-13T23:59:59Z",
            verification: "announcement",
            location: { en: "Anaheim Convention Center & Livestream", ru: "Анахайм (Калифорния) и Прямая трансляция" }
          },
          {
            id: "season-15-launch",
            type: "season_start",
            title: { en: "Season 15 Launch", ru: "Запуск Сезона 15" },
            startDate: "2026-09-15T17:00:00Z",
            verification: "estimated"
          }
        ],
        featureCategories: existingGame?.featureCategories || null,
        links: {
          official: 'https://diablo4.blizzard.com/',
          wiki: '',
          community: ''
        },
        metadata: {
          region: 'Global',
          platforms: ['PC', 'Console'],
          tags: ['ARPG', 'Action']
        }
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
