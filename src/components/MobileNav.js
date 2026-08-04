import { t } from '../i18n/index.js';
import { MoreMenuModal } from './MoreMenuModal.js';

/**
 * MobileNav component manages bottom mobile navigation bar.
 */
export class MobileNav {
  /**
   * Initializes mobile navigation handlers and links with proper base path.
   * @param {Object} [options]
   * @param {string} [options.basePath='./']
   */
  static init({ basePath = './' } = {}) {
    if (typeof document === 'undefined') return;

    const nav = document.getElementById('mobile-nav');
    if (!nav) return;

    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

    // 1. Update links
    const btnTracker = document.getElementById('mob-btn-tracker');
    if (btnTracker) {
      btnTracker.setAttribute('href', cleanBase);
    }

    const btnTimeline = document.getElementById('mob-btn-timeline');
    if (btnTimeline) {
      btnTimeline.setAttribute('href', `${cleanBase}#timeline`);
    }

    const btnChangelog = document.getElementById('mob-btn-changelog');
    if (btnChangelog) {
      btnChangelog.setAttribute('href', `${cleanBase}changelog/`);
    }

    // 2. Attach "More" button listener
    const btnMore = document.getElementById('mob-btn-more');
    if (btnMore) {
      btnMore.onclick = (e) => {
        e.preventDefault();
        MoreMenuModal.open(cleanBase);
      };
    }

    // 3. Update labels
    MobileNav.updateLabels();
  }

  static updateLabels() {
    if (typeof document === 'undefined') return;

    const lblTracker = document.getElementById('mob-lbl-tracker');
    if (lblTracker) lblTracker.textContent = t('navbar.btnCard');

    const lblTimeline = document.getElementById('mob-lbl-timeline');
    if (lblTimeline) lblTimeline.textContent = t('navbar.btnTimeline');

    const lblChangelog = document.getElementById('mob-lbl-changelog');
    if (lblChangelog) lblChangelog.textContent = t('navbar.btnChangelog');

    const lblMore = document.getElementById('mob-lbl-more');
    if (lblMore) lblMore.textContent = t('navbar.btnMore');
  }
}
