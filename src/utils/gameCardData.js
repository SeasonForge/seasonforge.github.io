/**
 * SeasonForge Game Card ViewModel
 * Shared data preparation layer for Desktop & Mobile GameCard components.
 * Extracts all business logic (statuses, dates, badges, PTR, features, events, countdown)
 * so that Desktop/Mobile components only handle HTML templates.
 */

import { t, getVal } from '../i18n/index.js';
import { getState } from '../store/state.js';
import { calculateDynamicStatus, getActivePtr } from './status.js';
import { escapeHtml, escapeAttr } from './helpers.js';
import { getIconSvg } from './icons.js';
import { formatLocalDate, formatShortDate } from './date.js';

/**
 * Prepare the full ViewModel for a game card.
 * @param {Object} game - Game data object
 * @param {Object} options - Render options (countdown, progressBar, isDetailPage, basePath, isActive)
 * @returns {Object} ViewModel with all pre-computed values
 */
export function prepareGameCardViewModel(game = {}, options = {}) {
  const state = getState ? getState() : {};
  const lang = state.settings?.lang || 'en';

  // --- Basic info ---
  const name = escapeHtml(getVal(game.name) || 'Untitled Game');
  const developer = escapeHtml(game.developer || 'Unknown developer');
  const rawColor = String(game.color || '#4b5563');
  const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#4b5563';

  // --- Status ---
  const statusCode = calculateDynamicStatus(game);
  const statusLabel = escapeHtml(t(`statuses.${statusCode}`) || game.status?.label || 'Unknown');
  const pillModifier = statusCode ? ` game-card__pill--${statusCode.toLowerCase().replace(/_/g, '-')}` : '';
  const uppercaseStatusPill = `${statusLabel}`.toUpperCase();

  // --- Current season ---
  const currentSeason = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
  const currentSeasonDate = formatLocalDate(game.currentSeason?.startDate);

  // --- Next season ---
  const rawNextSeason = getVal(game.nextSeason?.name) || 'TBA';
  const cleanNextSeason = rawNextSeason.replace(/\s*\((Estimated|Forecast|Оценка|Прогноз)\)/gi, '').trim();
  const nextSeason = escapeHtml(cleanNextSeason);
  const nextSeasonDateShort = formatShortDate(game.nextSeason?.startDate);
  const nextSeasonDateFull = formatLocalDate(game.nextSeason?.startDate);

  // --- Verification badge ---
  const verificationType = game.nextSeason?.verification;
  const isAnnouncement = verificationType === 'announcement' ||
    (rawNextSeason && /announcement|анонс/i.test(rawNextSeason));
  const customTooltip = game.nextSeason?.verificationNote ? getVal(game.nextSeason.verificationNote) : '';

  let nextSeasonDateBadge = '';
  if (isAnnouncement || verificationType === 'announcement') {
    nextSeasonDateBadge = `<span class="verification-badge verification-badge--announcement" data-tooltip="${escapeAttr(customTooltip || t('card.announcementBadgeTitle'))}" style="cursor: help;">${t('card.announcementBadge')}</span>`;
  } else if (verificationType === 'official') {
    nextSeasonDateBadge = `<span class="verification-badge verification-badge--official" data-tooltip="${escapeAttr(customTooltip || t('card.officialBadgeTitle'))}" style="cursor: help;">${t('card.officialBadge')}</span>`;
  } else if (verificationType === 'ai' || verificationType === 'estimated') {
    const tooltip = customTooltip || t('card.estimatedBadgeTitle');
    nextSeasonDateBadge = `<span class="verification-badge verification-badge--estimated" data-tooltip="${escapeAttr(tooltip)}" style="cursor: help;">▲ ${t('card.estimatedBadge')}</span>`;
  }

  const sideHeaderLabel = isAnnouncement ? t('card.announcementCountdownPrefix') : t('card.countdownPrefix');

  // --- PTR badge ---
  let ptrBadgeHtml = '';
  const activePtr = getActivePtr(game);
  if (activePtr) {
    const startVerb = lang === 'ru' ? 'Старт' : 'Starts';
    const ptrTitle = escapeHtml(getVal(activePtr.name) || getVal(activePtr.title) || 'PTR 3.2.0');
    const ptrText = activePtr.startDate ? `${ptrTitle}: ${startVerb} ${formatShortDate(activePtr.startDate)}` : ptrTitle;
    ptrBadgeHtml = `
      <div class="game-card__ptr-chip">
        <span class="game-card__ptr-chip-badge">PTR TEST</span>
        <span class="game-card__ptr-chip-text">${ptrText}</span>
      </div>
    `;
  }

  // --- Events data (shared, rendering is platform-specific) ---
  let sortedActiveEvents = [];
  if (Array.isArray(game.events) && game.events.length > 0) {
    const sorted = [...game.events].sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return dateA - dateB;
    });
    sortedActiveEvents = sorted.filter(e => {
      if (!e.endDate) return true;
      return new Date(e.endDate).getTime() >= Date.now();
    }).slice(0, 3);
  }

  // --- Features (shared data, rendering is platform-specific for toggle button ids) ---
  const features = Array.isArray(getVal(game.features)) ? getVal(game.features) : [];
  const featuresByCategory = game.nextSeason?.featuresByCategory || null;

  let featureCategoryData = null;
  if (featuresByCategory) {
    const official = Array.isArray(featuresByCategory.official) ? featuresByCategory.official : [];
    const announcements = Array.isArray(featuresByCategory.announcements) ? featuresByCategory.announcements : [];
    const expectations = Array.isArray(featuresByCategory.expectations) ? featuresByCategory.expectations : [];
    featureCategoryData = { official, announcements, expectations };
  }

  // --- Countdown state ---
  const countdown = options.countdown || {};
  const progressBar = options.progressBar || '';
  const website = escapeAttr(game.website || '#');

  const hasNextSeasonDate = game.nextSeason?.startDate && game.nextSeason.startDate !== '';
  const now = new Date();
  const targetDateObj = new Date(game.nextSeason?.startDate);
  const nextSeasonPassed = hasNextSeasonDate && !Number.isNaN(targetDateObj.getTime()) && targetDateObj.getTime() <= now.getTime();
  const curStart = game.currentSeason?.startDate ? new Date(game.currentSeason.startDate) : null;
  const isCurActive = curStart && !Number.isNaN(curStart.getTime()) && curStart.getTime() <= now.getTime();

  /** @type {'countdown'|'active-season'|'tba'|'launched'} */
  let countdownState = 'tba';
  let activeSeasonInfo = null;

  if (!hasNextSeasonDate) {
    if (isCurActive) {
      countdownState = 'active-season';
      const daysActive = Math.max(1, Math.floor((now.getTime() - curStart.getTime()) / (1000 * 60 * 60 * 24)));
      let activeLabel, dayLabel;

      if (daysActive <= 3) {
        activeLabel = lang === 'ru' ? 'Свежий запуск' : 'Fresh Start';
        const dayWord = lang === 'ru' ? (daysActive === 1 ? 'день' : 'дня') : (daysActive === 1 ? 'day' : 'days');
        dayLabel = lang === 'ru' ? `Старт ${daysActive} ${dayWord} назад` : `Started ${daysActive} ${dayWord} ago`;
      } else if (daysActive <= 14) {
        activeLabel = lang === 'ru' ? 'Ранняя фаза' : 'Early Phase';
        dayLabel = lang === 'ru' ? `Старт ${daysActive} дн. назад` : `Started ${daysActive}d ago`;
      } else {
        activeLabel = lang === 'ru' ? 'Сезон в разгаре' : 'Season in Progress';
        dayLabel = lang === 'ru' ? `В игре ${daysActive} дн.` : `Active for ${daysActive}d`;
      }

      activeSeasonInfo = { daysActive, activeLabel, dayLabel };
    } else {
      countdownState = 'tba';
    }
  } else if (nextSeasonPassed) {
    countdownState = 'launched';
  } else {
    countdownState = 'countdown';
  }

  // --- Paths ---
  const isDetailPage = options.isDetailPage || false;
  const cleanBase = typeof options.basePath === 'string' && options.basePath.endsWith('/')
    ? options.basePath
    : (typeof options.basePath === 'string' ? `${options.basePath}/` : (isDetailPage ? '../../' : './'));
  const logoPrefix = cleanBase;
  const moreDetailsUrl = isDetailPage
    ? (game.nextSeason?.sourceUrl || game.currentSeason?.sourceUrl || website)
    : `${cleanBase}games/${game.id}/`;
  const moreDetailsTarget = isDetailPage ? 'target="_blank" rel="noopener noreferrer"' : '';

  // --- Source / News ---
  const isForecastStatus = verificationType === 'ai' || verificationType === 'estimated';
  const dateStatusVal = isForecastStatus ? 'forecast' : 'official';
  const gameIdVal = escapeAttr(game.id || '');

  let sourceData = null;
  if (game.latestNews && game.latestNews.url) {
    const newsTitle = escapeHtml(game.latestNews.title || 'announcement');
    const newsUrl = escapeAttr(game.latestNews.url);
    const rawDate = game.latestNews.publishDate;
    const formattedNewsDate = rawDate ? formatLocalDate(rawDate) : '';
    const sourceLabel = escapeHtml(game.latestNews.source || 'Official Source');
    const newsSourceType = (newsUrl.includes('steam') || (game.latestNews.source || '').toLowerCase().includes('steam'))
      ? 'steam_news'
      : 'official_news';
    sourceData = { newsTitle, newsUrl, formattedNewsDate, sourceLabel, newsSourceType };
  }

  const detailsSourceType = moreDetailsUrl.includes('steam') ? 'steam_news' : 'official_announcement';
  const detailsLinkAttr = isDetailPage && moreDetailsUrl !== website && !moreDetailsUrl.startsWith('./')
    ? ` data-analytics-source="official_source" data-source-type="${detailsSourceType}" data-date-status="${dateStatusVal}" data-game-id="${gameIdVal}"`
    : '';
  const activeClass = options.isActive ? ' game-card--active' : '';

  return {
    // Basic
    name, developer, color, lang,
    // Status
    statusCode, statusLabel, pillModifier, uppercaseStatusPill,
    // Current season
    currentSeason, currentSeasonDate,
    // Next season
    rawNextSeason, nextSeason, nextSeasonDateShort, nextSeasonDateFull,
    verificationType, isAnnouncement, nextSeasonDateBadge, sideHeaderLabel,
    // PTR
    ptrBadgeHtml,
    // Events
    sortedActiveEvents,
    // Features
    features, featureCategoryData,
    // Countdown
    countdown, progressBar, countdownState, activeSeasonInfo,
    hasNextSeasonDate, nextSeasonPassed,
    // Paths & links
    website, isDetailPage, cleanBase, logoPrefix, moreDetailsUrl, moreDetailsTarget,
    // Analytics
    dateStatusVal, gameIdVal, sourceData, detailsSourceType, detailsLinkAttr,
    // State
    activeClass,
    // Raw game ref (for logo, icon, etc.)
    game
  };
}

