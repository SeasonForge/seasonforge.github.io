import { render as renderStreamerModal } from '../components/StreamerModal.js';
import { t, getVal } from '../i18n/index.js';
import { getState } from '../store/state.js';
import { trackEvent } from './analytics.js';

export function initStreamer(games = []) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const activeGames = (Array.isArray(games) && games.length > 0) 
    ? games 
    : (typeof getState === 'function' ? (getState()?.games || []) : []);

  // Remove existing one if any, then insert fresh HTML to ensure correct translation and options list
  const existingOverlay = document.getElementById('streamer-modal-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  modalRoot.insertAdjacentHTML('beforeend', renderStreamerModal(activeGames));

  const overlay = document.getElementById('streamer-modal-overlay');
  const typeSelect = document.getElementById('streamer-widget-type');
  const gameSelect = document.getElementById('streamer-game-select');
  const gameField = document.getElementById('streamer-game-field');
  const urlInput = document.getElementById('streamer-url-input');
  const copyBtn = document.getElementById('streamer-copy-btn');
  const closeBtn = document.getElementById('streamer-close-btn');
  const recommendedSize = document.getElementById('streamer-recommended-size');

  function getRootUrl() {
    const origin = window.location.origin;
    let path = window.location.pathname;
    path = path.replace(/index\.html$/, '');
    if (path.includes('/games/')) {
      path = path.substring(0, path.indexOf('/games/')) + '/';
    }
    path = path.replace(/\/+/g, '/');
    return origin + path;
  }

  function updateUrl() {
    const rootUrl = getRootUrl();
    const type = typeSelect.value;
    const gameId = gameSelect ? gameSelect.value : '';

    let targetUrl = `${rootUrl}?overlay=true&type=${type}`;
    if (type !== 'timeline' && gameId) {
      targetUrl += `&game=${gameId}`;
    }

    urlInput.value = targetUrl;

    // Update size recommendation and visibility of game select
    if (type === 'timeline') {
      if (gameField) gameField.style.display = 'none';
      if (recommendedSize) recommendedSize.textContent = '800×500';
    } else {
      if (gameField) gameField.style.display = 'block';
      if (recommendedSize) {
        recommendedSize.textContent = type === 'status' ? '400×120' : '400×250';
      }
    }

    // Update Live Preview Mockup
    const previewGameName = document.getElementById('obs-preview-game-name');
    const previewSeasonName = document.getElementById('obs-preview-season-name');
    const previewBadge = document.getElementById('obs-preview-badge');
    const previewDates = document.getElementById('obs-preview-dates');
    const previewProgressFill = document.getElementById('obs-preview-progress-fill');

    if (type === 'timeline') {
      if (previewGameName) previewGameName.textContent = t('streamer.typeTimeline');
      if (previewSeasonName) previewSeasonName.textContent = 'All 5 Action RPGs Monitored';
      if (previewBadge) previewBadge.textContent = 'TIMELINE';
      if (previewDates) previewDates.textContent = 'PoE 1 • PoE 2 • D4 • Last Epoch • Torchlight';
      if (previewProgressFill) previewProgressFill.style.width = '85%';
    } else {
      const currentGame = activeGames.find(g => g.id === gameId) || activeGames[0];
      if (currentGame) {
        if (previewGameName) previewGameName.textContent = getVal(currentGame.name) || 'Game';

        if (type === 'countdown') {
          const nextSeason = currentGame.nextSeason;
          const nextTitle = nextSeason ? (getVal(nextSeason.title) || getVal(nextSeason.name) || 'Next Season') : 'Next Season';
          if (previewSeasonName) previewSeasonName.textContent = nextTitle;
          if (previewBadge) previewBadge.textContent = 'COUNTDOWN';
          if (previewDates) previewDates.textContent = nextSeason?.startDate ? `Starts: ${nextSeason.startDate}` : 'Launch Soon • 41d 23h 15m';
          if (previewProgressFill) previewProgressFill.style.width = '45%';
        } else {
          // Status widget
          const currentSeason = currentGame.currentSeason || currentGame.seasons?.[0];
          if (currentSeason) {
            const seasonTitle = getVal(currentSeason.title) || getVal(currentSeason.name) || getVal(currentSeason.league) || 'Season';
            const numPrefix = currentSeason.number ? `${currentSeason.number} ` : '';
            if (previewSeasonName) previewSeasonName.textContent = `${numPrefix}${seasonTitle}`;
            if (previewBadge) previewBadge.textContent = 'LIVE';
            if (previewDates) previewDates.textContent = currentSeason.startDate ? `${currentSeason.startDate} • In Progress` : 'Active Season';
            if (previewProgressFill) previewProgressFill.style.width = '65%';
          } else {
            if (previewSeasonName) previewSeasonName.textContent = 'Current Season Status';
            if (previewBadge) previewBadge.textContent = 'ACTIVE';
            if (previewDates) previewDates.textContent = 'Live Tracker';
            if (previewProgressFill) previewProgressFill.style.width = '30%';
          }
        }
      }
    }
  }

  function openModal(placement = 'header') {
    overlay.style.display = 'flex';
    updateUrl();
    setTimeout(() => {
      overlay.classList.add('streamer-modal-overlay--visible');
    }, 10);

    trackEvent('obs_configurator_opened', { placement });
    
    document.addEventListener('keydown', handleEsc);
    overlay.addEventListener('click', handleOutsideClick);
  }

  function closeModal() {
    overlay.classList.remove('streamer-modal-overlay--visible');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
    
    document.removeEventListener('keydown', handleEsc);
    overlay.removeEventListener('click', handleOutsideClick);
  }

  function handleEsc(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  function handleOutsideClick(e) {
    if (e.target === overlay) {
      closeModal();
    }
  }

  async function handleCopy() {
    const url = urlInput.value;
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      // Fallback for older browsers
      urlInput.select();
      document.execCommand('copy');
    }

    const widgetType = typeSelect.value || 'status';
    const selectedGame = widgetType === 'timeline' ? 'all' : (gameSelect.value || 'path-of-exile');
    trackEvent('obs_widget_copied', {
      widget_type: widgetType,
      game_id: selectedGame
    });

    const btnText = copyBtn.querySelector('.streamer-form__btn-copy-text');
    copyBtn.classList.add('streamer-form__btn-copy--success');
    if (btnText) btnText.textContent = t('streamer.copied');

    setTimeout(() => {
      copyBtn.classList.remove('streamer-form__btn-copy--success');
      if (btnText) btnText.textContent = t('streamer.btnCopy');
    }, 1500);
  }

  // Event Listeners
  const ensureBound = (el, evt, handler) => {
    if (!el || el.dataset.bound) return;
    el.dataset.bound = 'true';
    el.addEventListener(evt, handler);
  };

  const headerCloseBtn = document.getElementById('streamer-header-close-btn');

  ensureBound(typeSelect, 'change', updateUrl);
  ensureBound(gameSelect, 'change', updateUrl);
  ensureBound(copyBtn, 'click', handleCopy);
  ensureBound(closeBtn, 'click', closeModal);
  if (headerCloseBtn) ensureBound(headerCloseBtn, 'click', closeModal);

  // Attach click listeners to all streamer trigger buttons cleanly
  document.querySelectorAll('.streamer-trigger-btn, #streamer-trigger-btn, #mob-streamer-trigger').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      openModal(btn.id === 'mob-streamer-trigger' ? 'mobile_menu' : 'header');
    };
  });
}
