import { getState, setActiveGame, setActiveView } from '../store/state.js';
import { t, getVal } from '../i18n/index.js';
import { trackEvent } from '../utils/analytics.js';

let timelineMode = 'seasons';
let isSwitchingTimelineMode = false;
let isInitialized = false;

export function getTimelineMode() {
  return timelineMode;
}

export function setTimelineMode(mode) {
  timelineMode = mode;
}

export function initSwitcherSlider() {
  if (typeof document === 'undefined') return;
  const switchers = document.querySelectorAll('.timeline-integrated-switcher');
  switchers.forEach(switcher => {
    const slider = switcher.querySelector('.timeline-switcher-slider');
    const activeTab = switcher.querySelector('.timeline-switcher-tab.active');
    if (!slider || !activeTab) return;

    const left = activeTab.offsetLeft;
    const width = activeTab.offsetWidth;

    slider.style.width = `${width}px`;
    slider.style.transform = `translate3d(${left - 3}px, 0, 0)`;

    if (activeTab.dataset.mode === 'events') {
      slider.classList.add('is-events');
    } else {
      slider.classList.remove('is-events');
    }
  });
}

export function switchTimelineMode(targetMode, onRender) {
  if (timelineMode === targetMode || isSwitchingTimelineMode) return;
  isSwitchingTimelineMode = true;

  const currentSwitcher = document.querySelector('.timeline-integrated-switcher');
  const targetTab = document.getElementById(`tab-mode-${targetMode}`);
  const currentTab = document.getElementById(`tab-mode-${timelineMode}`);

  if (currentSwitcher && targetTab) {
    const slider = currentSwitcher.querySelector('.timeline-switcher-slider');
    if (slider) {
      const left = targetTab.offsetLeft;
      const width = targetTab.offsetWidth;
      slider.style.width = `${width}px`;
      slider.style.transform = `translate3d(${left - 3}px, 0, 0)`;
      if (targetMode === 'events') {
        slider.classList.add('is-events');
      } else {
        slider.classList.remove('is-events');
      }
    }
    if (currentTab) {
      currentTab.classList.remove('active');
      currentTab.setAttribute('aria-selected', 'false');
    }
    targetTab.classList.add('active');
    targetTab.setAttribute('aria-selected', 'true');
  }

  setTimeout(() => {
    timelineMode = targetMode;
    if (targetMode === 'events') {
      if (!window.location.pathname.includes('/events')) {
        window.history.pushState({ mode: 'events' }, '', '/events/');
      }
    } else {
      if (window.location.pathname.includes('/events')) {
        window.history.pushState({ mode: 'seasons' }, '', '/');
      }
    }
    if (typeof onRender === 'function') {
      onRender();
    }
    isSwitchingTimelineMode = false;
  }, 120);
}

