import { t, getVal } from '../i18n/index.js';
import { getState } from '../store/state.js';

// Render a game card from provided props only.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function formatLocalDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  
  const state = getState();
  const lang = state.settings?.lang || 'en';
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  
  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function render(game = {}, options = {}) {
  const name = escapeHtml(getVal(game.name) || 'Untitled Game');
  const developer = escapeHtml(game.developer || 'Unknown developer');
  const color = escapeAttr(game.color || '#4b5563');
  const statusCode = (game.status?.code || 'default');
  const statusLabel = escapeHtml(t(`statuses.${statusCode}`) || game.status?.label || 'Unknown');
  
  const currentSeason = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
  const currentSeasonDate = formatLocalDate(game.currentSeason?.startDate);
  
  const rawNextSeason = getVal(game.nextSeason?.name) || 'TBA';
  const nextSeasonClean = rawNextSeason.startsWith('Сезон') || rawNextSeason.startsWith('Season') || rawNextSeason.startsWith('Cycle') || rawNextSeason.startsWith('Цикл') || rawNextSeason === 'TBA'
    ? rawNextSeason
    : `${t('card.nextSeasonLabel')} ${rawNextSeason}`;
  const nextSeason = escapeHtml(nextSeasonClean);
  const nextSeasonDate = formatLocalDate(game.nextSeason?.startDate);
  
  const isNextSeasonEstimated = game.nextSeason?.verification === 'ai' || game.nextSeason?.verification === 'estimated';
  const nextSeasonDateBadge = isNextSeasonEstimated && nextSeasonDate
    ? ` <span class="verification-badge verification-badge--estimated" title="${escapeAttr(t('card.estimatedBadgeTitle'))}" style="margin-left: 0.5rem; cursor: help; vertical-align: middle;">▲ ${t('card.estimatedBadge')}</span>`
    : '';
  
  const countdown = options.countdown || {};
  const progressBar = options.progressBar || '';
  const website = escapeAttr(game.website || '#');
  const features = Array.isArray(getVal(game.features)) ? getVal(game.features) : [];
  
  const pillModifier = statusCode && statusCode !== 'default' ? ` game-card__pill--${escapeAttr(statusCode)}` : '';
  const featureItems = features
    .map((feature) => `
      <li class="game-card__feature-item">
        <span class="game-card__feature-check">✓</span>
        <span class="game-card__feature-text">${escapeHtml(getVal(feature))}</span>
      </li>
    `)
    .join('');

  let featuresHtml = '';
  if (features.length > 0) {
    featuresHtml = `
      <section class="game-card__panel game-card__panel--features">
        <div class="game-card__features-header">
          <span class="game-card__label"><span class="game-card__features-compass">🧭</span> ${t('card.featuresLabel')}</span>
        </div>
        <ul class="game-card__feature-grid">${featureItems}</ul>
      </section>
    `;
  }
  
  // Check if we have a valid next season date to countdown to
  const hasNextSeasonDate = game.nextSeason?.startDate && game.nextSeason.startDate !== '';
  const now = new Date();
  const targetDateObj = new Date(game.nextSeason?.startDate);
  const nextSeasonPassed = hasNextSeasonDate && !Number.isNaN(targetDateObj.getTime()) && targetDateObj.getTime() <= now.getTime();
  
  let countdownHtml = '';
  if (!hasNextSeasonDate) {
    countdownHtml = `
      <div class="game-card__countdown game-card__countdown--tba">
        <div class="game-card__tba-icon">📅</div>
        <span class="game-card__tba-label">${t('card.noLaunchDate')}</span>
      </div>
    `;
  } else if (nextSeasonPassed) {
    countdownHtml = `
      <div class="game-card__countdown game-card__countdown--launched">
        <div class="game-card__tba-icon">⚡</div>
        <span class="game-card__tba-label">${t('card.justLaunched')}</span>
      </div>
    `;
  } else {
    countdownHtml = `
      <div class="game-card__countdown">
        <div class="game-card__countdown-item"><strong>${countdown.days ?? 0}</strong><span>${t('card.days')}</span></div>
        <div class="game-card__countdown-item"><strong>${countdown.hours ?? 0}</strong><span>${t('card.hours')}</span></div>
        <div class="game-card__countdown-item"><strong>${countdown.minutes ?? 0}</strong><span>${t('card.minutes')}</span></div>
        <div class="game-card__countdown-item"><strong>${countdown.seconds ?? 0}</strong><span>${t('card.seconds')}</span></div>
      </div>
    `;
  }

  // On detail pages, "More details" links to the external source. On the dashboard, it links to our detail page.
  const isDetailPage = options.isDetailPage || false;
  const moreDetailsUrl = isDetailPage 
    ? (game.nextSeason?.sourceUrl || game.currentSeason?.sourceUrl || website)
    : `./games/${game.id}/index.html`;
  const moreDetailsTarget = isDetailPage ? 'target="_blank"' : '';
  const uppercaseStatusPill = `${statusLabel}`.toUpperCase();

  let sourceHtml = '';
  if (game.latestNews && game.latestNews.url) {
    const newsTitle = escapeHtml(game.latestNews.title || 'announcement');
    const newsUrl = escapeAttr(game.latestNews.url);
    const rawDate = game.latestNews.publishDate;
    const formattedNewsDate = rawDate ? formatLocalDate(rawDate) : '';
    const dateText = formattedNewsDate ? ` ${t('card.publishedAt')} ${formattedNewsDate}` : '';
    const sourceLabel = escapeHtml(game.latestNews.source || 'Official Source');
    sourceHtml = `
      <p class="game-card__source-info">
        ${t('card.sourceLabel')}: <span class="game-card__source-badge">📰 ${sourceLabel}</span> • 
        <span class="game-card__source-title" title="${newsTitle}">${newsTitle}</span>${dateText} • 
        <a href="${newsUrl}" target="_blank" class="game-card__source-link">${t('card.readOriginal')}</a>
      </p>
    `;
  }

  return `
    <article class="game-card" data-game-id="${escapeAttr(game.id || '')}" style="--game-color: ${color};">
      <div class="game-card__glow"></div>
      <div class="game-card__header">
        <div class="game-card__title-block">
          <span class="game-card__pill${pillModifier}">${uppercaseStatusPill}</span>
          <h2 class="game-card__title">${name}</h2>
          <p class="game-card__subtitle">${t('card.currentSeasonLabel')}: ${currentSeason}</p>
          ${sourceHtml}
        </div>
        <div class="game-card__next-season">
          <span class="game-card__label">${t('card.nextSeasonLabel')}</span>
          <div class="game-card__next-season-title">
            <strong>${nextSeason}</strong>
          </div>
          <p class="game-card__next-season-date">${nextSeasonDate || 'TBA'}${nextSeasonDateBadge}</p>
        </div>
      </div>

      <div class="game-card__body">
        <section class="game-card__panel game-card__panel--main">
          <span class="game-card__label">${t('card.currentSeasonLabel')}</span>
          <h3 class="game-card__season">
            ${currentSeason}
          </h3>
          <div class="game-card__meta-row">
            <span>${t('card.launchLabel')}</span>
            <span>${currentSeasonDate || 'TBA'}</span>
          </div>

          <div class="game-card__progress-block">
            <div class="game-card__progress-meta">
              <span>${t('card.progressLabel')}</span>
            </div>
            ${hasNextSeasonDate && !nextSeasonPassed ? progressBar : '<div class="game-card__progress-bar-placeholder"></div>'}
          </div>
        </section>

        <section class="game-card__panel game-card__panel--side">
          <span class="game-card__label">${t('card.countdownPrefix')} ${nextSeason}</span>
          ${countdownHtml}
          <div class="game-card__developer">
            <span class="game-card__label">${t('card.developerLabel')}</span>
            <strong>${developer}</strong>
          </div>
          <a class="game-card__link" href="${moreDetailsUrl}" ${moreDetailsTarget} rel="noopener noreferrer">${t('card.detailsBtn')}</a>
        </section>
      </div>

      ${featuresHtml}
    </article>
  `;
}

export function GameCard(game, options) {
  return render(game, options);
}
