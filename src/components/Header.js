import { t } from '../i18n/index.js';
import { formatLastUpdated } from '../utils/date.js';
import { getState } from '../store/state.js';

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
  static update({ lang, lastChecked, lastUpdated } = {}) {
    if (typeof document === 'undefined') return;

    const state = getState();
    const activeLang = lang || state.settings?.lang || 'en';

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

    const isEn = activeLang === 'en';

    const lblWebWidget = document.getElementById('lbl-web-widget-btn');
    if (lblWebWidget) {
      lblWebWidget.textContent = isEn ? 'Website Widget' : 'Виджет для сайта';
    }

    const lblEvents = document.getElementById('lbl-events-btn');
    if (lblEvents) {
      lblEvents.textContent = isEn ? 'Events & Drops' : 'События и Drops';
    }

    // Timestamps (fallback to state.rawData / state.games if not explicitly passed)
    const checkedTs = lastChecked || state.rawData?.lastCheckedAt || state.lastCheckedAt;
    const checkedTimeEl = document.getElementById('last-checked-time');
    if (checkedTimeEl && checkedTs) {
      checkedTimeEl.textContent = formatLastUpdated(checkedTs);
    }

    let updatedTs = lastUpdated;
    if (!updatedTs && state.games && state.games.length > 0) {
      const times = state.games.map(g => new Date(g.status?.updatedAt).getTime()).filter(ts => !Number.isNaN(ts));
      if (times.length > 0) updatedTs = Math.max(...times);
    }
    const updatedTimeEl = document.getElementById('last-updated-time');
    if (updatedTimeEl && updatedTs) {
      updatedTimeEl.textContent = formatLastUpdated(updatedTs);
    }
  }
}
