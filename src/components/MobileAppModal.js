import { t } from '../i18n/index.js';

export function render() {
  const latestReleaseUrl = "https://github.com/SeasonForge/SeasonForgeMobile/releases/latest";
  const apkDownloadUrl = "https://github.com/SeasonForge/SeasonForgeMobile/releases/latest";

  return `
    <div id="mobile-app-modal-overlay" class="feedback-modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
      <div class="feedback-modal mobile-app-modal">
        <button id="mobile-app-modal-close" class="feedback-modal__close" aria-label="Close">✕</button>
        
        <div class="mobile-app-modal__header">
          <div class="mobile-app-modal__badge">Android • BETA</div>
          <h2 id="app-modal-title" class="mobile-app-modal__title">${t('mobileApp.modalTitle')}</h2>
          <p class="mobile-app-modal__subtitle">${t('mobileApp.modalSubtitle')}</p>
        </div>

        <div class="mobile-app-modal__body">
          <div class="mobile-app-modal__protect-notice" style="margin-bottom: 16px; border-color: rgba(234, 179, 8, 0.3); background: rgba(234, 179, 8, 0.05);">
            <div class="mobile-app-modal__protect-header">
              <h4>${t('mobileApp.soloNoticeTitle')}</h4>
            </div>
            <p style="margin: 0;">${t('mobileApp.soloNoticeDesc')}</p>
          </div>

          <div class="mobile-app-modal__features">
            <div class="mobile-app-modal__feature-item">
              <span class="mobile-app-modal__feature-icon">📱</span>
              <div>
                <h4>${t('mobileApp.widgetsTitle')}</h4>
                <p>${t('mobileApp.widgetsDesc')}</p>
              </div>
            </div>
            
            <div class="mobile-app-modal__feature-item">
              <span class="mobile-app-modal__feature-icon">🔔</span>
              <div>
                <h4>${t('mobileApp.remindersTitle')}</h4>
                <p>${t('mobileApp.remindersDesc')}</p>
              </div>
            </div>
          </div>

          <div class="mobile-app-modal__protect-notice">
            <div class="mobile-app-modal__protect-header">
              <span class="mobile-app-modal__protect-icon">🛡️</span>
              <h4>${t('mobileApp.protectTitle')}</h4>
            </div>
            <p>${t('mobileApp.protectDesc')}</p>
            <ol class="mobile-app-modal__protect-steps">
              <li>${t('mobileApp.protectStep1')}</li>
              <li>${t('mobileApp.protectStep2')}</li>
            </ol>
          </div>
        </div>

        <div class="mobile-app-modal__footer">
          <a href="${latestReleaseUrl}" target="_blank" rel="noopener noreferrer" class="mobile-app-modal__btn mobile-app-modal__btn--primary" style="width: 100%;">
            <span>📥</span> ${t('mobileApp.downloadDirect')}
          </a>
        </div>
      </div>
    </div>
  `;
}
