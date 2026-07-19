// Application entry point.
import { CONFIG } from './config.js';
import { SeasonService } from './services/SeasonService.js';
import {
  getState,
  setActiveGame,
  setActiveView,
  setError,
  setGames,
  setLoading,
  setLanguage
} from './store/state.js';
import { t, getVal } from './i18n/index.js';
import { render as renderNavbar } from './components/Navbar.js';
import { render as renderGameCard } from './components/GameCard.js';
import { render as renderTimeline } from './components/Timeline.js';
import { render as renderProgressBar } from './components/ProgressBar.js';
import { render as renderStatusBadge } from './components/StatusBadge.js';
import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';
import { getProgressPercent, calculateCountdown } from './utils/countdown.js';
import { formatLastUpdated } from './utils/date.js';

const seasonService = new SeasonService();
let countdownTimer = null;
let modalInstance = null;
let toastInstance = null;



function updateSeo() {
  document.title = t('seo.title');
  document.documentElement.lang = getState().settings?.lang || 'en';
  
  const desc = t('seo.description');
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.setAttribute('content', desc);
  
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', t('seo.title'));
  
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', desc);
  
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', t('seo.title'));
  
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', desc);
}

function renderLangSwitcher() {
  const switcherRoot = document.getElementById('lang-switcher');
  if (!switcherRoot) return;
  const state = getState();
  const currentLang = state.settings.lang;
  
  switcherRoot.innerHTML = `
    <button class="lang-switcher__btn ${currentLang === 'en' ? 'lang-switcher__btn--active' : ''}" data-lang-val="en">
      <img src="https://flagcdn.com/w20/us.png" class="lang-switcher__flag" alt="EN"> EN
    </button>
    <button class="lang-switcher__btn ${currentLang === 'ru' ? 'lang-switcher__btn--active' : ''}" data-lang-val="ru">
      <img src="https://flagcdn.com/w20/ru.png" class="lang-switcher__flag" alt="RU"> RU
    </button>
  `;
  
  switcherRoot.querySelectorAll('[data-lang-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-lang-val');
      if (selected !== state.settings.lang) {
        setLanguage(selected);
        updateSeo();
        renderToast(t('toasts.gameSelected', { game: getVal(state.activeGame?.name || '') }));
        renderApp();
      }
    });
  });
}

function renderModal() {
  const modalRoot = document.getElementById('modal-root');

  if (!modalRoot) {
    return;
  }

  if (!modalInstance) {
    modalInstance = Modal({
      isOpen: false,
      title: CONFIG.projectName,
      content: 'SeasonForge is ready.'
    });
  }

  modalRoot.innerHTML = modalInstance.render();
}

function renderToast(message, type = 'info') {
  const toastRoot = document.getElementById('toast-root');

  if (!toastRoot) {
    return;
  }

  toastInstance = Toast({ message, type, isVisible: true });
  toastRoot.innerHTML = toastInstance.render();

  window.setTimeout(() => {
    if (!toastInstance) {
      return;
    }

    toastInstance.hide();
    toastRoot.innerHTML = toastInstance.render();
  }, 2000);
}

