import { t, getVal } from '../i18n/index.js';
import { getIconSvg } from '../utils/icons.js';
import { getState } from '../store/state.js';
import { trackEvent } from '../utils/analytics.js';
import { generateEmbedUrl, generateIframeCode } from '../utils/widgetEmbed.js';

export function renderWebWidgetModal(games = []) {
  const activeGames = games.length ? games : [];
  const defaultGameName = activeGames[0] ? getVal(activeGames[0].name) : 'Select Game';

  const gameOptions = activeGames
    .map(game => `<option value="${game.id}">${getVal(game.name)}</option>`)
    .join('');

  return `
    <div id="web-widget-modal-overlay" class="streamer-modal-overlay" style="display: none;">
      <div class="streamer-modal-container obs-modal-card">
        
        <div class="obs-modal-header">
          <div class="obs-modal-header__title-block">
            <h3 class="obs-modal-title">${t('webWidget.title')}</h3>
          </div>
          <button type="button" class="modal-close" id="web-widget-header-close-btn" aria-label="Close">&times;</button>
        </div>
        
        <form id="web-widget-config-form" class="obs-config-form">
          
          <div class="obs-controls-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            
            <!-- Game Dropdown -->
            <div class="obs-form-group">
              <label class="obs-form-label">${t('webWidget.gameLabel')}</label>
              <div class="custom-dropdown" id="dropdown-web-game">
                <button type="button" class="custom-dropdown__trigger">
                  <span class="custom-dropdown__icon">${getIconSvg('gamepad', { size: 16 })}</span>
                  <span class="custom-dropdown__label">${defaultGameName}</span>
                  <span class="custom-dropdown__arrow">${getIconSvg('chevron-down', { size: 16 })}</span>
                </button>
                <div class="custom-dropdown__menu">
                  ${activeGames.map((g, idx) => `
                    <div class="custom-dropdown__item ${idx === 0 ? 'is-selected' : ''}" data-value="${g.id}" data-icon="gamepad">
                      <span class="custom-dropdown__item-icon">${getIconSvg('gamepad', { size: 16 })}</span>
                      <span>${getVal(g.name)}</span>
                    </div>
                  `).join('')}
                </div>
                <select id="web-widget-game-select" style="display: none;">
                  ${gameOptions}
                </select>
              </div>
            </div>

            <!-- Widget Type Dropdown -->
            <div class="obs-form-group">
              <label class="obs-form-label">${t('webWidget.typeLabel')}</label>
              <div class="custom-dropdown" id="dropdown-web-type">
                <button type="button" class="custom-dropdown__trigger">
                  <span class="custom-dropdown__icon">${getIconSvg('activity', { size: 16 })}</span>
                  <span class="custom-dropdown__label">${t('webWidget.typeStatus')}</span>
                  <span class="custom-dropdown__arrow">${getIconSvg('chevron-down', { size: 16 })}</span>
                </button>
                <div class="custom-dropdown__menu">
                  <div class="custom-dropdown__item is-selected" data-value="status" data-icon="activity">
                    <span class="custom-dropdown__item-icon">${getIconSvg('activity', { size: 16 })}</span>
                    <span>${t('webWidget.typeStatus')}</span>
                  </div>
                  <div class="custom-dropdown__item" data-value="countdown" data-icon="clock">
                    <span class="custom-dropdown__item-icon">${getIconSvg('clock', { size: 16 })}</span>
                    <span>${t('webWidget.typeCountdown')}</span>
                  </div>
                  <div class="custom-dropdown__item" data-value="card" data-icon="layout">
                    <span class="custom-dropdown__item-icon">${getIconSvg('layout', { size: 16 })}</span>
                    <span>${t('webWidget.typeCard')}</span>
                  </div>
                </div>
                <select id="web-widget-type-select" style="display: none;">
                  <option value="status">${t('webWidget.typeStatus')}</option>
                  <option value="countdown">${t('webWidget.typeCountdown')}</option>
                  <option value="card">${t('webWidget.typeCard')}</option>
                </select>
              </div>
            </div>

            <!-- Theme Dropdown -->
            <div class="obs-form-group">
              <label class="obs-form-label">${t('webWidget.themeLabel')}</label>
              <div class="custom-dropdown" id="dropdown-web-theme">
                <button type="button" class="custom-dropdown__trigger">
                  <span class="custom-dropdown__icon">${getIconSvg('moon', { size: 16 })}</span>
                  <span class="custom-dropdown__label">${t('webWidget.themeDark')}</span>
                  <span class="custom-dropdown__arrow">${getIconSvg('chevron-down', { size: 16 })}</span>
                </button>
                <div class="custom-dropdown__menu">
                  <div class="custom-dropdown__item is-selected" data-value="dark" data-icon="moon">
                    <span class="custom-dropdown__item-icon">${getIconSvg('moon', { size: 16 })}</span>
                    <span>${t('webWidget.themeDark')}</span>
                  </div>
                  <div class="custom-dropdown__item" data-value="light" data-icon="sun">
                    <span class="custom-dropdown__item-icon">${getIconSvg('sun', { size: 16 })}</span>
                    <span>${t('webWidget.themeLight')}</span>
                  </div>
                  <div class="custom-dropdown__item" data-value="transparent" data-icon="droplet">
                    <span class="custom-dropdown__item-icon">${getIconSvg('droplet', { size: 16 })}</span>
                    <span>${t('webWidget.themeTransparent')}</span>
                  </div>
                </div>
                <select id="web-widget-theme-select" style="display: none;">
                  <option value="dark">${t('webWidget.themeDark')}</option>
                  <option value="light">${t('webWidget.themeLight')}</option>
                  <option value="transparent">${t('webWidget.themeTransparent')}</option>
                </select>
              </div>
            </div>

          </div>

          <!-- HTML Snippet Input & Copy Button -->
          <div class="obs-form-group obs-url-group">
            <label class="obs-form-label" for="web-widget-code-input">${t('webWidget.codeLabel')}</label>
            <div class="obs-url-input-wrapper">
              <input type="text" id="web-widget-code-input" class="obs-url-input" readonly value="" />
              <button type="button" id="web-widget-copy-btn" class="obs-copy-btn">
                <span class="obs-copy-btn__icon">${getIconSvg('copy', { size: 15 })}</span>
                <span class="web-widget-btn-copy-text">${t('webWidget.btnCopyCode')}</span>
              </button>
            </div>
            <p class="obs-url-subtext">${t('webWidget.brandingNotice')}</p>
          </div>

          <!-- Live Preview Canvas -->
          <div class="obs-guide-card" style="margin-top: 1rem;">
            <div class="obs-preview-col" style="width: 100%;">
              <div class="obs-preview-col__header">
                <span class="obs-preview-col__dot"></span>
                <span class="obs-preview-col__title">${t('webWidget.previewTitle')}</span>
              </div>
              <div class="obs-canvas-mockup obs-canvas-mockup--auto" style="display: flex; justify-content: center; align-items: center; background: #1e293b; border-radius: 8px; padding: 1rem;">
                <iframe id="web-widget-preview-iframe" src="" style="width: 100%; max-width: 420px; border: none; border-radius: 12px; background: transparent !important; transition: height 0.25s ease;" allowtransparency="true" referrerpolicy="strict-origin-when-cross-origin" title="SeasonForge Widget Preview"></iframe>
              </div>
            </div>
          </div>

          <!-- Footer Buttons -->
          <div class="obs-modal-footer">
            <button type="button" id="web-widget-close-btn" class="obs-btn obs-btn--secondary">${t('streamer.btnClose')}</button>
          </div>

        </form>
      </div>
    </div>
  `;
}

