import { BaseAdapter } from './BaseAdapter.js';

export class DiabloAdapter extends BaseAdapter {
  constructor() {
    super('diablo-iv');
  }

  async fetchAndNormalize(gameConfig) {
    const cache = await this.getCache();
    const url = gameConfig.sourceUrl || 'https://news.blizzard.com/en-us/diablo4';

    try {
      console.log(`[Diablo IV] Fetching official Blizzard news page: ${url}`);
      const rawHtml = await this.fetchUrl(url);
      const cleanedText = this.cleanHtml(rawHtml);

      if (!cleanedText) {
        throw new Error('Fetched HTML content is empty after cleaning');
      }

      // Generate a signature of the news page to detect changes
      const textSignature = cleanedText.substring(0, 1000);

      if (cache && cache.textSignature === textSignature) {
        console.log(`[Diablo IV] No changes detected in news page content. Using cached data.`);
        return cache;
      }

      console.log(`[Diablo IV] New Blizzard news detected! Analyzing with Gemini...`);

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season details from the provided text of Diablo IV Blizzard news list.
Currently, the year is ${new Date().getFullYear()}. Determine:
1. Current Season name (e.g. "Season of the Hatred"). If none, use empty string.
2. Current Season start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
3. Next Season name, start date (YYYY-MM-DD), and end date (YYYY-MM-DD). Use empty string if unknown.
4. Game status: "active" (if a season is running), "in-development" (if between seasons), "maintenance" (if offline).
5. A list of 3-5 key features introduced or planned.

Ensure all dates are formatted strictly as YYYY-MM-DD or empty string. Do not invent dates. Reference news headlines and publication dates in the text to understand when events happen.`;

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

      const extracted = await this.callGemini(cleanedText.substring(0, 10000), systemInstruction, schema);

      const normalized = {
        id: this.gameId,
        name: 'Diablo IV',
        developer: 'Blizzard Entertainment',
        logo: '',
        color: '#8b1f1f',
        icon: '🔥',
        website: 'https://diablo4.blizzard.com/',
        textSignature: textSignature,
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
          sourceUrl: url
        },
        nextSeason: {
          name: extracted.nextSeasonName || 'TBA',
          startDate: extracted.nextSeasonStartDate || '',
          endDate: extracted.nextSeasonEndDate || '',
          isActive: false,
          verification: extracted.nextSeasonStartDate ? 'ai' : 'official',
          sourceUrl: url
        },
        features: extracted.features || [],
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

      await this.writeCache(normalized);
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
