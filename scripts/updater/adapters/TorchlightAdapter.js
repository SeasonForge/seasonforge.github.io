import { BaseAdapter } from './BaseAdapter.js';

export class TorchlightAdapter extends BaseAdapter {
  constructor() {
    super('torchlight-infinite');
  }

  async fetchAndNormalize(gameConfig, existingGame) {
    const cache = await this.getCache();
    const appId = gameConfig.appId || 1974050;
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
        console.log(`[Orchestrator] [Torchlight Infinite] Latest news unchanged (gid=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [Torchlight Infinite] New article detected (gid=${latestNewsId}). Calling Gemini...`);

      const newsText = newsitems
        .map(item => `Title: ${item.title}\nDate: ${new Date(item.date * 1000).toISOString()}\nContent: ${this.cleanHtml(item.contents)}`)
        .join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season details from the provided Steam news items for Torchlight Infinite.
Currently, the year is ${new Date().getFullYear()}. Determine:
1. Current Season name in English (e.g. "Twinightmare") in currentSeasonNameEn, and translated to Russian in currentSeasonNameRu.
2. Current Season start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
3. Next Season name in English in nextSeasonNameEn, and translated to Russian in nextSeasonNameRu.
4. Next Season start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
5. Game status: "active" (if a season is running), "in-development" (if in beta/dev), "maintenance" (if offline).
6. A list of 3-5 key features introduced or planned. Store the original English list in featuresEn, and translate it to Russian in featuresRu.
7. Whether the next season start date is officially confirmed by developers (use "official") or estimated/predicted based on patterns/intervals (use "estimated").

Ensure all dates are formatted strictly as YYYY-MM-DD or empty string. Do not invent dates. Use the news article timestamps to calibrate what "current" or "next" season means relative to today.`;

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
          en: 'Torchlight: Infinite',
          ru: 'Торчлайт: Инфинит'
        },
        developer: 'XD',
        logo: 'torchlight-infinite.png',
        color: '#c27a2b',
        icon: '⚡',
        website: 'https://torchlightinfinite.com/',
        latestNews: {
          id: latestNewsId,
          title: newsitems[0].title || 'Torchlight: Infinite Steam Update',
          url: newsitems[0].url || 'https://torchlightinfinite.com/',
          publishDate: new Date(newsitems[0].date * 1000).toISOString(),
          source: 'Torchlight Infinite Steam News'
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
          sourceUrl: newsitems[0].url || 'https://torchlightinfinite.com/'
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
          sourceUrl: newsitems[0].url || 'https://torchlightinfinite.com/'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
        links: {
          official: 'https://torchlightinfinite.com/',
          wiki: '',
          community: ''
        },
        metadata: {
          region: 'Global',
          platforms: ['PC'],
          tags: ['ARPG', 'Free-to-play']
        }
      };

      return normalized;
    } catch (e) {
      console.warn(`[Torchlight Infinite] Update failed: ${e.message}. Using cache fallback.`);
      if (cache) {
        return cache;
      }
      throw e;
    }
  }
}
