/**
 * Calculates dynamic seasonal status based on progress percentage and dates.
 * 
 * Rules:
 * 1. Special statuses preserve their priority (early-access, in-development, maintenance, ptr).
 * 2. If start date is invalid or missing -> return game.status.code or 'active'.
 * 3. If current date < start date -> 'upcoming'.
 * 4. Progress P = (now - start) / (end - start) * 100%.
 *    If end date is missing -> assume 90 days default duration from start date.
 * 5. If P < 15% -> 'just-started' (Только стартовал)
 * 6. If 15% <= P < 60% -> 'in-progress' (В разгаре)
 * 7. If 60% <= P < 85% -> 'late-season' (Поздний сезон)
 * 8. If 85% <= P <= 100% -> 'final-days' (Финальные дни)
 * 9. If P > 100% -> 'ended' (Завершился / Ожидание)
 */

export function calculateDynamicStatus(game = {}) {
  const specialStatuses = ['early-access', 'in-development', 'maintenance', 'ptr'];
  const rawCode = game.status?.code;

  if (specialStatuses.includes(rawCode)) {
    return rawCode;
  }

  const startDateStr = game.currentSeason?.startDate;
  if (!startDateStr) {
    return rawCode || 'active';
  }

  const startMs = new Date(startDateStr).getTime();
  if (Number.isNaN(startMs)) {
    return rawCode || 'active';
  }

  const nowMs = Date.now();

  if (nowMs < startMs) {
    return 'upcoming';
  }

  let endMs;
  if (game.currentSeason?.endDate) {
    endMs = new Date(game.currentSeason.endDate).getTime();
  }
  if (!endMs || Number.isNaN(endMs)) {
    // Fallback if nextSeason has a known startDate
    if (game.nextSeason?.startDate) {
      const nextStartMs = new Date(game.nextSeason.startDate).getTime();
      if (!Number.isNaN(nextStartMs) && nextStartMs > startMs) {
        endMs = nextStartMs;
      }
    }
  }

  if (!endMs || Number.isNaN(endMs)) {
    // Default 90 days duration
    endMs = startMs + 90 * 24 * 60 * 60 * 1000;
  }

  if (nowMs > endMs) {
    return 'ended';
  }

  const ageMs = nowMs - startMs;
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  // Week 1 & 2 (0–14 days): Fresh season phase
  if (ageMs <= FOURTEEN_DAYS_MS) {
    return 'just-started';
  }

  const totalDuration = endMs - startMs;
  if (totalDuration <= 0) {
    return 'in-progress';
  }

  const progressPercent = (ageMs / totalDuration) * 100;

  if (progressPercent < 60) {
    return 'in-progress';
  }
  if (progressPercent < 85) {
    return 'late-season';
  }
  return 'final-days';
}
