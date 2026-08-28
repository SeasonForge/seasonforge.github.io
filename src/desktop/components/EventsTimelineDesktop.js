/**
 * SeasonForge Desktop Events Timeline Component
 * Dedicated UI presentation layer for Desktop viewport (>= 901px).
 * Encapsulates interactive mouse hover states, smart auto-flip rich tooltips, and 3-column urgent cards grid.
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

  // 1. Determine Timeline Window: 7 days before today to 45 days ahead (~7 weeks)
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 45);
  const totalWindowMs = windowEnd.getTime() - windowStart.getTime();

  const nowMs = now.getTime();
  const nowPercent = Math.max(0, Math.min(100, ((nowMs - windowStart.getTime()) / totalWindowMs) * 100));

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
        shortLabel: d.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { month: 'short' }).toUpperCase(),
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
    const displayLabel = widthPct < 12 ? m.shortLabel : m.label;
    return `<div class="events-timeline__month-label" style="width: ${widthPct}%;">${escapeHtml(displayLabel)}</div>`;
  }).join('');

  const daysHeaderHtml = days.map((d) => {
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const dayNum = d.getDate();
    const isMajor = dayNum === 1 || dayNum % 5 === 0 || isToday;

    return `
      <div class="events-timeline__day-cell ${isToday ? 'is-today' : ''} ${isMajor ? 'is-major' : 'is-minor'}" title="${d.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })}">
        ${isMajor ? `<span class="events-timeline__day-num">${dayNum}</span>` : '<span class="events-timeline__day-tick"></span>'}
      </div>
    `;
  }).join('');

  // 3. Build Rows by Game
  const targetGames = Object.keys(GAME_META);
  const rowsHtml = targetGames.map((gameId, gameIndex) => {
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

    const isUpperRow = gameIndex <= 1;

    const barsHtml = packedEvents.map(event => {
      const eStart = new Date(event.startDate);
      const eEnd = event.endDate ? new Date(event.endDate) : new Date(eStart.getTime() + 7 * 86400000);

      const clampedStart = Math.max(windowStart.getTime(), eStart.getTime());
      const clampedEnd = Math.min(windowEnd.getTime(), eEnd.getTime());

      const leftPct = Math.max(0, ((clampedStart - windowStart.getTime()) / totalWindowMs) * 100);
      const rawWidthPct = ((clampedEnd - clampedStart) / totalWindowMs) * 100;
      const widthPct = Math.max(7.5, rawWidthPct);

      const isIconOnly = widthPct < 5;
      const widthClass = isIconOnly ? 'is-icon-only' : 'is-full';

      const topPx = subTracksCount === 1 ? 2 : (2 + event.trackIndex * 27);

      const typeKey = event.type || 'event';
      const typeIcon = TYPE_ICONS[typeKey] || 'calendar';
      const typeLabel = TYPE_LABELS[typeKey] ? (TYPE_LABELS[typeKey][lang] || TYPE_LABELS[typeKey].en) : (isEn ? 'Event' : 'Событие');

      const title = getVal(event.title, lang) || (isEn ? event.title_en : event.title_ru) || event.title_en || event.title_ru || (typeof event.title === 'string' ? event.title : 'Event');
      const description = getVal(event.description, lang) || (isEn ? event.description_en : event.description_ru) || '';

      const exactDatesStr = event.endDate
        ? `${eStart.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — ${eEnd.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
        : `${isEn ? 'Started:' : 'Старт:'} ${eStart.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })} (${isEn ? 'Active / Ongoing' : 'Активно'})`;

      const isUpcoming = eStart.getTime() > nowMs;
      const isLive = eStart.getTime() <= nowMs && (!event.endDate || eEnd.getTime() >= nowMs);

      // Smart Auto-Flip Tooltip
      const vAlignClass = isUpperRow ? 'tooltip--bottom' : 'tooltip--top';
      let hAlignClass = 'tooltip--align-center';
      if (leftPct < 15) {
        hAlignClass = 'tooltip--align-left';
      } else if (leftPct > 70) {
        hAlignClass = 'tooltip--align-right';
      }

      let rewardsBadges = '';
      if (Array.isArray(event.rewards) && event.rewards.length > 0) {
        const visibleRewards = event.rewards.slice(0, 4);
        const extraCount = event.rewards.length - 4;
        rewardsBadges = visibleRewards.map(r => `<span class="events-tooltip__reward-chip">${escapeHtml(typeof r === 'object' ? (r[lang] || r.en || r.ru) : r)}</span>`).join('');
        if (extraCount > 0) {
          rewardsBadges += `<span class="events-tooltip__reward-chip events-tooltip__reward-chip--more">+${extraCount}</span>`;
        }
      }

      return `
        <div class="events-timeline__bar ${isUpcoming ? 'is-upcoming' : 'is-live'} ${widthClass} type-${escapeAttr(typeKey)}" 
             data-event-id="${escapeAttr(event.id)}"
             style="left: ${leftPct}%; width: ${widthPct}%; top: ${topPx}px; height: 24px; --event-color: ${meta.color};"
             tabindex="0">
          <span class="events-timeline__bar-icon">${getIconSvg(typeIcon, { size: 14 })}</span>
          <span class="events-timeline__bar-title">${escapeHtml(title)}</span>
          ${isUpcoming ? '<div class="events-timeline__dotted-trail"></div>' : ''}

          <!-- Desktop Rich Interactive Hover Tooltip -->
          <div class="events-timeline__tooltip ${vAlignClass} ${hAlignClass}" role="tooltip">
            <div class="events-tooltip__header">
              <span class="events-tooltip__type-badge" style="--badge-accent: ${meta.color};">
                ${getIconSvg(typeIcon, { size: 12 })}
                <span>${escapeHtml(typeLabel)}</span>
              </span>
              <span class="events-tooltip__status-badge ${isLive ? 'status--live' : 'status--upcoming'}">
                ${isLive ? (isEn ? 'LIVE NOW' : 'АКТИВНО') : (isEn ? 'UPCOMING' : 'СКОРО')}
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
          ${meta.logo ? `<img src="${cleanBase}assets/logos/${escapeAttr(meta.logo)}" alt="${escapeAttr(meta.name)}" class="events-timeline__game-logo" width="20" height="20" loading="lazy" />` : `<span class="events-timeline__game-icon">${getIconSvg(meta.icon, { size: 16 })}</span>`}
          <span class="events-timeline__game-name">${escapeHtml(meta.name)}</span>
        </a>
        <div class="events-timeline__track" style="height: ${trackHeight}px;">
          ${barsHtml || `<div class="events-timeline__track-empty">${isEn ? 'No scheduled events in this period' : 'Нет событий в этом периоде'}</div>`}
        </div>
      </div>
    `;
  }).join('\n');

  // 4. Build Desktop Urgent Cards Grid (4 Columns, ordered by nearest urgency)
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
  }).join('\n') : `
    <div class="events-timeline__track-empty" style="grid-column: 1 / -1; padding: 2.5rem 1rem; text-align: center; color: var(--text-muted, #94a3b8); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: var(--radius-sm, 10px);">
      ${isEn ? 'No urgent events ending soon. Check the full timeline schedule above.' : 'Нет срочных событий, завершающихся в ближайшее время. Полное расписание смотрите на таймлайне выше.'}
    </div>
  `;

  return `
    <div class="events-dashboard-container events-dashboard-desktop">
      
      <!-- Main Live Events Timeline Card -->
      <section class="timeline-card events-timeline-card">
        <div class="timeline-card__header">
          <div>
            <h3 class="timeline-card__title">${isEn ? 'LIVE EVENTS TIMELINE' : 'ТАЙМЛАЙН СОБЫТИЙ И ИВЕНТОВ'}</h3>
            <p class="timeline-card__caption">${isEn ? 'All events, Twitch Drops, PTR and collabs across games on timeline' : 'Все события, Twitch Drops, PTR и коллаборации на одной шкале'}</p>
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

            <!-- Vertical NOW Line -->
            <div class="events-timeline__today-line" style="left: calc(185px + (100% - 185px) * ${nowPercent / 100});">
              <span class="events-timeline__today-badge">${isEn ? 'NOW' : 'СЕЙЧАС'}</span>
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
        <div class="urgent-events-grid urgent-events-grid-desktop">
          ${urgentCardsHtml}
        </div>
      </section>

      <!-- Desktop Interactive Detail Drawer (Docked inside Desktop Layout) -->
      <aside id="events-detail-drawer" class="events-detail-drawer" aria-hidden="true" role="region" aria-label="${isEn ? 'Event Details' : 'Информация о событии'}">
        <div class="events-detail-drawer__inner">
          <div class="events-detail-drawer__header">
            <span class="events-detail-drawer__title">
              ${getIconSvg('layers', { size: 15 })}
              <span>${isEn ? 'ABOUT EVENT' : 'О СОБЫТИИ'}</span>
            </span>
            <button type="button" class="events-detail-drawer__close" id="events-detail-drawer-close" aria-label="${isEn ? 'Close' : 'Закрыть'}">
              ${getIconSvg('x', { size: 16 })}
            </button>
          </div>
          <div class="events-detail-drawer__content" id="events-detail-drawer-content">
            <!-- Dynamically populated on timeline bar selection -->
          </div>
        </div>
      </aside>

    </div>
  `.trim();
}

/**
 * Renders the rich internal HTML content for a selected event inside the Desktop Drawer.
 * Strictly conditionally renders sections only when relevant data exists (no empty placeholders).
 */
