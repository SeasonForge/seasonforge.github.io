import { detectDefaultLocale } from '../i18n/index.js';

/**
 * Safely persist a key/value to localStorage. Silently ignores quota / disabled-storage errors.
 * @param {string} key
 * @param {string} value
 */
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // QuotaExceededError, SecurityError, or storage disabled (private mode) — non-fatal.
  }
}

export function detectDefaultView() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'timeline';
  return window.matchMedia('(min-width: 1025px)').matches ? 'timeline' : 'card';
}

// Global application state.
export const state = {
  games: [],
  activeGame: null,
  activeView: detectDefaultView(),
  loading: false,
  error: null,
  lastUpdate: null,
  rawData: null,
  settings: {
    theme: 'dark',
    autoRefresh: true,
    notificationsEnabled: true,
    lang: detectDefaultLocale()
  }
};

export function setLanguage(lang) {
  if (lang === 'en' || lang === 'ru') {
    state.settings.lang = lang;
    safeSetItem('seasonforge_lang', lang);
    document.documentElement.lang = lang;
  }
  return state;
}

export function setGames(games) {
  state.games = Array.isArray(games) ? games : [];
  return state;
}

export function setRawData(data) {
  state.rawData = data || null;
  return state;
}

export function setActiveGame(game, saveToStorage = false) {
  state.activeGame = game ?? null;
  if (saveToStorage && game) {
    safeSetItem('lastGame', game.id);
  }
  return state;
}

export function setActiveView(view, saveToStorage = false) {
  if (['timeline', 'card', 'games', 'more'].includes(view)) {
    state.activeView = view;
  } else {
    state.activeView = 'card';
  }
  if (saveToStorage) {
    const mapping = {
      'timeline': 'Timeline',
      'card': 'Game Card',
      'games': 'Games',
      'more': 'More'
    };
    safeSetItem('lastView', mapping[state.activeView] || 'Game Card');
  }
  return state;
}

export function setLoading(isLoading) {
  state.loading = Boolean(isLoading);
  return state;
}

export function setError(error) {
  state.error = error ?? null;
  return state;
}

export function getState() {
  return state;
}
