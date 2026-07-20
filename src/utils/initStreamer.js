import { render as renderStreamerModal } from '../components/StreamerModal.js';
import { t } from '../i18n/index.js';

export function initStreamer(games = []) {
  const triggerBtn = document.getElementById('streamer-trigger-btn');
  const modalRoot = document.getElementById('modal-root');
  if (!triggerBtn || !modalRoot) return;

  // Remove existing one if any, then insert fresh HTML to ensure correct translation and options list
  const existingOverlay = document.getElementById('streamer-modal-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  modalRoot.insertAdjacentHTML('beforeend', renderStreamerModal(games));

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
    if (path.includes('/games/')) {
      path = path.substring(0, path.indexOf('/games/')) + '/index.html';
    }
    path = path.replace(/\/+/g, '/');
    return origin + path;
  }

  function updateUrl() {
    const rootUrl = getRootUrl();
    const type = typeSelect.value;
    const game = gameSelect.value;

    let targetUrl = `${rootUrl}?overlay=true&type=${type}`;
    if (type !== 'timeline' && game) {
      targetUrl += `&game=${game}`;
    }

    urlInput.value = targetUrl;

    // Update size recommendation and visibility of game select
    if (type === 'timeline') {
      gameField.style.display = 'none';
      recommendedSize.textContent = '800x500px (or 1920x1080px)';
    } else {
      gameField.style.display = 'block';
      if (type === 'status') {
        recommendedSize.textContent = '400x120px';
      } else {
        recommendedSize.textContent = '400x250px';
      }
    }
  }

  function openModal() {
    overlay.style.display = 'flex';
    updateUrl();
    setTimeout(() => {
      overlay.classList.add('streamer-modal-overlay--visible');
    }, 10);
    
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

    const btnText = copyBtn.querySelector('.streamer-form__btn-copy-text');
    copyBtn.classList.add('streamer-form__btn-copy--success');
    if (btnText) btnText.textContent = t('streamer.copied');

    setTimeout(() => {
      copyBtn.classList.remove('streamer-form__btn-copy--success');
      if (btnText) btnText.textContent = t('streamer.btnCopy');
    }, 1500);
  }

  // Event Listeners
  typeSelect.addEventListener('change', updateUrl);
  gameSelect.addEventListener('change', updateUrl);
  copyBtn.addEventListener('click', handleCopy);
  closeBtn.addEventListener('click', closeModal);

  // Re-attach fresh click listener to trigger button to avoid multiple handlers
  const newTriggerBtn = triggerBtn.cloneNode(true);
  triggerBtn.parentNode.replaceChild(newTriggerBtn, triggerBtn);
  newTriggerBtn.addEventListener('click', openModal);
}
