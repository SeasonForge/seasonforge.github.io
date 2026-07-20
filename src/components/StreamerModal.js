import { t, getVal } from '../i18n/index.js';

export function render(games = []) {
  const gameOptions = games
    .map(game => `<option value="${game.id}">${getVal(game.name)}</option>`)
    .join('');

  return `
    <div id="streamer-modal-overlay" class="streamer-modal-overlay" style="display: none;">
      <div class="streamer-modal-container">
        
        <h3 class="streamer-modal__title">${t('streamer.title')}</h3>
        
        <form id="streamer-config-form" class="streamer-config-form">
          <!-- Widget Type Select -->
          <div class="streamer-form__field">
            <label class="streamer-form__label" for="streamer-widget-type">${t('streamer.typeLabel')}</label>
            <select id="streamer-widget-type" class="streamer-form__select">
              <option value="status">${t('streamer.typeStatus')}</option>
              <option value="countdown">${t('streamer.typeCountdown')}</option>
              <option value="timeline">${t('streamer.typeTimeline')}</option>
            </select>
          </div>

          <!-- Game Select (hidden if timeline widget is chosen) -->
          <div id="streamer-game-field" class="streamer-form__field">
            <label class="streamer-form__label" for="streamer-game-select">${t('streamer.gameLabel')}</label>
            <select id="streamer-game-select" class="streamer-form__select">
              ${gameOptions}
            </select>
          </div>

          <!-- Generated Link Input -->
          <div class="streamer-form__field">
            <label class="streamer-form__label" for="streamer-url-input">${t('streamer.urlLabel')}</label>
            <div class="streamer-form__url-wrapper">
              <input type="text" id="streamer-url-input" class="streamer-form__input-readonly" readonly value="" />
              <button type="button" id="streamer-copy-btn" class="streamer-form__btn-copy">
                <span class="streamer-form__btn-copy-text">${t('streamer.btnCopy')}</span>
              </button>
            </div>
          </div>

          <!-- Recommendations Box -->
          <div class="streamer-info-box">
            <div class="streamer-info-box__resolution">
              <strong>${t('streamer.recommendationLabel')}</strong>
              <span id="streamer-recommended-size">400x120px</span>
            </div>
            
            <div class="streamer-info-box__instructions">
              <strong>${t('streamer.instructionsTitle')}</strong>
              <ul>
                <li>${t('streamer.instructionsStep1')}</li>
                <li>${t('streamer.instructionsStep2')}</li>
                <li>${t('streamer.instructionsStep3')}</li>
                <li>${t('streamer.instructionsStep4')}</li>
              </ul>
            </div>
          </div>

          <!-- Cancel / Close Buttons -->
          <div class="streamer-form__buttons">
            <button type="button" id="streamer-close-btn" class="streamer-form__btn-close">
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
