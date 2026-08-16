import { t, getVal } from '../i18n/index.js';
import { getState } from '../store/state.js';
import { escapeHtml } from '../utils/helpers.js';
import { calculateDynamicStatus } from '../utils/status.js';
import { getProgressPercent } from '../utils/countdown.js';
import { getIconSvg } from '../utils/icons.js';



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

  // Fallbacks for known league names when version number is missing from string
  if (gameId === 'path-of-exile') {
    if (/(?:Curse of the Allflame|Проклятие Всепламени)/i.test(str)) return 'v3.29';
    if (/(?:Necropolis|Некрополь)/i.test(str)) return 'v3.28';
    if (/(?:Settlers of Kalguur|Поселенцы Кальгуура)/i.test(str)) return 'v3.27';
    if (/(?:Affliction|Аффликшн)/i.test(str)) return 'v3.25';
    if (/(?:Ancestors|Предки)/i.test(str)) return 'v3.24';
    if (/(?:Crucible|Горнило)/i.test(str)) return 'v3.23';
    if (/(?:Sanctum|Святилище)/i.test(str)) return 'v3.22';
  } else if (gameId === 'path-of-exile-2') {
    if (/(?:Return of the Ancients|Возвращение Древних)/i.test(str)) return 'v0.5.0';
    if (/(?:ExileCon)/i.test(str)) return 'v1.0';
  } else if (gameId === 'diablo-iv') {
    if (/(?:Death Awakening|Пробуждение смерти)/i.test(str)) return 'S14';
  } else if (gameId === 'last-epoch') {
    if (/(?:Shattered Omens|Разрушенные знамения)/i.test(str)) return 'C4';
  } else if (gameId === 'torchlight-infinite') {
    if (/(?:Afterlight)/i.test(str)) return 'SS13';
  }

  const clean = str.replace(/\s*\((Estimated|Release|Прогноз|Релиз)\)/gi, '').trim();
  const parts = clean.split(/[:—-]/);
  const candidate = parts[0].trim();

  // Strict check: never allow long text strings without digits on timeline
  if (!/\d/.test(candidate) && candidate.length > 6) {
    if (gameId === 'path-of-exile' || gameId === 'path-of-exile-2') return 'v--';
    if (gameId === 'diablo-iv') return 'S--';
    if (gameId === 'last-epoch') return 'C--';
    if (gameId === 'torchlight-infinite') return 'SS--';
  }

  return candidate;
}

function formatFullDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date).toUpperCase();
}

