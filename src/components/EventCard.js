import { getIconSvg } from '../utils/icons.js';
import { escapeHtml, escapeAttr } from '../utils/helpers.js';

const TYPE_ICONS = {
  twitch_drops: 'twitch',
  ptr: 'flask',
  race: 'trophy',
  collab: 'users',
  login: 'gift',
  event: 'calendar'
};

const TYPE_LABELS = {
  twitch_drops: { en: 'Twitch Drops', ru: 'Twitch Drops' },
  ptr: { en: 'PTR / Test Realm', ru: 'Тестовый сервер PTR' },
  race: { en: 'Race / Ladder', ru: 'Гонка / Ладдер' },
  collab: { en: 'Collaboration', ru: 'Коллаборация' },
  login: { en: 'Login Event', ru: 'Логин-ивент' },
  event: { en: 'Event', ru: 'Событие' }
};

const GAME_NAMES = {
  'path-of-exile': 'PoE 1',
  'path-of-exile-2': 'PoE 2',
  'diablo-4': 'Diablo IV',
  'last-epoch': 'Last Epoch',
  'torchlight-infinite': 'Torchlight'
};

export function formatEventDateRange(startDate, endDate, lang = 'en') {
  const isEn = lang === 'en';
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  const startStr = start.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });

  if (!end) {
    return isEn ? `From ${startStr}` : `С ${startStr}`;
  }

  const endStr = end.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });

  return `${startStr} — ${endStr}`;
}

export function renderEventCard(event, { lang = 'en' } = {}) {
  const isEn = lang === 'en';
  const title = isEn ? (event.title_en || event.title_ru) : (event.title_ru || event.title_en);
  const description = isEn ? (event.description_en || event.description_ru) : (event.description_ru || event.description_en);
  const gameName = GAME_NAMES[event.gameId] || event.gameId;

  const typeKey = event.type || 'event';
  const typeIcon = TYPE_ICONS[typeKey] || 'calendar';
  const typeLabel = TYPE_LABELS[typeKey]?.[lang] || typeKey;

  const status = event.status || 'active';
  const isLive = status === 'active';
  const isUpcoming = status === 'upcoming';
  const isEnded = status === 'ended';

  const statusLabel = isLive 
    ? (isEn ? 'Live Now' : 'Идёт сейчас') 
    : isUpcoming 
    ? (isEn ? 'Starts Soon' : 'Скоро начнётся') 
    : (isEn ? 'Ended' : 'Завершено');

  const rewards = Array.isArray(event.rewards) ? event.rewards : [];
  const dateRangeStr = formatEventDateRange(event.startDate, event.endDate, lang);

  const targetDateIso = isLive && event.endDate ? event.endDate : (isUpcoming ? event.startDate : '');

  return `
<div class="event-card status-${escapeAttr(status)}" 
     data-event-id="${escapeAttr(event.id)}" 
     data-game-id="${escapeAttr(event.gameId)}" 
     data-event-type="${escapeAttr(typeKey)}" 
     data-status="${escapeAttr(status)}"
     data-target-date="${escapeAttr(targetDateIso)}">
  
  <div class="event-card-header">
    <div class="event-badges-wrap">
      <span class="event-game-badge">${escapeHtml(gameName)}</span>
      <span class="event-type-badge type-${escapeAttr(typeKey)}">
        ${getIconSvg(typeIcon, { size: 14 })}
        ${escapeHtml(typeLabel)}
      </span>
    </div>
    
    <div class="event-status-wrap status-${escapeAttr(status)}">
      <span class="event-status-dot"></span>
      <span class="event-status-text" data-timer-label>${escapeHtml(statusLabel)}</span>
      ${targetDateIso ? `<span class="event-countdown-ticker" data-countdown-id="${escapeAttr(event.id)}"></span>` : ''}
    </div>
  </div>

  <div class="event-card-body">
    <h3 class="event-card-title">${escapeHtml(title)}</h3>
    ${description ? `<p class="event-card-desc">${escapeHtml(description)}</p>` : ''}

    ${rewards.length > 0 ? `
      <div class="event-rewards-list">
        ${rewards.map(r => `
          <span class="event-reward-chip">
            ${getIconSvg('gift', { size: 12 })}
            ${escapeHtml(r)}
          </span>
        `).join('')}
      </div>
    ` : ''}
  </div>

  <div class="event-card-footer">
    <div class="event-date-range">
      ${getIconSvg('calendar', { size: 14 })}
      <span>${escapeHtml(dateRangeStr)} (UTC)</span>
    </div>

    ${event.sourceUrl ? `
      <a href="${escapeAttr(event.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="event-source-link">
        <span>${isEn ? 'Source' : 'Источник'}</span>
        ${getIconSvg('external-link', { size: 13 })}
      </a>
    ` : ''}
  </div>
</div>
  `.trim();
}
