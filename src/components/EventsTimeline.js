import { t, getVal } from '../i18n/index.js';
import { getState } from '../store/state.js';
import { escapeHtml, escapeAttr } from '../utils/helpers.js';
import { getIconSvg } from '../utils/icons.js';
import { calculateCountdown } from '../utils/countdown.js';

const TYPE_ICONS = {
  twitch_drops: 'twitch',
  ptr: 'flask',
  race: 'trophy',
  collab: 'users',
  login: 'gift',
  event: 'calendar'
};

const GAME_META = {
  'path-of-exile': { name: 'Path of Exile 1', icon: 'skull', color: '#d97706', accentBg: 'rgba(217, 119, 6, 0.15)', borderColor: 'rgba(217, 119, 6, 0.4)' },
  'path-of-exile-2': { name: 'Path of Exile 2', icon: 'sparkles', color: '#8b5cf6', accentBg: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.4)' },
  'diablo-4': { name: 'Diablo IV', icon: 'flame', color: '#ef4444', accentBg: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' },
  'last-epoch': { name: 'Last Epoch', icon: 'hourglass', color: '#f59e0b', accentBg: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' },
  'torchlight-infinite': { name: 'Torchlight: Infinite', icon: 'zap', color: '#06b6d4', accentBg: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.4)' }
};

export function renderEventsTimeline(eventsList = [], gamesList = [], { lang = 'en', activeGameId = null, filterGames = null, basePath = './' } = {}) {
  const isEn = lang === 'en';
  const now = new Date();
  const cleanBase = typeof basePath === 'string' && basePath.endsWith('/') ? basePath : (typeof basePath === 'string' ? `${basePath}/` : './');
  const seasonsHref = cleanBase;
  const eventsHref = `${cleanBase}events/`;

  // 1. Determine Timeline Window: 7 days before today to 35 days ahead (approx 6 weeks / 42 days)
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 35);
  const totalWindowMs = windowEnd.getTime() - windowStart.getTime();

  const nowMs = now.getTime();
  const nowPercent = Math.max(0, Math.min(100, ((nowMs - windowStart.getTime()) / totalWindowMs) * 100));

  // Date range badge label (e.g. "AUG–SEP 2026")
  const startMonthStr = windowStart.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { month: 'short' }).toUpperCase();
  const endMonthStr = windowEnd.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { month: 'short' }).toUpperCase();
  const yearStr = windowStart.getFullYear();
  const dateRangeBadge = `${startMonthStr}–${endMonthStr} ${yearStr}`;

  // 2. Generate Days & Months Header for the grid
  const days = [];
  const curr = new Date(windowStart);
  while (curr <= windowEnd) {
    days.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  // Group days by month for top label
  const monthSpans = [];
  let currentMonthIndex = -1;
  let currentMonthYear = '';
  let countInMonth = 0;

  days.forEach((d, idx) => {
    const my = `${d.getFullYear()}-${d.getMonth()}`;
    if (my !== currentMonthYear) {
      if (currentMonthIndex >= 0) {
        monthSpans[currentMonthIndex].count = countInMonth;
      }
      currentMonthYear = my;
      currentMonthIndex = monthSpans.length;
      countInMonth = 1;
      monthSpans.push({
        label: d.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { month: 'short', year: 'numeric' }).toUpperCase(),
        count: 1
      });
    } else {
      countInMonth++;
    }
    if (idx === days.length - 1 && currentMonthIndex >= 0) {
      monthSpans[currentMonthIndex].count = countInMonth;
    }
  });

  const monthsHeaderHtml = monthSpans.map(m => {
    const widthPct = (m.count / days.length) * 100;
    return `<div class="events-timeline__month-label" style="width: ${widthPct}%;">${escapeHtml(m.label)}</div>`;
  }).join('');

  const daysHeaderHtml = days.map((d) => {
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const dayNum = d.getDate();
    const isMajor = dayNum === 1 || dayNum % 5 === 0 || isToday;
    return `
      <div class="events-timeline__day-cell ${isToday ? 'is-today' : ''} ${isMajor ? 'is-major' : ''}">
        <span class="events-timeline__day-num">${dayNum}</span>
      </div>
    `;
  }).join('');

  // 3. Build Rows by Game
  const targetGames = Object.keys(GAME_META);
  
  const rowsHtml = targetGames.map(gameId => {
    // If game filter is active, check visibility
    if (filterGames && filterGames.size > 0 && !filterGames.has(gameId)) {
      return '';
    }

    const meta = GAME_META[gameId];
    const gameEvents = eventsList.filter(e => e.gameId === gameId);

    // Render event bars for this game
    const barsHtml = gameEvents.map(event => {
      const eStart = new Date(event.startDate);
      const eEnd = event.endDate ? new Date(event.endDate) : new Date(eStart.getTime() + 7 * 86400000);

      // Check if event overlaps our window
      if (eEnd.getTime() < windowStart.getTime() || eStart.getTime() > windowEnd.getTime()) {
        return '';
      }

      const clampedStart = Math.max(windowStart.getTime(), eStart.getTime());
      const clampedEnd = Math.min(windowEnd.getTime(), eEnd.getTime());

      const leftPct = ((clampedStart - windowStart.getTime()) / totalWindowMs) * 100;
      const widthPct = Math.max(12, ((clampedEnd - clampedStart) / totalWindowMs) * 100);

      const typeKey = event.type || 'event';
      const typeIcon = TYPE_ICONS[typeKey] || 'calendar';
      const title = isEn ? (event.title_en || event.title_ru) : (event.title_ru || event.title_en);

      const dateStr = `${eStart.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { month: 'short', day: 'numeric' })} – ${eEnd.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { month: 'short', day: 'numeric' })}`;

      const isUpcoming = eStart.getTime() > nowMs;
      const isLive = eStart.getTime() <= nowMs && eEnd.getTime() >= nowMs;

      return `
        <div class="events-timeline__bar ${isUpcoming ? 'is-upcoming' : 'is-live'} type-${escapeAttr(typeKey)}" 
             style="left: ${leftPct}%; width: ${widthPct}%; --event-color: ${meta.color};"
             data-tooltip="${escapeAttr(title)} (${dateStr})">
          <div class="events-timeline__bar-content">
            <span class="events-timeline__bar-icon">${getIconSvg(typeIcon, { size: 13 })}</span>
            <div class="events-timeline__bar-text">
              <span class="events-timeline__bar-title">${escapeHtml(title)}</span>
              <span class="events-timeline__bar-dates">${escapeHtml(dateStr)}</span>
            </div>
          </div>
          ${isUpcoming ? '<div class="events-timeline__dotted-trail"></div>' : ''}
        </div>
      `;
    }).join('\n');

    return `
      <div class="events-timeline__row" data-game-id="${escapeAttr(gameId)}">
        <div class="events-timeline__game-label" style="--game-accent: ${meta.color};">
          <span class="events-timeline__game-icon">${getIconSvg(meta.icon, { size: 16 })}</span>
          <span class="events-timeline__game-name">${escapeHtml(meta.name)}</span>
        </div>
        <div class="events-timeline__track">
          ${barsHtml || `<div class="events-timeline__track-empty">${isEn ? 'No scheduled events in this period' : 'Нет событий в этом периоде'}</div>`}
        </div>
      </div>
    `;
  }).join('\n');

  // 4. Build Bottom Section: "UPCOMING & ENDING SOON" Cards (Sorted by urgency)
  const urgentEvents = [...eventsList].filter(e => {
    if (filterGames && filterGames.size > 0 && !filterGames.has(e.gameId)) return false;
    return true;
  }).sort((a, b) => {
    // Live events ending soonest come first, then upcoming starting soonest
    const aEnd = a.endDate ? new Date(a.endDate).getTime() : Infinity;
    const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
    const aStart = new Date(a.startDate).getTime();
    const bStart = new Date(b.startDate).getTime();

    const aIsLive = aStart <= nowMs && aEnd >= nowMs;
    const bIsLive = bStart <= nowMs && bEnd >= nowMs;

    if (aIsLive && !bIsLive) return -1;
    if (!aIsLive && bIsLive) return 1;
    if (aIsLive && bIsLive) return aEnd - bEnd;
    return aStart - bStart;
  }).slice(0, 6);

  const urgentCardsHtml = urgentEvents.map(event => {
    const meta = GAME_META[event.gameId] || GAME_META['path-of-exile'];
    const title = isEn ? (event.title_en || event.title_ru) : (event.title_ru || event.title_en);
    const gameName = meta.name;

    const eStart = new Date(event.startDate).getTime();
    const eEnd = event.endDate ? new Date(event.endDate).getTime() : null;

    let badgeText = isEn ? 'STARTING SOON' : 'СКОРО НАЧНЁТСЯ';
    let badgeClass = 'badge--starting';
    let targetTime = eStart;

    if (eStart <= nowMs && eEnd && nowMs <= eEnd) {
      const hoursLeft = (eEnd - nowMs) / 3600000;
      if (hoursLeft <= 48) {
        badgeText = isEn ? 'ENDS SOON' : 'СКОРО КОНЕЦ';
        badgeClass = 'badge--ending';
      } else {
        badgeText = isEn ? 'ACTIVE' : 'АКТИВНО';
        badgeClass = 'badge--active';
      }
      targetTime = eEnd;
    } else if (eEnd && nowMs > eEnd) {
      badgeText = isEn ? 'ENDED' : 'ЗАВЕРШЕНО';
      badgeClass = 'badge--ended';
    }

    const diffMs = Math.max(0, targetTime - nowMs);
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    return `
      <div class="urgent-event-card ${badgeClass}" style="--card-game-color: ${meta.color};">
        <div class="urgent-event-card__header">
          <span class="urgent-event-card__badge ${badgeClass}">${escapeHtml(badgeText)}</span>
        </div>
        <h4 class="urgent-event-card__title">${escapeHtml(title)}</h4>
        <div class="urgent-event-card__game">${escapeHtml(gameName)}</div>

        <div class="urgent-event-card__countdown" data-countdown-target="${targetTime}">
          <div class="urgent-countdown-item">
            <strong data-countdown="days">${days}</strong>
            <span>${isEn ? 'DAYS' : 'ДНЕЙ'}</span>
          </div>
          <div class="urgent-countdown-item">
            <strong data-countdown="hours">${hours}</strong>
            <span>${isEn ? 'HOURS' : 'ЧАСОВ'}</span>
          </div>
          <div class="urgent-countdown-item">
            <strong data-countdown="minutes">${mins}</strong>
            <span>${isEn ? 'MINS' : 'МИН'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('\n');

  return `
    <div class="events-dashboard-container">
      
      <!-- Segmented Mode Switcher (SEASONS | EVENTS) -->
      <div class="timeline-mode-switcher-bar">
        <div class="timeline-mode-switcher">
          <a href="${seasonsHref}" class="timeline-mode-tab" id="tab-mode-seasons">
            ${getIconSvg('calendar', { size: 15 })}
            <span>${isEn ? 'SEASONS' : 'СЕЗОНЫ'}</span>
          </a>
          <a href="${eventsHref}" class="timeline-mode-tab active" id="tab-mode-events">
            ${getIconSvg('gift', { size: 15 })}
            <span>${isEn ? 'EVENTS' : 'ИВЕНТЫ'}</span>
          </a>
        </div>
        <div class="timeline-card__year-badge">${escapeHtml(dateRangeBadge)}</div>
      </div>

      <!-- Main Live Events Timeline Card -->
      <section class="timeline-card events-timeline-card">
        <div class="timeline-card__header">
          <div>
            <h3 class="timeline-card__title">${isEn ? 'LIVE EVENTS TIMELINE' : 'ТАЙМЛАЙН СОБЫТИЙ И ИВЕНТОВ'}</h3>
            <p class="timeline-card__caption">${isEn ? 'All events, Twitch Drops, PTR and collabs across games on timeline' : 'Все события, Twitch Drops, PTR и коллаборации на одной шкале'}</p>
          </div>
        </div>

        <div class="timeline-map__scroll-container">
          <div class="events-timeline__grid">
            
            <!-- Months Header -->
            <div class="events-timeline__months-bar">
              <div class="events-timeline__offset-blank"></div>
              <div class="events-timeline__months-track">
                ${monthsHeaderHtml}
              </div>
            </div>

            <!-- Days Numbers Header -->
            <div class="events-timeline__days-bar">
              <div class="events-timeline__offset-blank"></div>
              <div class="events-timeline__days-track">
                ${daysHeaderHtml}
              </div>
            </div>

            <!-- Game Tracks / Rows -->
            <div class="events-timeline__rows">
              ${rowsHtml}
            </div>

            <!-- Vertical TODAY Line -->
            <div class="events-timeline__today-line" style="left: calc(180px + (100% - 180px) * ${nowPercent / 100});">
              <span class="events-timeline__today-badge">${isEn ? 'TODAY' : 'СЕГОДНЯ'}</span>
            </div>

          </div>
        </div>
      </section>

      <!-- Bottom Section: UPCOMING & ENDING SOON -->
      <section class="upcoming-launches events-urgent-section">
        <div class="upcoming-launches__header">
          <h3 class="upcoming-launches__title">${isEn ? 'UPCOMING & ENDING SOON' : 'БЛИЖАЙШИЕ И СКОРО ЗАВЕРШАЮЩИЕСЯ'}</h3>
          <p class="upcoming-launches__caption">${isEn ? "Don't miss important limited-time rewards and events" : 'Не пропустите важные награды и дедлайны активностей'}</p>
        </div>
        <div class="urgent-events-grid">
          ${urgentCardsHtml}
        </div>
      </section>

    </div>
  `.trim();
}
