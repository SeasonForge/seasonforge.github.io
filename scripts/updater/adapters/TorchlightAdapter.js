import { BaseAdapter } from './BaseAdapter.js';

export class TorchlightAdapter extends BaseAdapter {
  constructor() {
    super('torchlight-infinite');
  }

  async fetchAndNormalize(gameConfig, existingGame) {
    const cache = await this.getCache();
    const appId = gameConfig.appId || 1974050;
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=30&maxlength=4000&format=json`;

    try {
      const rawData = await this.fetchUrl(url);
      const data = JSON.parse(rawData);
      const newsitems = data.appnews?.newsitems || [];

      if (newsitems.length === 0) {
        throw new Error('No news items found in Steam API');
      }

      const filteredItems = this.filterRelevantNews(newsitems, ['season', 'ss', 'patch', 'livestream', 'launch', 'preview']);
      const targetItems = filteredItems.length > 0 ? filteredItems.slice(0, 10) : newsitems.slice(0, 5);

      const firstItem = targetItems[0] || newsitems[0];
      const latestNewsId = firstItem.gid;

      if (existingGame && existingGame.latestNews && existingGame.latestNews.id === latestNewsId) {
        console.log(`[Orchestrator] [Torchlight Infinite] Latest news unchanged (gid=${latestNewsId}). Skipping Gemini call.`);
        return existingGame;
      }

      console.log(`[Orchestrator] [Torchlight Infinite] New article detected (gid=${latestNewsId}). Calling Gemini...`);

      const newsText = targetItems.map(item => 
        `Title: ${item.title}\nDate: ${new Date(item.date * 1000).toISOString()}\nSummary: ${this.cleanHtml(item.contents)}`
      ).join('\n\n---\n\n');

      const todayIso = new Date().toISOString().split('T')[0];
      const systemInstruction = `You are a data extractor for SeasonForge. Extract ARPG game season details for Torchlight Infinite:
Today's date is: ${todayIso}.
1. Current Season details (name EN/RU, startDate, endDate).
2. Next Season details (name EN/RU, startDate, endDate, verification).
3. Timeline events (Pre-season, Livestreams, Season launches) with EN/RU titles and dates.
4. Game status: "active", "in-development", "maintenance", "ending".
5. Key features list EN/RU.

CRITICAL RULES:
- If an article describes an upcoming season or season preview/teaser whose launch date is in the future relative to today (${todayIso}), it is the NEXT season, NOT the current season.
- NEVER mark a season with a future start date as currentSeason.
- Formatting rule: Dates MUST be YYYY-MM-DD or full ISO strings.`;

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
                type: { type: 'STRING', description: 'One of: ptr, livestream, season_start, expansion' },
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
          'status', 'featuresEn', 'featuresRu'
        ]
      };

      const extracted = await this.callGemini(newsText, systemInstruction, schema);

      const parsedEvents = (extracted.events || []).map(ev => ({
        id: ev.id || `${ev.type}-${this.hashString(ev.titleEn + ev.startDate).slice(0, 6)}`,
        type: ev.type || 'season_start',
        title: { en: ev.titleEn || '', ru: ev.titleRu || ev.titleEn || '' },
        startDate: this.normalizeAndValidateDate(ev.startDate),
        endDate: this.normalizeAndValidateDate(ev.endDate),
        verification: ev.verification || 'official'
      })).filter(ev => ev.startDate !== '');

      const nowMs = Date.now();
      const extractedCurrentStart = this.normalizeAndValidateDate(extracted.currentSeasonStartDate);
      const isCurrentStartInFuture = extractedCurrentStart && new Date(extractedCurrentStart).getTime() > nowMs;

      let effectiveNextSeasonName = extracted.nextSeasonNameEn || existingGame?.nextSeason?.name?.en || 'TBA';
      let effectiveNextSeasonNameRu = extracted.nextSeasonNameRu || extracted.nextSeasonNameEn || existingGame?.nextSeason?.name?.ru || 'TBA';
      let effectiveNextSeasonStart = this.normalizeAndValidateDate(extracted.nextSeasonStartDate) || existingGame?.nextSeason?.startDate || '';
      let effectiveNextSeasonEnd = this.normalizeAndValidateDate(extracted.nextSeasonEndDate) || existingGame?.nextSeason?.endDate || '';
      let effectiveNextVerification = extracted.nextSeasonStartDate ? (extracted.nextSeasonVerification === 'official' ? 'official' : 'estimated') : (existingGame?.nextSeason?.verification || 'estimated');

      // If Gemini mistakenly returned a future start date as currentSeason, route it to nextSeason
      if (isCurrentStartInFuture) {
        console.warn(`[Torchlight Infinite] Gemini returned future start date (${extractedCurrentStart}) as currentSeason. Routing to nextSeason.`);
        effectiveNextSeasonName = extracted.currentSeasonNameEn || effectiveNextSeasonName;
        effectiveNextSeasonNameRu = extracted.currentSeasonNameRu || effectiveNextSeasonNameRu;
        effectiveNextSeasonStart = extractedCurrentStart;
        effectiveNextVerification = 'official';
      }

      // Calculate estimated 3-month duration (~91 days) for nextSeason if endDate is missing to avoid TBA
      if (effectiveNextSeasonStart && (!effectiveNextSeasonEnd || effectiveNextSeasonEnd === 'TBA')) {
        const startObj = new Date(effectiveNextSeasonStart);
        if (!isNaN(startObj.getTime())) {
          effectiveNextSeasonEnd = new Date(startObj.getTime() + 91 * 86400000).toISOString();
        }
      }

      // Synchronize currentSeason endDate with nextSeason startDate if known
      const currentStart = (!isCurrentStartInFuture && extractedCurrentStart) || existingGame?.currentSeason?.startDate || '';
      const currentEnd = effectiveNextSeasonStart || this.normalizeAndValidateDate(extracted.currentSeasonEndDate) || existingGame?.currentSeason?.endDate || '';
      const isEndingSoon = currentEnd && (new Date(currentEnd).getTime() - nowMs) <= 14 * 86400000 && (new Date(currentEnd).getTime() - nowMs) > 0;
      const statusCode = isEndingSoon ? 'ending' : (extracted.status || existingGame?.status?.code || 'active');

      const normalized = {
        id: this.gameId,
        name: { en: 'Torchlight: Infinite', ru: 'Торчлайт: Инфинит' },
        developer: 'XD',
        logo: 'torchlight-infinite.png',
        color: '#c27a2b',
        icon: 'zap',
        website: 'https://torchlightinfinite.com/',
        latestNews: {
          id: latestNewsId,
          title: newsitems[0].title || 'Torchlight: Infinite Steam Update',
          url: newsitems[0].url || 'https://torchlightinfinite.com/',
          publishDate: new Date(newsitems[0].date * 1000).toISOString(),
          source: 'Torchlight Infinite Steam News'
        },
        status: {
          ...this.normalizeStatus(statusCode),
          updatedAt: new Date().toISOString()
        },
        currentSeason: {
          name: {
            en: isCurrentStartInFuture ? (existingGame?.currentSeason?.name?.en || 'SS13: Afterlight') : (extracted.currentSeasonNameEn || existingGame?.currentSeason?.name?.en || 'TBA'),
            ru: isCurrentStartInFuture ? (existingGame?.currentSeason?.name?.ru || 'SS13: Afterlight') : (extracted.currentSeasonNameRu || extracted.currentSeasonNameEn || existingGame?.currentSeason?.name?.ru || 'TBA')
          },
          startDate: currentStart,
          endDate: currentEnd,
          isActive: ['active', 'in-progress', 'just-started', 'ending'].includes(statusCode),
          verification: 'official',
          sourceUrl: newsitems[0].url || 'https://torchlightinfinite.com/'
        },
        nextSeason: {
          name: {
            en: effectiveNextSeasonName,
            ru: effectiveNextSeasonNameRu
          },
          startDate: effectiveNextSeasonStart,
          endDate: effectiveNextSeasonEnd,
          isActive: false,
          verification: effectiveNextVerification,
          verificationNote: existingGame?.nextSeason?.verificationNote || {
            en: "Estimated date based on standard 3-month seasonal cycle of Torchlight: Infinite",
            ru: "Расчётная дата запуска на основе стандартного 3-месячного сезонного цикла Torchlight: Infinite"
          },
          sourceUrl: newsitems[0].url || 'https://torchlightinfinite.com/'
        },
        features: {
          en: (extracted.featuresEn && extracted.featuresEn.length > 0) ? extracted.featuresEn : (existingGame?.features?.en || []),
          ru: (extracted.featuresRu && extracted.featuresRu.length > 0) ? extracted.featuresRu : (existingGame?.features?.ru || [])
        },
        ptr: existingGame?.ptr || null,
        events: parsedEvents.length > 0 ? parsedEvents : (existingGame?.events || []),
        links: { official: 'https://torchlightinfinite.com/', wiki: '', community: '' },
        metadata: { region: 'Global', platforms: ['PC'], tags: ['ARPG', 'Free-to-play'] }
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
