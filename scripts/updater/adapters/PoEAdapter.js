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

        // Filter out articles specifically meant for PoE 2
        if (title.toLowerCase().startsWith('path of exile 2:') || title.toLowerCase().startsWith('poe 2:')) {
          continue;
        }

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

      const filteredItems = this.filterRelevantNews(items, ['league', 'expansion', 'livestream', 'teaser']);
      const targetItems = filteredItems.length > 0 ? filteredItems.slice(0, 8) : items.slice(0, 5);

      const feedContent = targetItems
        .map(item => `Title: ${item.title}\nDate: ${item.pubDate}\nDescription: ${this.cleanHtml(item.description)}`)
        .join('\n\n---\n\n');

      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game league/season details from Path of Exile 1 RSS feed content.
1. Current League name EN/RU, startDate, endDate.
2. Next League name EN/RU, startDate, endDate, verification ("official" or "estimated").
3. Events (livestreams, teaser schedules, league launches) with titles EN/RU and dates.
4. Game status: "active", "in-development", "maintenance".
5. Key features list EN/RU.

Formatting rule: Dates MUST be YYYY-MM-DD or full ISO strings. PoE league launches are almost always on Fridays.`;

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
                type: { type: 'STRING', description: 'One of: livestream, season_start, expansion, convention' },
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
          'status', 'featuresEn', 'featuresRu'
        ]
      };

      const rawExtracted = await this.callGemini(feedContent, systemInstruction, schema);
      const extracted = rawExtracted || {};

      let seasonNameEn = extracted.currentSeasonNameEn || 'TBA';
      if (seasonNameEn !== 'TBA' && !/^\s*v?\d+\.\d+/i.test(seasonNameEn)) {
        seasonNameEn = `v3.29: ${seasonNameEn}`;
      }

      const parsedEvents = (extracted.events || []).map(ev => ({
        id: ev.id || `${ev.type}-${this.hashString(ev.titleEn + ev.startDate).slice(0, 6)}`,
        type: ev.type || 'livestream',
        title: { en: ev.titleEn || '', ru: ev.titleRu || ev.titleEn || '' },
        startDate: this.normalizeAndValidateDate(ev.startDate),
        endDate: this.normalizeAndValidateDate(ev.endDate),
        verification: ev.verification || 'official'
      })).filter(ev => ev.startDate !== '');

      const normalized = {
        id: this.gameId,
        name: { en: 'Path of Exile 1', ru: 'Path of Exile 1' },
        developer: 'Grinding Gear Games',
        logo: 'path-of-exile.png',
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
            en: seasonNameEn,
            ru: extracted.currentSeasonNameRu || seasonNameEn
          },
          startDate: this.normalizeAndValidateDate(extracted.currentSeasonStartDate),
          endDate: this.normalizeAndValidateDate(extracted.currentSeasonEndDate),
          isActive: ['active', 'in-progress', 'just-started', 'ending'].includes(extracted.status),
          verification: 'official',
          sourceUrl: firstItem.link || 'https://www.pathofexile.com/'
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
            en: "Estimated date based on standard 3.5-4 month PoE league cycle after v3.29",
            ru: "Расчётная дата запуска на основе стандартного цикла лиг PoE (3.5–4 месяца) после v3.29"
          },
          sourceUrl: firstItem.link || 'https://www.pathofexile.com/'
        },
        features: {
          en: extracted.featuresEn || [],
          ru: extracted.featuresRu || []
        },
        ptr: existingGame?.ptr || null,
        events: parsedEvents.length > 0 ? parsedEvents : (existingGame?.events || []),
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
