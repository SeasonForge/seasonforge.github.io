// Application entry point.
import { CONFIG } from './config.js';
import { SeasonService } from './services/SeasonService.js';
import { FALLBACK_SEASONS_DATA } from './data/fallback-seasons.js';
import {
  getState,
  setActiveGame,
  setActiveView,
  setError,
  setGames,
  setLoading,
  setLanguage,
  setRawData
} from './store/state.js';
import { t, getVal } from './i18n/index.js';
import { render as renderNavbar } from './components/Navbar.js';
import { render as renderGameCard } from './components/GameCard.js';
import { render as renderTimeline } from './components/Timeline.js';
import { renderEventsTimeline } from './components/EventsTimeline.js?v=2.0.2';
import { renderGamesCatalog } from './components/GamesCatalog.js';
import { render as renderProgressBar } from './components/ProgressBar.js';
import { render as renderStatusBadge } from './components/StatusBadge.js';
import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';
import { getProgressPercent, calculateCountdown } from './utils/countdown.js';
import { formatLastUpdated } from './utils/date.js';
import { initFeedback } from './utils/initFeedback.js';
import { initStreamer } from './utils/initStreamer.js';
import { initWebWidget } from './utils/initWebWidget.js';
import { initMobileAppModal } from './utils/initMobileAppModal.js';
import { setMetaTags } from './utils/seo.js';
import { renderLangSwitcher as renderLangSwitcherComponent } from './components/LangSwitcher.js';
import { Header } from './components/Header.js';
import { ModalManager } from './components/ModalManager.js';
import { MobileNav } from './components/MobileNav.js';
import { MoreMenuModal } from './components/MoreMenuModal.js';
import { initHeroParallax } from './components/HeroParallax.js';
import { trackEvent } from './utils/analytics.js';
import { initOBSOverlay } from './widgets/WidgetRenderer.js';
import { AppController } from './controllers/AppController.js';

// Extracted Specialized Controllers
import { attachTimelineTooltipEvents } from './controllers/TooltipController.js';
import { attachEventsDetailDrawer, openEventsDrawer } from './controllers/EventsDrawerController.js';
import { startCountdownLoop } from './controllers/CountdownTicker.js';
import {
  getTimelineMode,
  setTimelineMode,
  initSwitcherSlider,
  attachNavbarEvents,
  initGlobalNavigationListeners
} from './controllers/NavigationController.js';

const seasonService = new SeasonService();
let toastTimer = null;
let modalInstance = null;
let toastInstance = null;
let eventsData = [];
const trackedForecastGames = new Set();

function updateSeo() {
  setMetaTags({
    title: t('seo.title'),
    description: t('seo.description'),
    lang: getState().settings?.lang || 'en'
  });
}

function renderLangSwitcher() {
  const state = getState();
  renderLangSwitcherComponent('lang-switcher', state.settings.lang, (selected) => {
    setLanguage(selected);
    updateSeo();
    renderToast(t('toasts.gameSelected', { game: getVal(state.activeGame?.name || '') }));
    renderApp();
  });
}

function renderModal() {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

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
  if (!toastRoot) return;

  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  toastInstance = Toast({ message, type, isVisible: true });
  toastRoot.innerHTML = toastInstance.render();

  toastTimer = window.setTimeout(() => {
    if (toastInstance) {
      toastInstance.hide();
      toastRoot.innerHTML = toastInstance.render();
    }
    toastTimer = null;
  }, 2000);
}

function getBasePath() {
  if (typeof window === 'undefined') return './';
  const path = window.location.pathname;
  const isSeasonPage = typeof document !== 'undefined' && document.getElementById('game-page-root')?.classList.contains('season-page-root');
  if (isSeasonPage) return '../../../';
  if (path.includes('/games/')) return '../../';
  if (path.includes('/events') || path.includes('/changelog') || path.includes('/donate') || path.includes('/privacy') || path.includes('/widget')) return '../';
  return './';
}

