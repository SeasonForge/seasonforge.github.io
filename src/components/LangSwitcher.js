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
    <button class="header-neon-btn lang-switcher__btn lang-switcher__btn--toggle" data-lang-val="${nextLang}" title="${title}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      <span>${label}</span>
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
