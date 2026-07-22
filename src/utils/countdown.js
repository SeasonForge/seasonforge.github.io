/**
 * Calculates the progress percentage of the current season (0–100).
 * @param {Object} game
 * @returns {number}
 */
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

/**
 * Calculates the countdown from now to a target date.
 * Returns an empty object when the date is missing or already passed.
 * @param {string} targetDateStr
 * @returns {{ days: number, hours: number, minutes: number, seconds: number } | {}}
 */
export function calculateCountdown(targetDateStr) {
  if (!targetDateStr) return {};
  const targetDate = new Date(targetDateStr);
  if (Number.isNaN(targetDate.getTime())) return {};

  const total = targetDate.getTime() - Date.now();
  if (total <= 0) return {};

  return {
    days:    Math.floor(total / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60)
  };
}

/**
 * Directly updates countdown number elements inside a container element.
 * @param {HTMLElement} container
 * @param {{ days?: number, hours?: number, minutes?: number, seconds?: number }} countdown
 */
export function updateCountdownDOM(container, countdown = {}) {
  if (!container) return;
  const update = (attr, val) => {
    const el = container.querySelector(`[data-countdown="${attr}"]`);
    if (el && val !== undefined) {
      el.textContent = val;
    }
  };
  update('days', countdown.days ?? 0);
  update('hours', countdown.hours ?? 0);
  update('minutes', countdown.minutes ?? 0);
  update('seconds', countdown.seconds ?? 0);
}