/**
 * Build features HTML section (shared between Desktop & Mobile).
 * @param {Object} vm - ViewModel from prepareGameCardViewModel
 * @param {Object} [opts] - Options: { toggleBtnId } for Desktop id attribute
 * @returns {string} HTML string
 */
export function buildFeaturesHtml(vm, opts = {}) {
  const { featureCategoryData, features, lang } = vm;
  const toggleId = opts.toggleBtnId ? ` id="${opts.toggleBtnId}"` : '';

  if (featureCategoryData) {
    const { official, announcements, expectations } = featureCategoryData;

    let officialHtml = '';
    if (official.length > 0) {
      const items = official.map(f => `
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
          <ul class="game-card__feature-grid">${items}</ul>
        </div>
      `;
    }

    let announcementsHtml = '';
    if (announcements.length > 0) {
      const blocks = announcements.map(ann => {
        const annTitle = escapeHtml(getVal(ann.title) || (lang === 'ru' ? 'Анонс разработчиков' : 'Developer Announcement'));
        const annDate = ann.date ? formatLocalDate(ann.date) : '';
        const annSource = escapeHtml(ann.source || 'Official');
        const annUrl = escapeAttr(ann.url || '#');
        const hasUrl = ann.url && ann.url !== '#';

        const highlights = Array.isArray(ann.highlights) ? ann.highlights.map(h => `
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
            ${highlights ? `<ul class="game-card__feature-grid" style="margin-bottom: 0.5rem;">${highlights}</ul>` : ''}
            ${hasUrl ? `<div style="text-align: right;"><a href="${annUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: #60a5fa; text-decoration: underline;">${t('card.sourceLabel')}: ${annSource} ↗</a></div>` : ''}
          </div>
        `;
      }).join('');

      announcementsHtml = `
        <div class="game-card__feature-group" style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span class="verification-badge verification-badge--announcement" style="font-size: 0.75rem;">${getIconSvg('dot', { size: 10 })} ${t('card.announcementCategory') || (lang === 'ru' ? 'Анонс / Презентация' : 'Announcement / Reveal')}</span>
          </div>
          ${blocks}
        </div>
      `;
    }

    let expHtml = '';
    if (expectations.length > 0) {
      const items = expectations.map(exp => `
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
          <ul class="game-card__feature-grid">${items}</ul>
        </div>
      `;
    }

    return `
      <section class="game-card__panel game-card__panel--features">
        <div class="game-card__features-header">
          <span class="game-card__label">${getIconSvg('compass', { size: 15, class: 'game-card__features-compass' })} ${t('card.featuresLabel')}</span>
          <button type="button" class="game-card__features-toggle-btn"${toggleId} data-action="toggle-features" data-label-show="${t('card.showFeatures')}" data-label-hide="${t('card.hideFeatures')}">${t('card.showFeatures')}</button>
        </div>
        <div class="game-card__features-body"${opts.toggleBtnId ? ' id="game-card-features-body"' : ''}>
          ${officialHtml}
          ${announcementsHtml}
          ${expHtml}
        </div>
      </section>
    `;
  } else if (features.length > 0) {
    const items = features.map(f => `
      <li class="game-card__feature-item">
        <span class="game-card__feature-check">${getIconSvg('check', { size: 13 })}</span>
        <span class="game-card__feature-text">${escapeHtml(getVal(f))}</span>
      </li>
    `).join('');

    return `
      <section class="game-card__panel game-card__panel--features">
        <div class="game-card__features-header">
          <span class="game-card__label">${getIconSvg('compass', { size: 15, class: 'game-card__features-compass' })} ${t('card.featuresLabel')}</span>
          <button type="button" class="game-card__features-toggle-btn"${toggleId} data-action="toggle-features" data-label-show="${t('card.showFeatures')}" data-label-hide="${t('card.hideFeatures')}">${t('card.showFeatures')}</button>
        </div>
        <div class="game-card__features-body"${opts.toggleBtnId ? ' id="game-card-features-body"' : ''}>
          <ul class="game-card__feature-grid">${items}</ul>
        </div>
      </section>
    `;
  }

  return '';
}

/**
 * Build countdown HTML block (shared between Desktop & Mobile).
 * @param {Object} vm - ViewModel
 * @returns {string} HTML string
 */
export function buildCountdownHtml(vm) {
  const { countdownState, activeSeasonInfo, countdown } = vm;

  if (countdownState === 'active-season' && activeSeasonInfo) {
    return `
      <div class="game-card__countdown game-card__countdown--active-season" style="display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 12px;">
        <div style="font-weight: 600; color: #818cf8; font-size: 0.88rem; display: flex; align-items: center; gap: 0.35rem; font-family: var(--font-display);">
          <span>${getIconSvg('zap', { size: 14 })}</span> <span>${activeSeasonInfo.activeLabel}</span>
        </div>
        <span style="font-size: 0.88rem; font-weight: 600; color: #cbd5e1; font-family: var(--font-display);">${activeSeasonInfo.dayLabel}</span>
      </div>
    `;
  }

  if (countdownState === 'tba') {
    return `
      <div class="game-card__countdown game-card__countdown--tba">
        <div class="game-card__tba-icon">${getIconSvg('calendar', { size: 18 })}</div>
        <span class="game-card__tba-label">${t('card.noLaunchDate')}</span>
      </div>
    `;
  }

  if (countdownState === 'launched') {
    return `
      <div class="game-card__countdown game-card__countdown--launched">
        <div class="game-card__tba-icon">${getIconSvg('zap', { size: 18 })}</div>
        <span class="game-card__tba-label">${t('card.justLaunched')}</span>
      </div>
    `;
  }

  // countdownState === 'countdown'
  return `
    <div class="game-card__countdown">
      <div class="game-card__countdown-item"><strong data-countdown="days">${countdown.days ?? 0}</strong><span>${t('card.days')}</span></div>
      <div class="game-card__countdown-item"><strong data-countdown="hours">${countdown.hours ?? 0}</strong><span>${t('card.hours')}</span></div>
      <div class="game-card__countdown-item"><strong data-countdown="minutes">${countdown.minutes ?? 0}</strong><span>${t('card.minutes')}</span></div>
      <div class="game-card__countdown-item"><strong data-countdown="seconds">${countdown.seconds ?? 0}</strong><span>${t('card.seconds')}</span></div>
    </div>
  `;
}

/**
 * Build source/news HTML (shared between Desktop & Mobile).
 * @param {Object} vm - ViewModel
 * @returns {string} HTML string
 */
export function buildSourceHtml(vm) {
  const { sourceData, dateStatusVal, gameIdVal } = vm;
  if (!sourceData) return '';

  const { newsTitle, newsUrl, formattedNewsDate, sourceLabel, newsSourceType } = sourceData;
  const dateText = formattedNewsDate ? ` ${t('card.publishedAt')} ${formattedNewsDate}` : '';

  return `
    <p class="game-card__source-info">
      ${t('card.sourceLabel')}: <span class="game-card__source-badge">${getIconSvg('newspaper', { size: 12 })} ${sourceLabel}</span> • 
      <span class="game-card__source-title" title="${newsTitle}">${newsTitle}</span>${dateText} • 
      <a href="${newsUrl}" target="_blank" rel="noopener noreferrer" class="game-card__source-link" data-analytics-source="official_source" data-source-type="${newsSourceType}" data-date-status="${dateStatusVal}" data-game-id="${gameIdVal}">${t('card.readOriginal')}</a>
    </p>
  `;
}
