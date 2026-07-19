import { detectDefaultLocale } from '../i18n/index.js';

// Global application state.
export const state = {
  games: [],
  activeGame: null,
  activeView: 'card', // 'card' or 'timeline'
  loading: false,
  error: null,
  lastUpdate: null,
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
    localStorage.setItem('seasonforge_lang', lang);
    document.documentElement.lang = lang;
  }
  return state;
}

export function setGames(games) {
  state.games = Array.isArray(games) ? games : [];
  return state;
}

export function setActiveGame(game) {
  state.activeGame = game ?? null;
  return state;
}

export function setActiveView(view) {
  state.activeView = view === 'timeline' ? 'timeline' : 'card';
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
