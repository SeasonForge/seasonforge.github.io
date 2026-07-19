export function getProgressPercent(game) {
  const startDate = game?.currentSeason?.startDate;
  const nextStartDate = game?.nextSeason?.startDate;

  if (!startDate || !nextStartDate) return 0;

  const start = new Date(startDate);
  const nextStart = new Date(nextStartDate);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(nextStart.getTime())) return 0;

  const total = nextStart.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

export function formatLastUpdated(timestamp, lang = 'en') {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  };

  const formatted = new Intl.DateTimeFormat(locale, options).format(date);
  return `${formatted} UTC`;
}

export function calculateCountdown(targetDateStr) {
  if (!targetDateStr) return {};
  const targetDate = new Date(targetDateStr);
  if (Number.isNaN(targetDate.getTime())) return {};

  const total = targetDate.getTime() - Date.now();
  if (total <= 0) return {};

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds };
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(value) {
  return escapeHtml(value);
}