function renderApp() {
  const state = getState();
  const navbarRoot = document.getElementById('navbar');
  const contentRoot = document.getElementById('content');
  const basePath = getBasePath();

  // Sync title and metadata
  updateSeo();
  renderLangSwitcher();

  // Update header and navigation components
  Header.update({ lang: state.settings?.lang });
  MobileNav.syncActive(state.activeView);

  // Update navbar
  if (navbarRoot) {
    navbarRoot.innerHTML = renderNavbar(state.games, state.activeGame, state.activeView, basePath);
  }

  renderModal();

  // Update dynamic timestamps in the page header
  const lastChecked = state.rawData?.lastCheckedAt || state.lastCheckedAt;
  const checkedEl = document.getElementById('last-checked-time');
  const checkedLbl = document.getElementById('lbl-status-check');
  if (checkedLbl) {
    checkedLbl.innerHTML = `<span class="status-dot"></span> ${t('header.statusCheck')}`;
  }
  if (checkedEl && lastChecked) {
    checkedEl.textContent = formatLastUpdated(lastChecked, state.settings?.lang);
  }

  const updateTimes = state.games.map(g => new Date(g.status?.updatedAt).getTime()).filter(ts => !Number.isNaN(ts));
  if (Array.isArray(state.rawData?.changelog)) {
    state.rawData.changelog.forEach(c => {
      const ts = new Date(c.timestamp).getTime();
      if (!Number.isNaN(ts)) updateTimes.push(ts);
    });
  }
  const latestTime = updateTimes.length > 0 ? Math.max(...updateTimes) : null;
  const timeEl = document.getElementById('last-updated-time');
  const updatedLbl = document.getElementById('lbl-last-updated');
  if (updatedLbl) {
    updatedLbl.textContent = t('header.lastUpdated');
  }
  if (timeEl && latestTime) {
    timeEl.textContent = formatLastUpdated(latestTime, state.settings?.lang);
  }

  // Render main content
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const timelineMode = getTimelineMode();

  if (contentRoot) {
    if (state.activeView === 'card') {
      if (isMobile) {
        contentRoot.innerHTML = renderTimeline(state.games, 'home', basePath, eventsData);
      } else {
        let activeGame = state.activeGame;
        if (!activeGame && state.games.length > 0) {
          activeGame = state.games[0];
          setActiveGame(activeGame, false);
        }

        const cardsHtml = state.games.map((game) => {
          const isActive = activeGame && game.id === activeGame.id;
          const countdown = calculateCountdown(game.nextSeason?.startDate || game.currentSeason?.startDate);
          const progressBar = renderProgressBar(getProgressPercent(game), game.color);
          const statusBadge = renderStatusBadge(game.status);

          return renderGameCard(game, {
            countdown,
            progressBar,
            statusBadge,
            isActive,
            basePath
          });
        }).join('');

        contentRoot.innerHTML = `<div class="game-feed">${cardsHtml}</div>`;
      }
    } else if (state.activeView === 'timeline') {
      if (timelineMode === 'events') {
        contentRoot.innerHTML = renderEventsTimeline(eventsData, state.games, { lang: state.settings?.lang, basePath });
      } else {
        contentRoot.innerHTML = renderTimeline(state.games, isMobile ? 'timeline' : 'all', basePath, eventsData);
      }
    } else if (state.activeView === 'games') {
      contentRoot.innerHTML = renderGamesCatalog(state.games, { basePath });
    } else if (state.activeView === 'more') {
      MoreMenuModal.open(basePath);
    }
  }

  // Attach controller events
  attachNavbarEvents({ onRender: renderApp, onToast: renderToast });
  initFeedback(() => state.activeGame?.id || 'None');
  initStreamer(state.games);
  initWebWidget(state.games);
  initMobileAppModal();
  
  if (state.activeView === 'timeline' || state.activeView === 'card') {
    attachTimelineTooltipEvents((gameId) => {
      AppController.handleGameSelect(gameId, renderApp);
    });
    attachEventsDetailDrawer(() => eventsData);
    requestAnimationFrame(() => initSwitcherSlider());
  }

  AppController.checkForecastViewed(trackedForecastGames);
}

async function initializeApp() {
  setError(null);

  const isEventsPage = typeof window !== 'undefined' && (
    window.location.pathname.includes('/events') || 
    window.location.search.includes('tab=events') || 
    window.location.hash === '#events'
  );
  if (isEventsPage) {
    setTimelineMode('events');
  }

  const embeddedEventsScript = typeof document !== 'undefined' && document.getElementById('sf-events-json');
  if (embeddedEventsScript) {
    try {
      const parsed = JSON.parse(embeddedEventsScript.textContent);
      if (Array.isArray(parsed)) eventsData = parsed;
    } catch (e) {}
  }

  // 1. Synchronous hydration from fallback data for 0ms initial render
  const initialGames = FALLBACK_SEASONS_DATA?.games || [];
  if (initialGames.length > 0) {
    setGames(initialGames);
    setRawData(FALLBACK_SEASONS_DATA);
  }

  try {
    const games = getState().games || [];

    // Check overlay parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get('overlay') === 'true') {
      document.body.classList.add('app-layout--overlay');
      setLoading(false);
      initOBSOverlay(games, getState());
      return;
    }

    // Restore last selected game from localStorage
    const lastGame = localStorage.getItem('lastGame');
    if (lastGame && games.length > 0) {
      const saved = games.find(g => g.id === lastGame || g.name?.en === lastGame || g.name?.ru === lastGame);
      if (saved) {
        setActiveGame(saved, false);
      }
    }

    ModalManager.initAll();
    MobileNav.init({ basePath: isEventsPage ? '../' : './' });
    initGlobalNavigationListeners({
      onRender: renderApp,
      onOpenDrawer: (eventId) => openEventsDrawer(eventId, eventsData)
    });

    initHeroParallax();
    setLoading(false);
    renderApp();
    startCountdownLoop(() => renderApp());

    // 2. Fetch fresh network data in background
    const eventsDataUrl = isEventsPage ? '../data/events.json' : './data/events.json';
    fetch(eventsDataUrl)
      .then(res => res.json())
      .then(data => {
        if (data?.events) {
          eventsData = data.events;
          if (getTimelineMode() === 'events') {
            renderApp();
          }
        }
      })
      .catch(() => {});

    seasonService.loadSeasons().then(rawData => {
      if (rawData?.games) {
        setRawData(rawData);
        setGames(rawData.games);
        renderApp();
      }
    }).catch(err => {
      console.warn('Background loadSeasons failed, using fallback:', err);
    });

  } catch (error) {
    setError(error.message || t('toasts.initFailed'));
    renderApp();
  } finally {
    setLoading(false);
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => {});
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}

initializeApp();