export function initWebWidget(games = []) {
  if (typeof document === 'undefined') return;

  const state = getState();
  const activeGames = games.length ? games : (state.games || []);

  let overlay = document.getElementById('web-widget-modal-overlay');
  if (overlay) {
    overlay.remove();
  }

  const modalRoot = document.getElementById('modal-root') || document.body;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = renderWebWidgetModal(activeGames);
  overlay = tempDiv.firstElementChild;
  modalRoot.appendChild(overlay);

  const gameSelect = document.getElementById('web-widget-game-select');
  const typeSelect = document.getElementById('web-widget-type-select');
  const themeSelect = document.getElementById('web-widget-theme-select');
  const codeInput = document.getElementById('web-widget-code-input');
  const copyBtn = document.getElementById('web-widget-copy-btn');
  const previewIframe = document.getElementById('web-widget-preview-iframe');
  const closeBtn = document.getElementById('web-widget-close-btn');
  const headerCloseBtn = document.getElementById('web-widget-header-close-btn');

  function updateWidgetCodeAndPreview() {
    if (!gameSelect || !typeSelect || !themeSelect || !codeInput || !previewIframe) return;

    const game = gameSelect.value || (activeGames[0] ? activeGames[0].id : 'path-of-exile');
    const type = typeSelect.value || 'status';
    const theme = themeSelect.value || 'dark';
    const lang = state.settings?.lang || 'ru';
    const baseUrl = window.location.origin;

    const embedUrl = generateEmbedUrl({ game, type, theme, lang, baseUrl });

    let height = '150';
    if (type === 'countdown') height = '270';
    if (type === 'card') height = '460';

    const iframeCode = generateIframeCode({
      url: embedUrl,
      width: '100%',
      height: `${height}px`,
      title: 'SeasonForge Widget'
    });

    codeInput.value = iframeCode;
    previewIframe.style.height = `${height}px`;
    previewIframe.src = embedUrl;

    const mockupContainer = previewIframe.closest('.obs-canvas-mockup');
    if (mockupContainer) {
      if (theme === 'transparent') {
        mockupContainer.style.background = '#0d111a';
      } else if (theme === 'light') {
        mockupContainer.style.background = '#f1f5f9';
      } else {
        mockupContainer.style.background = '#080c14';
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
        const textSpan = item.querySelector('span:last-child');
        if (label && textSpan) label.textContent = textSpan.textContent;
        if (iconEl && iconName) {
          iconEl.innerHTML = getIconSvg(iconName, { size: 16 });
        }

        items.forEach(i => i.classList.remove('is-selected'));
        item.classList.add('is-selected');

        container.classList.remove('is-open');
        updateWidgetCodeAndPreview();
      });
    });
  }

  setupCustomDropdown('dropdown-web-game', 'web-widget-game-select');
  setupCustomDropdown('dropdown-web-type', 'web-widget-type-select');
  setupCustomDropdown('dropdown-web-theme', 'web-widget-theme-select');

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
  });

  if (copyBtn && codeInput) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(codeInput.value).then(() => {
        const textSpan = copyBtn.querySelector('.web-widget-btn-copy-text');
        if (textSpan) {
          const originalText = textSpan.textContent;
          textSpan.textContent = t('webWidget.copied');
          setTimeout(() => {
            textSpan.textContent = originalText;
          }, 2000);
        }
        trackEvent('web_widget_code_copied', { type: typeSelect.value, game: gameSelect.value });
      }).catch(err => {
        console.error('Failed to copy widget code:', err);
      });
    });
  }

  const closeHandler = () => {
    if (overlay) {
      overlay.classList.remove('streamer-modal-overlay--visible');
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
      }, 200);
    }
  };

  if (closeBtn) closeBtn.addEventListener('click', closeHandler);
  if (headerCloseBtn) headerCloseBtn.addEventListener('click', closeHandler);

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeHandler();
    });
  }

  // Initial calculation
  updateWidgetCodeAndPreview();

  document.querySelectorAll('.web-widget-trigger-btn, #web-widget-trigger-btn').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      openWebWidgetModal();
    };
  });
}

export function openWebWidgetModal() {
  if (typeof document === 'undefined') return;
  let overlay = document.getElementById('web-widget-modal-overlay');
  if (!overlay) {
    const state = getState();
    initWebWidget(state.games || []);
    overlay = document.getElementById('web-widget-modal-overlay');
  }
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.removeAttribute('aria-hidden');
    setTimeout(() => {
      overlay.classList.add('streamer-modal-overlay--visible');
    }, 10);
    trackEvent('web_widget_modal_opened');
  }
}
