import { t } from '../i18n/index.js';
import { getIconSvg } from '../utils/icons.js';

export function render() {
  const latestReleaseUrl = "https://github.com/SeasonForge/SeasonForgeMobile/releases/latest";
  const apkDownloadUrl = "https://github.com/SeasonForge/SeasonForgeMobile/releases/latest";

  return `
    <div id="mobile-app-modal-overlay" class="feedback-modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
      <div class="feedback-modal mobile-app-modal">
        <button id="mobile-app-modal-close" class="mobile-app-modal__close" aria-label="Close">✕</button>
        
        <div class="mobile-app-modal__header">
          <div class="mobile-app-modal__badge">
            <span class="mobile-app-modal__badge-dot"></span>
            Android • BETA
          </div>
          <h2 id="app-modal-title" class="mobile-app-modal__title">${t('mobileApp.modalTitle')}</h2>
          <p class="mobile-app-modal__subtitle">${t('mobileApp.modalSubtitle')}</p>
        </div>

        <div class="mobile-app-modal__body">
          <div class="mobile-app-modal__solo-card">
            <div class="mobile-app-modal__solo-header">
              <h4>${t('mobileApp.soloNoticeTitle')}</h4>
            </div>
            <p>${t('mobileApp.soloNoticeDesc')}</p>
          </div>

          <div class="mobile-app-modal__features">
            <div class="mobile-app-modal__feature-item">
              <div class="mobile-app-modal__feature-icon-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
              </div>
              <div>
                <h4>${t('mobileApp.widgetsTitle')}</h4>
                <p>${t('mobileApp.widgetsDesc')}</p>
              </div>
            </div>
            
            <div class="mobile-app-modal__feature-item">
              <div class="mobile-app-modal__feature-icon-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <div>
                <h4>${t('mobileApp.remindersTitle')}</h4>
                <p>${t('mobileApp.remindersDesc')}</p>
              </div>
            </div>
          </div>

          <details class="mobile-app-modal__protect-details">
            <summary class="mobile-app-modal__protect-summary">
              <span class="mobile-app-modal__protect-icon">${getIconSvg('shield-check', { size: 18 })}</span>
              <span>${t('mobileApp.protectTitle')}</span>
              <svg class="mobile-app-modal__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </summary>
            <div class="mobile-app-modal__protect-content">
              <p>${t('mobileApp.protectDesc')}</p>
              <ol class="mobile-app-modal__protect-steps">
                <li>${t('mobileApp.protectStep1')}</li>
                <li>${t('mobileApp.protectStep2')}</li>
              </ol>
            </div>
          </details>
        </div>

        <div class="mobile-app-modal__footer">
          <a href="${latestReleaseUrl}" target="_blank" rel="noopener noreferrer" class="mobile-app-modal__btn mobile-app-modal__btn--primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>${t('mobileApp.downloadDirect')}</span>
          </a>
        </div>
      </div>
    </div>
  `;
}
