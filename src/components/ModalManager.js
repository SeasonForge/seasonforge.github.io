import { initFeedback } from '../utils/initFeedback.js';
import { initMobileAppModal } from '../utils/initMobileAppModal.js';
import { initStreamer } from '../utils/initStreamer.js';

/**
 * ModalManager encapsulates initialization and lifecycle for all application modals.
 */
export class ModalManager {
  static initAll() {
    if (typeof document === 'undefined') return;

    // Initialize individual modal triggers if present in DOM
    initFeedback();
    initMobileAppModal();
    initStreamer();

    // Global ESC key listener to close active modals
    document.removeEventListener('keydown', ModalManager.handleKeyDown);
    document.addEventListener('keydown', ModalManager.handleKeyDown);
  }

  static handleKeyDown(e) {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal-overlay:not([hidden]):not([style*="display: none"])');
      if (activeModal) {
        const closeBtn = activeModal.querySelector('.modal-close, [data-modal-close]');
        if (closeBtn) {
          closeBtn.click();
        } else {
          activeModal.style.display = 'none';
          activeModal.setAttribute('aria-hidden', 'true');
        }
      }
    }
  }

  /**
   * Closes any open modal on the page.
   */
  static closeAll() {
    if (typeof document === 'undefined') return;
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach((modal) => {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    });
  }
}
