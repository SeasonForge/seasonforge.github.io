import { BaseAdapter } from '../adapters/BaseAdapter.js';

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateDeterministicId(gameId, type, titleEn) {
  const normType = String(type || 'event').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const slug = slugify(titleEn || 'activity').slice(0, 45);
  return `${gameId}_${normType}_${slug}`;
}

export function cleanSourceUrl(url, gameId) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    const defaultHubs = {
      'path-of-exile': 'https://www.pathofexile.com/forum',
      'path-of-exile-2': 'https://www.pathofexile.com/forum',
      'diablo-iv': 'https://news.blizzard.com/en-us/diablo4',
      'last-epoch': 'https://forum.lastepoch.com',
      'torchlight-infinite': 'https://torchlight.xd.com'
    };
    return defaultHubs[gameId] || '';
  }

  let cleaned = url.trim();

  // 1. Steam akamaihd/externalpost URLs conversion
  if (cleaned.includes('steamstore-a.akamaihd.net') || cleaned.includes('/news/externalpost/')) {
    const match = cleaned.match(/steam_community_announcements\/(\d+)/) || cleaned.match(/\/(\d+)$/);
    if (match && match[1]) {
      const appMap = {
        'path-of-exile': 238960,
        'path-of-exile-2': 2694490,
        'last-epoch': 899770,
        'torchlight-infinite': 1974050
      };
      const appId = appMap[gameId] || 238960;
      return `https://store.steampowered.com/news/app/${appId}/view/${match[1]}`;
    }
  }

  // 2. Steam community announcement URLs
  if (cleaned.includes('steamcommunity.com/games/') && cleaned.includes('/announcements/detail/')) {
    const match = cleaned.match(/\/announcements\/detail\/(\d+)/);
    if (match && match[1]) {
      const appMap = {
        'path-of-exile': 238960,
        'path-of-exile-2': 2694490,
        'last-epoch': 899770,
        'torchlight-infinite': 1974050
      };
      const appId = appMap[gameId] || 238960;
      return `https://store.steampowered.com/news/app/${appId}/view/${match[1]}`;
    }
  }

  // 3. Normalize HTTP to HTTPS
  if (cleaned.startsWith('http://')) {
    cleaned = 'https://' + cleaned.slice(7);
  }

  return cleaned;
}

export const EVENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    events: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: {
            type: 'STRING',
            enum: ['twitch_drops', 'ptr', 'race', 'collab', 'login', 'event']
          },
          title_ru: { type: 'STRING' },
          title_en: { type: 'STRING' },
          startDate: { type: 'STRING', description: 'ISO 8601 UTC timestamp, e.g. 2026-08-20T18:00:00Z' },
          endDate: { type: 'STRING', description: 'ISO 8601 UTC timestamp or null' },
          description_ru: { type: 'STRING', description: '1-2 concise sentences focusing on rewards' },
          description_en: { type: 'STRING', description: '1-2 concise sentences focusing on rewards' },
          rewards: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'Top 2-4 key exclusive cosmetic or prestigious rewards (skins, portals, pets, titles, boxes). Do NOT include mundane currencies, vouchers, or materials.'
          },
          gameId: {
            type: 'STRING',
            description: 'Target game ID (e.g. "path-of-exile", "path-of-exile-2", "diablo-iv", "last-epoch", "torchlight-infinite")'
          },
          sourceUrl: { type: 'STRING', description: 'Official link to article/announcement' }
        },
        required: ['type', 'title_ru', 'title_en', 'startDate', 'description_ru', 'description_en']
      }
    }
  },
  required: ['events']
};

export class BaseEventAdapter extends BaseAdapter {
  constructor(gameId) {
    super(gameId);
  }

  filterNoiseItems(items = []) {
    const noisePatterns = [
      /\bhotfix\b/i,
      /\bpatch notes\b/i,
      /\bbug fixes?\b/i,
      /\bmaintenance\b/i,
      /\bserver downtime\b/i,
      /\btechnical update\b/i,
      /\bknown issues\b/i,
      /\broutine check\b/i
    ];

    return items.filter(item => {
      const title = item.title || item.properties?.title || '';
      const summary = item.contents || item.properties?.summary || '';
      const combined = `${title} ${summary}`;

      // Always keep if title or summary contains event indicators
      const hasImportantKeyword = /\b(event|drops|ptr|race|qualifier|hardcore|challenge|contest|art|anniversary|login|rewards?|gauntlet|flashback|server launch)\b/i.test(combined);
      if (hasImportantKeyword) return true;

      return !noisePatterns.some(p => p.test(title));
    });
  }

