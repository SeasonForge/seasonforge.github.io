import { render as renderFeedbackModal } from '../components/FeedbackModal.js';
import { sendFeedback } from './feedback.js';
import { t } from '../i18n/index.js';
import { getState } from '../store/state.js';
import { trackEvent } from './analytics.js';

export function initFeedback(getCurrentGameId) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  // Remove existing one if any, then insert fresh HTML to ensure correct translation
  const existingOverlay = document.getElementById('feedback-modal-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  modalRoot.insertAdjacentHTML('beforeend', renderFeedbackModal());

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
    }, 300); // Matches CSS transition time
    
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

  // Attach submit handler only once per form element lifetime
  if (!form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorAlert.style.display = 'none';
    errorAlert.textContent = '';

    // Spam honeypot validation
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

  // Attach click listener to all feedback trigger elements (guarded against duplicates)
  document.querySelectorAll('.feedback-trigger-btn, #feedback-trigger-btn').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', openModal);
  });

  if (!cancelBtn.dataset.bound) {
    cancelBtn.dataset.bound = 'true';
    cancelBtn.addEventListener('click', closeModal);
  }
}
