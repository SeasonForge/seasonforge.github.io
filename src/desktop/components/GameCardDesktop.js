/**
 * SeasonForge Desktop Game Card Component
 * Dedicated UI presentation layer for Desktop viewport (>= 901px).
 * Encapsulates 3D effects, 5-column layout, and desktop hover states.
 * Business logic delegated to shared gameCardData.js ViewModel.
 */

import { t, getVal } from '../../i18n/index.js';
import { escapeHtml, escapeAttr } from '../../utils/helpers.js';
import { getIconSvg } from '../../utils/icons.js';
import { formatShortDate } from '../../utils/date.js';
import { prepareGameCardViewModel, buildFeaturesHtml, buildCountdownHtml, buildSourceHtml } from '../../utils/gameCardData.js';

export function render(game = {}, options = {}) {
  const vm = prepareGameCardViewModel(game, options);
  const featuresHtml = buildFeaturesHtml(vm, { toggleBtnId: 'btn-toggle-features' });
  const countdownHtml = buildCountdownHtml(vm);
  const sourceHtml = buildSourceHtml(vm);

  // --- Desktop-specific events rendering (tag-based rows) ---
  let eventsBannerHtml = '';
  if (vm.sortedActiveEvents.length > 0) {
    const eventBadges = vm.sortedActiveEvents.map(evt => {
      const title = escapeHtml(getVal(evt.title) || getVal(evt.name) || 'Event');
      const start = evt.startDate ? formatShortDate(evt.startDate) : '';
      const end = evt.endDate ? formatShortDate(evt.endDate) : '';

      let dateStr = '';
      if (start && end) dateStr = `${start} — ${end}`;
      else if (start) dateStr = `${start}`;

      let tag = 'EVENT';
      let tagClass = 'game-card__event-tag--event';
      if (evt.type === 'ptr') { tag = 'PTR'; tagClass = 'game-card__event-tag--ptr'; }
      else if (evt.type === 'season_start' || evt.type === 'launch') { tag = 'LAUNCH'; tagClass = 'game-card__event-tag--launch'; }
      else if (evt.type === 'bonus_exp') { tag = 'EXP'; tagClass = 'game-card__event-tag--exp'; }
      else if (evt.type === 'tournament' || evt.type === 'race') { tag = 'RACE'; tagClass = 'game-card__event-tag--race'; }

      return `
        <div class="game-card__event-row">
          <span class="game-card__event-tag ${tagClass}">${tag}</span>
          <span class="game-card__event-row-title">${title}</span>
          ${dateStr ? `<span class="game-card__event-row-date">${dateStr}</span>` : ''}
        </div>
      `;
    }).join('');

    eventsBannerHtml = `
      <div class="game-card__events-tray">
        <div class="game-card__events-header">
          <span class="game-card__events-label">${t('card.upcomingEventsHeader') || 'UPCOMING STAGES & TESTS:'}</span>
        </div>
        <div class="game-card__events-list">${eventBadges}</div>
      </div>
    `;
  }

  const detailsSourceType = vm.moreDetailsUrl.includes('steam') ? 'steam_news' : 'official_announcement';
  const detailsLinkAttr = vm.isDetailPage && vm.moreDetailsUrl !== vm.website && !vm.moreDetailsUrl.startsWith('./')
    ? ` data-analytics-source="official_source" data-source-type="${detailsSourceType}" data-date-status="${vm.dateStatusVal}" data-game-id="${vm.gameIdVal}"`
    : '';

  return `
    <article class="game-card sf-desktop-card${vm.activeClass}" data-game-id="${escapeAttr(game.id || '')}" style="--game-color: ${vm.color};">
      <div class="game-card__glow"></div>
      <div class="game-card__header">
        <div class="game-card__title-block">
          <div class="game-card__badge-row">
            <span class="game-card__pill${vm.pillModifier}">${vm.uppercaseStatusPill}</span>
            ${vm.ptrBadgeHtml}
          </div>
          <h2 class="game-card__title">${vm.name}</h2>
          <p class="game-card__subtitle">${t('card.currentSeasonLabel')}: ${vm.currentSeason}</p>
          ${sourceHtml}
        </div>
      </div>

      <div class="game-card__body">
        <section class="game-card__panel game-card__panel--main">
          <span class="game-card__label">${t('card.currentSeasonLabel')}</span>
          <h3 class="game-card__season">
            <span>${vm.currentSeason}</span>
          </h3>
          <div class="game-card__meta-row">
            <span>${t('card.launchLabel')}</span>
            <span>${vm.currentSeasonDate || 'TBA'}</span>
          </div>

          <div class="game-card__progress-block">
            <div class="game-card__progress-meta">
              <span>${t('card.progressLabel')}</span>
            </div>
            ${game.currentSeason?.startDate ? vm.progressBar : '<div class="game-card__progress-bar-placeholder"></div>'}
          </div>
          ${eventsBannerHtml}
          ${!vm.isDetailPage ? `
            <a class="game-card__cta-block" href="${vm.cleanBase}games/${game.id}/">
              <div class="game-card__cta-icon-box">
                ${game.logo
                  ? `<img src="${vm.cleanBase}assets/logos/${escapeAttr(game.logo)}" alt="${vm.name}" class="game-card__cta-game-logo" />`
                  : getIconSvg(game.icon, { size: 20, class: 'game-card__cta-game-svg' })
                }
              </div>
              <div class="game-card__cta-content">
                <span class="game-card__cta-title">${t('card.gamePageLinkTitle')}</span>
                <span class="game-card__cta-subtitle">${t('card.gamePageLinkSubtitle')}</span>
              </div>
              <div class="game-card__cta-arrow-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="game-card__cta-arrow-icon">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </a>
          ` : ''}
        </section>

        <section class="game-card__panel game-card__panel--side">
          <div class="game-card__side-header">
            <div class="game-card__side-top-row">
              <span class="game-card__side-label">${vm.sideHeaderLabel}</span>
              ${vm.nextSeasonDateBadge ? `<div class="game-card__badge-wrapper">${vm.nextSeasonDateBadge}</div>` : ''}
            </div>
            <h3 class="game-card__side-season-name" title="${escapeAttr(vm.rawNextSeason)}">${vm.nextSeason}</h3>
            ${vm.nextSeasonDateShort ? `
              <div class="game-card__side-date-row" title="${escapeAttr(vm.nextSeasonDateFull)}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="game-card__side-date-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span class="game-card__side-date">${vm.nextSeasonDateShort}</span>
              </div>
            ` : ''}
          </div>
          ${countdownHtml}
          <a class="game-card__developer" href="${vm.website}" target="_blank" rel="noopener noreferrer" title="${vm.developer}">
            <div class="game-card__developer-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <div class="game-card__developer-info">
              <span class="game-card__developer-label">${t('card.developerLabel')}</span>
              <strong class="game-card__developer-name">${vm.developer}</strong>
            </div>
          </a>
        </section>
      </div>

      ${featuresHtml}
      <div class="game-card__watermark">
        <img src="${vm.logoPrefix}assets/logo.png" alt="SeasonForge Logo" class="game-card__watermark-logo" />
        <span class="game-card__watermark-dot">•</span>
        <span class="game-card__watermark-text">seasonforge.online</span>
      </div>
    </article>
  `;
}
