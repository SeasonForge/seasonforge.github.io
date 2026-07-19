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
        logo: '',
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
            ru: extracted.currentSeasonNameRu || 'TBA'
          },
          startDate: extracted.currentSeasonStartDate || '',
          endDate: extracted.currentSeasonEndDate || '',
          isActive: extracted.status === 'active',
          verification: 'official',
          sourceUrl: firstItem.properties.newsUrl || 'https://diablo4.blizzard.com/'
        },
        nextSeason: {
          name: {
            en: extracted.nextSeasonNameEn || 'TBA',
            ru: extracted.nextSeasonNameRu || 'TBA'
          },
          startDate: extracted.nextSeasonStartDate || '',
          endDate: extracted.nextSeasonEndDate || '',
          isActive: false,
          verification: extracted.nextSeasonVerification === 'official' ? 'official' : 'estimated',
          sourceUrl: firstItem.properties.newsUrl || 'https://diablo4.blizzard.com/'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
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