export function render(games = [], viewMode = 'all') {
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

  // 4. Render rows
  const rowsHtml = items.map((game) => {
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
      : getIconSvg(game.icon, { size: 18, class: 'timeline-map__row-svg' });



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

    return `
      <div class="timeline-map__row" style="--game-color: ${color}">
        <div class="timeline-map__row-label" data-game-id="${escapeHtml(game.id)}">
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
          <!-- PTR Duration Bar Segment (Aug 4 - Aug 11) -->
          ${(game.events || []).filter(e => e.type === 'ptr').map(ev => {
            if (!ev.startDate) return '';
            const ptrStartPos = getPercent(ev.startDate);
            const ptrEndPos = ev.endDate ? getPercent(ev.endDate) : ptrStartPos + 3;
            const ptrWidth = Math.max(1.5, ptrEndPos - ptrStartPos);
            if (ptrStartPos <= 0 || ptrStartPos >= 100) return '';
            return `
              <div class="timeline-bar timeline-bar--ptr" style="left: ${ptrStartPos}%; width: ${ptrWidth}%;" data-game-id="${escapeHtml(game.id)}" data-season-type="ptr"></div>
            `;
          }).join('\n')}
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

  // 5. Render Upcoming Cards (STRICTLY 1 Card Per Game, Earliest Milestone First)
  const upcomingCards = items
    .map(g => {
      const milestones = [];
      
      if (g.events && Array.isArray(g.events)) {
        g.events.forEach(ev => {
          if (ev.startDate) {
            const d = new Date(ev.startDate);
            if (d.getTime() > Date.now()) {
              milestones.push({
                date: d,
                startDateStr: ev.startDate,
                name: getVal(ev.title),
                type: ev.type || 'event'
              });
            }
          }
        });
      }
      
      if (g.nextSeason?.startDate) {
        const d = new Date(g.nextSeason.startDate);
        if (d.getTime() > Date.now()) {
          milestones.push({
            date: d,
            startDateStr: g.nextSeason.startDate,
            name: getVal(g.nextSeason.name),
            type: 'season'
          });
        }
      }
      
      if (milestones.length === 0) return null;

      milestones.sort((a, b) => a.date - b.date);
      const earliest = milestones[0];
      
      let seasonSubtext = '';
      if (earliest.type !== 'season' && g.nextSeason?.startDate) {
        const nextSeasonName = escapeHtml(getVal(g.nextSeason.name) || 'TBA');
        const nextSeasonFormatted = formatDate(g.nextSeason.startDate, lang);
        seasonSubtext = `${nextSeasonName}: ${nextSeasonFormatted}`;
      }

      return {
        game: g,
        earliest,
        seasonSubtext
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.earliest.date - b.earliest.date);

  let upcomingLaunchesHtml = '';
  if (upcomingCards.length > 0) {
    const cardsHtml = upcomingCards.map(({ game, earliest, seasonSubtext }) => {
      const gameName = escapeHtml(getVal(game.name));
      const eventTitle = escapeHtml(earliest.name || 'TBA');
      const rawColor = String(game.color || '#6366f1');
      const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#6366f1';
      const formattedDate = formatFullDate(earliest.startDateStr, lang);
      
      const diff = earliest.date.getTime() - Date.now();
      const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      const hours = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
      const minutes = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));
      const seconds = Math.max(0, Math.floor((diff / 1000) % 60));
      
      const isHype = days <= 14;
      const isPtr = earliest.type === 'ptr';

      let conventionBadge = 'EVENT';
      if (earliest.type === 'convention') {
        const titleLower = String(earliest.name || '').toLowerCase();
        if (titleLower.includes('gamescom')) conventionBadge = 'GAMESCOM';
        else if (titleLower.includes('exilecon')) conventionBadge = 'EXILECON';
        else if (titleLower.includes('blizzcon')) conventionBadge = 'BLIZZCON';
        else conventionBadge = 'SHOWCASE';
      }
      const badgeText = isPtr ? 'PTR TEST' : (earliest.type === 'convention' ? conventionBadge : (isHype ? t('timeline.hype') : ''));

      const currentSeasonName = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
      const progressPercent = Math.round(getProgressPercent(game));
      const statusCode = calculateDynamicStatus(game);
      const statusLabel = escapeHtml(t(`statuses.${statusCode}`) || game.status?.label || 'Active');
      const logo = game.logo ? escapeHtml(game.logo) : '';
      const icon = escapeHtml(game.icon || '🎮');

      const iconHtml = logo 
        ? `<img src="./assets/logos/${logo}" alt="${gameName}" class="unified-card__logo" />`
        : getIconSvg(game.icon, { size: 20, class: 'unified-card__svg' });

      const subtextHtml = seasonSubtext ? `
        <div class="upcoming-card__season-subtext">
          ${seasonSubtext}
        </div>
      ` : '';

      if (viewMode === 'home') {
        const eyebrowLabel = lang === 'ru' ? 'До старта сезона' : 'Until season start';
        return `
          <div class="upcoming-card unified-card ${isHype ? 'upcoming-card--hype' : ''} ${isPtr ? 'upcoming-card--ptr' : ''}" style="--game-color: ${color};" data-game-countdown="${game.id}">
            <img src="./assets/images/cards/${game.id}.webp" alt="${gameName}" class="upcoming-card__bg" loading="lazy" />
            
            <!-- Top Section: Current Season & Status -->
            <div class="unified-card__top">
              <div class="unified-card__header-row">
                <div class="unified-card__game-title-group">
                  <div class="unified-card__icon-box">${iconHtml}</div>
                  <h4 class="unified-card__game-name">${gameName}</h4>
                </div>
                <span class="game-card__pill game-card__pill--${statusCode}">${statusLabel.toUpperCase()}</span>
              </div>

              <div class="unified-card__season-info">
                <span class="unified-card__season-label">${t('card.currentSeasonLabel') || 'Текущий сезон'}:</span>
                <strong class="unified-card__season-title">${currentSeasonName}</strong>
              </div>

              <div class="unified-card__progress-block">
                <div class="unified-card__progress-bar-bg">
                  <div class="unified-card__progress-bar-fill" style="width: ${progressPercent}%; background: ${color};"></div>
                </div>
                <span class="unified-card__progress-val">${progressPercent}%</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="unified-card__divider"></div>

            <!-- Bottom Section: Next Season & Countdown -->
            <div class="unified-card__bottom">
              <div class="unified-card__next-header">
                <span class="unified-card__next-eyebrow">${eyebrowLabel}</span>
              </div>

              <div class="upcoming-card__countdown unified-card__countdown">
                <div class="upcoming-card__countdown-item"><strong data-countdown="days">${days}</strong><span>${t('card.days') || 'days'}</span></div>
                <div class="upcoming-card__countdown-item"><strong data-countdown="hours">${hours}</strong><span>${t('card.hours') || 'hours'}</span></div>
                <div class="upcoming-card__countdown-item"><strong data-countdown="minutes">${minutes}</strong><span>${t('card.minutes') || 'min'}</span></div>
                <div class="upcoming-card__countdown-item"><strong data-countdown="seconds">${seconds}</strong><span>${t('card.seconds') || 'sec'}</span></div>
              </div>

              <div class="unified-card__event-row">
                <strong class="unified-card__next-title">${eventTitle}</strong>
                ${badgeText ? `<span class="upcoming-card__hype-badge ${isPtr ? 'upcoming-card__hype-badge--ptr' : ''}">${badgeText}</span>` : ''}
              </div>

              <div class="unified-card__footer-row">
                <a href="./games/${game.id}/" class="unified-card__arrow-btn">
                  <span>${lang === 'ru' ? 'Перейти к игре' : 'View Game'}</span>
                  <span class="unified-card__arrow-icon">→</span>
                </a>
              </div>
            </div>
          </div>
        `;
      }

      // Default Compact Card for Desktop Timeline View
      return `
        <div class="upcoming-card ${isHype ? 'upcoming-card--hype' : ''} ${isPtr ? 'upcoming-card--ptr' : ''}" style="--game-color: ${color}" data-game-countdown="${game.id}">
          <img src="./assets/images/cards/${game.id}.webp" alt="${gameName}" class="upcoming-card__bg" loading="lazy" />
          <div class="upcoming-card__date-wrapper">
            <span class="upcoming-card__date">${formattedDate}</span>
            ${badgeText ? `<span class="upcoming-card__hype-badge ${isPtr ? 'upcoming-card__hype-badge--ptr' : ''}">${badgeText}</span>` : ''}
          </div>
          <h4 class="upcoming-card__game-name">${gameName}</h4>
          <div class="upcoming-card__season-name">${eventTitle}</div>
          ${subtextHtml}
          <div class="upcoming-card__countdown">
            <div class="upcoming-card__countdown-item"><strong data-countdown="days">${days}</strong><span>${t('card.days') || 'days'}</span></div>
            <div class="upcoming-card__countdown-item"><strong data-countdown="hours">${hours}</strong><span>${t('card.hours') || 'hours'}</span></div>
            <div class="upcoming-card__countdown-item"><strong data-countdown="minutes">${minutes}</strong><span>${t('card.minutes') || 'min'}</span></div>
            <div class="upcoming-card__countdown-item"><strong data-countdown="seconds">${seconds}</strong><span>${t('card.seconds') || 'sec'}</span></div>
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

  if (viewMode === 'home') {
    return `<div class="home-view-wrapper">${upcomingLaunchesHtml}</div>`;
  }

  const startYear = startTimelineDate.getFullYear();
  const endYear = endTimelineDate.getFullYear();
  const yearBadgeText = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;

  const cleanBase = typeof basePath === 'string' && basePath.endsWith('/') ? basePath : (typeof basePath === 'string' ? `${basePath}/` : './');
  const seasonsHref = cleanBase;
  const eventsHref = `${cleanBase}events/`;

  const timelineChartHtml = `
    <div class="timeline-view-wrapper">
      <section class="timeline-card">
        <div class="timeline-card__header">
          <div>
            <h3 class="timeline-card__title">${t('timeline.title')}</h3>
            <p class="timeline-card__caption">${t('timeline.subtitle')}</p>
          </div>
          
          <div class="timeline-card__header-actions">
            <!-- Seamless Integrated Switcher embedded right inside Card Header -->
            <div class="timeline-integrated-switcher" role="tablist">
              <a href="${seasonsHref}" class="timeline-switcher-tab active" id="tab-mode-seasons" data-mode="seasons" role="tab" aria-selected="true">
                <span class="switcher-icon">${getIconSvg('gear-sun', { size: 15 })}</span>
                <span class="switcher-text">${t('timeline.modeSeasons') || 'СЕЗОНЫ'}</span>
              </a>
              <a href="${eventsHref}" class="timeline-switcher-tab" id="tab-mode-events" data-mode="events" role="tab" aria-selected="false">
                <span class="switcher-icon">${getIconSvg('layers', { size: 15 })}</span>
                <span class="switcher-text">${t('timeline.modeEvents') || 'ИВЕНТЫ'}</span>
              </a>
              <div class="timeline-switcher-slider"></div>
            </div>

            <div class="timeline-card__year-badge">${yearBadgeText}</div>
          </div>
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
            <div class="timeline-map__now-line" style="left: calc(var(--timeline-offset, 180px) + 12px + (100% - var(--timeline-offset, 180px) - 32px) * ${nowPercent / 100});">
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

      <!-- Dynamic tooltip element -->
      <div id="timeline-tooltip" class="timeline-tooltip" style="display: none;"></div>
    </div>
  `;

  if (viewMode === 'timeline') {
    return timelineChartHtml;
  }

  return `
    <div class="timeline-view-wrapper">
      ${timelineChartHtml}
      ${upcomingLaunchesHtml}
    </div>
  `;
}

export function Timeline(games) {
  return render(games);
}
