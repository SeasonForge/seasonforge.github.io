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

  root.innerHTML = `
    <button class="lang-switcher__btn ${currentLang === 'en' ? 'lang-switcher__btn--active' : ''}" data-lang-val="en">
      <img src="https://flagcdn.com/w20/us.png" class="lang-switcher__flag" alt="EN"> EN
    </button>
    <button class="lang-switcher__btn ${currentLang === 'ru' ? 'lang-switcher__btn--active' : ''}" data-lang-val="ru">
      <img src="https://flagcdn.com/w20/ru.png" class="lang-switcher__flag" alt="RU"> RU
    </button>
  `;

  root.querySelectorAll('[data-lang-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-lang-val');
      if (selected && selected !== currentLang && typeof onLangChange === 'function') {
        onLangChange(selected);
      }
    });
  });
}
