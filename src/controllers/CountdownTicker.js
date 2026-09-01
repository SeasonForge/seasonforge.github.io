import { getState } from '../store/state.js';
import { calculateCountdown, updateCountdownDOM } from '../utils/countdown.js';

let countdownTimer = null;
const expiredGameCountdowns = new Set();
const expiredUpcomingCountdowns = new Set();

export function tickCountdown(onExpire) {
  if (typeof document !== 'undefined' && !document.querySelector('[data-countdown]')) return;
  const state = getState();
  const games = state.games || [];

  // 1. Update Game Cards & Upcoming Launch Cards
  games.forEach((game) => {
    const targetDateStr = game.nextSeason?.startDate;
    if (!targetDateStr) return;

    const targetDate = new Date(targetDateStr);
    const now = new Date();
    if (targetDate <= now) {
      if (!expiredGameCountdowns.has(game.id) || !expiredUpcomingCountdowns.has(game.id)) {
        expiredGameCountdowns.add(game.id);
        expiredUpcomingCountdowns.add(game.id);
        if (typeof onExpire === 'function') {
          onExpire();
        }
      }
      return;
    }

    const countdownValues = calculateCountdown(targetDateStr);
    const safeGameId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(game.id) : game.id;

    // Update Game Cards (Desktop & Mobile)
    const cardEls = document.querySelectorAll(`.game-card[data-game-id="${safeGameId}"] .game-card__countdown`);
    cardEls.forEach(cardEl => {
      updateCountdownDOM(cardEl, countdownValues);
    });

    // Update Upcoming Launches Cards (Desktop, Mobile, Home)
    const upcomingEls = document.querySelectorAll(
      `.upcoming-card[data-game-id="${safeGameId}"] .upcoming-card__countdown, .upcoming-card[data-game-countdown="${safeGameId}"] .upcoming-card__countdown, [data-game-countdown="${safeGameId}"] .upcoming-card__countdown`
    );
    upcomingEls.forEach(el => {
      updateCountdownDOM(el, countdownValues);
    });
  });

  // 2. Update Urgent Event Card Countdowns
  const urgentCountdowns = document.querySelectorAll('.urgent-event-card__countdown[data-countdown-target]');
  if (urgentCountdowns.length > 0) {
    const now = Date.now();
    urgentCountdowns.forEach(el => {
      const target = Number(el.getAttribute('data-countdown-target'));
      if (!target) return;
      const diffMs = Math.max(0, target - now);
      const totalSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);

      const daysEl = el.querySelector('[data-countdown="days"]');
      const hoursEl = el.querySelector('[data-countdown="hours"]');
      const minsEl = el.querySelector('[data-countdown="minutes"]');

      if (daysEl) daysEl.textContent = days;
      if (hoursEl) hoursEl.textContent = hours;
      if (minsEl) minsEl.textContent = mins;
    });
  }

  // 3. Update Event Detail Drawer Countdown
  const drawerCountdown = document.querySelector('.events-detail-status-row[data-countdown-target], .events-detail-countdown[data-countdown-target]');
  if (drawerCountdown) {
    const target = Number(drawerCountdown.getAttribute('data-countdown-target'));
    const displayEl = drawerCountdown.querySelector('[data-countdown-display]');
    if (target && displayEl) {
      const now = Date.now();
      const diffMs = Math.max(0, target - now);
      const totalSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);

      const isEn = (getState().settings?.lang || 'en') === 'en';
      let formatted = '';
      if (days > 0) {
        formatted = isEn ? `${days}d ${hours}h ${mins}m` : `${days}д ${hours}ч ${mins}м`;
      } else if (hours > 0) {
        formatted = isEn ? `${hours}h ${mins}m` : `${hours}ч ${mins}м`;
      } else {
        formatted = isEn ? `${mins}m` : `${mins}м`;
      }

      const currentText = displayEl.textContent.trim();
      let prefix = '';
      if (currentText.startsWith('Starts in')) prefix = 'Starts in ';
      else if (currentText.startsWith('Ends soon in')) prefix = 'Ends soon in ';
      else if (currentText.startsWith('Ends in')) prefix = 'Ends in ';
      else if (currentText.startsWith('Начнётся через')) prefix = 'Начнётся через ';
      else if (currentText.startsWith('Скоро завершится через')) prefix = 'Скоро завершится через ';
      else if (currentText.startsWith('Завершится через')) prefix = 'Завершится через ';

      displayEl.textContent = `${prefix}${formatted}`;
    }
  }
}

export function startCountdownLoop(onExpire) {
  if (countdownTimer) return;
  tickCountdown(onExpire);
  countdownTimer = window.setInterval(() => tickCountdown(onExpire), 1000);
}

export function stopCountdownLoop() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}
