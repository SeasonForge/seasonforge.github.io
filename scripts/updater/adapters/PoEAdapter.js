import { BaseAdapter } from './BaseAdapter.js';

export class PoEAdapter extends BaseAdapter {
  constructor() {
    super('path-of-exile');
  }

  async fetchAndNormalize(gameConfig, existingGame) {
    const cache = await this.getCache();
    const url = gameConfig.sourceUrl || 'https://www.pathofexile.com/news/rss';

    try {
      const rssText = await this.fetchUrl(url);
      
      // Simple regex-based RSS parser to avoid library dependencies
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(rssText)) !== null && items.length < 5) {
        const itemContent = match[1];
        
        const cleanCdata = (str) => str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/i, '$1').trim();
        
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
        const guidMatch = itemContent.match(/<guid[^>]*?>([\s\S]*?)<\/guid>/i);
        const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);
        const dateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

        const title = titleMatch ? cleanCdata(titleMatch[1]) : '';
        const link = linkMatch ? cleanCdata(linkMatch[1]) : '';
        const guid = guidMatch ? cleanCdata(guidMatch[1]) : '';
        const description = descMatch ? cleanCdata(descMatch[1]) : '';
        const pubDate = dateMatch ? cleanCdata(dateMatch[1]) : '';

        items.push({ title, link, guid, description, pubDate });
      }

      if (items.length === 0) {
        throw new Error('No items found in Path of Exile RSS feed');
      }

      // Check if the latest news GUID/link is the same as the cached/existing one
      const firstItem = items[0];
      const latestNewsId = firstItem.guid || firstItem.link || this.hashString(firstItem.title + firstItem.pubDate);
      
      if (existingGame && existingGame.latestNews && existingGame.latestNews.id === latestNewsId) {
        console.log(`[Orchestrator] [PoE] Latest news unchanged (id=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [PoE] New article detected (id=${latestNewsId}). Calling Gemini...`);

      const feedContent = items
        .map(item => `Title: ${item.title}\nDate: ${item.pubDate}\nDescription: ${this.cleanHtml(item.description)}`)
        .join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game league/season details from Path of Exile RSS feed content.
Currently, the year is ${new Date().getFullYear()}. Determine:
1. Current Season/League name in English (e.g. "Settlers of Kalguur") in currentSeasonNameEn, and translated to Russian in currentSeasonNameRu.
2. Current Season/League start date (YYYY-MM-DD) and end date (YYYY-MM-DD). If unknown, use empty string.
3. Next Season/League name in English in nextSeasonNameEn, and translated to Russian in nextSeasonNameRu.
4. Next Season/League start date (YYYY-MM-DD) and end date (YYYY-MM-DD). If unknown, use empty string.
5. Game status: "active" (if a league is currently running), "in-development" (if between leagues), "maintenance" (if offline).
6. A list of 3-5 key features introduced or planned. Store the original English list in featuresEn, and translate it to Russian in featuresRu.
7. Whether the next season start date is officially confirmed by developers (use "official") or estimated/predicted based on patterns/intervals (use "estimated").

Ensure dates are formatted strictly as YYYY-MM-DD or empty string. Do not invent dates. PoE league launches are usually on Fridays.`;

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

      const extracted = await this.callGemini(feedContent, systemInstruction, schema);

      const normalized = {
        id: this.gameId,
        name: {
          en: 'Path of Exile 1',
          ru: 'Path of Exile 1'
        },
        developer: 'Grinding Gear Games',
        logo: '',
        color: '#f5c342',
        icon: '💀',
        website: 'https://www.pathofexile.com/',
        latestNews: {
          id: latestNewsId,
          title: firstItem.title,
          url: firstItem.link,
          publishDate: firstItem.pubDate || '',
          source: 'Path of Exile RSS'
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
          sourceUrl: items[0].link || 'https://www.pathofexile.com/'
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
          sourceUrl: items[0].link || 'https://www.pathofexile.com/'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
        links: {
          official: 'https://www.pathofexile.com/',
          wiki: '',
          community: ''
        },
        metadata: {
          region: 'Global',
          platforms: ['PC'],
          tags: ['ARPG', 'Live Service']
        }
      };

      return normalized;
    } catch (e) {
      console.warn(`[Path of Exile] Update failed: ${e.message}. Using cache fallback.`);
      if (cache) {
        return cache;
      }
      throw e;
    }
  }
}
