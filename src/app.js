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
import { renderEventDetailContent } from './desktop/components/EventsTimelineDesktop.js';
import { render as renderProgressBar } from './components/ProgressBar.js';
import { render as renderStatusBadge } from './components/StatusBadge.js';
import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';
import { getProgressPercent, calculateCountdown, updateCountdownDOM } from './utils/countdown.js';
import { formatLastUpdated } from './utils/date.js';
import { getIconSvg } from './utils/icons.js';
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
import { escapeHtml, escapeAttr } from './utils/helpers.js';
import { initOBSOverlay } from './widgets/WidgetRenderer.js';



const seasonService = new SeasonService();
let countdownTimer = null;
let toastTimer = null;
let modalInstance = null;
let toastInstance = null;
let timelineMode = 'seasons';
let eventsData = [];

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

  const mobileAppBtn = document.getElementById('lbl-mobile-app-btn');
  if (mobileAppBtn) {
    mobileAppBtn.textContent = t('mobileApp.headerBtn');
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

  const isEventsPage = typeof window !== 'undefined' && window.location.pathname.includes('/events');
  const basePath = isEventsPage ? '../' : './';

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

  // Update footer translations
  const footerCopy = document.getElementById('lbl-footer-copy');
  const footerChangelog = document.getElementById('lbl-footer-changelog');
  const footerPrivacy = document.getElementById('lbl-footer-privacy');

  if (footerCopy) footerCopy.textContent = t('footer.copy') || '© 2026 SeasonForge.';
  if (footerChangelog) footerChangelog.textContent = t('footer.changelog') || 'Changelog';
  if (footerPrivacy) footerPrivacy.textContent = t('footer.privacy') || 'Privacy Policy';

  // Attach click listener for header meta date to navigate to ./changelog/ with custom glassmorphic tooltip
  const headerMeta = document.querySelector('.app-header__meta');
  if (headerMeta) {
    headerMeta.removeAttribute('title');
    const tooltipText = state.settings?.lang === 'ru' ? 'История обновлений ↗' : 'View Update History ↗';
    headerMeta.setAttribute('data-tooltip', tooltipText);
    if (!headerMeta.dataset.changelogBound) {
      headerMeta.dataset.changelogBound = 'true';
      headerMeta.style.cursor = 'pointer';
      headerMeta.addEventListener('click', () => {
        window.location.href = `${basePath}changelog/`;
      });
    }
  }

  // Render main content depending on activeView and device viewport
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  if (contentRoot) {
    if (state.activeView === 'card') {
      if (isMobile) {
        contentRoot.innerHTML = renderTimeline(state.games, 'home', basePath);
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

          const card = renderGameCard(game, {
            countdown,
            progressBar,
            statusBadge,
            isActive
          });

          return card;
        }).join('');
        contentRoot.innerHTML = `<div class="game-feed">${cardsHtml}</div>`;
      }
    } else if (state.activeView === 'timeline') {
      if (timelineMode === 'events') {
        contentRoot.innerHTML = renderEventsTimeline(eventsData, state.games, { lang: state.settings?.lang, basePath });
      } else {
        if (isMobile) {
          contentRoot.innerHTML = renderTimeline(state.games, 'timeline', basePath);
        } else {
          contentRoot.innerHTML = renderTimeline(state.games, 'all', basePath);
        }
      }
    } else if (state.activeView === 'games') {
      const catalogCards = state.games.map(game => {
        const id = game.id;
        const name = escapeHtml(getVal(game.name) || 'Untitled Game');
        const currentSeason = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
        const statusCode = game.status?.code || 'active';
        const statusLabel = escapeHtml(t(`statuses.${statusCode}`) || game.status?.label || 'Active');
        const color = escapeHtml(game.color || '#6366f1');
        const icon = escapeHtml(game.icon || 'skull');
        const logo = game.logo ? escapeHtml(game.logo) : '';
        
        const iconHtml = logo 
          ? `<img src="./assets/logos/${logo}" alt="${name}" class="catalog-card__logo" />`
          : getIconSvg(game.icon, { size: 22, class: 'catalog-card__svg' });
          
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
      MoreMenuModal.open('./');
    }
  }

  attachNavbarEvents();
  attachFooterEvents();
  initFeedback(() => state.activeGame?.id || 'None');
  initStreamer(state.games);
  initWebWidget(state.games);
  initMobileAppModal();
  
  if (state.activeView === 'timeline' || state.activeView === 'card') {
    attachTimelineTooltipEvents();
    attachEventsDetailDrawer();
    requestAnimationFrame(() => initSwitcherSlider());
  }
  checkForecastViewed();
  initAnalyticsSourceDelegate();
}

