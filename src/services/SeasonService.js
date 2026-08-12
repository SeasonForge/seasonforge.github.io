// Service for loading and accessing season data.
import { CONFIG } from '../config.js';
import { FALLBACK_SEASONS_DATA } from '../data/fallback-seasons.js';

export class SeasonService {
  /**
   * @param {string} [seasonsPath] - Optional override for the data path.
   */
  constructor(seasonsPath) {
    this.seasonsPath = seasonsPath || CONFIG.data.seasonsPath;
  }

  async loadSeasons() {
    const cacheBuster = `?t=${Date.now()}`;
    const pathsToTry = [];

    if (typeof window !== 'undefined') {
      // 1. Absolute URL from origin — works regardless of current path depth
      try {
        pathsToTry.push(new URL('/data/seasons.json', window.location.origin).href + cacheBuster);
      } catch (e) {
        console.warn('SeasonService: Failed to resolve rootUrl', e);
      }

      // 2. Relative URL from current page depth — fallback for non-standard hosting
      try {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const depth = pathSegments.length > 0 && !pathSegments[pathSegments.length - 1].includes('.') ? pathSegments.length : Math.max(0, pathSegments.length - 1);
        const relPrefix = depth > 0 ? '../'.repeat(depth) : './';
        pathsToTry.push(new URL(`${relPrefix}data/seasons.json`, window.location.href).href + cacheBuster);
      } catch (e) {
        console.warn('SeasonService: Failed to resolve relativeUrl', e);
      }
    } else {
      pathsToTry.push('./data/seasons.json');
    }

    for (const pathUrl of pathsToTry) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(pathUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.games) && data.games.length > 0) {
            if (typeof localStorage !== 'undefined') {
              try {
                localStorage.setItem('cached_seasons_data', JSON.stringify(data));
              } catch (e) {
                console.warn('SeasonService: Failed to write to localStorage', e);
              }
            }
            return data;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn(`SeasonService: Failed to fetch seasons from ${pathUrl}`, err);
      }
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
      } catch (e) {
        console.warn('SeasonService: Failed to read/parse localStorage cache', e);
      }
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
