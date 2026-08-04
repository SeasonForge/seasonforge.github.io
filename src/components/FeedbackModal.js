import { t } from '../i18n/index.js';
import { getIconSvg } from '../utils/icons.js';
import { sendFeedback } from '../utils/feedback.js';
import { getState } from '../store/state.js';
import { trackEvent } from '../utils/analytics.js';

export function render() {
  return `
    <div id="feedback-modal-overlay" class="feedback-modal-overlay" style="display: none;">
      <div class="feedback-modal-container">
        
        <!-- Standard Form View -->
        <form id="feedback-form" class="feedback-form">
          <div class="feedback-modal__header">
            <h3 class="feedback-modal__title">${t('feedback.title')}</h3>
            <button type="button" class="modal-close" id="feedback-header-close-btn" aria-label="Close">&times;</button>
          </div>
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
          <div class="feedback-success-screen__icon">${getIconSvg('check-circle', { size: 36, class: 'feedback-success-svg' })}</div>
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

export function initFeedback(getCurrentGameId) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  // Remove existing one if any, then insert fresh HTML to ensure correct translation
  const existingOverlay = document.getElementById('feedback-modal-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  modalRoot.insertAdjacentHTML('beforeend', render());

  const overlay = document.getElementById('feedback-modal-overlay');
  const form = document.getElementById('feedback-form');
  const cancelBtn = document.getElementById('feedback-cancel-btn');
  const submitBtn = document.getElementById('feedback-submit-btn');
  const errorAlert = document.getElementById('feedback-error-alert');
  const successScreen = document.getElementById('feedback-success-screen');
  const messageInput = document.getElementById('feedback-message');
  const emailInput = document.getElementById('feedback-email');
  const honeypot = document.getElementById('feedback-hp');

  function openModal() {
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.classList.add('feedback-modal-overlay--visible');
      messageInput.focus();
    }, 10);
    
    document.addEventListener('keydown', handleEsc);
    overlay.addEventListener('click', handleOutsideClick);
  }

  function closeModal() {
    overlay.classList.remove('feedback-modal-overlay--visible');
    setTimeout(() => {
      overlay.style.display = 'none';
      resetForm();
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

  function resetForm() {
    form.reset();
    form.style.display = 'block';
    successScreen.style.display = 'none';
    errorAlert.style.display = 'none';
    errorAlert.textContent = '';
    submitBtn.disabled = false;
    cancelBtn.disabled = false;
    
    const spinner = submitBtn.querySelector('.feedback-form__spinner');
    if (spinner) spinner.style.display = 'none';
    
    const btnText = submitBtn.querySelector('.feedback-form__btn-text');
    if (btnText) btnText.style.opacity = '1';
  }

  function showError(msg) {
    errorAlert.textContent = msg;
    errorAlert.style.display = 'block';
  }

  if (!form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorAlert.style.display = 'none';
      errorAlert.textContent = '';

      if (honeypot.value) {
        console.warn('Spam submission filtered.');
        closeModal();
        return;
      }

      const message = messageInput.value.trim();
      const email = emailInput.value.trim();

      if (message.length < 10 || message.length > 3000) {
        showError(t('feedback.errorValidationMessage'));
        messageInput.focus();
        return;
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          showError(t('feedback.errorValidationEmail'));
          emailInput.focus();
          return;
        }
      }

      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      
      const spinner = submitBtn.querySelector('.feedback-form__spinner');
      if (spinner) spinner.style.display = 'inline-block';
      
      const btnText = submitBtn.querySelector('.feedback-form__btn-text');
      if (btnText) btnText.style.opacity = '0.5';

      const state = getState();
      const activeLang = state.settings?.lang || 'en';
      const currentGame = getCurrentGameId ? getCurrentGameId() : (state.activeGame?.id || 'None');

      const feedbackData = {
        type: form.elements['feedback-type'].value,
        message,
        email,
        telemetry: {
          url: window.location.href,
          lang: activeLang,
          game: currentGame,
          resolution: `${window.innerWidth}x${window.innerHeight}`,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      try {
        await sendFeedback(feedbackData);
        trackEvent('feedback_submitted', {
          feedback_type: feedbackData.type || 'Other',
          game_id: (currentGame && currentGame !== 'None') ? currentGame : (state.activeGame?.id || 'path-of-exile')
        });
        form.style.display = 'none';
        successScreen.style.display = 'flex';
        setTimeout(() => {
          closeModal();
        }, 1500);
      } catch (err) {
        console.error('Failed to send feedback:', err);
        showError(t('feedback.errorNetwork'));
        submitBtn.disabled = false;
        cancelBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.style.opacity = '1';
      }
    });
  }

  document.querySelectorAll('.feedback-trigger-btn, #feedback-trigger-btn').forEach(btn => {
    btn.onclick = openModal;
  });

  const headerCloseBtn = document.getElementById('feedback-header-close-btn');

  if (!cancelBtn.dataset.bound) {
    cancelBtn.dataset.bound = 'true';
    cancelBtn.addEventListener('click', closeModal);
  }
  if (headerCloseBtn && !headerCloseBtn.dataset.bound) {
    headerCloseBtn.dataset.bound = 'true';
    headerCloseBtn.addEventListener('click', closeModal);
  }
}
