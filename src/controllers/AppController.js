import { getState, setActiveView, setActiveGame } from '../store/state.js';
import { trackEvent } from '../utils/analytics.js';

export class AppController {
  static handleViewChange(view, renderCallback) {
    setActiveView(view);
    trackEvent('view_changed', { view });
    if (typeof renderCallback === 'function') {
      renderCallback();
    }
  }

  static handleGameSelect(gameId, renderCallback) {
    const state = getState();
    const game = state.games.find(g => g.id === gameId);
    if (game) {
      setActiveGame(game);
      setActiveView('card');
      trackEvent('game_selected', { game_id: gameId });
      if (typeof renderCallback === 'function') {
        renderCallback();
      }
    }
  }

  static checkForecastViewed(trackedForecastGames = new Set()) {
    const state = getState();
    const checkGame = (g) => {
      if (!g || !g.id || !g.nextSeason) return;
      const isEstimated = g.nextSeason.verification === 'estimated' || g.nextSeason.verification === 'ai';
      if (isEstimated && g.nextSeason.startDate && !trackedForecastGames.has(g.id)) {
        trackedForecastGames.add(g.id);
        trackEvent('forecast_viewed', {
          game_id: g.id,
          season_name: g.nextSeason.name?.en || g.nextSeason.name || 'Estimated Season'
        });
      }
    };

    if (state.activeView === 'card' && state.activeGame) {
      checkGame(state.activeGame);
    } else if (state.activeView === 'timeline' && Array.isArray(state.games)) {
      state.games.forEach(checkGame);
    }
  }
}
