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
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'more-menu-modal';
      modalRoot.appendChild(modal);
    }

    modal.className = 'feedback-modal-overlay feedback-modal-overlay--visible';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px); padding: 1rem;';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

    modal.innerHTML = `
      <div class="feedback-modal-container more-panel" style="max-width: 400px; width: 100%; position: relative; background: #111827; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 1rem; padding: 1.5rem; color: #fff; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700; color: #fff;">${t('navbar.btnMore')}</h3>
          <button class="modal-close" id="close-more-menu-btn" style="background: none; border: none; color: #9ca3af; font-size: 1.5rem; cursor: pointer; padding: 0.25rem 0.5rem; line-height: 1;">&times;</button>
        </div>
        <div class="more-menu-grid" style="display: flex; flex-direction: column; gap: 0.75rem;">
          <a href="${cleanBase}" class="more-menu-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; color: #f3f4f6; text-decoration: none; font-weight: 500; transition: background 0.2s;">
            <span style="display: inline-flex; align-items: center; justify-content: center; opacity: 0.9;">${getIconSvg('home', { size: 20 })}</span> <span>${t('breadcrumbs.home')}</span>
          </a>
          <a href="${cleanBase}#games" class="more-menu-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; color: #f3f4f6; text-decoration: none; font-weight: 500; transition: background 0.2s;">
            <span style="display: inline-flex; align-items: center; justify-content: center; opacity: 0.9;">${getIconSvg('gamepad', { size: 20 })}</span> <span>${t('navbar.btnGames')}</span>
          </a>
          <a href="${cleanBase}#timeline" class="more-menu-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; color: #f3f4f6; text-decoration: none; font-weight: 500; transition: background 0.2s;">
            <span style="display: inline-flex; align-items: center; justify-content: center; opacity: 0.9;">${getIconSvg('hourglass', { size: 20 })}</span> <span>${t('navbar.btnTimeline')}</span>
          </a>
          <a href="${cleanBase}changelog/" class="more-menu-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; color: #f3f4f6; text-decoration: none; font-weight: 500; transition: background 0.2s;">
            <span style="display: inline-flex; align-items: center; justify-content: center; opacity: 0.9;">${getIconSvg('clipboard-list', { size: 20 })}</span> <span>${t('footer.changelog')}</span>
          </a>
          <button id="more-menu-feedback-btn" class="more-menu-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; color: #f3f4f6; text-decoration: none; font-weight: 500; cursor: pointer; text-align: left; width: 100%; transition: background 0.2s;">
            <span style="display: inline-flex; align-items: center; justify-content: center; opacity: 0.9;">${getIconSvg('message-square', { size: 20 })}</span> <span>${t('feedback.btnLabel')}</span>
          </button>
          <button id="more-menu-app-btn" class="more-menu-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; color: #f3f4f6; text-decoration: none; font-weight: 500; cursor: pointer; text-align: left; width: 100%; transition: background 0.2s;">
            <span style="display: inline-flex; align-items: center; justify-content: center; opacity: 0.9;">${getIconSvg('smartphone', { size: 20 })}</span> <span>${t('mobileApp.headerBtn')}</span>
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    modal.removeAttribute('hidden');

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
