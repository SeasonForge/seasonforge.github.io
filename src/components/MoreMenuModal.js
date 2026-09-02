import { t } from '../i18n/index.js';
import { getIconSvg } from '../utils/icons.js';

/**
 * Renders and manages the unified "More" ("Ещё") mobile menu modal.
 */
export class MoreMenuModal {
  /**
   * Initializes or toggles the "More" modal window.
   * @param {string} [basePath='./'] Relative base path to site root
   */
  static open(basePath = './') {
    if (typeof document === 'undefined') return;

    const modalRoot = document.getElementById('modal-root') || document.body;

    let modal = document.getElementById('more-menu-modal');
    if (modal) modal.remove();

    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

    modal = document.createElement('div');
    modal.id = 'more-menu-modal';
    modal.className = 'feedback-modal-overlay feedback-modal-overlay--visible more-menu-overlay more-menu-overlay--visible';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
      <div class="feedback-modal-container more-menu-panel">
        <div class="more-menu-header">
          <h3 class="more-menu-title">${t('navbar.btnMore')}</h3>
          <button class="modal-close" id="close-more-menu-btn" aria-label="Close">&times;</button>
        </div>
        <div class="more-menu-grid">
          <a href="${cleanBase}" class="more-menu-item">
            <div class="more-menu-item__left">
              <span class="more-menu-item__icon">${getIconSvg('home', { size: 18 })}</span>
              <span class="more-menu-item__label">${t('breadcrumbs.home')}</span>
            </div>
            <span class="more-menu-item__arrow">${getIconSvg('chevron-right', { size: 16 })}</span>
          </a>
          <a href="${cleanBase}#games" class="more-menu-item">
            <div class="more-menu-item__left">
              <span class="more-menu-item__icon">${getIconSvg('gamepad', { size: 18 })}</span>
              <span class="more-menu-item__label">${t('navbar.btnGames')}</span>
            </div>
            <span class="more-menu-item__arrow">${getIconSvg('chevron-right', { size: 16 })}</span>
          </a>
          <a href="${cleanBase}#timeline" class="more-menu-item">
            <div class="more-menu-item__left">
              <span class="more-menu-item__icon">${getIconSvg('hourglass', { size: 18 })}</span>
              <span class="more-menu-item__label">${t('navbar.btnTimeline')}</span>
            </div>
            <span class="more-menu-item__arrow">${getIconSvg('chevron-right', { size: 16 })}</span>
          </a>
          <a href="/events/" class="more-menu-item">
            <div class="more-menu-item__left">
              <span class="more-menu-item__icon">${getIconSvg('gift', { size: 18 })}</span>
              <span class="more-menu-item__label">${t('navbar.btnEvents') || 'Events & Drops'}</span>
            </div>
            <span class="more-menu-item__arrow">${getIconSvg('chevron-right', { size: 16 })}</span>
          </a>
          <a href="/changelog/" class="more-menu-item">
            <div class="more-menu-item__left">
              <span class="more-menu-item__icon">${getIconSvg('clipboard-list', { size: 18 })}</span>
              <span class="more-menu-item__label">${t('footer.changelog')}</span>
            </div>
            <span class="more-menu-item__arrow">${getIconSvg('chevron-right', { size: 16 })}</span>
          </a>
          <button id="more-menu-feedback-btn" class="more-menu-item">
            <div class="more-menu-item__left">
              <span class="more-menu-item__icon">${getIconSvg('message-square', { size: 18 })}</span>
              <span class="more-menu-item__label">${t('feedback.btnLabel')}</span>
            </div>
            <span class="more-menu-item__arrow">${getIconSvg('chevron-right', { size: 16 })}</span>
          </button>
          <button id="more-menu-web-widget-btn" class="more-menu-item">
            <div class="more-menu-item__left">
              <span class="more-menu-item__icon">${getIconSvg('code', { size: 18 })}</span>
              <span class="more-menu-item__label">${t('webWidget.btnLabel')}</span>
            </div>
            <span class="more-menu-item__arrow">${getIconSvg('chevron-right', { size: 16 })}</span>
          </button>
          <button id="more-menu-app-btn" class="more-menu-item">
            <div class="more-menu-item__left">
              <span class="more-menu-item__icon">${getIconSvg('smartphone', { size: 18 })}</span>
              <span class="more-menu-item__label">${t('mobileApp.headerBtn')}</span>
            </div>
            <span class="more-menu-item__arrow">${getIconSvg('chevron-right', { size: 16 })}</span>
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    modal.removeAttribute('hidden');
    modalRoot.appendChild(modal);

    // Attach listeners inside modal
    const closeBtn = document.getElementById('close-more-menu-btn');
    if (closeBtn) {
      closeBtn.onclick = () => MoreMenuModal.close();
    }

    modal.onclick = (e) => {
      if (e.target === modal) MoreMenuModal.close();
    };

    const feedbackBtn = document.getElementById('more-menu-feedback-btn');
    if (feedbackBtn) {
      feedbackBtn.onclick = () => {
        MoreMenuModal.close();
        const mainFeedbackBtn = document.getElementById('feedback-trigger-btn');
        if (mainFeedbackBtn) mainFeedbackBtn.click();
      };
    }

    const webWidgetBtn = document.getElementById('more-menu-web-widget-btn');
    if (webWidgetBtn) {
      webWidgetBtn.onclick = () => {
        MoreMenuModal.close();
        const mainWebWidgetBtn = document.getElementById('web-widget-trigger-btn');
        if (mainWebWidgetBtn) mainWebWidgetBtn.click();
      };
    }

    const appBtn = document.getElementById('more-menu-app-btn');
    if (appBtn) {
      appBtn.onclick = () => {
        MoreMenuModal.close();
        const mainAppBtn = document.getElementById('mobile-app-trigger-btn');
        if (mainAppBtn) mainAppBtn.click();
      };
    }
  }

  static close() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('more-menu-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('hidden', 'true');
    }
  }
}
