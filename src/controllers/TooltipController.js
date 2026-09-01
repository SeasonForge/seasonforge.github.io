import { getState, setActiveGame, setActiveView } from '../store/state.js';
import { t, getVal } from '../i18n/index.js';
import { escapeHtml } from '../utils/helpers.js';
import { getIconSvg } from '../utils/icons.js';
import { trackEvent } from '../utils/analytics.js';

let timelineAbortController = null;

export function formatTooltipDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

export function getTimelineTooltipContent(gameId, seasonType) {
  const currentState = getState();
  const game = currentState.games?.find(g => g.id === gameId);
  if (!game) return '';

  const isNext = seasonType === 'next';
  const isHistory = String(seasonType).startsWith('history');
  const isPtrType = seasonType === 'ptr';
  const lang = currentState.settings?.lang || 'en';

  const gameName = escapeHtml(getVal(game.name));

  if (isPtrType) {
    const ptrData = game.ptr || (game.events || []).find(e => e.type === 'ptr');
    const ptrTitle = escapeHtml(getVal(ptrData?.name) || getVal(ptrData?.title) || (lang === 'ru' ? 'PTR Патч 3.2.0' : 'PTR Patch 3.2.0'));
    const startStr = ptrData?.startDate ? formatTooltipDate(ptrData.startDate, lang) : (lang === 'ru' ? '4 авг.' : 'Aug 4');
    const endStr = ptrData?.endDate ? formatTooltipDate(ptrData.endDate, lang) : (lang === 'ru' ? '11 авг.' : 'Aug 11');
    const platforms = ptrData?.platforms ? escapeHtml(getVal(ptrData.platforms)) : (lang === 'ru' ? 'Только ПК (Battle.net / Game Pass)' : 'PC Only (Battle.net / Game Pass)');
    const note = ptrData?.note ? escapeHtml(getVal(ptrData.note)) : (lang === 'ru' ? 'Часть контента S15 скрыта до BlizzCon' : 'Season 15 content held for BlizzCon');

    return `
      <div class="timeline-tooltip__title" style="color: #34d399; font-weight: 700; font-family: var(--font-display);">PTR Test: ${ptrTitle}</div>
      <div class="timeline-tooltip__season" style="color: #a7f3d0; font-size: 0.82rem;">${gameName}</div>
      <div class="timeline-tooltip__detail" style="margin-top: 0.35rem;"><strong>${lang === 'ru' ? 'Старт тестов' : 'PTR Start'}:</strong> ${startStr}</div>
      <div class="timeline-tooltip__detail"><strong>${lang === 'ru' ? 'Завершение' : 'PTR End'}:</strong> ${endStr}</div>
      <div class="timeline-tooltip__detail" style="color: #94a3b8; font-size: 0.75rem; margin-top: 0.2rem; display: flex; align-items: center; gap: 4px;">${getIconSvg('gamepad', { size: 13 })} <span><strong>${lang === 'ru' ? 'Платформы' : 'Platforms'}:</strong> ${platforms}</span></div>
      <div style="font-size: 0.72rem; color: #cbd5e1; margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.15); font-style: italic; display: flex; align-items: flex-start; gap: 4px;">
        <span style="flex-shrink: 0; margin-top: 1px;">${getIconSvg('info', { size: 12 })}</span> <span>${note}</span>
      </div>
    `;
  }
  let seasonName = 'TBA';
  let start = null;
  let end = null;

  if (isNext) {
    seasonName = escapeHtml(getVal(game.nextSeason?.name) || 'TBA');
    start = game.nextSeason?.startDate;
    end = game.nextSeason?.endDate;
  } else if (isHistory) {
    const idx = parseInt(String(seasonType).split('-')[1] || '0', 10);
    const hItem = (game.history || [])[idx] || (game.history || [])[0];
    seasonName = escapeHtml(getVal(hItem?.name) || 'Past Season');
    start = hItem?.startDate;
    end = hItem?.endDate;
  } else {
    seasonName = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
    start = game.currentSeason?.startDate;
    end = game.currentSeason?.endDate || game.nextSeason?.startDate;
  }

  const startStr = start ? formatTooltipDate(start, lang) : 'TBA';
  const endStr = end ? formatTooltipDate(end, lang) : (isNext ? 'TBA' : t('timeline.ongoing') || 'Ongoing');

  let durationStr = '—';
  if (start && end) {
    const diff = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    durationStr = `${diff} ${lang === 'ru' ? 'дней' : 'days'}`;
  }

  let eventsHtml = '';
  if (game.events && game.events.length > 0) {
    const eventsList = game.events.map(ev => {
      const title = escapeHtml(getVal(ev.title));
      const range = ev.startDate ? formatTooltipDate(ev.startDate, lang) : '';
      const isPtr = ev.type === 'ptr';
      const tag = isPtr ? 'PTR' : (ev.type === 'convention' ? 'EVENT' : 'LAUNCH');
      const tagColor = isPtr ? '#34d399' : (ev.type === 'convention' ? '#fbbf24' : '#818cf8');
      return `<div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 0.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;"><span style="color: ${tagColor}; font-weight: 600;">[${tag}] ${title}</span><span style="color: #94a3b8; font-size: 0.72rem;">${range}</span></div>`;
    }).join('');

    eventsHtml = `
      <div style="margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px solid rgba(255,255,255,0.15);">
        <div style="font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-display);">${t('card.upcomingEventsHeader') || (lang === 'ru' ? 'БЛИЖАЙШИЕ ЭТАПЫ И ТЕСТЫ:' : 'UPCOMING STAGES & TESTS:')}</div>
        ${eventsList}
      </div>
    `;
  }

  let verificationNoteHtml = '';
  if (isNext && game.nextSeason?.verificationNote) {
    const rawNote = getVal(game.nextSeason.verificationNote);
    if (rawNote) {
      const escaped = escapeHtml(rawNote).replace(/\n/g, '<br>');
      const headerText = lang === 'ru' ? 'ОБОСНОВАНИЕ ПРОГНОЗА:' : 'FORECAST RATIONALE:';
      verificationNoteHtml = `
        <div style="margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px solid rgba(255,255,255,0.15); font-size: 0.74rem; color: #cbd5e1; line-height: 1.35;">
          <div style="font-size: 0.68rem; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-display); margin-bottom: 0.25rem; display: flex; align-items: center; gap: 4px;">
            ${getIconSvg('lightbulb', { size: 13 })} <span>${headerText}</span>
          </div>
          ${escaped}
        </div>
      `;
    }
  }

  return `
    <div class="timeline-tooltip__title">${gameName}</div>
    <div class="timeline-tooltip__season">${seasonName}</div>
    <div class="timeline-tooltip__detail"><strong>${t('timeline.started') || 'Started'}:</strong> ${startStr}</div>
    <div class="timeline-tooltip__detail"><strong>${t('timeline.ends') || 'Ends'}:</strong> ${endStr}</div>
    <div class="timeline-tooltip__detail"><strong>${t('timeline.duration') || 'Duration'}:</strong> ${durationStr}</div>
    ${verificationNoteHtml}
    ${eventsHtml}
  `;
}

