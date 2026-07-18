// Application entry point.
import { CONFIG } from './config.js';
import { SeasonService } from './services/SeasonService.js';
import {
  getState,
  setActiveGame,
  setActiveView,
  setError,
  setGames,
  setLoading
} from './store/state.js';
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
  const months = [
    'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} • ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} UTC`;
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
      contentRoot.innerHTML = '<p>No game available.</p>';
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
        renderToast(`Выбрана игра: ${nextGame.name}`);
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
  const resetBtn = document.getElementById('reset-data-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const state = getState();
      setActiveView('card');
      if (state.games.length > 0) {
        setActiveGame(state.games[0]);
      }
      renderToast('Данные сброшены к исходным!', 'info');
      renderApp();
    });
  }
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
    setError(error.message || 'Failed to initialize SeasonForge');
    renderToast('Failed to load data.', 'error');
    console.error('SeasonForge initialization failed', error);
  } finally {
    setLoading(false);
    renderApp();
  }
}

initializeApp();
