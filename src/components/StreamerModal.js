import { t, getVal } from '../i18n/index.js';
import { getIconSvg } from '../utils/icons.js';

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
            
            <!-- Left: How to use in OBS steps -->
            <div class="obs-guide-left">
              <h4 class="obs-guide-title">${t('streamer.instructionsTitle')}</h4>
              <ul class="obs-steps-list">
                <li class="obs-step-item">
                  <span class="obs-step-badge">1</span>
                  <span class="obs-step-text">${t('streamer.instructionsStep1')}</span>
                </li>
                <li class="obs-step-item">
                  <span class="obs-step-badge">2</span>
                  <span class="obs-step-text">${t('streamer.instructionsStep2')}</span>
                </li>
                <li class="obs-step-item">
                  <span class="obs-step-badge">3</span>
                  <span class="obs-step-text">${t('streamer.instructionsStep3')}</span>
                  <span id="streamer-recommended-size" class="obs-res-tag">400×120</span>
                </li>
                <li class="obs-step-item">
                  <span class="obs-step-badge">4</span>
                  <span class="obs-step-text">${t('streamer.instructionsStep4')}</span>
                </li>
              </ul>
            </div>

            <!-- Right: Interactive Live Preview Card Mockup -->
            <div class="obs-preview-box">
              <div id="obs-preview-card" class="obs-preview-card">
                <div class="obs-preview-card__top">
                  <div class="obs-preview-card__game">
                    <span id="obs-preview-icon" class="obs-preview-game-icon">
                      ${getIconSvg('gamepad', { size: 16 })}
                    </span>
                    <span id="obs-preview-game-name" class="obs-preview-game-title">Path of Exile 1</span>
                  </div>
                  <span id="obs-preview-badge" class="obs-preview-status-badge">NOW</span>
                </div>
                
                <div id="obs-preview-season-name" class="obs-preview-season-title">v3.29 The Forbidden Sanctum</div>
                <div id="obs-preview-dates" class="obs-preview-dates-row">Nov 13, 2024 • Active</div>
                
                <div class="obs-preview-progress-track">
                  <div id="obs-preview-progress-fill" class="obs-preview-progress-fill" style="width: 65%;">
                    <span class="obs-preview-progress-dot"></span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom Tip Bar & Close Action -->
          <div class="obs-bottom-bar">
            <div class="obs-tip-block">
              <span class="obs-tip-icon">${getIconSvg('lightbulb', { size: 16 })}</span>
              <span class="obs-tip-text">${t('streamer.tip')}</span>
            </div>
            <button type="button" id="streamer-close-btn" class="obs-close-btn">
              ${t('streamer.btnCancel')}
            </button>
          </div>

        </form>

      </div>
    </div>
  `;
}

export function StreamerModal(games) {
  return render(games);
}
