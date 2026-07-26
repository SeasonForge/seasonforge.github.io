import { render as renderMobileAppModal } from '../components/MobileAppModal.js';

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

  function openModal() {
    if (!overlay) return;
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.classList.add('feedback-modal-overlay--visible');
    }, 10);

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
    btn.onclick = (e) => {
      e.preventDefault();
      openModal();
    };
  });
}
