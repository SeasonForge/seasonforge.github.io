import { t, getVal } from '../i18n/index.js';
import { getIconSvg } from '../utils/icons.js';
import { getState } from '../store/state.js';
import { trackEvent } from '../utils/analytics.js';

export function render(games = []) {
  const gameOptions = games
    .map(game => `<option value="${game.id}">${getVal(game.name)}</option>`)
    .join('');

  return `
    <div id="streamer-modal-overlay" class="streamer-modal-overlay" style="display: none;">
      <div class="streamer-modal-container obs-modal-card">
        
        <div class="obs-modal-header">
          <div class="obs-modal-header__title-block">
            <h3 class="obs-modal-title">${t('streamer.title')}</h3>
          </div>
          <button type="button" class="modal-close" id="streamer-header-close-btn" aria-label="Close">&times;</button>
        </div>
        
        <form id="streamer-config-form" class="obs-config-form">
          
          <!-- Top 2 Select Controls Grid -->
          <div class="obs-controls-grid">
            <div class="obs-form-group">
              <label class="obs-form-label" for="streamer-widget-type">${t('streamer.typeLabel')}</label>
              <div class="obs-select-wrapper">
                <span class="obs-select-icon">${getIconSvg('activity', { size: 16 })}</span>
                <select id="streamer-widget-type" class="obs-select">
                  <option value="status">${t('streamer.typeStatus')}</option>
                  <option value="countdown">${t('streamer.typeCountdown')}</option>
                  <option value="timeline">${t('streamer.typeTimeline')}</option>
                </select>
              </div>
            </div>

            <div id="streamer-game-field" class="obs-form-group">
              <label class="obs-form-label" for="streamer-game-select">${t('streamer.gameLabel')}</label>
              <div class="obs-select-wrapper">
                <span class="obs-select-icon">${getIconSvg('gamepad', { size: 16 })}</span>
                <select id="streamer-game-select" class="obs-select">
                  ${gameOptions}
                </select>
              </div>
            </div>
          </div>

          <!-- URL Input Row -->
          <div class="obs-form-group obs-url-group">
            <label class="obs-form-label" for="streamer-url-input">${t('streamer.urlLabel')}</label>
            <div class="obs-url-input-wrapper">
              <input type="text" id="streamer-url-input" class="obs-url-input" readonly value="" />
              <button type="button" id="streamer-copy-btn" class="obs-copy-btn">
                <span class="obs-copy-btn__icon">${getIconSvg('copy', { size: 15 })}</span>
                <span class="streamer-form__btn-copy-text">${t('streamer.btnCopy')}</span>
              </button>
            </div>
            <p class="obs-url-subtext">${t('streamer.urlSubtext')}</p>
          </div>

          <!-- Main Guide Card (2 Columns: Steps + Live Preview) -->
          <div class="obs-guide-card">
            <!-- Left Side: Step-by-Step Instructions -->
            <div class="obs-steps-col">
              <div class="obs-steps-col__header">
                <span class="obs-steps-col__icon">${getIconSvg('video', { size: 18 })}</span>
                <span class="obs-steps-col__title">${t('streamer.stepGuideTitle')}</span>
              </div>
              <ol class="obs-steps-list">
                <li class="obs-step-item">
                  <span class="obs-step-num">1</span>
                  <div class="obs-step-content">${t('streamer.step1')}</div>
                </li>
                <li class="obs-step-item">
                  <span class="obs-step-num">2</span>
                  <div class="obs-step-content">${t('streamer.step2')}</div>
                </li>
                <li class="obs-step-item">
                  <span class="obs-step-num">3</span>
                  <div class="obs-step-content">${t('streamer.step3')}</div>
                </li>
              </ol>
            </div>

            <!-- Right Side: Live Interactive OBS Preview Mockup -->
            <div class="obs-preview-col">
              <div class="obs-preview-col__header">
                <span class="obs-preview-col__dot"></span>
                <span class="obs-preview-col__title">${t('streamer.previewTitle')}</span>
                <span id="streamer-recommended-size" class="obs-preview-col__size">400×120</span>
              </div>
              <div class="obs-canvas-mockup">
                <div class="obs-canvas-watermark">OBS / Streamlabs Canvas</div>
                <div class="obs-widget-box">
                  <div class="obs-widget-box__header">
                    <span id="obs-preview-game-name" class="obs-widget-box__game">Path of Exile</span>
                    <span id="obs-preview-badge" class="obs-widget-box__badge">LIVE</span>
                  </div>
                  <div id="obs-preview-season-name" class="obs-widget-box__season">Necropolis League</div>
                  <div id="obs-preview-dates" class="obs-widget-box__dates">Mar 29 • Active</div>
                  <div class="obs-widget-box__progress">
                    <div id="obs-preview-progress-fill" class="obs-widget-box__progress-fill"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="obs-modal-footer">
            <button type="button" id="streamer-close-btn" class="obs-btn obs-btn--secondary">${t('streamer.btnClose')}</button>
          </div>

        </form>

      </div>
    </div>
  `;
}

export function initStreamer(games = []) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const activeGames = (Array.isArray(games) && games.length > 0) 
    ? games 
    : (typeof getState === 'function' ? (getState()?.games || []) : []);

  const existingOverlay = document.getElementById('streamer-modal-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  modalRoot.insertAdjacentHTML('beforeend', render(activeGames));

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

    if (type === 'timeline') {
      if (gameField) gameField.style.display = 'none';
      if (recommendedSize) recommendedSize.textContent = '800×500';
    } else {
      if (gameField) gameField.style.display = 'block';
      if (recommendedSize) {
        recommendedSize.textContent = type === 'status' ? '400×120' : '400×250';
      }
    }

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

  document.querySelectorAll('.streamer-trigger-btn, #streamer-trigger-btn, #mob-streamer-trigger').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      openModal(btn.id === 'mob-streamer-trigger' ? 'mobile_menu' : 'header');
    };
  });
}
