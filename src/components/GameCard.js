/**
 * SeasonForge Dual-UI GameCard Facade Component
 * Renders both Desktop and Mobile optimized cards for SSG/SEO and responsive CSS switching.
 */

import { render as renderDesktop } from '../desktop/components/GameCardDesktop.js';
import { render as renderMobile } from '../mobile/components/GameCardMobile.js';

export function render(game = {}, options = {}) {
  return `
    <div class="sf-desktop-only">
      ${renderDesktop(game, options)}
    </div>
    <div class="sf-mobile-only">
      ${renderMobile(game, options)}
    </div>
  `;
}

/**
 * Binds event delegation for GameCard interactive elements.
 * Call once after rendering cards into a container.
 * @param {HTMLElement} container - Parent element containing rendered cards
 */
export function bindGameCardEvents(container) {
  if (!container || container.dataset.gcEventsBound) return;
  container.dataset.gcEventsBound = 'true';

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="toggle-features"]');
    if (!btn) return;

    const body = btn.parentElement.nextElementSibling;
    if (!body) return;

    const isExpanded = body.classList.toggle('game-card__features-body--open');
    btn.classList.toggle('game-card__features-toggle-btn--open', isExpanded);
    btn.textContent = isExpanded ? btn.dataset.labelHide : btn.dataset.labelShow;
  });
}

export function GameCard(game, options) {
  return render(game, options);
}
