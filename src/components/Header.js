import { t } from '../i18n/index.js';
import { formatLastUpdated } from '../utils/date.js';

/**
 * Header component to update header elements and labels.
 */
export class Header {
  /**
   * Initializes or updates header labels based on current language and status data.
   * @param {Object} [options]
   * @param {string} [options.lang='en']
   * @param {string} [options.lastChecked]
   * @param {string} [options.lastUpdated]
   */
  static update({ lang = 'en', lastChecked, lastUpdated } = {}) {
    if (typeof document === 'undefined') return;

    // Subtitle
    const subtitleEl = document.getElementById('app-header-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = t('header.subtitle');
    }

    // Status Labels
    const lblChecked = document.getElementById('lbl-status-check');
    if (lblChecked) {
      const dotHtml = '<span class="status-dot"></span>';
      lblChecked.innerHTML = `${dotHtml} ${t('header.statusCheck')}`;
    }

    const lblUpdated = document.getElementById('lbl-last-updated');
    if (lblUpdated) {
      lblUpdated.textContent = t('header.lastUpdated');
    }

    // Tool Buttons
    const lblMobileApp = document.getElementById('lbl-mobile-app-btn');
    if (lblMobileApp) {
      lblMobileApp.textContent = t('mobileApp.headerBtn');
    }

    const lblFeedback = document.getElementById('lbl-feedback-btn');
    if (lblFeedback) {
      lblFeedback.textContent = t('feedback.btnLabel');
    }

    const lblStreamer = document.getElementById('lbl-streamer-btn');
    if (lblStreamer) {
      lblStreamer.textContent = t('streamer.btnLabel');
    }

    // Timestamps
    if (lastChecked) {
      const checkedTimeEl = document.getElementById('last-checked-time');
      if (checkedTimeEl) checkedTimeEl.textContent = formatLastUpdated(lastChecked);
    }
    if (lastUpdated) {
      const updatedTimeEl = document.getElementById('last-updated-time');
      if (updatedTimeEl) updatedTimeEl.textContent = formatLastUpdated(lastUpdated);
    }
  }
}
