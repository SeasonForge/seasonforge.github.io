import { BaseAdapter } from './BaseAdapter.js';

export class DiabloAdapter extends BaseAdapter {
  constructor() {
    super('diablo-iv');
  }

  async fetchAndNormalize(gameConfig, existingGame) {
    const cache = await this.getCache();
    const url = gameConfig.sourceUrl || 'https://news.blizzard.com/en-us/diablo4';

    try {
      console.log(`[Diablo IV] Fetching official Blizzard news page: ${url}`);
      const rawHtml = await this.fetchUrl(url);
      const cleanedText = this.cleanHtml(rawHtml);

      if (!cleanedText) {
        throw new Error('Fetched HTML content is empty after cleaning');
      }

      // Extract the first article link using regex
      const articleLinkMatch = rawHtml.match(/href="([^"]*?diablo4\/\d+[^"]*?)"/i) || 
                            rawHtml.match(/href="([^"]*?diablo-iv\/\d+[^"]*?)"/i);
      let latestUrl = url;
      if (articleLinkMatch) {
        let path = articleLinkMatch[1];
        if (path.startsWith('/')) {
          path = 'https://news.blizzard.com' + path;
        }
        latestUrl = path;
      }
      
      const latestNewsId = this.hashString(latestUrl);

      if (existingGame && existingGame.latestNews && existingGame.latestNews.id === latestNewsId) {
        console.log(`[Orchestrator] [Diablo IV] Latest news unchanged (id=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [Diablo IV] New article detected (id=${latestNewsId}). Calling Gemini...`);

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season details from the provided text of Diablo IV Blizzard news list.
Currently, the year is ${new Date().getFullYear()}. Determine:
1. Current Season name (e.g. "Season of the Hatred"). If none, use empty string.
2. Current Season start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
3. Next Season name, start date (YYYY-MM-DD), and end date (YYYY-MM-DD). Use empty string if unknown.
4. Game status: "active" (if a season is running), "in-development" (if between seasons), "maintenance" (if offline).
5. A list of 3-5 key features introduced or planned.
6. The title (latestNewsTitle) and publication date (latestNewsDate, formatted strictly as YYYY-MM-DD or empty string) of the most recent news article listed in the text.

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
          },
          latestNewsTitle: { type: 'STRING' },
          latestNewsDate: { type: 'STRING' }
        },
        required: ['currentSeasonName', 'currentSeasonStartDate', 'currentSeasonEndDate', 'nextSeasonName', 'nextSeasonStartDate', 'nextSeasonEndDate', 'status', 'features', 'latestNewsTitle', 'latestNewsDate']
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
        latestNews: {
          id: latestNewsId,
          title: extracted.latestNewsTitle || 'Official Diablo IV News',
          url: latestUrl,
          publishDate: extracted.latestNewsDate || new Date().toISOString().split('T')[0],
          source: 'Official Diablo IV News'
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
