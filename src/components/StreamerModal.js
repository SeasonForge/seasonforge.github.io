import { t, getVal } from '../i18n/index.js';
import { getIconSvg } from '../utils/icons.js';
import { getState } from '../store/state.js';
import { trackEvent } from '../utils/analytics.js';

export function render(games = []) {
  const gameOptions = games
    .map(game => `<option value="${game.id}">${getVal(game.name)}</option>`)
    .join('');

  const defaultGameName = games[0] ? getVal(games[0].name) : 'Select Game';

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
              <label class="obs-form-label">${t('streamer.typeLabel')}</label>
              <div class="custom-dropdown" id="dropdown-widget-type">
                <button type="button" class="custom-dropdown__trigger">
                  <span class="custom-dropdown__icon">${getIconSvg('activity', { size: 16 })}</span>
                  <span class="custom-dropdown__label">${t('streamer.typeStatus')}</span>
                  <span class="custom-dropdown__arrow">${getIconSvg('chevron-down', { size: 16 })}</span>
                </button>
                <div class="custom-dropdown__menu">
                  <div class="custom-dropdown__item is-selected" data-value="status" data-icon="activity">
                    <span class="custom-dropdown__item-icon">${getIconSvg('activity', { size: 16 })}</span>
                    <span>${t('streamer.typeStatus')}</span>
                  </div>
                  <div class="custom-dropdown__item" data-value="countdown" data-icon="clock">
                    <span class="custom-dropdown__item-icon">${getIconSvg('clock', { size: 16 })}</span>
                    <span>${t('streamer.typeCountdown')}</span>
                  </div>
                  <div class="custom-dropdown__item" data-value="card" data-icon="layout">
                    <span class="custom-dropdown__item-icon">${getIconSvg('layout', { size: 16 })}</span>
                    <span>${t('streamer.typeCard')}</span>
                  </div>
                  <div class="custom-dropdown__item" data-value="timeline" data-icon="layers">
                    <span class="custom-dropdown__item-icon">${getIconSvg('layers', { size: 16 })}</span>
                    <span>${t('streamer.typeTimeline')}</span>
                  </div>
                </div>
                <select id="streamer-widget-type" style="display: none;">
                  <option value="status">${t('streamer.typeStatus')}</option>
                  <option value="countdown">${t('streamer.typeCountdown')}</option>
                  <option value="card">${t('streamer.typeCard')}</option>
                  <option value="timeline">${t('streamer.typeTimeline')}</option>
                </select>
              </div>
            </div>

            <div id="streamer-game-field" class="obs-form-group">
              <label class="obs-form-label">${t('streamer.gameLabel')}</label>
              <div class="custom-dropdown" id="dropdown-game-select">
                <button type="button" class="custom-dropdown__trigger">
                  <span class="custom-dropdown__icon">${getIconSvg('gamepad', { size: 16 })}</span>
                  <span class="custom-dropdown__label">${defaultGameName}</span>
                  <span class="custom-dropdown__arrow">${getIconSvg('chevron-down', { size: 16 })}</span>
                </button>
                <div class="custom-dropdown__menu">
                  ${games.map((game, idx) => `
                    <div class="custom-dropdown__item ${idx === 0 ? 'is-selected' : ''}" data-value="${game.id}">
                      <span class="custom-dropdown__item-icon">${getIconSvg('gamepad', { size: 16 })}</span>
                      <span>${getVal(game.name)}</span>
                    </div>
                  `).join('')}
                </div>
                <select id="streamer-game-select" style="display: none;">
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
                  <div class="obs-step-content">${t('streamer.step1')}</div>
                </li>
                <li class="obs-step-item">
                  <div class="obs-step-content">${t('streamer.step2')}</div>
                </li>
                <li class="obs-step-item">
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
                <div class="obs-canvas-watermark">OBS Canvas Preview</div>
                <div id="obs-preview-container" class="obs-iframe-frame">
                  <!-- Dynamic 1:1 OBS Widget Preview -->
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

  let timerInterval = null;

  function startPreviewTimer(targetDateStr) {
    if (timerInterval) clearInterval(timerInterval);
    const timerEl = document.getElementById('obs-preview-timer');
    if (!timerEl) return;

    const updateTimer = () => {
      if (!targetDateStr) {
        timerEl.textContent = '41d 23h 15m 08s';
        return;
      }
      const diff = new Date(targetDateStr).getTime() - Date.now();
      if (diff <= 0) {
        timerEl.textContent = '00d 00h 00m 00s';
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      const pad = (n) => String(n).padStart(2, '0');
      timerEl.textContent = `${pad(days)}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
    };

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }

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
    const type = typeSelect ? typeSelect.value : 'status';
    const gameId = gameSelect ? gameSelect.value : '';

    let targetUrl = `${rootUrl}?overlay=true&type=${type}`;
    if (type !== 'timeline' && gameId) {
      targetUrl += `&game=${gameId}`;
    }

    if (urlInput) urlInput.value = targetUrl;

    if (type === 'timeline') {
      if (gameField) gameField.style.display = 'none';
      if (recommendedSize) recommendedSize.textContent = '800×500';
    } else {
      if (gameField) gameField.style.display = 'block';
      if (recommendedSize) {
        recommendedSize.textContent = type === 'status' ? '400×120' : (type === 'card' ? '420×360' : '400×250');
      }
    }

    const activeLang = (typeof getState === 'function' ? getState()?.settings?.lang : 'ru') || 'ru';
    const previewContainer = document.getElementById('obs-preview-container');

    if (previewContainer) {
      if (type === 'timeline') {
        if (timerInterval) clearInterval(timerInterval);
        previewContainer.className = 'obs-iframe-frame';
        previewContainer.innerHTML = `
          <div class="obs-widget-box">
            <div class="obs-widget-box__header">
              <span class="obs-widget-box__game-title">${t('streamer.typeTimeline')}</span>
              <span class="obs-widget-badge obs-widget-badge--timeline">TIMELINE</span>
            </div>
            <div class="obs-widget-timeline-rows">
              <div class="obs-timeline-mini-row"><span class="obs-mini-tag">PoE 1</span><div class="obs-mini-bar poe-bar"></div></div>
              <div class="obs-timeline-mini-row"><span class="obs-mini-tag">PoE 2</span><div class="obs-mini-bar poe2-bar"></div></div>
              <div class="obs-timeline-mini-row"><span class="obs-mini-tag">D4</span><div class="obs-mini-bar d4-bar"></div></div>
              <div class="obs-timeline-mini-row"><span class="obs-mini-tag">LE</span><div class="obs-mini-bar le-bar"></div></div>
              <div class="obs-timeline-mini-row"><span class="obs-mini-tag">TL</span><div class="obs-mini-bar tl-bar"></div></div>
            </div>
            <div class="obs-widget-watermark">seasonforge.online</div>
          </div>
        `;
      } else {
        const currentGame = activeGames.find(g => g.id === gameId) || activeGames[0];
        const gameName = getVal(currentGame?.name) || 'Game';

        if (type === 'card') {
          const currentSeason = currentGame?.currentSeason || currentGame?.seasons?.[0];
          const seasonTitle = currentSeason ? (getVal(currentSeason.title) || getVal(currentSeason.name) || getVal(currentSeason.league) || 'Current Season') : 'Active Season';
          const numPrefix = currentSeason?.number ? `${currentSeason.number} ` : '';

          const nextSeason = currentGame?.nextSeason;
          const nextTitle = nextSeason ? (getVal(nextSeason.title) || getVal(nextSeason.name) || 'Next Season') : 'Upcoming Season';
          const startDateFormatted = nextSeason?.startDate
            ? new Date(nextSeason.startDate).toLocaleDateString(activeLang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

          previewContainer.className = 'obs-iframe-frame';
          previewContainer.innerHTML = `
            <div class="obs-widget-box obs-widget-box--card">
              <div class="obs-widget-box__header">
                <span class="obs-widget-box__game-title">${gameName}</span>
                <span class="obs-widget-badge obs-widget-badge--live">● IN PROGRESS</span>
              </div>
              <div class="obs-widget-card__section">
                <div class="obs-widget-box__dates">${activeLang === 'ru' ? 'Текущий сезон' : 'Current Season'}: ${numPrefix}${seasonTitle}</div>
                <div class="obs-widget-progress">
                  <div class="obs-widget-progress__fill" style="width: 65%;"></div>
                </div>
              </div>
              <div class="obs-widget-card__section" style="margin-top: 8px;">
                <div class="obs-widget-box__season-title" style="font-size: 0.82rem; color: #a78bfa;">⏳ ${activeLang === 'ru' ? 'СЛЕДУЮЩИЙ СЕЗОН' : 'NEXT SEASON'}: ${nextTitle}</div>
                <div class="obs-widget-timer-display" id="obs-preview-timer">--d --h --m --s</div>
                <div class="obs-widget-box__date-sub">${startDateFormatted ? `${activeLang === 'ru' ? 'Старт' : 'Launch'}: ${startDateFormatted}` : ''}</div>
              </div>
              <div class="obs-widget-watermark">seasonforge.online</div>
            </div>
          `;
          startPreviewTimer(nextSeason?.startDate);
        } else if (type === 'countdown') {
          const nextSeason = currentGame?.nextSeason;
          const nextTitle = nextSeason ? (getVal(nextSeason.title) || getVal(nextSeason.name) || 'Next Season') : 'Upcoming Season';
          const startDateFormatted = nextSeason?.startDate
            ? new Date(nextSeason.startDate).toLocaleDateString(activeLang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

          previewContainer.className = 'obs-iframe-frame';
          previewContainer.innerHTML = `
            <div class="obs-widget-box">
              <div class="obs-widget-box__header">
                <span class="obs-widget-box__game-title">${gameName}</span>
                <span class="obs-widget-badge obs-widget-badge--countdown">COUNTDOWN</span>
              </div>
              <div>
                <div class="obs-widget-box__season-title">${nextTitle}</div>
                <div class="obs-widget-timer-display" id="obs-preview-timer">--d --h --m --s</div>
                <div class="obs-widget-box__date-sub">${startDateFormatted ? `${activeLang === 'ru' ? 'Старт' : 'Starts'}: ${startDateFormatted}` : ''}</div>
              </div>
              <div class="obs-widget-watermark">seasonforge.online</div>
            </div>
          `;
          startPreviewTimer(nextSeason?.startDate);
        } else {
          // Status (400x120)
          if (timerInterval) clearInterval(timerInterval);
          const currentSeason = currentGame?.currentSeason || currentGame?.seasons?.[0];
          const seasonTitle = currentSeason ? (getVal(currentSeason.title) || getVal(currentSeason.name) || getVal(currentSeason.league) || 'Current Season') : 'Active Season';
          const numPrefix = currentSeason?.number ? `${currentSeason.number} ` : '';
          const startDateFormatted = currentSeason?.startDate
            ? new Date(currentSeason.startDate).toLocaleDateString(activeLang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

          previewContainer.className = 'obs-iframe-frame';
          previewContainer.innerHTML = `
            <div class="obs-widget-box">
              <div class="obs-widget-box__header">
                <span class="obs-widget-box__game-title">${gameName}</span>
                <span class="obs-widget-badge obs-widget-badge--live">● LIVE</span>
              </div>
              <div>
                <div class="obs-widget-box__season-title">${numPrefix}${seasonTitle}</div>
                <div class="obs-widget-box__dates">${startDateFormatted ? `${startDateFormatted} • ${activeLang === 'ru' ? 'Идёт сейчас' : 'In Progress'}` : 'Active'}</div>
                <div class="obs-widget-progress">
                  <div class="obs-widget-progress__fill" style="width: 65%;"></div>
                </div>
              </div>
              <div class="obs-widget-watermark">seasonforge.online</div>
            </div>
          `;
        }
      }
    }
  }

  function setupCustomDropdown(dropdownId, selectId) {
    const container = document.getElementById(dropdownId);
    const hiddenSelect = document.getElementById(selectId);
    if (!container || !hiddenSelect) return;

    const trigger = container.querySelector('.custom-dropdown__trigger');
    const label = container.querySelector('.custom-dropdown__label');
    const iconEl = container.querySelector('.custom-dropdown__icon');
    const items = container.querySelectorAll('.custom-dropdown__item');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-dropdown.is-open').forEach(other => {
        if (other !== container) other.classList.remove('is-open');
      });
      container.classList.toggle('is-open');
    });

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = item.dataset.value;
        const iconName = item.dataset.icon || 'gamepad';

        hiddenSelect.value = val;
        label.textContent = item.querySelector('span:last-child').textContent;
        if (iconEl && iconName) {
          iconEl.innerHTML = getIconSvg(iconName, { size: 16 });
        }

        items.forEach(i => i.classList.remove('is-selected'));
        item.classList.add('is-selected');

        container.classList.remove('is-open');
        updateUrl();
      });
    });
  }

  setupCustomDropdown('dropdown-widget-type', 'streamer-widget-type');
  setupCustomDropdown('dropdown-game-select', 'streamer-game-select');

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
  });

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
    if (!urlInput) return;
    const url = urlInput.value;
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      urlInput.select();
      document.execCommand('copy');
    }

    const widgetType = typeSelect ? typeSelect.value : 'status';
    const selectedGame = widgetType === 'timeline' ? 'all' : (gameSelect ? gameSelect.value : 'path-of-exile');
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

  if (typeSelect) ensureBound(typeSelect, 'change', updateUrl);
  if (gameSelect) ensureBound(gameSelect, 'change', updateUrl);
  if (copyBtn) ensureBound(copyBtn, 'click', handleCopy);
  if (closeBtn) ensureBound(closeBtn, 'click', closeModal);
  if (headerCloseBtn) ensureBound(headerCloseBtn, 'click', closeModal);

  document.querySelectorAll('.streamer-trigger-btn, #streamer-trigger-btn, #mob-streamer-trigger').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      openModal(btn.id === 'mob-streamer-trigger' ? 'mobile_menu' : 'header');
    };
  });
}

