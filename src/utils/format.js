/**
 * Truncates a string to a maximum character length, appending an ellipsis if needed.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 100) {
  if (!str || str.length <= maxLength) return str || '';
  return `${str.slice(0, maxLength).trimEnd()}\u2026`;
}

/**
 * Formats a number as an ordinal string (1st, 2nd, 3rd, etc.).
 * @param {number} n
 * @returns {string}
 */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
