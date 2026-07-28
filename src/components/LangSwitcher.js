/**
 * Renders language switcher into root container and attaches click listeners.
 * @param {HTMLElement|string} rootElementOrId
 * @param {string} currentLang
 * @param {function(string):void} onLangChange
 */
export function renderLangSwitcher(rootElementOrId, currentLang, onLangChange) {
  const root = typeof rootElementOrId === 'string'
    ? document.getElementById(rootElementOrId)
    : rootElementOrId;

  if (!root) return;

  const nextLang = currentLang === 'ru' ? 'en' : 'ru';
  const label = currentLang === 'ru' ? 'RU' : 'EN';
  const title = currentLang === 'ru' ? 'Switch to English' : 'Переключить на русский';

  root.innerHTML = `
    <button class="lang-switcher__btn lang-switcher__btn--toggle" data-lang-val="${nextLang}" title="${title}">
      🌐 ${label}
    </button>
  `;

  const btn = root.querySelector('[data-lang-val]');
  if (btn) {
    btn.addEventListener('click', () => {
      if (typeof onLangChange === 'function') {
        onLangChange(nextLang);
      }
    });
  }
}
