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

export function GameCard(game, options) {
  return render(game, options);
}
