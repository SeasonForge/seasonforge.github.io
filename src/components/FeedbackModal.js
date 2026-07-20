import { t } from '../i18n/index.js';

export function render() {
  return `
    <div id="feedback-modal-overlay" class="feedback-modal-overlay" style="display: none;">
      <div class="feedback-modal-container">
        
        <!-- Standard Form View -->
        <form id="feedback-form" class="feedback-form">
          <h3 class="feedback-modal__title">${t('feedback.title')}</h3>
          <p class="feedback-modal__subtitle">${t('feedback.subtitle')}</p>
          
          <!-- Honeypot anti-spam field -->
          <div class="feedback-form__honeypot" style="display: none !important;">
            <input type="text" id="feedback-hp" name="feedback-hp" tabindex="-1" autocomplete="off" />
          </div>

          <!-- Message Type Radio Group -->
          <div class="feedback-form__field">
            <span class="feedback-form__label">${t('feedback.typeLabel')}</span>
            <div class="feedback-form__radio-group">
              <label class="feedback-form__radio-label">
                <input type="radio" name="feedback-type" value="Idea" checked />
                <span>${t('feedback.typeIdea')}</span>
              </label>
              <label class="feedback-form__radio-label">
                <input type="radio" name="feedback-type" value="Bug" />
                <span>${t('feedback.typeBug')}</span>
              </label>
              <label class="feedback-form__radio-label">
                <input type="radio" name="feedback-type" value="Other" />
                <span>${t('feedback.typeOther')}</span>
              </label>
            </div>
          </div>

          <!-- Message Area -->
          <div class="feedback-form__field">
            <textarea 
              id="feedback-message" 
              class="feedback-form__textarea" 
              placeholder="${t('feedback.messagePlaceholder')}" 
              required 
              minlength="10" 
              maxlength="3000"
            ></textarea>
          </div>

          <!-- Email Field -->
          <div class="feedback-form__field">
            <input 
              type="email" 
              id="feedback-email" 
              class="feedback-form__input" 
              placeholder="${t('feedback.emailPlaceholder')}" 
            />
          </div>

          <!-- Future Attachments Placeholder -->
          <!--
          <div class="feedback-form__field feedback-form__attachments-placeholder" style="display: none;">
            <input type="file" id="feedback-files" multiple />
          </div>
          -->

          <!-- Error Alert Banner -->
          <div id="feedback-error-alert" class="feedback-form__error-alert" style="display: none;"></div>

          <!-- Form Buttons -->
          <div class="feedback-form__buttons">
            <button type="button" id="feedback-cancel-btn" class="feedback-form__btn feedback-form__btn--cancel">
              ${t('feedback.btnCancel')}
            </button>
            <button type="submit" id="feedback-submit-btn" class="feedback-form__btn feedback-form__btn--submit">
              <span class="feedback-form__btn-text">${t('feedback.btnSubmit')}</span>
              <span class="feedback-form__spinner" style="display: none;"></span>
            </button>
          </div>
        </form>

        <!-- Success Message Screen (Hidden by default) -->
        <div id="feedback-success-screen" class="feedback-success-screen" style="display: none;">
          <div class="feedback-success-screen__icon">✅</div>
          <h3 class="feedback-success-screen__title">${t('feedback.successTitle')}</h3>
          <p class="feedback-success-screen__text">${t('feedback.successText')}</p>
        </div>

      </div>
    </div>
  `;
}

export function FeedbackModal() {
  return render();
}
