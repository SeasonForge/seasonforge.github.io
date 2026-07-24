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
  setLanguage,
  setRawData
} from './store/state.js';
import { t, getVal } from './i18n/index.js';
import { render as renderNavbar } from './components/Navbar.js';
import { render as renderGameCard } from './components/GameCard.js';
import { render as renderTimeline } from './components/Timeline.js';
import { render as renderProgressBar } from './components/ProgressBar.js';
import { render as renderStatusBadge } from './components/StatusBadge.js';
import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';
import { getProgressPercent, calculateCountdown, updateCountdownDOM } from './utils/countdown.js';
import { formatLastUpdated } from './utils/date.js';
import { initFeedback } from './utils/initFeedback.js';
import { initStreamer } from './utils/initStreamer.js';
import { setMetaTags } from './utils/seo.js';
import { renderLangSwitcher as renderLangSwitcherComponent } from './components/LangSwitcher.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(value) {
  return escapeHtml(value);
}

const seasonService = new SeasonService();
let countdownTimer = null;
let modalInstance = null;
let toastInstance = null;

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

  // Translate static header elements and mobile nav labels
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

  const feedbackBtn = document.getElementById('lbl-feedback-btn');
  if (feedbackBtn) {
    feedbackBtn.textContent = t('feedback.btnLabel');
  }

  const streamerBtn = document.getElementById('lbl-streamer-btn');
  if (streamerBtn) {
    streamerBtn.textContent = t('streamer.btnLabel');
  }

  const mobLblTracker = document.getElementById('mob-lbl-tracker');
  if (mobLblTracker) mobLblTracker.textContent = t('navbar.btnCard');

  const mobLblTimeline = document.getElementById('mob-lbl-timeline');
  if (mobLblTimeline) mobLblTimeline.textContent = t('navbar.btnTimeline');

  const mobLblGames = document.getElementById('mob-lbl-games');
  if (mobLblGames) mobLblGames.textContent = t('navbar.btnGames') || 'Games';

  const mobLblMore = document.getElementById('mob-lbl-more');
  if (mobLblMore) mobLblMore.textContent = t('navbar.btnMore') || 'More';

  const mobTrackerBtn = document.getElementById('mob-btn-tracker');
  const mobTimelineBtn = document.getElementById('mob-btn-timeline');
  const mobGamesBtn = document.getElementById('mob-btn-games');
  const mobMoreBtn = document.getElementById('mob-btn-more');

  if (mobTrackerBtn && mobTimelineBtn && mobGamesBtn && mobMoreBtn) {
    mobTrackerBtn.classList.toggle('mobile-nav__btn--active', state.activeView === 'card');
    mobTimelineBtn.classList.toggle('mobile-nav__btn--active', state.activeView === 'timeline');
    mobGamesBtn.classList.toggle('mobile-nav__btn--active', state.activeView === 'games');
    mobMoreBtn.classList.toggle('mobile-nav__btn--active', state.activeView === 'more');
  }

  // Update navbar
  if (navbarRoot) {
    navbarRoot.innerHTML = renderNavbar(state.games, state.activeGame, state.activeView);
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

  const updateTimes = state.games.map(g => new Date(g.status?.updatedAt).getTime()).filter(t => !Number.isNaN(t));
  const latestTime = updateTimes.length > 0 ? Math.max(...updateTimes) : null;
  const timeEl = document.getElementById('last-updated-time');
  const updatedLbl = document.getElementById('lbl-last-updated');
  if (updatedLbl) {
    updatedLbl.textContent = t('header.lastUpdated');
  }
  if (timeEl && latestTime) {
    timeEl.textContent = formatLastUpdated(latestTime, state.settings?.lang);
  }

  // Render main content depending on activeView
  if (contentRoot) {
    if (state.activeView === 'timeline') {
      contentRoot.innerHTML = renderTimeline(state.games);
    } else if (state.activeView === 'games') {
      const catalogCards = state.games.map(game => {
        const id = game.id;
        const name = escapeHtml(getVal(game.name) || 'Untitled Game');
        const currentSeason = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
        const statusCode = game.status?.code || 'active';
        const statusLabel = escapeHtml(t(`statuses.${statusCode}`) || game.status?.label || 'Active');
        const color = escapeHtml(game.color || '#6366f1');
        const icon = escapeHtml(game.icon || '🎮');
        const logo = game.logo ? escapeHtml(game.logo) : '';
        
        const iconHtml = logo 
          ? `<img src="./assets/logos/${logo}" alt="${name}" class="catalog-card__logo" />`
          : `<span class="catalog-card__emoji">${icon}</span>`;
          
        return `
          <a class="catalog-card" href="./games/${id}/" style="--game-color: ${color};">
            <div class="catalog-card__main">
              <div class="catalog-card__icon">${iconHtml}</div>
              <div class="catalog-card__info">
                <div class="catalog-card__top">
                  <h3 class="catalog-card__name">${name}</h3>
                  <span class="game-card__pill game-card__pill--${statusCode}">${statusLabel.toUpperCase()}</span>
                </div>
                <p class="catalog-card__season">${t('card.currentSeasonLabel')}: <strong>${currentSeason}</strong></p>
              </div>
            </div>
            <div class="catalog-card__action">
              <span>${t('card.gamePageLinkTitle') || 'Page'}</span>
              <span class="catalog-card__arrow">→</span>
            </div>
          </a>
        `;
      }).join('');

      contentRoot.innerHTML = `
        <div class="games-catalog">
          <h2 class="games-catalog__title">🎮 ${t('navbar.btnGames') || 'Games'}</h2>
          <div class="games-catalog__grid">${catalogCards}</div>
        </div>
      `;
    } else if (state.activeView === 'more') {
      contentRoot.innerHTML = `
        <div class="more-panel">
          <h2 class="more-panel__title">${t('navbar.btnMore') || 'More'}</h2>
          
          <div class="more-panel__section">
            <span class="more-panel__label">Language / Язык</span>
            <div class="more-panel__lang-row">
              <button class="more-panel__lang-btn ${state.settings.lang === 'en' ? 'more-panel__lang-btn--active' : ''}" data-lang-val="en">
                <img src="https://flagcdn.com/w20/us.png" class="lang-switcher__flag" alt="EN"> English
              </button>
              <button class="more-panel__lang-btn ${state.settings.lang === 'ru' ? 'more-panel__lang-btn--active' : ''}" data-lang-val="ru">
                <img src="https://flagcdn.com/w20/ru.png" class="lang-switcher__flag" alt="RU"> Русский
              </button>
            </div>
          </div>

          <div class="more-panel__section">
            <span class="more-panel__label">Tools / Утилиты</span>
            <div class="more-panel__tools-list">
              <button id="mob-feedback-trigger" class="more-panel__tool-btn">
                <span class="more-panel__tool-icon">💬</span>
                <span>${t('feedback.btnLabel') || 'Feedback'}</span>
              </button>
              <button id="mob-streamer-trigger" class="more-panel__tool-btn">
                <span class="more-panel__tool-icon">🎥</span>
                <span>${t('streamer.btnLabel') || 'OBS Widgets'}</span>
              </button>
            </div>
          </div>

          <div class="more-panel__section">
            <span class="more-panel__label">About / О проекте</span>
            <div class="more-panel__about-box">
              <p><strong>SeasonForge</strong> — ${t('header.subtitle') || 'Monitoring current and upcoming seasons of major action RPGs.'}</p>
              <p>Data source: <strong>Official Game Feeds</strong></p>
            </div>
          </div>
        </div>
      `;

      // Attach language switcher events in More tab
      contentRoot.querySelectorAll('[data-lang-val]').forEach(btn => {
        btn.addEventListener('click', () => {
          const selected = btn.getAttribute('data-lang-val');
          if (selected !== state.settings.lang) {
            setLanguage(selected);
            updateSeo();
            renderApp();
          }
        });
      });

      // Attach tool trigger buttons in More tab
      const mobFeedbackTrigger = document.getElementById('mob-feedback-trigger');
      if (mobFeedbackTrigger) {
        mobFeedbackTrigger.addEventListener('click', () => {
          const btn = document.getElementById('feedback-trigger-btn');
          if (btn) btn.click();
        });
      }

      const mobStreamerTrigger = document.getElementById('mob-streamer-trigger');
      if (mobStreamerTrigger) {
        mobStreamerTrigger.addEventListener('click', () => {
          const btn = document.getElementById('streamer-trigger-btn');
          if (btn) btn.click();
        });
      }
    } else {
      let activeGame = state.activeGame;
      if (!activeGame && state.games.length > 0) {
        activeGame = state.games[0];
        setActiveGame(activeGame, false);
      }

      // Render feed of all games
      const cardsHtml = state.games.map((game) => {
        const isActive = activeGame && game.id === activeGame.id;
        const countdown = calculateCountdown(game.nextSeason?.startDate || game.currentSeason?.startDate);
        const progressBar = renderProgressBar(getProgressPercent(game), game.color);
        const statusBadge = renderStatusBadge(game.status);

        const card = renderGameCard(game, {
          countdown,
          progressBar,
          statusBadge
        });

        // Add active class for desktop filtering
        return card.replace('class="game-card"', `class="game-card ${isActive ? 'game-card--active' : ''}"`);
      }).join('');
      contentRoot.innerHTML = `<div class="game-feed">${cardsHtml}</div>`;
    }
  }

  attachNavbarEvents();
  attachFooterEvents();
  initFeedback(() => state.activeGame?.id || 'None');
  initStreamer(state.games);
  
  if (state.activeView === 'timeline') {
    attachTimelineTooltipEvents();
  }
}

