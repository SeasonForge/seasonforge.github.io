// Service for loading and accessing season data.
import { CONFIG } from '../config.js';

const FALLBACK_SEASONS_DATA = {
  "lastCheckedAt": "2026-07-24T22:15:43.357Z",
  "games": [
    {
      "id": "path-of-exile",
      "name": { "en": "Path of Exile 1", "ru": "Path of Exile 1" },
      "developer": "Grinding Gear Games",
      "logo": "path-of-exile.png",
      "color": "#f5c342",
      "icon": "💀",
      "website": "https://www.pathofexile.com/",
      "status": { "code": "active", "label": { "en": "Active", "ru": "Активен" }, "updatedAt": "2026-07-24T22:15:42.047Z" },
      "currentSeason": { "name": { "en": "Curse of the Allflame", "ru": "Curse of the Allflame" }, "startDate": "2026-07-24T20:00:00Z", "endDate": "", "isActive": true, "verification": "official" },
      "nextSeason": { "name": { "en": "3.29 (TBA)", "ru": "3.29 (TBA)" }, "startDate": "", "endDate": "", "isActive": false, "verification": "tba" }
    },
    {
      "id": "path-of-exile-2",
      "name": { "en": "Path of Exile 2", "ru": "Path of Exile 2" },
      "developer": "Grinding Gear Games",
      "logo": "path-of-exile-2.png",
      "color": "#eab308",
      "icon": "⚔️",
      "website": "https://pathofexile2.com/",
      "status": { "code": "early-access", "label": { "en": "Early Access", "ru": "Ранний доступ" }, "updatedAt": "2026-07-24T22:15:42.047Z" },
      "currentSeason": { "name": { "en": "0.5.0: Return of the Ancients", "ru": "0.5.0: Return of the Ancients" }, "startDate": "2026-07-02T10:00:00Z", "endDate": "", "isActive": true, "verification": "official" },
      "nextSeason": { "name": { "en": "TBA", "ru": "TBA" }, "startDate": "", "endDate": "", "isActive": false, "verification": "tba" }
    },
    {
      "id": "diablo-iv",
      "name": { "en": "Diablo IV", "ru": "Diablo IV" },
      "developer": "Blizzard Entertainment",
      "logo": "diablo-iv.png",
      "color": "#ef4444",
      "icon": "🔥",
      "website": "https://diablo4.blizzard.com/",
      "status": { "code": "active", "label": { "en": "In Progress", "ru": "В разгаре" }, "updatedAt": "2026-07-24T22:15:42.047Z" },
      "currentSeason": { "name": { "en": "Season 14: Season of Death Awakening", "ru": "Сезон 14: Сезон Пробуждения Смерти" }, "startDate": "2026-06-15T00:00:00Z", "endDate": "2026-09-15T00:00:00Z", "isActive": true, "verification": "official" },
      "nextSeason": { "name": { "en": "Season 15", "ru": "Сезон 15" }, "startDate": "2026-09-16T00:00:00Z", "endDate": "", "isActive": false, "verification": "official" }
    },
    {
      "id": "last-epoch",
      "name": { "en": "Last Epoch", "ru": "Last Epoch" },
      "developer": "Eleventh Hour Games",
      "logo": "last-epoch.png",
      "color": "#a855f7",
      "icon": "⏳",
      "website": "https://lastepoch.com/",
      "status": { "code": "active", "label": { "en": "Active", "ru": "Активен" }, "updatedAt": "2026-07-24T22:15:42.047Z" },
      "currentSeason": { "name": { "en": "Cycle 4: Shattered Omens", "ru": "Цикл 4: Shattered Omens" }, "startDate": "2026-07-10T15:00:00Z", "endDate": "", "isActive": true, "verification": "official" },
      "nextSeason": { "name": { "en": "Cycle 5", "ru": "Цикл 5" }, "startDate": "2026-11-01T00:00:00Z", "endDate": "", "isActive": false, "verification": "estimated" }
    },
    {
      "id": "torchlight-infinite",
      "name": { "en": "Torchlight: Infinite", "ru": "Торчлайт: Инфинит" },
      "developer": "XD Inc.",
      "logo": "torchlight-infinite.png",
      "color": "#06b6d4",
      "icon": "⚡",
      "website": "https://torchlight.xd.com/",
      "status": { "code": "just-launched", "label": { "en": "Just Launched", "ru": "Только начался" }, "updatedAt": "2026-07-24T22:15:42.047Z" },
      "currentSeason": { "name": { "en": "SS15: Afterlight", "ru": "SS15: Afterlight" }, "startDate": "2026-07-20T00:00:00Z", "endDate": "", "isActive": true, "verification": "official" },
      "nextSeason": { "name": { "en": "SS16", "ru": "SS16" }, "startDate": "2026-10-20T00:00:00Z", "endDate": "", "isActive": false, "verification": "estimated" }
    }
  ]
};

export class SeasonService {
  /**
   * @param {string} [seasonsPath] - Optional override for the data path.
   */
  constructor(seasonsPath) {
    this.seasonsPath = seasonsPath || CONFIG.data.seasonsPath;
  }

  async loadSeasons() {
    let fetchPath = this.seasonsPath || './data/seasons.json';
    const pathsToTry = [];

    if (typeof window !== 'undefined') {
      try {
        const rootUrl = new URL('/data/seasons.json', window.location.origin).href;
        pathsToTry.push(rootUrl + `?t=${Date.now()}`);
        pathsToTry.push(rootUrl);
      } catch (e) {}

      try {
        const relativeUrl = new URL('data/seasons.json', window.location.href).href;
        pathsToTry.push(relativeUrl + `?t=${Date.now()}`);
        pathsToTry.push(relativeUrl);
      } catch (e) {}

      const isGamesSubdir = window.location.pathname.includes('/games/');
      if (isGamesSubdir && !fetchPath.startsWith('http') && !fetchPath.startsWith('/')) {
        fetchPath = '../../data/seasons.json';
      }
    }

    const cacheBuster = `?t=${Date.now()}`;
    pathsToTry.push(fetchPath + cacheBuster);
    pathsToTry.push(fetchPath);
    pathsToTry.push('./data/seasons.json' + cacheBuster);
    pathsToTry.push('/data/seasons.json' + cacheBuster);

    for (const pathUrl of pathsToTry) {
      try {
        const response = await fetch(pathUrl);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.games) && data.games.length > 0) {
            if (typeof localStorage !== 'undefined') {
              try { localStorage.setItem('cached_seasons_data', JSON.stringify(data)); } catch (e) {}
            }
            return data;
          }
        }
      } catch (err) {}
    }

    // Attempt retrieval from localStorage cache if fetch attempts fail
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem('cached_seasons_data');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.games) && parsed.games.length > 0) {
            return parsed;
          }
        }
      } catch (e) {}
    }

    // Ultimate fallback if network and cache both fail
    return FALLBACK_SEASONS_DATA;
  }

  async getGames() {
    const data = await this.loadSeasons();
    return Array.isArray(data.games) ? data.games : [];
  }

  async getGameById(id) {
    const games = await this.getGames();
    return games.find((game) => game.id === id || game.slug === id) ?? null;
  }

  async getActiveGame() {
    const games = await this.getGames();
    return games[0] ?? null;
  }
}
