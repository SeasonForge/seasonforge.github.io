import { render as renderMobileAppModal } from '../components/MobileAppModal.js';
import { trackEvent } from './analytics.js';

export function initMobileAppModal() {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  // Re-render modal overlay to pick up current language
  const existingOverlay = document.getElementById('mobile-app-modal-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  modalRoot.insertAdjacentHTML('beforeend', renderMobileAppModal());

  const overlay = document.getElementById('mobile-app-modal-overlay');
  const closeBtn = document.getElementById('mobile-app-modal-close');

  function openModal(placement = 'header') {
    if (!overlay) return;
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.classList.add('feedback-modal-overlay--visible');
    }, 10);

    trackEvent('android_modal_opened', { placement });

    document.addEventListener('keydown', handleEsc);
    overlay.addEventListener('click', handleOutsideClick);
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('feedback-modal-overlay--visible');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);

    document.removeEventListener('keydown', handleEsc);
    overlay.removeEventListener('click', handleOutsideClick);
  }

  function handleEsc(e) {
    if (e.key === 'Escape') closeModal();
  }

  function handleOutsideClick(e) {
    if (e.target === overlay) closeModal();
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Attach event listeners to all triggers across header & navbar
  const triggers = document.querySelectorAll('.mobile-app-trigger-btn');
  triggers.forEach((btn) => {
    if (btn.dataset.boundAppModal) return;
    btn.dataset.boundAppModal = 'true';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      let placement = 'header';
      if (btn.closest('.navbar-panel') || btn.closest('.navbar') || btn.closest('.navbar-app-card')) {
        placement = 'sidebar';
      } else if (btn.closest('.mobile-nav') || btn.closest('.more-panel')) {
        placement = 'mobile_menu';
      }
      openModal(placement);
    });
  });

  // Track download button inside modal or navbar
  const downloadBtns = document.querySelectorAll('.mobile-app-modal__btn, .navbar-app-card__btn-download');
  downloadBtns.forEach((btn) => {
    if (btn.dataset.boundDownloadTrack) return;
    btn.dataset.boundDownloadTrack = 'true';
    btn.addEventListener('click', () => {
      let placement = 'sidebar';
      if (btn.closest('.mobile-app-modal')) {
        placement = 'sidebar'; // Default placement for modal downloads or sidebar
      }
      trackEvent('android_download_clicked', {
        placement,
        destination: 'github_releases'
      });
    });
  });
}