function renderApp() {
  const state = getState();
  const navbarRoot = document.getElementById('navbar');
  const contentRoot = document.getElementById('content');

  // Sync title and metadata
  updateSeo();

  // Render language selector buttons
  renderLangSwitcher();

  // Translate static header elements
  const appHeaderSubtitle = document.getElementById('app-header-subtitle');
  if (appHeaderSubtitle) {
    appHeaderSubtitle.textContent = t('header.subtitle');
  }

  const lblLastUpdated = document.getElementById('lbl-last-updated');
  if (lblLastUpdated) {
    lblLastUpdated.textContent = t('header.lastUpdated');
  }

  const lblDataSource = document.getElementById('lbl-data-source');
  if (lblDataSource) {
    lblDataSource.textContent = t('header.dataSource');
  }

  // Update navbar
  if (navbarRoot) {
    navbarRoot.innerHTML = renderNavbar(state.games, state.activeGame, state.activeView);
  }

  renderModal();

  // Update dynamic timestamp in the page header
  const updateTimes = state.games.map(g => new Date(g.status?.updatedAt).getTime()).filter(t => !Number.isNaN(t));
  const latestTime = updateTimes.length > 0 ? Math.max(...updateTimes) : null;
  const timeEl = document.getElementById('last-updated-time');
  if (timeEl && latestTime) {
    timeEl.textContent = formatLastUpdated(latestTime, state.settings?.lang);
  }

  // Render main content depending on activeView
  if (contentRoot) {
    if (!state.activeGame) {
      contentRoot.innerHTML = `<p>${t('fallback.noGame')}</p>`;
      return;
    }

    if (state.activeView === 'timeline') {
      contentRoot.innerHTML = renderTimeline(state.games);
    } else {
      const countdown = calculateCountdown(state.activeGame?.nextSeason?.startDate || state.activeGame?.currentSeason?.startDate);
      const progressBar = renderProgressBar(getProgressPercent(state.activeGame), state.activeGame?.color);
      const statusBadge = renderStatusBadge(state.activeGame?.status);

      const card = renderGameCard(state.activeGame, {
        countdown,
        progressBar,
        statusBadge
      });
      contentRoot.innerHTML = card;
    }
  }

  attachNavbarEvents();
  attachFooterEvents();
}

function attachNavbarEvents() {
  const navbarRoot = document.getElementById('navbar');

  if (!navbarRoot) {
    return;
  }

  navbarRoot.querySelectorAll('.navbar__tab[data-game-id]').forEach((tab) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      const gameId = tab.getAttribute('data-game-id');
      const state = getState();
      const nextGame = state.games.find((game) => game.id === gameId || game.slug === gameId);

      if (nextGame) {
        setActiveGame(nextGame);
        renderToast(t('toasts.gameSelected', { game: getVal(nextGame.name) }));
        renderApp();
      }
    });
  });

  // Attach tab switching events
  const viewCardBtn = document.getElementById('view-card-btn');
  const viewTimelineBtn = document.getElementById('view-timeline-btn');

  if (viewCardBtn) {
    viewCardBtn.addEventListener('click', () => {
      setActiveView('card');
      renderApp();
    });
  }

  if (viewTimelineBtn) {
    viewTimelineBtn.addEventListener('click', () => {
      setActiveView('timeline');
      renderApp();
    });
  }
}

function attachFooterEvents() {
  // Reset button removed from footer
}

/**
 * Updates only the countdown number elements in the DOM without a full re-render.
 * Falls back to a full renderApp() when the countdown expires (state change).
 */
function tickCountdown() {
  const state = getState();
  if (state.activeView !== 'card' || !state.activeGame) return;

  const targetDateStr = state.activeGame.nextSeason?.startDate;
  if (!targetDateStr) return; // TBA — no live countdown to maintain

  const targetDate = new Date(targetDateStr);
  if (targetDate <= new Date()) {
    // Countdown just expired — full re-render to show "Just Launched" state
    renderApp();
    return;
  }

  const total = targetDate.getTime() - Date.now();
  const update = (attr, val) => {
    const el = document.querySelector(`[data-countdown="${attr}"]`);
    if (el) el.textContent = val;
  };
  update('days',    Math.floor(total / (1000 * 60 * 60 * 24)));
  update('hours',   Math.floor((total / (1000 * 60 * 60)) % 24));
  update('minutes', Math.floor((total / (1000 * 60)) % 60));
  update('seconds', Math.floor((total / 1000) % 60));
}

function startCountdownLoop() {
  if (countdownTimer) return;
  countdownTimer = window.setInterval(tickCountdown, 1000);
}

async function initializeApp() {
  setLoading(true);
  setError(null);

  try {
    const games = await seasonService.getGames();
    setGames(games);
    setActiveGame(games[0] ?? null);
    renderApp();
    startCountdownLoop();

    console.info('SeasonForge initialized', {
      project: CONFIG.projectName,
      games: getState().games.length,
      activeGame: getState().activeGame
    });
  } catch (error) {
    setError(error.message || t('toasts.initFailed'));
    renderToast(t('toasts.loadFailed'), 'error');
    console.error('SeasonForge initialization failed', error);
  } finally {
    setLoading(false);
    renderApp();
  }
}

initializeApp();