export function attachTimelineTooltipEvents(onGameSelected) {
  const grid = document.querySelector('.timeline-map__grid');
  const tooltip = document.getElementById('timeline-tooltip');
  if (!grid || !tooltip) return;

  if (timelineAbortController) {
    timelineAbortController.abort();
  }
  timelineAbortController = new AbortController();
  const { signal } = timelineAbortController;

  let activeTouch = false;

  grid.addEventListener('mouseover', (e) => {
    if (activeTouch) return;
    const item = e.target.closest('[data-game-id]');
    if (!item) return;

    const gameId = item.getAttribute('data-game-id');
    const seasonType = item.getAttribute('data-season-type');
    const content = getTimelineTooltipContent(gameId, seasonType);
    if (!content) return;

    tooltip.innerHTML = content;
    tooltip.style.display = 'block';
  }, { signal });

  grid.addEventListener('mousemove', (e) => {
    if (activeTouch) return;
    if (tooltip.style.display === 'block') {
      const tooltipWidth = tooltip.offsetWidth || 220;
      const tooltipHeight = tooltip.offsetHeight || 100;
      let left = e.clientX + 15;
      let top = e.clientY + 15;

      if (left + tooltipWidth > window.innerWidth - 10) {
        left = Math.max(10, e.clientX - tooltipWidth - 15);
      }
      if (top + tooltipHeight > window.innerHeight - 10) {
        top = Math.max(10, e.clientY - tooltipHeight - 15);
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
  }, { signal });

  grid.addEventListener('mouseout', (e) => {
    if (activeTouch) return;
    const item = e.target.closest('[data-game-id]');
    if (!item) return;

    const related = e.relatedTarget;
    if (related && item.contains(related)) return;

    tooltip.style.display = 'none';
  }, { signal });

  const handleTimelineClick = (e) => {
    const item = e.target.closest('[data-game-id]');
    if (item) {
      const gameId = item.getAttribute('data-game-id');
      const seasonType = item.getAttribute('data-season-type');
      
      if (e.pointerType === 'touch' || e.detail === 0) {
        activeTouch = true;
        e.stopPropagation();
        
        const content = getTimelineTooltipContent(gameId, seasonType);
        if (!content) return;

        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        
        const rect = item.getBoundingClientRect();
        const tooltipWidth = tooltip.offsetWidth || 180;
        const tooltipHeight = tooltip.offsetHeight || 120;
        
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltipHeight - 10}px`;

        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.left < 10) {
          tooltip.style.left = '10px';
        } else if (tooltipRect.right > window.innerWidth - 10) {
          tooltip.style.left = `${window.innerWidth - tooltipWidth - 10}px`;
        }
        if (tooltipRect.top < 10) {
          tooltip.style.top = `${rect.bottom + 10}px`;
        }
      } else {
        if (gameId && typeof onGameSelected === 'function') {
          onGameSelected(gameId);
        }
      }
    } else {
      tooltip.style.display = 'none';
    }
  };

  grid.addEventListener('click', handleTimelineClick, { signal });
  
  document.addEventListener('click', (e) => {
    if (!grid.contains(e.target)) {
      tooltip.style.display = 'none';
    }
  }, { signal });
}