let timelineAbortController = null;
const expiredGameCountdowns = new Set();

function attachTimelineTooltipEvents() {
  const grid = document.querySelector('.timeline-map__grid');
  const tooltip = document.getElementById('timeline-tooltip');
  if (!grid || !tooltip) return;

  if (timelineAbortController) {
    timelineAbortController.abort();
  }
  timelineAbortController = new AbortController();
  const { signal } = timelineAbortController;

  let activeTouch = false;

  grid.addEventListener('mouseover', (e) => {
    if (activeTouch) return;
    const item = e.target.closest('[data-tooltip]');
    if (!item) return;

    const content = item.getAttribute('data-tooltip');
    if (!content) return;

    tooltip.innerHTML = content;
    tooltip.style.display = 'block';
  }, { signal });

  grid.addEventListener('mousemove', (e) => {
    if (activeTouch) return;
    if (tooltip.style.display === 'block') {
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY + 15}px`;
    }
  }, { signal });

  grid.addEventListener('mouseout', (e) => {
    if (activeTouch) return;
    const item = e.target.closest('[data-tooltip]');
    if (!item) return;

    const related = e.relatedTarget;
    if (related && item.contains(related)) return;

    tooltip.style.display = 'none';
  }, { signal });

  // Tap-to-toggle details on mobile touchscreens
  const handleTouchTap = (e) => {
    const item = e.target.closest('[data-tooltip]');
    if (item) {
      activeTouch = true;
      e.stopPropagation();
      
      const content = item.getAttribute('data-tooltip');
      if (!content) return;

      tooltip.innerHTML = content;
      tooltip.style.display = 'block';
      
      // Position the tooltip near the tapped element
      const rect = item.getBoundingClientRect();
      const tooltipWidth = tooltip.offsetWidth || 180;
      const tooltipHeight = tooltip.offsetHeight || 120;
      
      tooltip.style.left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`;
      tooltip.style.top = `${rect.top - tooltipHeight - 10}px`;

      // Contain tooltip within screen edges
      const tooltipRect = tooltip.getBoundingClientRect();
      if (tooltipRect.left < 10) {
        tooltip.style.left = '10px';
      } else if (tooltipRect.right > window.innerWidth - 10) {
        tooltip.style.left = `${window.innerWidth - tooltipWidth - 10}px`;
      }
      if (tooltipRect.top < 10) {
        tooltip.style.top = `${rect.bottom + 10}px`;
      }
    } else {
      tooltip.style.display = 'none';
    }
  };

  grid.addEventListener('click', handleTouchTap, { signal });
  
  // Hide tooltip when clicking anywhere else
  document.addEventListener('click', (e) => {
    if (!grid.contains(e.target)) {
      tooltip.style.display = 'none';
    }
  }, { signal });
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
        setActiveGame(nextGame, true);
        setActiveView('card', true);
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
      renderApp();
    });
  }

  if (viewTimelineBtn) {
    viewTimelineBtn.addEventListener('click', () => {
      setActiveView('timeline', true);
      renderApp();
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

  if (mobTrackerBtn) {
    mobTrackerBtn.addEventListener('click', () => {
      setActiveView('card', true);
      const currentState = getState();
      if (!currentState.activeGame && currentState.games.length > 0) {
        const lastGame = localStorage.getItem('lastGame');
        const matched = currentState.games.find(g => g.id === lastGame || g.name?.en === lastGame || g.name?.ru === lastGame);
        setActiveGame(matched || currentState.games[0], true);
      }
      renderApp();
    });
  }
  if (mobTimelineBtn) {
    mobTimelineBtn.addEventListener('click', () => {
      setActiveView('timeline', true);
      renderApp();
    });
  }
  if (mobGamesBtn) {
    mobGamesBtn.addEventListener('click', () => {
      setActiveView('games', true);
      renderApp();
    });
  }
  if (mobMoreBtn) {
    mobMoreBtn.addEventListener('click', () => {
      setActiveView('more', true);
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
  
  // 1. Update Game Card Countdowns
  if (state.activeView === 'card') {
    state.games.forEach((game) => {
      const targetDateStr = game.nextSeason?.startDate;
      if (!targetDateStr) return;

      const targetDate = new Date(targetDateStr);
      const now = new Date();
      if (targetDate <= now) {
        if (!expiredGameCountdowns.has(game.id)) {
          expiredGameCountdowns.add(game.id);
          renderApp();
        }
        return;
      }
      
      const cardEl = document.querySelector(`.game-card[data-game-id="${game.id}"] .game-card__countdown`);
      if (cardEl) {
        updateCountdownDOM(cardEl, calculateCountdown(targetDateStr));
      }
    });
  }

  // 2. Update Timeline Upcoming Launches Countdowns (if visible)
  if (state.activeView === 'timeline') {
    state.games.forEach((game) => {
      const targetDateStr = game.nextSeason?.startDate;
      if (!targetDateStr) return;

      const targetDate = new Date(targetDateStr);
      const total = targetDate.getTime() - Date.now();
      
      if (total <= 0) return;

      const update = (attr, val) => {
        const el = document.querySelector(`[data-game-countdown="${game.id}"] [data-countdown="${attr}"]`);
        if (el) el.textContent = val;
      };
      update('days',    Math.floor(total / (1000 * 60 * 60 * 24)));
      update('hours',   Math.floor((total / (1000 * 60 * 60)) % 24));
      update('minutes', Math.floor((total / (1000 * 60)) % 60));
    });
  }
}

function startCountdownLoop() {
  if (countdownTimer) return;
  countdownTimer = window.setInterval(tickCountdown, 1000);
}

async function initializeApp() {
  setLoading(true);
  setError(null);

  try {
    const rawData = await seasonService.loadSeasons();
    const games = Array.isArray(rawData?.games) ? rawData.games : [];
    setRawData(rawData);
    setGames(games);

    // Check overlay parameters
    const params = new URLSearchParams(window.location.search);
    const isOverlay = params.get('overlay') === 'true';
    if (isOverlay) {
      document.body.classList.add('app-layout--overlay');
      const type = params.get('type') || 'status';
      const gameId = params.get('game') || '';
      
      document.body.classList.add(`overlay-type-${type}`);
      
      if (type === 'timeline') {
        setActiveView('timeline');
      } else {
        setActiveView('card');
        const matchedGame = games.find(g => g.id === gameId);
        if (matchedGame) {
          setActiveGame(matchedGame);
        } else {
          setActiveGame(games[0] ?? null);
        }
      }
    } else {
      // Restore user state from localStorage
      const lastGame = localStorage.getItem('lastGame');
      const lastView = localStorage.getItem('lastView');
      const lastVisit = localStorage.getItem('lastVisit');
      
      const now = Date.now();
      const isLongTimeNoSee = lastVisit && (now - parseInt(lastVisit, 10) > 30 * 24 * 60 * 60 * 1000);
      const isFirstVisit = !lastVisit;

      if (isFirstVisit) {
        // First-time visit: open Timeline (Overview), do not select game automatically
        setActiveView('timeline', false);
        setActiveGame(null, false);
      } else if (isLongTimeNoSee) {
        // Inactive for 30+ days: open saved game, show Game Card instead of Timeline
        let matchedGame = null;
        if (lastGame) {
          matchedGame = games.find(g => g.id === lastGame || g.name?.en === lastGame || g.name?.ru === lastGame);
        }
        
        if (matchedGame) {
          setActiveGame(matchedGame, false);
          setActiveView('card', false);
        } else {
          setActiveGame(null, false);
          setActiveView('timeline', false);
        }
      } else {
        // Returning visit (under 30 days): restore saved game and view
        let matchedGame = null;
        if (lastGame) {
          matchedGame = games.find(g => g.id === lastGame || g.name?.en === lastGame || g.name?.ru === lastGame);
        }
        
        if (matchedGame) {
          setActiveGame(matchedGame, false);
        } else {
          setActiveGame(games[0] ?? null, false);
        }

        if (lastView === 'Timeline') {
          setActiveView('timeline', false);
        } else if (lastView === 'Game Card') {
          setActiveView('card', false);
        } else {
          // Default fallback: show Card if game is selected, else Timeline
          setActiveView(matchedGame ? 'card' : 'timeline', false);
        }
      }

      // Update lastVisit timestamp
      localStorage.setItem('lastVisit', String(now));
    }

    renderApp();
    startCountdownLoop();

    console.info('SeasonForge initialized', {
      project: CONFIG.projectName,
      games: getState().games.length,
      activeGame: getState().activeGame
    });
  } catch (error) {
    setError(error.message || t('toasts.initFailed'));
    if (!getState().games || getState().games.length === 0) {
      renderToast(t('toasts.loadFailed'), 'error');
    }
    console.error('SeasonForge initialization failed', error);
  } finally {
    setLoading(false);
    renderApp();
  }
}

initializeApp();