let timelineAbortController = null;
const expiredGameCountdowns = new Set();
const trackedForecastGames = new Set();

function checkForecastViewed() {
  const state = getState();
  const checkGame = (g) => {
    if (!g || !g.id || !g.nextSeason) return;
    const isEstimated = g.nextSeason.verification === 'estimated' || g.nextSeason.verification === 'ai';
    if (isEstimated && g.nextSeason.startDate && !trackedForecastGames.has(g.id)) {
      trackedForecastGames.add(g.id);
      trackEvent('forecast_viewed', {
        game_id: g.id,
        season_name: getVal(g.nextSeason.name) || 'Estimated Season'
      });
    }
  };

  if (state.activeView === 'card' && state.activeGame) {
    checkGame(state.activeGame);
  } else if (state.activeView === 'timeline' && Array.isArray(state.games)) {
    state.games.forEach(checkGame);
  }
}

let _analyticsSourceBound = false;
function initAnalyticsSourceDelegate() {
  if (_analyticsSourceBound) return;
  _analyticsSourceBound = true;
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-analytics-source="official_source"]');
    if (link) {
      const gameId = link.getAttribute('data-game-id');
      const sourceType = link.getAttribute('data-source-type');
      const dateStatus = link.getAttribute('data-date-status');
      if (gameId && sourceType && dateStatus) {
        trackEvent('official_source_opened', {
          game_id: gameId,
          source_type: sourceType,
          date_status: dateStatus
        });
      }
    }
  });
}

function formatTooltipDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

