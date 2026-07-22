import { t, getVal } from '../i18n/index.js';
import { getState } from '../store/state.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

function getShortName(name) {
  if (!name) return '';
  const parts = name.split(/[:—-]/);
  return parts[0].trim();
}

function formatFullDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date).toUpperCase();
}

export function render(games = []) {
  const items = Array.isArray(games) ? games : [];
  const state = getState();
  const lang = state.settings?.lang || 'en';

  if (!items.length) {
    return `<section class="timeline-card"><h3>${t('timeline.fallbackTitle')}</h3><p>${t('timeline.fallbackNoGames')}</p></section>`;
  }

  // 1. Setup Dynamic Time Window
  const currentYear = new Date().getFullYear();
  let minDate = new Date(`${currentYear}-01-01T00:00:00Z`).getTime();
  let maxDate = new Date(`${currentYear}-12-31T23:59:59Z`).getTime();

  items.forEach(g => {
    [g.currentSeason?.startDate, g.currentSeason?.endDate, g.nextSeason?.startDate, g.nextSeason?.endDate].forEach(d => {
      if (!d) return;
      const timeMs = new Date(d).getTime();
      if (!Number.isNaN(timeMs)) {
        if (timeMs < minDate) minDate = timeMs;
        if (timeMs > maxDate) maxDate = timeMs;
      }
    });
  });

  const startTimelineDate = new Date(minDate);
  startTimelineDate.setDate(1);
  startTimelineDate.setHours(0, 0, 0, 0);

  const endTimelineDate = new Date(maxDate);
  endTimelineDate.setMonth(endTimelineDate.getMonth() + 1, 0);
  endTimelineDate.setHours(23, 59, 59, 999);

  const startTimeline = startTimelineDate.getTime();
  const endTimeline = endTimelineDate.getTime();
  const totalDuration = Math.max(1, endTimeline - startTimeline);

  const getPercent = (dateStr) => {
    if (!dateStr) return 0;
    const time = new Date(dateStr).getTime();
    const percent = ((time - startTimeline) / totalDuration) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  // 2. NOW indicator
  const nowTime = new Date().getTime();
  const nowPercent = Math.max(0, Math.min(100, ((nowTime - startTimeline) / totalDuration) * 100));

  // 3. Dynamic Grid months header
  const activeMonths = [];
  const monthCursor = new Date(startTimelineDate);
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });

  while (monthCursor <= endTimelineDate) {
    activeMonths.push(monthFormatter.format(monthCursor).toUpperCase().slice(0, 3));
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  const monthsHeaderHtml = activeMonths
    .map(m => `<div class="timeline-map__month">${m}</div>`)
    .join('');

  // Grid lines mapping
  const gridLinesHtml = activeMonths
    .map(() => `<div class="timeline-map__grid-line"></div>`)
    .join('');

  // Helper for generating tooltip HTML
  const getTooltipHtml = (game, isNext = false) => {
    const gameName = escapeHtml(getVal(game.name));
    const seasonName = isNext 
      ? escapeHtml(getVal(game.nextSeason?.name) || 'TBA')
      : escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
    const start = isNext ? game.nextSeason?.startDate : game.currentSeason?.startDate;
    const end = isNext ? game.nextSeason?.endDate : (game.currentSeason?.endDate || game.nextSeason?.startDate);

    const startStr = start ? formatDate(start, lang) : 'TBA';
    const endStr = end ? formatDate(end, lang) : (isNext ? 'TBA' : t('timeline.ongoing') || 'Ongoing');

    let durationStr = '—';
    if (start && end) {
      const diff = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
      durationStr = `${diff} ${lang === 'ru' ? 'дней' : 'days'}`;
    }

    return `
      <div class="timeline-tooltip__title">${gameName}</div>
      <div class="timeline-tooltip__season">${seasonName}</div>
      <div class="timeline-tooltip__detail"><strong>${t('timeline.started') || 'Started'}:</strong> ${startStr}</div>
      <div class="timeline-tooltip__detail"><strong>${t('timeline.ends') || 'Ends'}:</strong> ${endStr}</div>
      <div class="timeline-tooltip__detail"><strong>${t('timeline.duration') || 'Duration'}:</strong> ${durationStr}</div>
    `.replace(/"/g, '&quot;');
  };

  // 4. Render rows
  const rowsHtml = items.map((game) => {
    const name = escapeHtml(getVal(game.name));
    const rawColor = String(game.color || '#6366f1');
    const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#6366f1';
    const logo = game.logo ? escapeHtml(game.logo) : '';

    const currentSeasonName = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
    const nextSeasonName = escapeHtml(getVal(game.nextSeason?.name) || 'TBA');

    // Calculate segments
    const currentStart = getPercent(game.currentSeason?.startDate);
    const currentEnd = getPercent(game.currentSeason?.endDate || game.nextSeason?.startDate);
    
    // Split into elapsed (opacity: 1) and remaining (opacity: 0.4) based on nowPercent
    const nowPos = nowPercent;
    let elapsedWidth = 0;
    let remainingWidth = 0;
    let remainingStart = currentStart;

    if (nowPos > currentStart) {
      const elapsedEnd = Math.min(currentEnd, nowPos);
      elapsedWidth = Math.max(0, elapsedEnd - currentStart);
      remainingStart = elapsedEnd;
      remainingWidth = Math.max(0, currentEnd - elapsedEnd);
    } else {
      remainingWidth = Math.max(0, currentEnd - currentStart);
    }

    const nextStart = getPercent(game.nextSeason?.startDate);
    let nextEnd = 100;
    if (game.nextSeason?.startDate) {
      const nextStartMs = new Date(game.nextSeason.startDate).getTime();
      const estEndMs = game.nextSeason.endDate 
        ? new Date(game.nextSeason.endDate).getTime() 
        : nextStartMs + 120 * 24 * 60 * 60 * 1000;
      nextEnd = getPercent(estEndMs);
    }
    const nextWidth = Math.max(0, nextEnd - nextStart);

    const formattedNextStart = game.nextSeason?.startDate ? formatDate(game.nextSeason.startDate, lang) : '';

    const logoHtml = logo 
      ? `<img src="./assets/logos/${logo}" alt="${name}" class="timeline-map__row-logo" />`
      : `<span class="timeline-map__row-emoji">${escapeHtml(game.icon || '🎮')}</span>`;

    const currentTooltip = getTooltipHtml(game, false);
    const nextTooltip = getTooltipHtml(game, true);

    const daysUntil = game.nextSeason?.startDate 
      ? (new Date(game.nextSeason.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      : Infinity;
    const isHype = daysUntil >= 0 && daysUntil <= 14;

    return `
      <div class="timeline-map__row" style="--game-color: ${color}">
        <div class="timeline-map__row-label">
          ${logoHtml}
          <span class="timeline-map__row-name">${name}</span>
        </div>
        <div class="timeline-map__row-track">
          <!-- Elapsed bar for current season -->
          ${elapsedWidth > 0 ? `
            <div class="timeline-bar timeline-bar--current-elapsed" style="left: ${currentStart}%; width: ${elapsedWidth}%;" data-tooltip="${currentTooltip}">
              <span class="timeline-bar__title">${escapeHtml(getShortName(getVal(game.currentSeason?.name)) || 'TBA')}</span>
            </div>
          ` : ''}
          <!-- Remaining bar for current season -->
          ${remainingWidth > 0 ? `
            <div class="timeline-bar timeline-bar--current-remaining" style="left: ${remainingStart}%; width: ${remainingWidth}%;" data-tooltip="${currentTooltip}">
              ${elapsedWidth === 0 ? `<span class="timeline-bar__title">${escapeHtml(getShortName(getVal(game.currentSeason?.name)) || 'TBA')}</span>` : ''}
            </div>
          ` : ''}
          <!-- Next season start circle node -->
          ${game.nextSeason?.startDate ? `
            <div class="timeline-circle ${isHype ? 'timeline-circle--hype' : ''}" style="left: ${nextStart}%;" data-tooltip="${nextTooltip}">
              <span class="timeline-circle__label">${escapeHtml(getShortName(getVal(game.nextSeason?.name)) || 'TBA')}</span>
              <span class="timeline-circle__date">${formattedNextStart}</span>
            </div>
          ` : ''}
          <!-- Future season dashed line -->
          ${game.nextSeason?.startDate ? `
            <div class="timeline-bar timeline-bar--future ${isHype ? 'timeline-bar--future-hype' : ''}" style="left: ${nextStart}%; width: ${nextWidth}%;" data-tooltip="${nextTooltip}"></div>
          ` : ''}
          <!-- Intersection dot for NOW line -->
          <div class="timeline-map__now-dot" style="left: ${nowPercent}%;"></div>
        </div>
      </div>
    `;
  }).join('\n');

  // 5. Render Upcoming Launches Cards
  const upcoming = items
    .filter(g => g.nextSeason?.startDate)
    .map(g => {
      const date = new Date(g.nextSeason.startDate);
      return { game: g, date };
    })
    .filter(({ date }) => date.getTime() > Date.now())
    .sort((a, b) => a.date - b.date);

  let upcomingLaunchesHtml = '';
  if (upcoming.length > 0) {
    const cardsHtml = upcoming.map(({ game, date }) => {
      const gameName = escapeHtml(getVal(game.name));
      const nextSeasonName = escapeHtml(getVal(game.nextSeason?.name) || 'TBA');
      const rawColor = String(game.color || '#6366f1');
      const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#6366f1';
      const formattedDate = formatFullDate(game.nextSeason.startDate, lang);
      
      const diff = date.getTime() - Date.now();
      const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      const hours = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
      const minutes = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));
      
      const daysUntil = game.nextSeason?.startDate 
        ? (new Date(game.nextSeason.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        : Infinity;
      const isHype = daysUntil >= 0 && daysUntil <= 14;
      
      return `
        <div class="upcoming-card ${isHype ? 'upcoming-card--hype' : ''}" style="--game-color: ${color}" data-game-countdown="${game.id}">
          <div class="upcoming-card__date-wrapper">
            <span class="upcoming-card__date">${formattedDate}</span>
            ${isHype ? `<span class="upcoming-card__hype-badge">${t('timeline.hype')}</span>` : ''}
          </div>
          <h4 class="upcoming-card__game-name">${gameName}</h4>
          <div class="upcoming-card__season-name">${nextSeasonName}</div>
          
          <div class="upcoming-card__countdown">
            <div class="upcoming-card__countdown-item"><strong data-countdown="days">${days}</strong><span>${t('card.days') || 'days'}</span></div>
            <div class="upcoming-card__countdown-item"><strong data-countdown="hours">${hours}</strong><span>${t('card.hours') || 'hours'}</span></div>
            <div class="upcoming-card__countdown-item"><strong data-countdown="minutes">${minutes}</strong><span>${t('card.minutes') || 'min'}</span></div>
          </div>
        </div>
      `;
    }).join('\n');

    upcomingLaunchesHtml = `
      <section class="upcoming-launches">
        <div class="upcoming-launches__header">
          <h3 class="upcoming-launches__title">${t('timeline.upcomingTitle') || 'UPCOMING LAUNCHES'}</h3>
          <p class="upcoming-launches__caption">${t('timeline.upcomingSubtitle') || 'Next season starts across all games'}</p>
        </div>
        <div class="upcoming-launches__grid">
          ${cardsHtml}
        </div>
      </section>
    `;
  }

  const startYear = startTimelineDate.getFullYear();
  const endYear = endTimelineDate.getFullYear();
  const yearBadgeText = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;

  // 6. Main timeline structure output
  return `
    <div class="timeline-view-wrapper">
      <section class="timeline-card">
        <div class="timeline-card__header">
          <div>
            <h3 class="timeline-card__title">${t('timeline.title')}</h3>
            <p class="timeline-card__caption">${t('timeline.subtitle')}</p>
          </div>
          <div class="timeline-card__year-badge">${yearBadgeText}</div>
        </div>
        
        <div class="timeline-map__scroll-container">
          <div class="timeline-map__grid">
            <!-- Month labels -->
            <div class="timeline-map__months">
              ${monthsHeaderHtml}
            </div>
            
            <!-- Background grid lines -->
            <div class="timeline-map__grid-lines">
              ${gridLinesHtml}
            </div>
            
            <!-- Rows container -->
            <div class="timeline-map__rows">
              ${rowsHtml}
            </div>
            
            <!-- Vertical NOW line marker -->
            <div class="timeline-map__now-line" style="left: calc(180px + (100% - 180px) * ${nowPercent / 100});">
              <span class="timeline-map__now-badge">${t('timeline.now')}</span>
            </div>
          </div>
        </div>
        <div class="timeline-card__watermark">
          <img src="./assets/logo.png" alt="SeasonForge Logo" class="timeline-card__watermark-logo" />
          <span class="timeline-card__watermark-dot">•</span>
          <span class="timeline-card__watermark-text">seasonforge.online</span>
        </div>
      </section>

      <!-- Bottom launches section -->
      ${upcomingLaunchesHtml}

      <!-- Dynamic tooltip element -->
      <div id="timeline-tooltip" class="timeline-tooltip" style="display: none;"></div>
    </div>
  `;
}

export function Timeline(games) {
  return render(games);
}
