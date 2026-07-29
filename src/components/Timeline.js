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

function getCleanSeasonTag(name, gameId) {
  if (!name) return 'TBA';
  const str = String(name).trim();

  // Version numbers (e.g. 3.29, v3.29, 0.5.0, 1.0)
  const versionMatch = str.match(/(?:v|version\s*)?(\d+\.\d+(?:\.\d+)?)/i);
  if (versionMatch) {
    return `v${versionMatch[1]}`;
  }

  // Season / Cycle / SS numbers
  const numberMatch = str.match(/\b\d+\b/);
  if (numberMatch) {
    const num = numberMatch[0];
    if (gameId === 'diablo-iv') return `S${num}`;
    if (gameId === 'last-epoch') return `C${num}`;
    if (gameId === 'torchlight-infinite') return `SS${num}`;
    if (gameId === 'path-of-exile' || gameId === 'path-of-exile-2') return `v${num}`;
    return `#${num}`;
  }

  // Known PoE league name fallbacks if version number is missing from name string
  if (gameId === 'path-of-exile') {
    if (/Curse of the Allflame/i.test(str)) return 'v3.29';
    if (/Necropolis/i.test(str)) return 'v3.28';
  }

  const clean = str.replace(/\s*\((Estimated|Release|Прогноз|Релиз)\)/gi, '').trim();
  const parts = clean.split(/[:—-]/);
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
  const compareMode = state.compareMode || false;
  const compareGames = state.compareGames || [];

  // In compare mode: all games shown, unchecked ones are dimmed
  // compareGames starts pre-populated with all IDs on mode enter (see setCompareMode)
  const displayItems = items;

  if (!items.length) {
    return `<section class="timeline-card"><h3>${t('timeline.fallbackTitle')}</h3><p>${t('timeline.fallbackNoGames')}</p></section>`;
  }

  // If in compare mode and < 2 selected, show hint
  const showCompareHint = compareMode && compareGames.filter(id => items.some(g => g.id === id)).length < 2;

  // 1. Setup Dynamic Time Window
  const currentYear = new Date().getFullYear();
  let minDate = new Date(`${currentYear}-01-01T00:00:00Z`).getTime();
  let maxDate = new Date(`${currentYear}-12-31T23:59:59Z`).getTime();

  displayItems.forEach(g => {
    (g.history || []).forEach(h => {
      [h.startDate, h.endDate].forEach(d => {
        if (!d) return;
        const timeMs = new Date(d).getTime();
        if (!Number.isNaN(timeMs)) {
          if (timeMs < minDate) minDate = timeMs;
          if (timeMs > maxDate) maxDate = timeMs;
        }
      });
    });
    [g.currentSeason?.startDate, g.currentSeason?.endDate, g.nextSeason?.startDate, g.nextSeason?.endDate].forEach(d => {
      if (!d) return;
      const timeMs = new Date(d).getTime();
      if (!Number.isNaN(timeMs)) {
        if (timeMs < minDate) minDate = timeMs;
        if (timeMs > maxDate) maxDate = timeMs;
      }
    });
    if (g.nextSeason?.startDate) {
      const nextStartMs = new Date(g.nextSeason.startDate).getTime();
      const estEndMs = g.nextSeason.endDate
        ? new Date(g.nextSeason.endDate).getTime()
        : nextStartMs + 90 * 24 * 60 * 60 * 1000;
      if (!Number.isNaN(estEndMs) && estEndMs > maxDate) {
        maxDate = estEndMs;
      }
    }
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

  // 3. Dynamic Grid months header with depth perspective
  const activeMonths = [];
  const monthCursor = new Date(startTimelineDate);
  monthCursor.setDate(1);
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });

  const nowObj = new Date();
  const currentMonthIdx = nowObj.getMonth();
  const currentYearVal = nowObj.getFullYear();

  while (monthCursor <= endTimelineDate) {
    const isCurrent = monthCursor.getMonth() === currentMonthIdx && monthCursor.getFullYear() === currentYearVal;
    const isAdjacent = Math.abs((monthCursor.getFullYear() * 12 + monthCursor.getMonth()) - (currentYearVal * 12 + currentMonthIdx)) === 1;

    activeMonths.push({
      name: monthFormatter.format(monthCursor).toUpperCase().slice(0, 3),
      isCurrent,
      isAdjacent
    });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  const monthsHeaderHtml = activeMonths
    .map(m => {
      let cls = 'timeline-map__month';
      if (m.isCurrent) cls += ' timeline-map__month--current';
      else if (m.isAdjacent) cls += ' timeline-map__month--adjacent';
      return `<div class="${cls}">${m.name}</div>`;
    })
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

    return `<div class="timeline-tooltip__title">${gameName}</div><div class="timeline-tooltip__season">${seasonName}</div><div class="timeline-tooltip__detail"><strong>${t('timeline.started') || 'Started'}:</strong> ${startStr}</div><div class="timeline-tooltip__detail"><strong>${t('timeline.ends') || 'Ends'}:</strong> ${endStr}</div><div class="timeline-tooltip__detail"><strong>${t('timeline.duration') || 'Duration'}:</strong> ${durationStr}</div>`.replace(/\s+/g, ' ').replace(/"/g, '&quot;');
  };

  // 4. Compute compare statistics (gaps and overlaps)
  const activeCompareGames = compareMode ? items.filter(g => compareGames.includes(g.id)) : [];
  const compareStatsHtml = computeCompareStats(activeCompareGames, compareMode, lang);

  // 5. Render rows
  const rowsHtml = displayItems.map((game) => {
    const name = escapeHtml(getVal(game.name));
    const rawColor = String(game.color || '#6366f1');
    const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#6366f1';
    const logo = game.logo ? escapeHtml(game.logo) : '';

    const currentSeasonName = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
    const nextSeasonName = escapeHtml(getVal(game.nextSeason?.name) || 'TBA');

    // Calculate segments
    let curEndMs = 0;
    if (game.currentSeason?.endDate) {
      curEndMs = new Date(game.currentSeason.endDate).getTime();
    } else if (game.nextSeason?.startDate) {
      curEndMs = new Date(game.nextSeason.startDate).getTime();
    } else if (game.currentSeason?.startDate) {
      const curStartMs = new Date(game.currentSeason.startDate).getTime();
      curEndMs = curStartMs + 90 * 24 * 60 * 60 * 1000;
    }
    const currentStart = getPercent(game.currentSeason?.startDate);
    const currentEnd = curEndMs > 0 ? getPercent(new Date(curEndMs).toISOString()) : getPercent(game.currentSeason?.startDate);
    
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
        : nextStartMs + 90 * 24 * 60 * 60 * 1000;
      nextEnd = Math.min(100, getPercent(new Date(estEndMs).toISOString()));
    }
    const nextWidth = Math.max(0, Math.min(100 - nextStart, nextEnd - nextStart));

    const formattedNextStart = game.nextSeason?.startDate ? formatDate(game.nextSeason.startDate, lang) : '';

    const logoHtml = logo 
      ? `<img src="./assets/logos/${logo}" alt="${name}" class="timeline-map__row-logo" />`
      : `<span class="timeline-map__row-emoji">${escapeHtml(game.icon || '🎮')}</span>`;



    const daysUntil = game.nextSeason?.startDate 
      ? (new Date(game.nextSeason.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      : Infinity;
    const isHype = daysUntil >= 0 && daysUntil <= 14;

    const historyBarsHtml = (game.history || []).map((h, idx) => {
      if (!h.startDate || !h.endDate) return '';
      const hStart = getPercent(h.startDate);
      const hEnd = getPercent(h.endDate);
      const hWidth = Math.max(0, hEnd - hStart);
      if (hWidth <= 0) return '';

      const hTag = escapeHtml(getCleanSeasonTag(getVal(h.name), game.id));
      return `
        <div class="timeline-bar timeline-bar--past" style="left: ${hStart}%; width: ${hWidth}%;" data-game-id="${escapeHtml(game.id)}" data-season-type="history-${idx}">
          <span class="timeline-bar__title">${hTag}</span>
        </div>
      `;
    }).join('\n');

    const isCompareChecked = compareMode ? compareGames.includes(game.id) : false;
    const compareDimClass = compareMode && !isCompareChecked ? 'timeline-map__row--compare-dimmed' : '';
    const checkboxHtml = compareMode
      ? `<input type="checkbox" class="timeline-compare-row-checkbox" data-compare-game-id="${escapeHtml(game.id)}" ${isCompareChecked ? 'checked' : ''} />`
      : '';

    return `
      <div class="timeline-map__row ${compareDimClass}" style="--game-color: ${color}">
        <div class="timeline-map__row-label" data-game-id="${escapeHtml(game.id)}">
          ${checkboxHtml}
          ${logoHtml}
          <span class="timeline-map__row-name">${name}</span>
        </div>
        <div class="timeline-map__row-track">
          <!-- Past archived seasons -->
          ${historyBarsHtml}
          <!-- Elapsed bar for current season -->
          ${elapsedWidth > 0 ? `
            <div class="timeline-bar timeline-bar--current-elapsed" style="left: ${currentStart}%; width: ${elapsedWidth}%;" data-game-id="${escapeHtml(game.id)}" data-season-type="current">
              <span class="timeline-bar__title">${escapeHtml(getCleanSeasonTag(getVal(game.currentSeason?.name), game.id))}</span>
            </div>
          ` : ''}
          <!-- Remaining bar for current season -->
          ${remainingWidth > 0 ? `
            <div class="timeline-bar timeline-bar--current-remaining" style="left: ${remainingStart}%; width: ${remainingWidth}%;" data-game-id="${escapeHtml(game.id)}" data-season-type="current">
              ${elapsedWidth === 0 ? `<span class="timeline-bar__title">${escapeHtml(getCleanSeasonTag(getVal(game.currentSeason?.name), game.id))}</span>` : ''}
            </div>
          ` : ''}
          <!-- Next season start circle node -->
          ${game.nextSeason?.startDate ? `
            <div class="timeline-circle ${isHype ? 'timeline-circle--hype' : ''}" style="left: ${nextStart}%;" data-game-id="${escapeHtml(game.id)}" data-season-type="next">
              <span class="timeline-circle__label">${escapeHtml(getCleanSeasonTag(getVal(game.nextSeason?.name), game.id))}</span>
              <span class="timeline-circle__date">${formattedNextStart}</span>
            </div>
          ` : ''}
          <!-- Future season dashed line -->
          ${game.nextSeason?.startDate ? `
            <div class="timeline-bar timeline-bar--future ${isHype ? 'timeline-bar--future-hype' : ''}" style="left: ${nextStart}%; width: ${nextWidth}%;" data-game-id="${escapeHtml(game.id)}" data-season-type="next"></div>
          ` : ''}
          <!-- Intersection dot for NOW line -->
          <div class="timeline-map__now-dot" style="left: ${nowPercent}%;"></div>
        </div>
      </div>
    `;
  }).join('\n');

  // 6. Render Upcoming Launches Cards (hide in compare mode)
  const upcoming = compareMode ? [] : items
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
          <img src="./assets/images/cards/${game.id}.webp" alt="${gameName}" class="upcoming-card__bg" loading="lazy" />
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

  // 7. Main timeline structure output
  return `
    <div class="timeline-view-wrapper">
      <section class="timeline-card">
        <div class="timeline-card__header">
          <div>
            <h3 class="timeline-card__title">${t('timeline.title')}</h3>
            <p class="timeline-card__caption">${t('timeline.subtitle')}</p>
          </div>
          <div class="timeline-card__header-actions">
            ${renderCompareToggle(compareMode, lang)}
            <div class="timeline-card__year-badge">${yearBadgeText}</div>
          </div>
        </div>
        ${compareStatsHtml}
        ${showCompareHint ? `<div class="timeline-compare__stats timeline-compare__stats--hint"><p>${t('timeline.compareSelectMin')}</p></div>` : ''}
        
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
            <div class="timeline-map__now-line" style="left: calc(var(--timeline-offset, 180px) + (100% - var(--timeline-offset, 180px)) * ${nowPercent / 100});">
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

// --- Compare Mode Helpers ---

function renderCompareToggle(isActive, lang) {
  return `
    <div class="timeline-compare-toggle">
      <button class="timeline-compare-toggle__btn ${!isActive ? 'timeline-compare-toggle__btn--active' : ''}" data-compare-toggle="false">
        <span>🌐</span> ${t('timeline.allGames')}
      </button>
      <button class="timeline-compare-toggle__btn ${isActive ? 'timeline-compare-toggle__btn--active' : ''}" data-compare-toggle="true">
        <span>⚡</span> ${t('timeline.compare')}
      </button>
    </div>
  `;
}

function computeCompareStats(games, isActive, lang) {
  if (!isActive || games.length < 2) {
    if (isActive && games.length === 1) {
      return `<div class="timeline-compare__stats timeline-compare__stats--hint"><p>${t('timeline.compareSelectMin')}</p></div>`;
    }
    return '';
  }

  // Collect all season events: { gameId, gameName, name, startDate, endDate }
  const events = [];
  games.forEach(g => {
    const gameName = getVal(g.name) || g.id;
    // History seasons
    (g.history || []).forEach(h => {
      if (h.startDate && h.endDate) {
        events.push({ gameId: g.id, gameName, name: getVal(h.name), startDate: new Date(h.startDate).getTime(), endDate: new Date(h.endDate).getTime() });
      }
    });
    // Current season
    if (g.currentSeason?.startDate) {
      const startMs = new Date(g.currentSeason.startDate).getTime();
      let endMs;
      if (g.currentSeason?.endDate) {
        endMs = new Date(g.currentSeason.endDate).getTime();
      } else if (g.nextSeason?.startDate) {
        endMs = new Date(g.nextSeason.startDate).getTime();
      } else {
        endMs = startMs + 120 * 24 * 60 * 60 * 1000;
      }
      events.push({ gameId: g.id, gameName, name: getVal(g.currentSeason.name), startDate: startMs, endDate: endMs });
    }
    // Next season
    if (g.nextSeason?.startDate) {
      const startMs = new Date(g.nextSeason.startDate).getTime();
      const endMs = g.nextSeason.endDate
        ? new Date(g.nextSeason.endDate).getTime()
        : startMs + 120 * 24 * 60 * 60 * 1000;
      events.push({ gameId: g.id, gameName, name: getVal(g.nextSeason.name), startDate: startMs, endDate: endMs });
    }
  });

  // Sort by start date
  events.sort((a, b) => a.startDate - b.startDate);

  // Find gaps and overlaps between consecutive events of DIFFERENT games
  const transitions = [];
  for (let i = 0; i < events.length - 1; i++) {
    const a = events[i];
    const b = events[i + 1];
    if (a.gameId === b.gameId) continue;

    // Gap: a ends before b starts
    if (a.endDate < b.startDate) {
      const gapDays = Math.round((b.startDate - a.endDate) / (1000 * 60 * 60 * 24));
      if (gapDays > 0) {
        transitions.push({ type: 'gap', gameA: a.gameName, gameB: b.gameName, days: gapDays });
      }
    }
    // Overlap: a ends after b starts
    else if (a.endDate > b.startDate) {
      const overlapDays = Math.round((a.endDate - b.startDate) / (1000 * 60 * 60 * 24));
      if (overlapDays > 0) {
        transitions.push({ type: 'overlap', gameA: a.gameName, gameB: b.gameName, days: overlapDays });
      }
    }
  }

  if (transitions.length === 0) {
    return `<div class="timeline-compare__stats"><p class="timeline-compare__stats-empty">—</p></div>`;
  }

  // Render up to 6 most significant transitions
  const itemsHtml = transitions.slice(0, 6).map(tr => {
    const gameALabel = escapeHtml(tr.gameA.length > 15 ? tr.gameA.split(' ').map(w => w[0]).join('').toUpperCase() : tr.gameA);
    const gameBLabel = escapeHtml(tr.gameB.length > 15 ? tr.gameB.split(' ').map(w => w[0]).join('').toUpperCase() : tr.gameB);
    const isOverlap = tr.type === 'overlap';
    const labelKey = isOverlap ? 'timeline.overlapBetween' : 'timeline.gapBetween';
    const daysKey = isOverlap ? 'timeline.daysOverlap' : 'timeline.daysGap';
    return `
      <div class="timeline-compare__stat-item ${isOverlap ? 'timeline-compare__stat-item--overlap' : ''}">
        <span class="timeline-compare__stat-label">${t(labelKey, { gameA: gameALabel, gameB: gameBLabel })}</span>
        <span class="timeline-compare__stat-value">${t(daysKey, { days: tr.days })}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="timeline-compare__stats">
      <span class="timeline-compare__stats-title">${t('timeline.compareStats')}</span>
      <div class="timeline-compare__stats-grid">
        ${itemsHtml}
      </div>
    </div>
  `;
}