function getTimelineTooltipContent(gameId, seasonType) {
  const currentState = getState();
  const game = currentState.games?.find(g => g.id === gameId);
  if (!game) return '';

  const isNext = seasonType === 'next';
  const isHistory = String(seasonType).startsWith('history');
  const isPtrType = seasonType === 'ptr';
  const lang = currentState.settings?.lang || 'en';

  const gameName = escapeHtml(getVal(game.name));

  if (isPtrType) {
    const ptrData = game.ptr || (game.events || []).find(e => e.type === 'ptr');
    const ptrTitle = escapeHtml(getVal(ptrData?.name) || getVal(ptrData?.title) || (lang === 'ru' ? 'PTR Патч 3.2.0' : 'PTR Patch 3.2.0'));
    const startStr = ptrData?.startDate ? formatTooltipDate(ptrData.startDate, lang) : (lang === 'ru' ? '4 авг.' : 'Aug 4');
    const endStr = ptrData?.endDate ? formatTooltipDate(ptrData.endDate, lang) : (lang === 'ru' ? '11 авг.' : 'Aug 11');
    const platforms = ptrData?.platforms ? escapeHtml(getVal(ptrData.platforms)) : (lang === 'ru' ? 'Только ПК (Battle.net / Game Pass)' : 'PC Only (Battle.net / Game Pass)');
    const note = ptrData?.note ? escapeHtml(getVal(ptrData.note)) : (lang === 'ru' ? 'Часть контента S15 скрыта до BlizzCon' : 'Season 15 content held for BlizzCon');

    return `
      <div class="timeline-tooltip__title" style="color: #34d399; font-weight: 700; font-family: var(--font-display);">PTR Test: ${ptrTitle}</div>
      <div class="timeline-tooltip__season" style="color: #a7f3d0; font-size: 0.82rem;">${gameName}</div>
      <div class="timeline-tooltip__detail" style="margin-top: 0.35rem;"><strong>${lang === 'ru' ? 'Старт тестов' : 'PTR Start'}:</strong> ${startStr}</div>
      <div class="timeline-tooltip__detail"><strong>${lang === 'ru' ? 'Завершение' : 'PTR End'}:</strong> ${endStr}</div>
      <div class="timeline-tooltip__detail" style="color: #94a3b8; font-size: 0.75rem; margin-top: 0.2rem;">🎮 <strong>${lang === 'ru' ? 'Платформы' : 'Platforms'}:</strong> ${platforms}</div>
      <div style="font-size: 0.72rem; color: #cbd5e1; margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.15); font-style: italic;">
        ℹ️ ${note}
      </div>
    `;
  }
  let seasonName = 'TBA';
  let start = null;
  let end = null;

  if (isNext) {
    seasonName = escapeHtml(getVal(game.nextSeason?.name) || 'TBA');
    start = game.nextSeason?.startDate;
    end = game.nextSeason?.endDate;
  } else if (isHistory) {
    const idx = parseInt(String(seasonType).split('-')[1] || '0', 10);
    const hItem = (game.history || [])[idx] || (game.history || [])[0];
    seasonName = escapeHtml(getVal(hItem?.name) || 'Past Season');
    start = hItem?.startDate;
    end = hItem?.endDate;
  } else {
    seasonName = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
    start = game.currentSeason?.startDate;
    end = game.currentSeason?.endDate || game.nextSeason?.startDate;
  }

  const startStr = start ? formatTooltipDate(start, lang) : 'TBA';
  const endStr = end ? formatTooltipDate(end, lang) : (isNext ? 'TBA' : t('timeline.ongoing') || 'Ongoing');

  let durationStr = '—';
  if (start && end) {
    const diff = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    durationStr = `${diff} ${lang === 'ru' ? 'дней' : 'days'}`;
  }

  let eventsHtml = '';
  if (game.events && game.events.length > 0) {
    const eventsList = game.events.map(ev => {
      const title = escapeHtml(getVal(ev.title));
      const range = ev.startDate ? formatTooltipDate(ev.startDate, lang) : '';
      const isPtr = ev.type === 'ptr';
      const tag = isPtr ? 'PTR' : (ev.type === 'convention' ? 'EVENT' : 'LAUNCH');
      const tagColor = isPtr ? '#34d399' : (ev.type === 'convention' ? '#fbbf24' : '#818cf8');
      return `<div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 0.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;"><span style="color: ${tagColor}; font-weight: 600;">[${tag}] ${title}</span><span style="color: #94a3b8; font-size: 0.72rem;">${range}</span></div>`;
    }).join('');

    eventsHtml = `
      <div style="margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px solid rgba(255,255,255,0.15);">
        <div style="font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-display);">${t('card.upcomingEventsHeader') || (lang === 'ru' ? 'БЛИЖАЙШИЕ ЭТАПЫ И ТЕСТЫ:' : 'UPCOMING STAGES & TESTS:')}</div>
        ${eventsList}
      </div>
    `;
  }

  let verificationNoteHtml = '';
  if (isNext && game.nextSeason?.verificationNote) {
    const rawNote = getVal(game.nextSeason.verificationNote);
    if (rawNote) {
      const escaped = escapeHtml(rawNote).replace(/\n/g, '<br>');
      const headerText = lang === 'ru' ? 'ОБОСНОВАНИЕ ПРОГНОЗА:' : 'FORECAST RATIONALE:';
      verificationNoteHtml = `
        <div style="margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px solid rgba(255,255,255,0.15); font-size: 0.74rem; color: #cbd5e1; line-height: 1.35;">
          <div style="font-size: 0.68rem; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-display); margin-bottom: 0.25rem;">
            💡 ${headerText}
          </div>
          ${escaped}
        </div>
      `;
    }
  }

  return `
    <div class="timeline-tooltip__title">${gameName}</div>
    <div class="timeline-tooltip__season">${seasonName}</div>
    <div class="timeline-tooltip__detail"><strong>${t('timeline.started') || 'Started'}:</strong> ${startStr}</div>
    <div class="timeline-tooltip__detail"><strong>${t('timeline.ends') || 'Ends'}:</strong> ${endStr}</div>
    <div class="timeline-tooltip__detail"><strong>${t('timeline.duration') || 'Duration'}:</strong> ${durationStr}</div>
    ${verificationNoteHtml}
    ${eventsHtml}
  `;
}

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
    const item = e.target.closest('[data-game-id]');
    if (!item) return;

    const gameId = item.getAttribute('data-game-id');
    const seasonType = item.getAttribute('data-season-type');
    const content = getTimelineTooltipContent(gameId, seasonType);
    if (!content) return;

    tooltip.innerHTML = content;
    tooltip.style.display = 'block';
  }, { signal });

  grid.addEventListener('mousemove', (e) => {
    if (activeTouch) return;
    if (tooltip.style.display === 'block') {
      const tooltipWidth = tooltip.offsetWidth || 220;
      const tooltipHeight = tooltip.offsetHeight || 100;
      let left = e.clientX + 15;
      let top = e.clientY + 15;

      if (left + tooltipWidth > window.innerWidth - 10) {
        left = Math.max(10, e.clientX - tooltipWidth - 15);
      }
      if (top + tooltipHeight > window.innerHeight - 10) {
        top = Math.max(10, e.clientY - tooltipHeight - 15);
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
  }, { signal });

  grid.addEventListener('mouseout', (e) => {
    if (activeTouch) return;
    const item = e.target.closest('[data-game-id]');
    if (!item) return;

    const related = e.relatedTarget;
    if (related && item.contains(related)) return;

    tooltip.style.display = 'none';
  }, { signal });

  // Tap-to-toggle details on mobile touchscreens and click to navigate
  const handleTimelineClick = (e) => {
    const item = e.target.closest('[data-game-id]');
    if (item) {
      const gameId = item.getAttribute('data-game-id');
      const seasonType = item.getAttribute('data-season-type');
      
      // If touchscreen, show tooltip on first tap
      if (e.pointerType === 'touch' || e.detail === 0) {
        activeTouch = true;
        e.stopPropagation();
        
        const content = getTimelineTooltipContent(gameId, seasonType);
        if (!content) return;

        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        
        const rect = item.getBoundingClientRect();
        const tooltipWidth = tooltip.offsetWidth || 180;
        const tooltipHeight = tooltip.offsetHeight || 120;
        
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltipHeight - 10}px`;

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
        // Desktop click: navigate to game card
        if (gameId) {
          const nextGame = getState().games.find((g) => g.id === gameId);
          if (nextGame) {
            trackEvent('game_selected', {
              game_id: nextGame.id,
              game_name: getVal(nextGame.name) || 'Untitled Game',
              view: 'timeline'
            });
            setActiveGame(nextGame, true);
            setActiveView('card', true);
            renderToast(t('toasts.gameSelected', { game: getVal(nextGame.name) }));
            renderApp();
          }
        }
      }
    } else {
      tooltip.style.display = 'none';
    }
  };

  grid.addEventListener('click', handleTimelineClick, { signal });
  
  // Hide tooltip when clicking anywhere else
  document.addEventListener('click', (e) => {
    if (!grid.contains(e.target)) {
      tooltip.style.display = 'none';
    }
  }, { signal });
}

let selectedEventId = null;
let eventsDrawerAbortController = null;

function attachEventsDetailDrawer() {
  const container = document.querySelector('.events-dashboard-desktop');
  const drawer = document.getElementById('events-detail-drawer');
  const drawerContent = document.getElementById('events-detail-drawer-content');

  if (!container || !drawer || !drawerContent) return;

  if (eventsDrawerAbortController) {
    eventsDrawerAbortController.abort();
  }
  eventsDrawerAbortController = new AbortController();
  const { signal } = eventsDrawerAbortController;

  const closeDrawer = () => {
    selectedEventId = null;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    container.querySelectorAll('.events-timeline__bar.is-selected').forEach(bar => {
      bar.classList.remove('is-selected');
    });
  };

  const openEvent = (eventId) => {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;

    selectedEventId = eventId;
    const state = getState();
    const lang = state.settings?.lang || 'en';
    const isEventsPage = typeof window !== 'undefined' && window.location.pathname.includes('/events');
    const basePath = isEventsPage ? '../' : './';

    drawerContent.innerHTML = renderEventDetailContent(event, { lang, basePath });
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');

    container.querySelectorAll('.events-timeline__bar').forEach(bar => {
      if (bar.dataset.eventId === eventId) {
        bar.classList.add('is-selected');
      } else {
        bar.classList.remove('is-selected');
      }
    });
  };

  // Click on event bars in the timeline grid or close button
  container.addEventListener('click', (e) => {
    const bar = e.target.closest('.events-timeline__bar[data-event-id]');
    if (bar) {
      const eventId = bar.dataset.eventId;
      if (selectedEventId === eventId) {
        // Re-clicking same event toggles it closed
        closeDrawer();
      } else {
        openEvent(eventId);
      }
      return;
    }

    // Close button click
    if (e.target.closest('#events-detail-drawer-close')) {
      closeDrawer();
    }
  }, { signal });

  // Click outside drawer to close
  document.addEventListener('click', (e) => {
    if (!drawer.classList.contains('is-open')) return;
    if (drawer.contains(e.target)) return;
    if (e.target.closest('.events-timeline__bar')) return;
    closeDrawer();
  }, { signal });

  // Escape key closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      closeDrawer();
    }
  }, { signal });
}

function attachNavbarEvents() {
  const navbarRoot = document.getElementById('navbar');

  if (!navbarRoot) {
    return;
  }

  // Use event delegation on the navbar container — survives innerHTML re-renders without duplicate listeners
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
          renderToast(t('toasts.gameSelected', { game: getVal(nextGame.name) }));
          renderApp();
        }
        return;
      }

      // 2) View switch buttons (rendered fresh each time, but listener lives on parent)
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
        renderApp();
        return;
      }

      const viewTimelineBtn = event.target.closest('#view-timeline-btn');
      if (viewTimelineBtn) {
        setActiveView('timeline', true);
        renderApp();
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
      renderApp();
    });
  }
  if (mobTimelineBtn && !mobTimelineBtn.dataset.bound) {
    mobTimelineBtn.dataset.bound = 'true';
    mobTimelineBtn.addEventListener('click', () => {
      setActiveView('timeline', true);
      renderApp();
    });
  }
  if (mobGamesBtn && !mobGamesBtn.dataset.bound) {
    mobGamesBtn.dataset.bound = 'true';
    mobGamesBtn.addEventListener('click', () => {
      setActiveView('games', true);
      renderApp();
    });
  }
  if (mobMoreBtn && !mobMoreBtn.dataset.bound) {
    mobMoreBtn.dataset.bound = 'true';
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
  if (typeof document !== 'undefined' && !document.querySelector('[data-countdown]')) return;
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
      
      const safeGameId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(game.id) : game.id;
      const cardEls = document.querySelectorAll(`.game-card[data-game-id="${safeGameId}"] .game-card__countdown`);
      cardEls.forEach(cardEl => {
        updateCountdownDOM(cardEl, calculateCountdown(targetDateStr));
      });
    });
  }

  // 2. Update Timeline Upcoming Launches Countdowns (if visible)
  if (state.activeView === 'timeline' || state.activeView === 'card') {
    state.games.forEach((game) => {
      const targetDateStr = game.nextSeason?.startDate;
      if (!targetDateStr) return;

      const targetDate = new Date(targetDateStr);
      const now = new Date();
      if (targetDate <= now) {
        if (!expiredUpcomingCountdowns.has(game.id)) {
          expiredUpcomingCountdowns.add(game.id);
          renderApp();
        }
        return;
      }

      const safeGameId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(game.id) : game.id;
      const upcomingEls = document.querySelectorAll(`.upcoming-card[data-game-id="${safeGameId}"] .upcoming-card__countdown`);
      upcomingEls.forEach(el => {
        updateCountdownDOM(el, calculateCountdown(targetDateStr));
      });
    });

    // 3. Update Urgent Event Card Countdowns (if visible)
    const urgentCountdowns = document.querySelectorAll('.urgent-event-card__countdown[data-countdown-target]');
    if (urgentCountdowns.length > 0) {
      const now = Date.now();
      urgentCountdowns.forEach(el => {
        const target = Number(el.getAttribute('data-countdown-target'));
        if (!target) return;
        const diffMs = Math.max(0, target - now);
        const totalSecs = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);

        const daysEl = el.querySelector('[data-countdown="days"]');
        const hoursEl = el.querySelector('[data-countdown="hours"]');
        const minsEl = el.querySelector('[data-countdown="minutes"]');

        if (daysEl) daysEl.textContent = days;
        if (hoursEl) hoursEl.textContent = hours;
        if (minsEl) minsEl.textContent = mins;
      });
    }

    // 4. Update Event Detail Drawer Countdown (if open and has active target)
    const drawerCountdown = document.querySelector('.events-detail-status-row[data-countdown-target], .events-detail-countdown[data-countdown-target]');
    if (drawerCountdown) {
      const target = Number(drawerCountdown.getAttribute('data-countdown-target'));
      const displayEl = drawerCountdown.querySelector('[data-countdown-display]');
      if (target && displayEl) {
        const now = Date.now();
        const diffMs = Math.max(0, target - now);
        const totalSecs = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);

        const isEn = (getState().settings?.lang || 'en') === 'en';
        let formatted = '';
        if (days > 0) {
          formatted = isEn ? `${days}d ${hours}h ${mins}m` : `${days}д ${hours}ч ${mins}м`;
        } else if (hours > 0) {
          formatted = isEn ? `${hours}h ${mins}m` : `${hours}ч ${mins}м`;
        } else {
          formatted = isEn ? `${mins}m` : `${mins}м`;
        }

        const currentText = displayEl.textContent.trim();
        let prefix = '';
        if (currentText.startsWith('Starts in')) prefix = 'Starts in ';
        else if (currentText.startsWith('Ends soon in')) prefix = 'Ends soon in ';
        else if (currentText.startsWith('Ends in')) prefix = 'Ends in ';
        else if (currentText.startsWith('Начнётся через')) prefix = 'Начнётся через ';
        else if (currentText.startsWith('Скоро завершится через')) prefix = 'Скоро завершится через ';
        else if (currentText.startsWith('Завершится через')) prefix = 'Завершится через ';

        displayEl.textContent = `${prefix}${formatted}`;
      }
    }
  }
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

let isSwitchingTimelineMode = false;

function switchTimelineMode(targetMode) {
  if (timelineMode === targetMode || isSwitchingTimelineMode) return;
  isSwitchingTimelineMode = true;

  const currentSwitcher = document.querySelector('.timeline-integrated-switcher');
  const targetTab = document.getElementById(`tab-mode-${targetMode}`);
  const currentTab = document.getElementById(`tab-mode-${timelineMode}`);
  const container = document.querySelector('.timeline-view-wrapper, .events-dashboard-container');

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
        window.history.pushState({ mode: 'events' }, '', './events/');
      }
    } else {
      if (window.location.pathname.includes('/events')) {
        window.history.pushState({ mode: 'seasons' }, '', '../');
      }
    }
    renderApp();
    isSwitchingTimelineMode = false;
  }, 120);
}

// Global click handler for mode switcher (SEASONS <-> EVENTS)
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const tabSeasons = e.target.closest('#tab-mode-seasons');
    if (tabSeasons) {
      e.preventDefault();
      switchTimelineMode('seasons');
      return;
    }

    const tabEvents = e.target.closest('#tab-mode-events');
    if (tabEvents) {
      e.preventDefault();
      switchTimelineMode('events');
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
    renderApp();
  });

  window.addEventListener('resize', () => {
    initSwitcherSlider();
  });
}

function startCountdownLoop() {
  if (countdownTimer) return;
  tickCountdown();
  countdownTimer = window.setInterval(tickCountdown, 1000);
}

async function initializeApp() {
  setError(null);

  const isEventsPage = typeof window !== 'undefined' && window.location.pathname.includes('/events');
  if (isEventsPage) {
    timelineMode = 'events';
  }

  const embeddedEventsScript = typeof document !== 'undefined' && document.getElementById('sf-events-json');
  if (embeddedEventsScript) {
    try {
      const parsed = JSON.parse(embeddedEventsScript.textContent);
      if (Array.isArray(parsed)) eventsData = parsed;
    } catch (e) {}
  }

  // 1. Immediately hydrate synchronously from fallback data for 0ms instantaneous render
  const initialGames = FALLBACK_SEASONS_DATA?.games || [];
  if (initialGames.length > 0) {
    setGames(initialGames);
    setRawData(FALLBACK_SEASONS_DATA);
  }

  try {
    const games = getState().games || [];

    // Check overlay parameters
    const params = new URLSearchParams(window.location.search);
    const isOverlay = params.get('overlay') === 'true';
    if (isOverlay) {
      document.body.classList.add('app-layout--overlay');
      setLoading(false);
      initOBSOverlay(games, getState());
      return;
    } else {
      // Restore user state from localStorage
      const lastGame = localStorage.getItem('lastGame');
      const lastView = localStorage.getItem('lastView');
      const lastVisit = localStorage.getItem('lastVisit');
      
      const now = Date.now();
      const isFirstVisit = !lastVisit;
      const isLongTimeNoSee = lastVisit && (now - parseInt(lastVisit, 10) > 30 * 24 * 60 * 60 * 1000);
      const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1025px)').matches;
      const defaultView = isDesktop || isEventsPage ? 'timeline' : 'card';

      if (isEventsPage) {
        setActiveView('timeline', false);
        setActiveGame(games[0] ?? null, false);
      } else if (isFirstVisit) {
        setActiveView(defaultView, false);
        setActiveGame(games[0] ?? null, false);
      } else if (isLongTimeNoSee) {
        let matchedGame = null;
        if (lastGame) {
          matchedGame = games.find(g => g.id === lastGame || g.name?.en === lastGame || g.name?.ru === lastGame);
        }
        setActiveGame(matchedGame || games[0] || null, false);
        setActiveView(defaultView, false);
      } else {
        let matchedGame = null;
        if (lastGame) {
          matchedGame = games.find(g => g.id === lastGame || g.name?.en === lastGame || g.name?.ru === lastGame);
        }
        setActiveGame(matchedGame || games[0] || null, false);

        if (lastView === 'Timeline') {
          setActiveView('timeline', false);
        } else if (lastView === 'Game Card') {
          setActiveView('card', false);
        } else {
          setActiveView(defaultView, false);
        }
      }

      const hashView = window.location.hash.replace('#', '').toLowerCase();
      const queryView = params.get('view')?.toLowerCase();
      const overrideView = ['timeline', 'games', 'more', 'card'].includes(hashView) ? hashView : (['timeline', 'games', 'more', 'card'].includes(queryView) ? queryView : null);
      if (overrideView) {
        setActiveView(overrideView, false);
      }

      try {
        localStorage.setItem('lastVisit', String(now));
      } catch (e) {
        // localStorage non-fatal
      }
    }

    ModalManager.initAll();
    MobileNav.init({ basePath: isEventsPage ? '../' : './' });
    Header.update({ lang: getState().settings?.lang });

    initHeroParallax();
    setLoading(false);
    renderApp();
    startCountdownLoop();

    // 2. Fetch fresh network data asynchronously in background (0ms latency!)
    const eventsDataUrl = isEventsPage ? '../data/events.json' : './data/events.json';
    fetch(eventsDataUrl)
      .then(res => res.json())
      .then(data => {
        if (data?.events) {
          eventsData = data.events;
          if (timelineMode === 'events') {
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

initializeApp();
