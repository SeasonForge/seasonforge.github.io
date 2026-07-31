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

      const filteredItems = this.filterRelevantNews(items, ['poe 2', 'league', 'early access', 'exilecon', 'release']);
      const targetItems = filteredItems.length > 0 ? filteredItems.slice(0, 8) : items.slice(0, 5);

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
          verificationNote: existingGame?.nextSeason?.verificationNote || null,
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