  getSystemInstruction() {
    const todayIso = new Date().toISOString().split('T')[0];
    return `
You are an expert ARPG event monitor and structured data extractor.
Today's date is: ${todayIso}.

Analyze the provided official announcements / news articles and extract ONLY valid, active or upcoming short-term in-game activities:
1. Twitch Drops & Support-a-Streamer campaigns (rewards, dates, watch requirements).
2. Public Test Realms (PTR / Beta / Playtests).
3. Mid-season races, gauntlets, ladder resets, Flashbacks, special modifiers.
4. Mid-season Hardcore / Challenge servers (e.g. "Afterlight Hardcore Server", Race servers).
5. Collaborations & Crossovers (especially those offering cosmetics/rewards).
6. Celebration login events, anniversaries, free reward caches, official community contests (e.g. Fan Art Competitions with in-game rewards).

CRITICAL RULE: DECOMPOSE MULTI-STAGE EVENTS & RACE SERIES:
- If an announcement describes a multi-stage tournament, race series, qualifier rounds, or episodic drops (e.g., "Qualifier #1 (Aug 6), Qualifier #2 (Aug 13), Qualifier #3 (Aug 20), Qualifier #4 (Aug 27)", or "Stage 1 vs Stage 2 Drops"):
  You MUST decompose them and extract EACH individual active or upcoming stage as a SEPARATE event object with its EXACT start and end timestamp (e.g., 'ExileCon 2026: Race Qualifier #3', 'ExileCon 2026: Race Qualifier #4').
- NEVER merge a multi-week series into a single blurry 3-week block when individual rounds have discrete dates and times.
- Ignore stages that have already ended more than 7 days ago.

CRITICAL RULES FOR DATES & DURATION:
- Events MUST be limited-time activities (typically 1 to 21 days, absolute maximum 30 days).
- NEVER set the endDate of an event to the end of the entire season (e.g. 2-3 months away). If a season launch announcement includes a "login event" or "launch campaign", extract the dates of the specific launch/login window (typically the first 7 to 14 days after start), NOT the whole season duration.
- Do NOT extract full season lifecycles as events (seasons are tracked separately).
- STRICT PROHIBITION ON DATE HALLUCINATIONS: NEVER invent, approximate, or extrapolate an endDate. If the exact end date/time is NOT explicitly stated in the source text, you MUST set endDate: null.
- Dates MUST be normalized to strict ISO 8601 UTC strings (e.g. "2026-08-20T21:00:00Z"). If time is unknown, use "T00:00:00Z".
- If end date is unannounced/unknown, set endDate to null.

CRITICAL RULES FOR REWARDS:
- Extract ONLY 2 to 4 key exclusive or cosmetic rewards (e.g., "Weapon Skin", "Exclusive Portal Effect", "Mystery Box", "Demigod's Unique", "Super Time Transition Capsule").
- STRICTLY EXCLUDE mundane in-game currencies, crafting materials, tax vouchers, utility tickets, or standard consumables.

CRITICAL RULES FOR CANONICAL SOURCE URLS:
- Extract the direct official announcement permalink from the news item:
  * For Path of Exile 1 & 2: Extract direct official forum thread link ('https://www.pathofexile.com/forum/view-thread/...') or Steam news permalink.
  * For Diablo IV: Extract full Blizzard news article link ('https://news.blizzard.com/en-us/article/...').
  * For Torchlight: Infinite & Last Epoch: Extract direct Steam news link, forum thread, or official developer post (e.g. on x.com).
- If the news text body references or links to the official announcement thread / article, prefer that direct link over generic aggregators.
- NEVER invent, truncate, or hallucinate URLs.

CRITICAL RULES FOR CROSS-GAME CONTESTS:
- If an announcement mentions both Path of Exile 1 and Path of Exile 2 (like the Fan Art Competition), ensure it is marked appropriately or extracted for the relevant games.

OTHER RULES:
- Do NOT extract regular shop microtransactions (MTX sales) unless they offer free rewards/drops.
- Do NOT extract simple balance patch notes or server maintenance windows.
- Provide bilingual titles and descriptions (Russian and English).
- Return valid JSON matching the schema.
`.trim();
  }

  // Merges extracted events into existing event list with deterministic IDs
  mergeEvents(existingGameEvents = [], extractedEvents = []) {
    const eventMap = new Map();

    // Index existing events
    for (const evt of existingGameEvents) {
      if (evt && evt.id) {
        eventMap.set(evt.id, { ...evt });
      }
    }

    const nowIso = new Date().toISOString();

    for (const item of extractedEvents) {
      if (!item || !item.title_en) continue;

      const cleanUrl = cleanSourceUrl(item.sourceUrl || '', this.gameId);

      const targetGameId = item.gameId || this.gameId;
      const detId = generateDeterministicId(targetGameId, item.type, item.title_en);
      const itemTitleSlug = slugify(item.title_en);

      // Find existing match by exact ID, or same sourceUrl + identical title slug
      let matchedKey = null;
      if (eventMap.has(detId)) {
        matchedKey = detId;
      } else {
        for (const [key, val] of eventMap.entries()) {
          if (val.gameId === targetGameId && cleanUrl && val.sourceUrl === cleanUrl && slugify(val.title_en) === itemTitleSlug) {
            matchedKey = key;
            break;
          }
        }
      }

      const finalId = matchedKey || detId;
      const existing = eventMap.get(finalId);

      const merged = {
        id: finalId,
        gameId: targetGameId,
        type: item.type || 'event',
        title_ru: item.title_ru || existing?.title_ru || item.title_en,
        title_en: item.title_en,
        startDate: item.startDate || existing?.startDate || nowIso,
        endDate: item.endDate !== undefined ? item.endDate : (existing?.endDate || null),
        description_ru: item.description_ru || existing?.description_ru || '',
        description_en: item.description_en || existing?.description_en || '',
        rewards: Array.isArray(item.rewards) && item.rewards.length > 0 ? item.rewards : (existing?.rewards || []),
        sourceUrl: cleanUrl || existing?.sourceUrl || '',
        updatedAt: nowIso
      };

      if (matchedKey && matchedKey !== finalId) {
        eventMap.delete(matchedKey);
      }
      eventMap.set(finalId, merged);
    }

    return Array.from(eventMap.values());
  }
}
