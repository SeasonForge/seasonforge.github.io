/**
 * SeasonForge Mobile Game Card Component
 * Dedicated UI presentation layer for Mobile viewport (<= 900px).
 * Clean, lightweight, vertical stack with touch-friendly targets.
 */

import { t, getVal } from '../../i18n/index.js';
import { getState } from '../../store/state.js';
import { calculateDynamicStatus } from '../../utils/status.js';
import { escapeHtml, escapeAttr } from '../../utils/helpers.js';
import { getIconSvg } from '../../utils/icons.js';
import { formatLocalDate, formatShortDate } from '../../utils/date.js';

export function render(game = {}, options = {}) {
  const name = escapeHtml(getVal(game.name) || 'Untitled Game');
  const developer = escapeHtml(game.developer || 'Unknown developer');
  const rawColor = String(game.color || '#4b5563');
  const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#4b5563';
  const statusCode = calculateDynamicStatus(game);
  const statusLabel = escapeHtml(t(`statuses.${statusCode}`) || game.status?.label || 'Unknown');
  
  const currentSeason = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
  const currentSeasonDate = formatLocalDate(game.currentSeason?.startDate);
  
  const rawNextSeason = getVal(game.nextSeason?.name) || 'TBA';
  const cleanNextSeason = rawNextSeason.replace(/\s*\((Estimated|Forecast|Оценка|Прогноз)\)/gi, '').trim();
  const nextSeason = escapeHtml(cleanNextSeason);
  
  const nextSeasonDateShort = formatShortDate(game.nextSeason?.startDate);
  const nextSeasonDateFull = formatLocalDate(game.nextSeason?.startDate);
  
  const verificationType = game.nextSeason?.verification;
  const isAnnouncement = verificationType === 'announcement' || 
    (rawNextSeason && /announcement|анонс/i.test(rawNextSeason));

  let nextSeasonDateBadge = '';
  const customTooltip = game.nextSeason?.verificationNote ? getVal(game.nextSeason.verificationNote) : '';
  if (isAnnouncement || verificationType === 'announcement') {
    nextSeasonDateBadge = `<span class="verification-badge verification-badge--announcement" data-tooltip="${escapeAttr(customTooltip || t('card.announcementBadgeTitle'))}" style="cursor: help;">${t('card.announcementBadge')}</span>`;
  } else if (verificationType === 'official') {
    nextSeasonDateBadge = `<span class="verification-badge verification-badge--official" data-tooltip="${escapeAttr(customTooltip || t('card.officialBadgeTitle'))}" style="cursor: help;">${t('card.officialBadge')}</span>`;
  } else if (verificationType === 'ai' || verificationType === 'estimated') {
    const defaultEstimatedTooltip = customTooltip || t('card.estimatedBadgeTitle');
    nextSeasonDateBadge = `<span class="verification-badge verification-badge--estimated" data-tooltip="${escapeAttr(defaultEstimatedTooltip)}" style="cursor: help;">▲ ${t('card.estimatedBadge')}</span>`;
  }

  const sideHeaderLabel = isAnnouncement ? t('card.announcementCountdownPrefix') : t('card.countdownPrefix');
  
  const countdown = options.countdown || {};
  const progressBar = options.progressBar || '';
  const website = escapeAttr(game.website || '#');
  const features = Array.isArray(getVal(game.features)) ? getVal(game.features) : [];
  
  let ptrBadgeHtml = '';
  if (game.ptr || (game.events && game.events.some(e => e.type === 'ptr'))) {
    const ptrItem = game.ptr || game.events.find(e => e.type === 'ptr');
    const state = getState ? getState() : {};
    const lang = state.settings?.lang || 'en';
    const startVerb = lang === 'ru' ? 'Старт' : 'Starts';
    const ptrTitle = escapeHtml(getVal(ptrItem.name) || getVal(ptrItem.title) || 'PTR 3.2.0');
    const ptrText = ptrItem.startDate ? `${ptrTitle}: ${startVerb} ${formatShortDate(ptrItem.startDate)}` : ptrTitle;
    ptrBadgeHtml = `
      <div class="game-card__ptr-chip">
        <span class="game-card__ptr-chip-badge">PTR TEST</span>
        <span class="game-card__ptr-chip-text">${ptrText}</span>
      </div>
    `;
  }

  let eventsBannerHtml = '';
  if (Array.isArray(game.events) && game.events.length > 0) {
    const sortedEvents = [...game.events].sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return dateA - dateB;
    });

    const activeOrUpcomingEvents = sortedEvents.filter(e => {
      if (!e.endDate) return true;
      return new Date(e.endDate).getTime() >= Date.now();
    });

    if (activeOrUpcomingEvents.length > 0) {
      const topEvents = activeOrUpcomingEvents.slice(0, 3);
      const state = getState ? getState() : {};
      const lang = state.settings?.lang || 'en';

      const eventBadges = topEvents.map(evt => {
        const title = escapeHtml(getVal(evt.title) || getVal(evt.name) || 'Event');
        const start = evt.startDate ? formatShortDate(evt.startDate) : '';
        const end = evt.endDate ? formatShortDate(evt.endDate) : '';
        
        let dateStr = '';
        if (start && end) {
          dateStr = `${start} — ${end}`;
        } else if (start) {
          dateStr = `${lang === 'ru' ? 'с' : 'from'} ${start}`;
        }

        let typeClass = 'game-card__event-pill--special';
        let iconSymbol = getIconSvg('zap', { size: 14 });
        if (evt.type === 'bonus_exp') {
          typeClass = 'game-card__event-pill--exp';
          iconSymbol = getIconSvg('flame', { size: 14 });
        } else if (evt.type === 'tournament' || evt.type === 'race') {
          typeClass = 'game-card__event-pill--tournament';
          iconSymbol = getIconSvg('trophy', { size: 14 });
        } else if (evt.type === 'ptr') {
          typeClass = 'game-card__event-pill--ptr';
          iconSymbol = getIconSvg('flask', { size: 14 });
        }

        return `
          <div class="game-card__event-pill ${typeClass}" title="${title} (${dateStr})">
            <div class="game-card__event-pill-header">
              <span class="game-card__event-icon">${iconSymbol}</span>
              <span class="game-card__event-title">${title}</span>
            </div>
            ${dateStr ? `<span class="game-card__event-date">${dateStr}</span>` : ''}
          </div>
        `;
      }).join('');

      eventsBannerHtml = `
        <div class="game-card__events-tray">
          <div class="game-card__events-header">
            <span class="game-card__events-label">${t('card.inGameEvents') || 'In-Game Events'}</span>
          </div>
          <div class="game-card__events-list">
            ${eventBadges}
          </div>
        </div>
      `;
    }
  }

  const pillModifier = statusCode ? ` game-card__pill--${statusCode.toLowerCase().replace(/_/g, '-')}` : '';

  let featuresHtml = '';
  if (game.nextSeason?.featuresByCategory) {
    const fCat = game.nextSeason.featuresByCategory;
    const official = Array.isArray(fCat.official) ? fCat.official : [];
    const announcements = Array.isArray(fCat.announcements) ? fCat.announcements : [];
    const expectations = Array.isArray(fCat.expectations) ? fCat.expectations : [];

    const state = getState ? getState() : {};
    const lang = state.settings?.lang || 'en';

    let officialHtml = '';
    if (official.length > 0) {
      const officialItems = official.map(f => `
        <li class="game-card__feature-item">
          <span class="game-card__feature-check" style="color: #4ade80;">${getIconSvg('check', { size: 13 })}</span>
          <span class="game-card__feature-text">${escapeHtml(getVal(f))}</span>
        </li>
      `).join('');

      officialHtml = `
        <div class="game-card__feature-group" style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span class="verification-badge verification-badge--official" style="font-size: 0.75rem;">${getIconSvg('dot', { size: 10 })} ${t('card.officialCategory')}</span>
          </div>
          <ul class="game-card__feature-grid">${officialItems}</ul>
        </div>
      `;
    }

    let announcementsHtml = '';
    if (announcements.length > 0) {
      const annBlocks = announcements.map(ann => {
        const annTitle = escapeHtml(getVal(ann.title) || (lang === 'ru' ? 'Анонс разработчиков' : 'Developer Announcement'));
        const annDate = ann.date ? formatLocalDate(ann.date) : '';
        const annSource = escapeHtml(ann.source || 'Official');
        const annUrl = escapeAttr(ann.url || '#');
        const hasUrl = ann.url && ann.url !== '#';
        
        const annHighlights = Array.isArray(ann.highlights) ? ann.highlights.map(h => `
          <li class="game-card__feature-item">
            <span class="game-card__feature-check" style="color: #60a5fa;">•</span>
            <span class="game-card__feature-text">${escapeHtml(getVal(h))}</span>
          </li>
        `).join('') : '';

        return `
          <div style="background: rgba(30, 41, 59, 0.4); border-left: 3px solid #3b82f6; padding: 0.75rem; border-radius: 4px; margin-bottom: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.35rem;">
              <strong style="color: #93c5fd; font-size: 0.85rem;">${annTitle}</strong>
              <span style="font-size: 0.7rem; color: #94a3b8;">${annDate}</span>
            </div>
            ${annHighlights ? `<ul class="game-card__feature-grid" style="margin-bottom: 0.5rem;">${annHighlights}</ul>` : ''}
            ${hasUrl ? `<div style="text-align: right;"><a href="${annUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: #60a5fa; text-decoration: underline;">${t('card.sourceLabel')}: ${annSource} ↗</a></div>` : ''}
          </div>
        `;
      }).join('');

      announcementsHtml = `
        <div class="game-card__feature-group" style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span class="verification-badge verification-badge--announcement" style="font-size: 0.75rem;">${getIconSvg('dot', { size: 10 })} ${t('card.announcementCategory') || (lang === 'ru' ? 'Анонс / Презентация' : 'Announcement / Reveal')}</span>
          </div>
          ${annBlocks}
        </div>
      `;
    }

    let expHtml = '';
    if (expectations.length > 0) {
      const expItems = expectations.map(exp => `
        <li class="game-card__feature-item">
          <span class="game-card__feature-check" style="color: #fde047;">${getIconSvg('star', { size: 12 })}</span>
          <span class="game-card__feature-text" style="color: #cbd5e1;">${escapeHtml(getVal(exp))}</span>
        </li>
      `).join('');

      expHtml = `
        <div class="game-card__feature-group">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span class="verification-badge verification-badge--estimated" style="font-size: 0.75rem;">${getIconSvg('dot', { size: 10 })} ${t('card.expectationsCategory')}</span>
          </div>
          <ul class="game-card__feature-grid">${expItems}</ul>
        </div>
      `;
    }

    featuresHtml = `
      <section class="game-card__panel game-card__panel--features">
        <div class="game-card__features-header">
          <span class="game-card__label">${getIconSvg('compass', { size: 15, class: 'game-card__features-compass' })} ${t('card.featuresLabel')}</span>
          <button type="button" class="game-card__features-toggle-btn" onclick="
            const body = this.parentElement.nextElementSibling;
            const isExpanded = body.classList.toggle('game-card__features-body--open');
            this.classList.toggle('game-card__features-toggle-btn--open', isExpanded);
            this.innerHTML = isExpanded ? '${t('card.hideFeatures')}' : '${t('card.showFeatures')}';
          ">${t('card.showFeatures')}</button>
        </div>
        <div class="game-card__features-body">
          ${officialHtml}
          ${announcementsHtml}
          ${expHtml}
        </div>
      </section>
    `;
  } else if (features.length > 0) {
    const featureItems = features
      .map((feature) => `
        <li class="game-card__feature-item">
          <span class="game-card__feature-check">${getIconSvg('check', { size: 13 })}</span>
          <span class="game-card__feature-text">${escapeHtml(getVal(feature))}</span>
        </li>
      `)
      .join('');

    featuresHtml = `
      <section class="game-card__panel game-card__panel--features">
        <div class="game-card__features-header">
          <span class="game-card__label">${getIconSvg('compass', { size: 15, class: 'game-card__features-compass' })} ${t('card.featuresLabel')}</span>
          <button type="button" class="game-card__features-toggle-btn" onclick="
            const body = this.parentElement.nextElementSibling;
            const isExpanded = body.classList.toggle('game-card__features-body--open');
            this.classList.toggle('game-card__features-toggle-btn--open', isExpanded);
            this.innerHTML = isExpanded ? '${t('card.hideFeatures')}' : '${t('card.showFeatures')}';
          ">${t('card.showFeatures')}</button>
        </div>
        <div class="game-card__features-body">
          <ul class="game-card__feature-grid">${featureItems}</ul>
        </div>
      </section>
    `;
  }
  
  const hasNextSeasonDate = game.nextSeason?.startDate && game.nextSeason.startDate !== '';
  const now = new Date();
  const targetDateObj = new Date(game.nextSeason?.startDate);
  const nextSeasonPassed = hasNextSeasonDate && !Number.isNaN(targetDateObj.getTime()) && targetDateObj.getTime() <= now.getTime();
  
  const curStart = game.currentSeason?.startDate ? new Date(game.currentSeason.startDate) : null;
  const isCurActive = curStart && !Number.isNaN(curStart.getTime()) && curStart.getTime() <= now.getTime();

  let countdownHtml = '';
  if (!hasNextSeasonDate) {
    if (isCurActive) {
      const daysActive = Math.max(1, Math.floor((now.getTime() - curStart.getTime()) / (1000 * 60 * 60 * 24)));
      const state = getState();
      const lang = state.settings?.lang || 'en';
      
      let activeLabel = lang === 'ru' ? 'Сезон в разгаре' : 'Season in Progress';
      let dayLabel = lang === 'ru' ? `В игре ${daysActive} дн.` : `Active for ${daysActive}d`;

      if (daysActive <= 3) {
        activeLabel = lang === 'ru' ? 'Свежий запуск' : 'Fresh Start';
        const dayWord = lang === 'ru' ? (daysActive === 1 ? 'день' : 'дня') : (daysActive === 1 ? 'day' : 'days');
        dayLabel = lang === 'ru' ? `Старт ${daysActive} ${dayWord} назад` : `Started ${daysActive} ${dayWord} ago`;
      } else if (daysActive <= 14) {
        activeLabel = lang === 'ru' ? 'Ранняя фаза' : 'Early Phase';
        dayLabel = lang === 'ru' ? `Старт ${daysActive} дн. назад` : `Started ${daysActive}d ago`;
      }

      countdownHtml = `
        <div class="game-card__countdown game-card__countdown--active-season" style="display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 12px;">
          <div style="font-weight: 600; color: #818cf8; font-size: 0.88rem; display: flex; align-items: center; gap: 0.35rem; font-family: var(--font-display);">
            <span>${getIconSvg('zap', { size: 14 })}</span> <span>${activeLabel}</span>
          </div>
          <span style="font-size: 0.88rem; font-weight: 600; color: #cbd5e1; font-family: var(--font-display);">${dayLabel}</span>
        </div>
      `;
    } else {
      countdownHtml = `
        <div class="game-card__countdown game-card__countdown--tba">
          <div class="game-card__tba-icon">${getIconSvg('calendar', { size: 18 })}</div>
          <span class="game-card__tba-label">${t('card.noLaunchDate')}</span>
        </div>
      `;
    }
  } else if (nextSeasonPassed) {
    countdownHtml = `
      <div class="game-card__countdown game-card__countdown--launched">
        <div class="game-card__tba-icon">${getIconSvg('zap', { size: 18 })}</div>
        <span class="game-card__tba-label">${t('card.justLaunched')}</span>
      </div>
    `;
  } else {
    countdownHtml = `
      <div class="game-card__countdown">
        <div class="game-card__countdown-item"><strong data-countdown="days">${countdown.days ?? 0}</strong><span>${t('card.days')}</span></div>
        <div class="game-card__countdown-item"><strong data-countdown="hours">${countdown.hours ?? 0}</strong><span>${t('card.hours')}</span></div>
        <div class="game-card__countdown-item"><strong data-countdown="minutes">${countdown.minutes ?? 0}</strong><span>${t('card.minutes')}</span></div>
        <div class="game-card__countdown-item"><strong data-countdown="seconds">${countdown.seconds ?? 0}</strong><span>${t('card.seconds')}</span></div>
      </div>
    `;
  }

  const isDetailPage = options.isDetailPage || false;
  const logoPrefix = isDetailPage ? '../../' : './';
  const moreDetailsUrl = isDetailPage 
    ? (game.nextSeason?.sourceUrl || game.currentSeason?.sourceUrl || website)
    : `./games/${game.id}/`;
  const moreDetailsTarget = isDetailPage ? 'target="_blank" rel="noopener noreferrer"' : '';
  const uppercaseStatusPill = `${statusLabel}`.toUpperCase();

  const isForecastStatus = verificationType === 'ai' || verificationType === 'estimated';
  const dateStatusVal = isForecastStatus ? 'forecast' : 'official';
  const gameIdVal = escapeAttr(game.id || '');

  let sourceHtml = '';
  if (game.latestNews && game.latestNews.url) {
    const newsTitle = escapeHtml(game.latestNews.title || 'announcement');
    const newsUrl = escapeAttr(game.latestNews.url);
    const rawDate = game.latestNews.publishDate;
    const formattedNewsDate = rawDate ? formatLocalDate(rawDate) : '';
    const dateText = formattedNewsDate ? ` ${t('card.publishedAt')} ${formattedNewsDate}` : '';
    const sourceLabel = escapeHtml(game.latestNews.source || 'Official Source');
    const newsSourceType = (newsUrl.includes('steam') || (game.latestNews.source || '').toLowerCase().includes('steam'))
      ? 'steam_news'
      : 'official_news';

    sourceHtml = `
      <p class="game-card__source-info">
        ${t('card.sourceLabel')}: <span class="game-card__source-badge">${getIconSvg('newspaper', { size: 12 })} ${sourceLabel}</span> • 
        <span class="game-card__source-title" title="${newsTitle}">${newsTitle}</span>${dateText} • 
        <a href="${newsUrl}" target="_blank" rel="noopener noreferrer" class="game-card__source-link" data-analytics-source="official_source" data-source-type="${newsSourceType}" data-date-status="${dateStatusVal}" data-game-id="${gameIdVal}">${t('card.readOriginal')}</a>
      </p>
    `;
  }

  const detailsSourceType = moreDetailsUrl.includes('steam') ? 'steam_news' : 'official_announcement';
  const detailsLinkAttr = isDetailPage && moreDetailsUrl !== website && !moreDetailsUrl.startsWith('./')
    ? ` data-analytics-source="official_source" data-source-type="${detailsSourceType}" data-date-status="${dateStatusVal}" data-game-id="${gameIdVal}"`
    : '';
  const activeClass = options.isActive ? ' game-card--active' : '';

  return `
    <article class="game-card sf-mobile-card${activeClass}" data-game-id="${escapeAttr(game.id || '')}" style="--game-color: ${color};">
      <div class="game-card__glow"></div>
      <div class="game-card__header">
        <div class="game-card__title-block">
          <div class="game-card__badge-row">
            <span class="game-card__pill${pillModifier}">${uppercaseStatusPill}</span>
            ${ptrBadgeHtml}
          </div>
          <h2 class="game-card__title">${name}</h2>
          <p class="game-card__subtitle">${t('card.currentSeasonLabel')}: ${currentSeason}</p>
          ${sourceHtml}
        </div>
      </div>

      <div class="game-card__body">
        <section class="game-card__panel game-card__panel--main">
          <span class="game-card__label">${t('card.currentSeasonLabel')}</span>
          <h3 class="game-card__season">
            <span>${currentSeason}</span>
          </h3>
          <div class="game-card__meta-row">
            <span>${t('card.launchLabel')}</span>
            <span>${currentSeasonDate || 'TBA'}</span>
          </div>

          <div class="game-card__progress-block">
            <div class="game-card__progress-meta">
              <span>${t('card.progressLabel')}</span>
            </div>
            ${game.currentSeason?.startDate ? progressBar : '<div class="game-card__progress-bar-placeholder"></div>'}
          </div>
          ${eventsBannerHtml}
          ${!isDetailPage ? `
            <a class="game-card__cta-block" href="./games/${game.id}/">
              <div class="game-card__cta-icon-box">
                ${game.logo 
                  ? `<img src="./assets/logos/${escapeAttr(game.logo)}" alt="${name}" class="game-card__cta-game-logo" />`
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
              <span class="game-card__side-label">${sideHeaderLabel}</span>
              ${nextSeasonDateBadge ? `<div class="game-card__badge-wrapper">${nextSeasonDateBadge}</div>` : ''}
            </div>
            <h3 class="game-card__side-season-name" title="${escapeAttr(rawNextSeason)}">${nextSeason}</h3>
            ${nextSeasonDateShort ? `
              <div class="game-card__side-date-row" title="${escapeAttr(nextSeasonDateFull)}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="game-card__side-date-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span class="game-card__side-date">${nextSeasonDateShort}</span>
              </div>
            ` : ''}
          </div>
          ${countdownHtml}
          <a class="game-card__developer" href="${website}" target="_blank" rel="noopener noreferrer" title="${developer}">
            <div class="game-card__developer-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <div class="game-card__developer-info">
              <span class="game-card__developer-label">${t('card.developerLabel')}</span>
              <strong class="game-card__developer-name">${developer}</strong>
            </div>
          </a>
        </section>
      </div>

      ${featuresHtml}
      <div class="game-card__watermark">
        <img src="${logoPrefix}assets/logo.png" alt="SeasonForge Logo" class="game-card__watermark-logo" />
        <span class="game-card__watermark-dot">•</span>
        <span class="game-card__watermark-text">seasonforge.online</span>
      </div>
    </article>
  `;
}
