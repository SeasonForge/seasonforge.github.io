import { BaseAdapter } from './BaseAdapter.js';

export class PoE2Adapter extends BaseAdapter {
  constructor() {
    super('path-of-exile-2');
  }

  async fetchAndNormalize(gameConfig, existingGame) {
    const cache = await this.getCache();
    const url = gameConfig.sourceUrl || 'https://www.pathofexile.com/news/rss';

    try {
      const rssText = await this.fetchUrl(url);

      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(rssText)) !== null && items.length < 15) {
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

        // Include articles for PoE 2 or general ExileCon / Return of the Ancients announcements
        const titleLower = title.toLowerCase();
        if (titleLower.includes('poe 2') || titleLower.includes('path of exile 2') || titleLower.includes('exilecon') || titleLower.includes('ancients')) {
          items.push({ title, link, guid, description, pubDate });
        }
      }

      if (items.length === 0) {
        throw new Error('No items found in Path of Exile RSS feed');
      }

      const firstItem = items[0];
      const latestNewsId = firstItem.guid || firstItem.link || this.hashString(firstItem.title + firstItem.pubDate);

      if (existingGame && existingGame.latestNews && existingGame.latestNews.id === latestNewsId) {
        console.log(`[Orchestrator] [Path of Exile 2] Latest news unchanged (id=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [Path of Exile 2] New RSS article detected (id=${latestNewsId}). Calling Gemini...`);

      const feedContent = items
        .map(item => `Title: ${item.title}\nDate: ${item.pubDate}\nDescription: ${this.cleanHtml(item.description)}`)
        .join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season/league and major event details from Path of Exile RSS feed content specifically for Path of Exile 2. Path of Exile 2 calls seasons "leagues".
Currently, the year is ${new Date().getFullYear()}. Determine:
1. Current Season/League name in English (e.g. "0.5.0: Return of the Ancients") in currentSeasonNameEn, and translated to Russian in currentSeasonNameRu.
2. Current Season/League start date (YYYY-MM-DD) and end date (YYYY-MM-DD). Use empty string if unknown.
3. Next Season/League or Major Event name in English (e.g. "ExileCon 2026 (Announcement)" or "Version 1.0 Release") in nextSeasonNameEn, and translated to Russian in nextSeasonNameRu (e.g. "ExileCon 2026 (Анонс лиги)" or "Версия 1.0 (Релиз)").
4. Next Season/League or Major Event start date (YYYY-MM-DD) and end date (YYYY-MM-DD). NOTE: ExileCon 2026 is scheduled for November 7-8, 2026 (2026-11-07). If ExileCon 2026 is mentioned as the next major announcement hub for PoE 2, use 2026-11-07 as the next start date and set nextSeasonVerification to "official".
5. Game status: "active" (if a league is running), "in-development" (if in early access/beta/dev), "maintenance" (if offline), "early-access" (if in early access).
6. A list of 3-5 key features or major upcoming events (including ExileCon 2026 if mentioned). Store the original English list in featuresEn, and translate it to Russian in featuresRu.
7. Whether the next season/event start date is officially confirmed by developers (use "official") or estimated (use "estimated").

Ensure all dates are formatted strictly as YYYY-MM-DD or empty string. Do not invent fake dates.`;

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
          en: 'Path of Exile 2',
          ru: 'Path of Exile 2'
        },
        developer: 'Grinding Gear Games',
        logo: 'path-of-exile-2.png',
        color: '#4b6e9c',
        icon: '✨',
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
            ru: extracted.currentSeasonNameRu || '0.5.0: Return of the Ancients'
          },
          startDate: extracted.currentSeasonStartDate || '',
          endDate: extracted.currentSeasonEndDate || '',
          isActive: ['active', 'in-progress', 'just-started', 'ending'].includes(extracted.status),
          verification: 'official',
          sourceUrl: firstItem.link || 'https://www.pathofexile.com/news'
        },
        nextSeason: {
          name: {
            en: extracted.nextSeasonNameEn || 'ExileCon 2026 (League & 1.0 Reveal)',
            ru: extracted.nextSeasonNameRu || 'ExileCon 2026 (Анонс лиги и 1.0)'
          },
          startDate: extracted.nextSeasonStartDate || '2026-11-07',
          endDate: extracted.nextSeasonEndDate || '',
          isActive: false,
          verification: 'announcement',
          sourceUrl: firstItem.link || 'https://www.pathofexile.com/news'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
        links: {
          official: 'https://pathofexile2.com',
          wiki: '',
          community: ''
        },
        metadata: {
          region: 'Global',
          platforms: ['PC', 'PlayStation 5', 'Xbox Series X/S'],
          tags: ['ARPG', 'Dark Fantasy']
        }
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
