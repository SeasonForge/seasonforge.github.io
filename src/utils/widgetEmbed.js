/**
 * Utility functions for generating standardized web widget embed URLs and iframe snippets.
 */

export const VALID_WIDGET_TYPES = ['status', 'countdown', 'card'];
export const VALID_WIDGET_THEMES = ['dark', 'light', 'transparent'];
export const VALID_WIDGET_LANGS = ['ru', 'en'];

/**
 * Builds a valid widget URL conforming to the site contract.
 * @param {Object} params
 * @param {string} [params.game='all'] - Game ID or 'all'
 * @param {string} [params.type='status'] - Widget type ('status', 'countdown', 'card')
 * @param {string} [params.theme='dark'] - Color theme ('dark', 'light', 'transparent')
 * @param {string} [params.lang='ru'] - Language ('ru', 'en')
 * @param {string} [params.baseUrl] - Base site URL
 * @returns {string} Fully formatted URL string
 */
export function generateEmbedUrl({
  game = 'all',
  type = 'status',
  theme = 'dark',
  lang = 'ru',
  baseUrl = ''
} = {}) {
  const sanitizedGame = encodeURIComponent(game || 'all');
  const sanitizedType = VALID_WIDGET_TYPES.includes(type) ? type : 'status';
  const sanitizedTheme = VALID_WIDGET_THEMES.includes(theme) ? theme : 'dark';
  const sanitizedLang = VALID_WIDGET_LANGS.includes(lang) ? lang : 'ru';

  const cleanBase = baseUrl ? (baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`) : '';
  const path = `${cleanBase}widget.html`;

  const queryParams = new URLSearchParams();
  queryParams.set('game', sanitizedGame);
  queryParams.set('type', sanitizedType);
  queryParams.set('theme', sanitizedTheme);
  queryParams.set('lang', sanitizedLang);

  return `${path}?${queryParams.toString()}`;
}

/**
 * Generates an HTML <iframe> snippet for embedding on external websites.
 * @param {Object} params
 * @param {string} params.url - Embed widget URL
 * @param {string|number} [params.width='100%'] - Width of iframe (px or %)
 * @param {string|number} [params.height='150'] - Height of iframe (px or %)
 * @param {string} [params.title='SeasonForge Widget'] - Accessible title for iframe
 * @returns {string} Safe HTML iframe snippet string
 */
export function generateIframeCode({
  url = '',
  width = '100%',
  height = '120',
  title = 'SeasonForge Widget'
} = {}) {
  const cleanWidth = typeof width === 'number' ? `${width}px` : (width || '100%');
  const cleanHeight = typeof height === 'number' ? `${height}px` : (height || '120px');
  const cleanTitle = title.replace(/"/g, '&quot;');

  return `<iframe src="${url}" width="${cleanWidth}" height="${cleanHeight}" style="border:0; background:transparent;" allowtransparency="true" referrerpolicy="strict-origin-when-cross-origin" title="${cleanTitle}"></iframe>`;
}
