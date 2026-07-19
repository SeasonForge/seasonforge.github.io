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
import { render as renderCountdown } from './components/Countdown.js';
import { render as renderProgressBar } from './components/ProgressBar.js';
import { render as renderStatusBadge } from './components/StatusBadge.js';
import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';

const seasonService = new SeasonService();
let countdownTimer = null;
let modalInstance = null;
let toastInstance = null;

function getProgressPercent(game) {
  const startDate = game?.currentSeason?.startDate;
  const nextStartDate = game?.nextSeason?.startDate;

  if (!startDate || !nextStartDate) {
    return 0;
  }

  const start = new Date(startDate);
  const nextStart = new Date(nextStartDate);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(nextStart.getTime())) {
    return 0;
  }

  const total = nextStart.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

function formatLastUpdated(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const state = getState();
  const lang = state.settings?.lang || 'en';
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  };

  const formatted = new Intl.DateTimeFormat(locale, options).format(date);
  return `${formatted} UTC`;
}

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
    <button class="lang-switcher__btn ${currentLang === 'en' ? 'lang-switcher__btn--active' : ''}" data-lang-val="en">🇺🇸 EN</button>
    <button class="lang-switcher__btn ${currentLang === 'ru' ? 'lang-switcher__btn--active' : ''}" data-lang-val="ru">🇷🇺 RU</button>
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
    timeEl.textContent = formatLastUpdated(latestTime);
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
      const countdown = renderCountdown(state.activeGame?.nextSeason?.startDate || state.activeGame?.currentSeason?.startDate);
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

function startCountdownLoop() {
  if (countdownTimer) {
    return;
  }

  countdownTimer = window.setInterval(() => {
    // Only re-render countdowns if we are in card view to avoid layout shifts in timeline view
    const state = getState();
    if (state.activeView === 'card') {
      renderApp();
    }
  }, 1000);
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