export function attachNavbarEvents({ onRender, onToast }) {
  const navbarRoot = document.getElementById('navbar');
  if (!navbarRoot) return;

  if (!navbarRoot.dataset.navbarDelegated) {
    navbarRoot.dataset.navbarDelegated = 'true';
    navbarRoot.addEventListener('click', (event) => {
      // 1) Game tab click
      const tab = event.target.closest('.navbar__tab[data-game-id]');
      if (tab) {
        event.preventDefault();
        const gameId = tab.getAttribute('data-game-id');
        const state = getState();
        const nextGame = state.games.find((game) => game.id === gameId || game.slug === gameId);

        if (nextGame) {
          trackEvent('game_selected', {
            game_id: nextGame.id,
            game_name: getVal(nextGame.name) || 'Untitled Game',
            view: state.activeView || 'card'
          });
          setActiveGame(nextGame, true);
          setActiveView('card', true);
          if (typeof onToast === 'function') {
            onToast(t('toasts.gameSelected', { game: getVal(nextGame.name) }));
          }
          if (typeof onRender === 'function') {
            onRender();
          }
        }
        return;
      }

      // 2) View switch buttons
      const viewCardBtn = event.target.closest('#view-card-btn');
      if (viewCardBtn) {
        const state = getState();
        setActiveView('card', true);
        if (!state.activeGame) {
          const lastGame = localStorage.getItem('lastGame');
          const matched = state.games.find(g => g.id === lastGame || g.name?.en === lastGame || g.name?.ru === lastGame);
          if (matched) {
            setActiveGame(matched, true);
          } else if (state.games.length > 0) {
            setActiveGame(state.games[0], true);
          }
        }
        if (typeof onRender === 'function') {
          onRender();
        }
        return;
      }

      const viewTimelineBtn = event.target.closest('#view-timeline-btn');
      if (viewTimelineBtn) {
        setActiveView('timeline', true);
        if (typeof onRender === 'function') {
          onRender();
        }
        return;
      }
    });
  }

  // Mobile Bottom Nav listeners & active class sync
  const state = getState();
  const mobTrackerBtn = document.getElementById('mob-btn-tracker');
  const mobTimelineBtn = document.getElementById('mob-btn-timeline');
  const mobGamesBtn = document.getElementById('mob-btn-games');
  const mobMoreBtn = document.getElementById('mob-btn-more');

  [mobTrackerBtn, mobTimelineBtn, mobGamesBtn, mobMoreBtn].forEach(b => b?.classList.remove('mobile-nav__btn--active'));
  if (state.activeView === 'card' && mobTrackerBtn) mobTrackerBtn.classList.add('mobile-nav__btn--active');
  else if (state.activeView === 'timeline' && mobTimelineBtn) mobTimelineBtn.classList.add('mobile-nav__btn--active');
  else if (state.activeView === 'games' && mobGamesBtn) mobGamesBtn.classList.add('mobile-nav__btn--active');
  else if (state.activeView === 'more' && mobMoreBtn) mobMoreBtn.classList.add('mobile-nav__btn--active');

  if (mobTrackerBtn && !mobTrackerBtn.dataset.bound) {
    mobTrackerBtn.dataset.bound = 'true';
    mobTrackerBtn.addEventListener('click', () => {
      setActiveView('card', true);
      const currentState = getState();
      if (!currentState.activeGame && currentState.games.length > 0) {
        const lastGame = localStorage.getItem('lastGame');
        const matched = currentState.games.find(g => g.id === lastGame || g.name?.en === lastGame || g.name?.ru === lastGame);
        setActiveGame(matched || currentState.games[0], true);
      }
      if (typeof onRender === 'function') onRender();
    });
  }
  if (mobTimelineBtn && !mobTimelineBtn.dataset.bound) {
    mobTimelineBtn.dataset.bound = 'true';
    mobTimelineBtn.addEventListener('click', () => {
      setActiveView('timeline', true);
      if (typeof onRender === 'function') onRender();
    });
  }
  if (mobGamesBtn && !mobGamesBtn.dataset.bound) {
    mobGamesBtn.dataset.bound = 'true';
    mobGamesBtn.addEventListener('click', () => {
      setActiveView('games', true);
      if (typeof onRender === 'function') onRender();
    });
  }
  if (mobMoreBtn && !mobMoreBtn.dataset.bound) {
    mobMoreBtn.dataset.bound = 'true';
    mobMoreBtn.addEventListener('click', () => {
      setActiveView('more', true);
      if (typeof onRender === 'function') onRender();
    });
  }
}

export function initGlobalNavigationListeners({ onRender, onOpenDrawer }) {
  if (isInitialized || typeof document === 'undefined') return;
  isInitialized = true;

  document.addEventListener('click', (e) => {
    const tabSeasons = e.target.closest('#tab-mode-seasons');
    if (tabSeasons) {
      e.preventDefault();
      switchTimelineMode('seasons', onRender);
      return;
    }

    const tabEvents = e.target.closest('#tab-mode-events');
    if (tabEvents) {
      e.preventDefault();
      switchTimelineMode('events', onRender);
      return;
    }

    // Click on upcoming-card event badge -> Switch to events timeline & open event detail drawer
    const eventBadge = e.target.closest('.upcoming-card__event-badge[data-event-id]');
    if (eventBadge) {
      e.preventDefault();
      e.stopPropagation();
      const eventId = eventBadge.dataset.eventId;
      if (!eventId) return;

      if (getState().activeView !== 'timeline') {
        setActiveView('timeline', false);
      }
      if (timelineMode !== 'events') {
        switchTimelineMode('events', onRender);
      } else if (typeof onRender === 'function') {
        onRender();
      }

      setTimeout(() => {
        if (typeof onOpenDrawer === 'function') {
          onOpenDrawer(eventId);
        }
        const timelineEl = document.querySelector('.timeline-view-wrapper') || document.querySelector('.events-dashboard-desktop');
        if (timelineEl) {
          timelineEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 160);
      return;
    }
  });

  window.addEventListener('popstate', () => {
    if (window.location.pathname.includes('/events')) {
      timelineMode = 'events';
      setActiveView('timeline', false);
    } else {
      timelineMode = 'seasons';
    }
    if (typeof onRender === 'function') onRender();
  });

  window.addEventListener('resize', () => {
    initSwitcherSlider();
  });
}
