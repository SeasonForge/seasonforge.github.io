/**
 * SeasonForge Mobile Events Timeline Component
 * Dedicated UI presentation layer for Mobile viewport (<= 900px).
 * Encapsulates touch momentum horizontal scrolling, 1-column urgent cards stack, and touch-optimized tap targets.
 */

import { t, getVal } from '../../i18n/index.js';
import { escapeHtml, escapeAttr } from '../../utils/helpers.js';
import { getIconSvg } from '../../utils/icons.js';
import { TYPE_ICONS, GAME_META, TYPE_LABELS, cleanSourceUrl, getSourceInfo, assignTracks } from '../../utils/events.js';

export function render(eventsList = [], gamesList = [], { lang = 'en', activeGameId = null, filterGames = null, basePath = './' } = {}) {
  const isEn = lang === 'en';
  const localizedEventsList = eventsList.filter(e => !e.locales || (Array.isArray(e.locales) && e.locales.includes(lang)));
  const now = new Date();
  const cleanBase = typeof basePath === 'string' && basePath.endsWith('/') ? basePath : (typeof basePath === 'string' ? `${basePath}/` : './');
  const seasonsHref = cleanBase;
  const eventsHref = `${cleanBase}events/`;

  // Timeline Window: 7 days before today to 45 days ahead (~7 weeks)
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 45);
  const totalWindowMs = windowEnd.getTime() - windowStart.getTime();

  const nowMs = now.getTime();
  const nowPercent = Math.max(0, Math.min(100, ((nowMs - windowStart.getTime()) / totalWindowMs) * 100));

  const startMonthStr = windowStart.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { month: 'short' }).toUpperCase();
  const endMonthStr = windowEnd.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { month: 'short' }).toUpperCase();
  const yearStr = windowStart.getFullYear();
  const dateRangeBadge = `${startMonthStr}–${endMonthStr} ${yearStr}`;

  // Days list for timeline grid
  const days = [];
  const curr = new Date(windowStart);
  while (curr <= windowEnd) {
    days.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

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

  // Rows by Game
  const targetGames = Object.keys(GAME_META);
  const rowsHtml = targetGames.map((gameId) => {
    if (filterGames && filterGames.size > 0 && !filterGames.has(gameId)) {
      return '';
    }

    const meta = GAME_META[gameId];
    const gameEvents = localizedEventsList.filter(e => e.gameId === gameId);

    const overlappingEvents = gameEvents.filter(event => {
      const eStart = new Date(event.startDate);
      const eEnd = event.endDate ? new Date(event.endDate) : new Date(eStart.getTime() + 7 * 86400000);
      return !(eEnd.getTime() < windowStart.getTime() || eStart.getTime() > windowEnd.getTime());
    });

    const packedEvents = assignTracks(overlappingEvents);
    const subTracksCount = packedEvents.length > 0 ? Math.max(...packedEvents.map(e => e.trackIndex)) + 1 : 1;
    const trackHeight = subTracksCount === 1 ? 28 : (subTracksCount * 24 + (subTracksCount - 1) * 3 + 4);

    const barsHtml = packedEvents.map(event => {
      const eStart = new Date(event.startDate);
      const eEnd = event.endDate ? new Date(event.endDate) : new Date(eStart.getTime() + 7 * 86400000);

      const clampedStart = Math.max(windowStart.getTime(), eStart.getTime());
      const clampedEnd = Math.min(windowEnd.getTime(), eEnd.getTime());

      const leftPct = Math.max(0, ((clampedStart - windowStart.getTime()) / totalWindowMs) * 100);
      const rawWidthPct = ((clampedEnd - clampedStart) / totalWindowMs) * 100;
      const widthPct = Math.max(4.5, rawWidthPct);

      const isIconOnly = widthPct < 8;
      const widthClass = isIconOnly ? 'is-icon-only' : 'is-full';
      const topPx = subTracksCount === 1 ? 2 : (2 + event.trackIndex * 27);

      const typeKey = event.type || 'event';
      const typeIcon = TYPE_ICONS[typeKey] || 'calendar';
      const typeLabel = TYPE_LABELS[typeKey] ? (TYPE_LABELS[typeKey][lang] || TYPE_LABELS[typeKey].en) : (isEn ? 'Event' : 'Событие');

      const title = getVal(event.title, lang) || (isEn ? event.title_en : event.title_ru) || event.title_en || event.title_ru || (typeof event.title === 'string' ? event.title : 'Event');
      const description = getVal(event.description, lang) || (isEn ? event.description_en : event.description_ru) || '';

      const exactDatesStr = event.endDate
        ? `${eStart.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })} — ${eEnd.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })}`
        : `${isEn ? 'Started:' : 'Старт:'} ${eStart.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })} (${isEn ? 'Active / Ongoing' : 'Активно'})`;

      const isUpcoming = eStart.getTime() > nowMs;
      const isLive = eStart.getTime() <= nowMs && (!event.endDate || eEnd.getTime() >= nowMs);

      let rewardsBadges = '';
      if (Array.isArray(event.rewards) && event.rewards.length > 0) {
        const visibleRewards = event.rewards.slice(0, 3);
        const extraCount = event.rewards.length - 3;
        rewardsBadges = visibleRewards.map(r => `<span class="events-tooltip__reward-chip">${escapeHtml(typeof r === 'object' ? (r[lang] || r.en || r.ru) : r)}</span>`).join('');
        if (extraCount > 0) {
          rewardsBadges += `<span class="events-tooltip__reward-chip events-tooltip__reward-chip--more">+${extraCount}</span>`;
        }
      }

      return `
        <div class="events-timeline__bar ${isUpcoming ? 'is-upcoming' : 'is-live'} ${widthClass} type-${escapeAttr(typeKey)}" 
             style="left: ${leftPct}%; width: ${widthPct}%; top: ${topPx}px; height: 24px; --event-color: ${meta.color};"
             tabindex="0">
          <span class="events-timeline__bar-icon">${getIconSvg(typeIcon, { size: 13 })}</span>
          <span class="events-timeline__bar-title">${escapeHtml(title)}</span>
          ${isUpcoming ? '<div class="events-timeline__dotted-trail"></div>' : ''}

          <!-- Mobile Tap-friendly Tooltip -->
          <div class="events-timeline__tooltip tooltip--bottom tooltip--align-center" role="tooltip">
            <div class="events-tooltip__header">
              <span class="events-tooltip__type-badge" style="--badge-accent: ${meta.color};">
                ${getIconSvg(typeIcon, { size: 11 })}
                <span>${escapeHtml(typeLabel)}</span>
              </span>
              <span class="events-tooltip__status-badge ${isLive ? 'status--live' : 'status--upcoming'}">
                ${isLive ? (isEn ? 'LIVE' : 'АКТИВНО') : (isEn ? 'SOON' : 'СКОРО')}
              </span>
            </div>
            <h4 class="events-tooltip__title">${escapeHtml(title)}</h4>
            <p class="events-tooltip__game">${escapeHtml(meta.name)}</p>
            ${description ? `<p class="events-tooltip__desc">${escapeHtml(description)}</p>` : ''}
            <div class="events-tooltip__meta">
              <div class="events-tooltip__meta-row">
                <span class="events-tooltip__meta-icon">${getIconSvg('calendar', { size: 12 })}</span>
                <span>${escapeHtml(exactDatesStr)}</span>
              </div>
            </div>
            ${rewardsBadges ? `
              <div class="events-tooltip__rewards">
                <span class="events-tooltip__rewards-title">${isEn ? 'Rewards:' : 'Награды:'}</span>
                <div class="events-tooltip__rewards-list">${rewardsBadges}</div>
              </div>
            ` : ''}
            ${event.sourceUrl ? (() => {
              const cleanedUrl = cleanSourceUrl(event.sourceUrl, gameId);
              const sourceInfo = getSourceInfo(cleanedUrl, isEn);
              return `
                <a href="${escapeAttr(cleanedUrl)}" target="_blank" rel="noopener noreferrer" class="events-tooltip__link">
                  <span class="events-tooltip__link-label">${escapeHtml(sourceInfo.label)}</span>
                  ${getIconSvg(sourceInfo.icon, { size: 12 })}
                </a>
              `;
            })() : ''}
          </div>
        </div>
      `;
    }).join('\n');

    return `
      <div class="events-timeline__row" data-game-id="${escapeAttr(gameId)}" style="min-height: ${trackHeight + 8}px;">
        <a href="${cleanBase}games/${escapeAttr(gameId)}/" class="events-timeline__game-label" style="--game-accent: ${meta.color};" title="${escapeAttr(meta.name)}">
          <span class="events-timeline__game-icon">${getIconSvg(meta.icon, { size: 14 })}</span>
          <span class="events-timeline__game-name">${escapeHtml(meta.shortName || meta.name)}</span>
        </a>
        <div class="events-timeline__track" style="height: ${trackHeight}px;">
          ${barsHtml || `<div class="events-timeline__track-empty">${isEn ? 'No events' : 'Нет событий'}</div>`}
        </div>
      </div>
    `;
  }).join('\n');

  // Mobile Urgent Cards Grid (1 Column Touch Stack, ordered by nearest urgency)
  const urgentEvents = [...localizedEventsList].filter(e => {
    if (filterGames && filterGames.size > 0 && !filterGames.has(e.gameId)) return false;
    if (!e.endDate) return false;
    const eEnd = new Date(e.endDate).getTime();
    return eEnd >= nowMs;
  }).sort((a, b) => {
    const aStart = new Date(a.startDate).getTime();
    const bStart = new Date(b.startDate).getTime();
    const aEnd = a.endDate ? new Date(a.endDate).getTime() : Infinity;
    const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;

    const aTarget = (aStart <= nowMs && aEnd >= nowMs) ? aEnd : aStart;
    const bTarget = (bStart <= nowMs && bEnd >= nowMs) ? bEnd : bStart;

    return aTarget - bTarget;
  }).slice(0, 8);

  const urgentCardsHtml = urgentEvents.length > 0 ? urgentEvents.map(event => {
    const meta = GAME_META[event.gameId] || GAME_META['path-of-exile'];
    const title = getVal(event.title, lang) || (isEn ? event.title_en : event.title_ru) || event.title_en || event.title_ru || (typeof event.title === 'string' ? event.title : 'Event');
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
    }

    const diffMs = Math.max(0, targetTime - nowMs);
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    return `
      <div class="urgent-event-card ${badgeClass} urgent-event-card-mobile" style="--card-game-color: ${meta.color};">
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
  }).join('\n') : `
    <div class="events-timeline__track-empty" style="padding: 1.75rem 1rem; text-align: center; color: var(--text-muted, #94a3b8); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: var(--radius-sm, 10px);">
      ${isEn ? 'No urgent events ending soon.' : 'Нет срочных событий.'}
    </div>
  `;

  return `
    <div class="events-dashboard-container events-dashboard-mobile">
      
      <!-- Main Live Events Timeline Card -->
      <section class="timeline-card events-timeline-card">
        <div class="timeline-card__header">
          <div>
            <h3 class="timeline-card__title">${isEn ? 'LIVE EVENTS TIMELINE' : 'ТАЙМЛАЙН СОБЫТИЙ И ИВЕНТОВ'}</h3>
            <p class="timeline-card__caption">${isEn ? 'Swipe horizontally to view all upcoming events' : 'Свайпайте вправо/влево для просмотра всех событий'}</p>
          </div>
          
          <div class="timeline-card__header-actions">
            <!-- Seamless Integrated Switcher embedded right inside Card Header -->
            <div class="timeline-integrated-switcher" role="tablist">
              <a href="${seasonsHref}" class="timeline-switcher-tab" id="tab-mode-seasons" data-mode="seasons" role="tab" aria-selected="false">
                <span class="switcher-icon">${getIconSvg('gear-sun', { size: 15 })}</span>
                <span class="switcher-text">${isEn ? 'SEASONS' : 'СЕЗОНЫ'}</span>
              </a>
              <a href="${eventsHref}" class="timeline-switcher-tab active" id="tab-mode-events" data-mode="events" role="tab" aria-selected="true">
                <span class="switcher-icon">${getIconSvg('layers', { size: 15 })}</span>
                <span class="switcher-text">${isEn ? 'EVENTS' : 'ИВЕНТЫ'}</span>
              </a>
              <div class="timeline-switcher-slider is-events"></div>
            </div>

            <div class="timeline-card__year-badge">${escapeHtml(dateRangeBadge)}</div>
          </div>
        </div>

        <div class="timeline-map__scroll-container events-timeline-scroll-mobile">
          <div class="events-timeline__grid events-timeline-grid-mobile">
            
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
            <div class="events-timeline__today-line" style="left: calc(130px + (100% - 130px) * ${nowPercent / 100});">
              <span class="events-timeline__today-badge">${isEn ? 'TODAY' : 'СЕГОДНЯ'}</span>
            </div>

          </div>
        </div>
      </section>

      <!-- Bottom Section: UPCOMING & ENDING SOON -->
      <section class="upcoming-launches events-urgent-section">
        <div class="upcoming-launches__header">
          <h3 class="upcoming-launches__title">${isEn ? 'UPCOMING & ENDING SOON' : 'БЛИЖАЙШИЕ И СКОРО ЗАВЕРШАЮЩИЕСЯ'}</h3>
        </div>
        <div class="urgent-events-grid urgent-events-grid-mobile">
          ${urgentCardsHtml}
        </div>
      </section>

    </div>
  `.trim();
}