export function renderEventDetailContent(event, { lang = 'en', basePath = './' } = {}) {
  if (!event) return '';
  const isEn = lang === 'en';
  const now = new Date();
  const nowMs = now.getTime();

  const meta = GAME_META[event.gameId] || { name: 'Unknown Game', icon: 'gamepad', color: '#6366f1' };
  const typeKey = event.type || 'event';
  const typeIcon = TYPE_ICONS[typeKey] || 'calendar';
  const typeLabel = TYPE_LABELS[typeKey] ? (TYPE_LABELS[typeKey][lang] || TYPE_LABELS[typeKey].en) : (isEn ? 'Event' : 'Событие');

  const title = getVal(event.title, lang) || (isEn ? event.title_en : event.title_ru) || event.title_en || event.title_ru || (typeof event.title === 'string' ? event.title : 'Event');
  const description = getVal(event.description, lang) || (isEn ? event.description_en : event.description_ru) || '';

  const eStart = event.startDate ? new Date(event.startDate) : null;
  const eEnd = event.endDate ? new Date(event.endDate) : null;
  const startMs = eStart ? eStart.getTime() : 0;
  const endMs = eEnd ? eEnd.getTime() : null;

  const isUpcoming = startMs > nowMs;
  const isEnded = endMs && nowMs > endMs;
  const isLive = !isUpcoming && !isEnded;

  // Status & Countdown
  let statusText = isEn ? 'UPCOMING' : 'ПРЕДСТОИТ';
  let statusClass = 'status--upcoming';
  let countdownLabel = isEn ? 'Starts in' : 'Начнётся через';
  let targetTime = startMs;

  if (isLive) {
    statusText = isEn ? 'LIVE NOW' : 'В РАЗГАРЕ';
    statusClass = 'status--live';
    if (endMs) {
      const hoursLeft = (endMs - nowMs) / 3600000;
      if (hoursLeft <= 48) {
        countdownLabel = isEn ? 'Ends soon in' : 'Скоро завершится через';
      } else {
        countdownLabel = isEn ? 'Ends in' : 'Завершится через';
      }
      targetTime = endMs;
    } else {
      countdownLabel = isEn ? 'Duration' : 'Длительность';
      targetTime = null;
    }
  } else if (isEnded) {
    statusText = isEn ? 'ENDED' : 'ЗАВЕРШЕНО';
    statusClass = 'status--ended';
    countdownLabel = isEn ? 'Status' : 'Статус';
    targetTime = null;
  }

  let countdownValueStr = '';
  if (targetTime && targetTime > nowMs) {
    const diffMs = targetTime - nowMs;
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    if (days > 0) {
      countdownValueStr = isEn ? `${days}d ${hours}h ${mins}m` : `${days}д ${hours}ч ${mins}м`;
    } else if (hours > 0) {
      countdownValueStr = isEn ? `${hours}h ${mins}m` : `${hours}ч ${mins}м`;
    } else {
      countdownValueStr = isEn ? `${mins}m` : `${mins}м`;
    }
  } else if (isLive && !endMs) {
    countdownValueStr = isEn ? 'Ongoing' : 'Бессрочно';
  } else if (isEnded) {
    countdownValueStr = isEn ? 'Completed' : 'Завершено';
  }

  // Dates formatting
  let startDateStr = '';
  let endDateStr = '';
  if (eStart) {
    startDateStr = eStart.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  if (eEnd) {
    endDateStr = eEnd.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const sourceUrl = event.sourceUrl ? cleanSourceUrl(event.sourceUrl, event.gameId, lang) : null;
  const postUrl = event.postUrl ? cleanSourceUrl(event.postUrl, event.gameId, lang) : null;
  const streamUrl = event.streamUrl ? cleanSourceUrl(event.streamUrl, event.gameId, lang) : null;

  const actionLinks = [];
  if (streamUrl) {
    actionLinks.push({ url: streamUrl, info: getSourceInfo(streamUrl, isEn) });
  }
  if (sourceUrl && (!streamUrl || sourceUrl !== streamUrl)) {
    actionLinks.push({ url: sourceUrl, info: getSourceInfo(sourceUrl, isEn) });
  }
  if (postUrl && postUrl !== sourceUrl && postUrl !== streamUrl) {
    actionLinks.push({ url: postUrl, info: getSourceInfo(postUrl, isEn) });
  }
  if (actionLinks.length === 0 && sourceUrl) {
    actionLinks.push({ url: sourceUrl, info: getSourceInfo(sourceUrl, isEn) });
  }

  // Strictly conditional data checks
  const conditions = Array.isArray(event.conditions) && event.conditions.length > 0
    ? event.conditions
    : (Array.isArray(event.requirements) && event.requirements.length > 0 ? event.requirements : null);

  const rewards = Array.isArray(event.rewards) && event.rewards.length > 0 ? event.rewards : null;

  return `
    <div class="events-detail-body" style="--event-accent: ${meta.color};">
      
      <!-- Category Badge, Title & Game Header -->
      <div class="events-detail-hero">
        <div class="events-detail-tags">
          <span class="events-detail-type-badge" style="--badge-accent: ${meta.color};">
            <span class="events-detail-type-icon">${getIconSvg(typeIcon, { size: 12 })}</span>
            <span>${escapeHtml(typeLabel.toUpperCase())}</span>
          </span>
          <span class="events-detail-game-badge">
            <span class="events-detail-game-icon" style="color: ${meta.color};">${getIconSvg(meta.icon, { size: 13 })}</span>
            <span>${escapeHtml(meta.name)}</span>
          </span>
        </div>

        <h3 class="events-detail-title">${escapeHtml(title)}</h3>

        <!-- Status & Countdown Pills Row -->
        <div class="events-detail-status-row" ${targetTime ? `data-countdown-target="${targetTime}"` : ''}>
          <span class="events-detail-status-badge ${statusClass}">
            ${escapeHtml(statusText)}
          </span>
          ${countdownValueStr ? `
            <span class="events-detail-countdown-box">
              <span class="events-detail-countdown-text" data-countdown-display>${escapeHtml(countdownLabel)} ${escapeHtml(countdownValueStr)}</span>
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Date & Time Section with Card Container -->
      <div class="events-detail-section">
        <h4 class="events-detail-section__heading">${isEn ? 'DATE & TIME' : 'ДАТА И ВРЕМЯ'}</h4>
        <div class="events-detail-dates-card">
          ${eStart ? `
            <div class="events-detail-date-item">
              <span class="events-detail-date-icon">${getIconSvg('calendar', { size: 15 })}</span>
              <span class="events-detail-date-text">
                <span class="events-detail-date-val">${escapeHtml(startDateStr)}</span>
                <span class="events-detail-date-suffix">(${isEn ? 'Starts' : 'Старт'})</span>
              </span>
            </div>
          ` : ''}
          ${eEnd ? `
            <div class="events-detail-date-item">
              <span class="events-detail-date-icon">${getIconSvg('clock', { size: 15 })}</span>
              <span class="events-detail-date-text">
                <span class="events-detail-date-val">${escapeHtml(endDateStr)}</span>
                <span class="events-detail-date-suffix">(${isEn ? 'Ends' : 'Конец'})</span>
              </span>
            </div>
          ` : (eStart && !eEnd ? `
            <div class="events-detail-date-item">
              <span class="events-detail-date-icon">${getIconSvg('clock', { size: 15 })}</span>
              <span class="events-detail-date-text">
                <span class="events-detail-date-val">${isEn ? 'Until season ends' : 'До окончания сезона'}</span>
              </span>
            </div>
          ` : '')}
        </div>
      </div>

      <!-- Description Section (ONLY IF PRESENT) -->
      ${description ? `
        <div class="events-detail-section">
          <h4 class="events-detail-section__heading">${isEn ? 'DESCRIPTION' : 'ОПИСАНИЕ'}</h4>
          <p class="events-detail-description">${escapeHtml(description)}</p>
        </div>
      ` : ''}

      <!-- Conditions / Rules Section (ONLY IF PRESENT) -->
      ${conditions ? `
        <div class="events-detail-section">
          <h4 class="events-detail-section__heading">${isEn ? 'CONDITIONS & RULES' : 'УСЛОВИЯ УЧАСТИЯ'}</h4>
          <ul class="events-detail-list events-detail-list--conditions">
            ${conditions.map(c => `
              <li>${escapeHtml(typeof c === 'object' ? (c[lang] || c.en || c.ru) : c)}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Rewards Section (ONLY IF PRESENT) -->
      ${rewards ? `
        <div class="events-detail-section">
          <h4 class="events-detail-section__heading">${isEn ? 'REWARDS' : 'НАГРАДЫ'}</h4>
          <ul class="events-detail-list events-detail-list--rewards">
            ${rewards.map(r => `
              <li>
                <span class="events-detail-bullet">•</span>
                <span class="events-detail-reward-text">${escapeHtml(typeof r === 'object' ? (r[lang] || r.en || r.ru) : r)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Official Source Action Buttons (ONLY IF PRESENT) -->
      ${actionLinks.length > 0 ? `
        <div class="events-detail-section events-detail-section--action">
          <div class="events-detail-actions-grid" style="${actionLinks.length > 1 ? 'display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;' : ''}">
            ${actionLinks.map(link => `
              <a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer" class="events-detail-btn-action" style="--btn-color: ${meta.color};">
                <span>${escapeHtml(link.info.label)}</span>
                ${getIconSvg(link.info.icon || 'external-link', { size: 14 })}
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `.trim();
}
