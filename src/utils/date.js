import { getState } from '../store/state.js';

/**
 * Formats a date string into a localized human-readable date.
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
export function formatLocalDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const state = getState();
  const lang = state.settings?.lang || 'en';
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

/**
 * Formats a timestamp into a localized date+time string with UTC suffix.
 * @param {string|number} timestamp
 * @returns {string}
 */
export function formatLastUpdated(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);

  const state = getState();
  const lang = state.settings?.lang || 'en';
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  const formatted = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }).format(date);

  return `${formatted} UTC`;
}
