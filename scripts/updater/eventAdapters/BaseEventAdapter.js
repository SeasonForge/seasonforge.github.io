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
            description: 'List of rewards (skins, portals, pets, titles, caches)'
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

  getSystemInstruction() {
    const todayIso = new Date().toISOString().split('T')[0];
    return `
You are an expert ARPG event monitor and structured data extractor.
Today's date is: ${todayIso}.

Analyze the provided official announcements / news articles and extract ONLY valid, active or upcoming short-term in-game activities:
1. Twitch Drops & Support-a-Streamer campaigns (rewards, dates, watch requirements).
2. Public Test Realms (PTR / Beta / Playtests).
3. Mid-season races, gauntlets, ladder resets, Flashbacks, special modifiers.
4. Collaborations & Crossovers (especially those offering cosmetics/rewards).
5. Celebration login events, anniversaries, free reward caches.

RULES:
- Do NOT extract regular shop microtransactions (MTX sales) unless they offer free rewards/drops.
- Do NOT extract simple balance patch notes or server maintenance windows.
- Dates MUST be normalized to strict ISO 8601 UTC strings (e.g. "2026-08-20T18:00:00Z"). If time is unknown, use "T00:00:00Z".
- If end date is unannounced/unknown, set endDate to null.
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

      const detId = generateDeterministicId(this.gameId, item.type, item.title_en);
      const existing = eventMap.get(detId);

      const merged = {
        id: detId,
        gameId: this.gameId,
        type: item.type || 'event',
        title_ru: item.title_ru || existing?.title_ru || item.title_en,
        title_en: item.title_en,
        startDate: item.startDate || existing?.startDate || nowIso,
        endDate: item.endDate !== undefined ? item.endDate : (existing?.endDate || null),
        description_ru: item.description_ru || existing?.description_ru || '',
        description_en: item.description_en || existing?.description_en || '',
        rewards: Array.isArray(item.rewards) && item.rewards.length > 0 ? item.rewards : (existing?.rewards || []),
        sourceUrl: item.sourceUrl || existing?.sourceUrl || '',
        updatedAt: nowIso
      };

      eventMap.set(detId, merged);
    }

    return Array.from(eventMap.values());
  }
}
