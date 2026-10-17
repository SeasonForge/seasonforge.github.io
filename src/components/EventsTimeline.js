/**
 * SeasonForge Dual-UI EventsTimeline Facade Component
 * Renders both Desktop and Mobile optimized timelines for SSG/SEO and zero-CLS CSS switching.
 */

import { render as renderDesktop } from '../desktop/components/EventsTimelineDesktop.js';
import { render as renderMobile } from '../mobile/components/EventsTimelineMobile.js';
import { getIconSvg } from '../utils/icons.js';

export function renderEventsTimeline(eventsList = [], gamesList = [], options = {}) {
  const isEn = (options.lang || 'en') === 'en';
  return `
    <div class="sf-desktop-only">
      ${renderDesktop(eventsList, gamesList, options)}
    </div>
    <div class="sf-mobile-only">
      ${renderMobile(eventsList, gamesList, options)}
    </div>
    <aside id="events-detail-drawer" class="events-detail-drawer" aria-hidden="true" role="region" aria-label="${isEn ? 'Event Details' : 'Информация о событии'}">
      <div class="events-detail-drawer__inner">
        <div class="events-detail-drawer__header">
          <span class="events-detail-drawer__title">
            ${getIconSvg('layers', { size: 15 })}
            <span>${isEn ? 'ABOUT EVENT' : 'О СОБЫТИИ'}</span>
          </span>
          <button type="button" class="events-detail-drawer__close" id="events-detail-drawer-close" aria-label="${isEn ? 'Close' : 'Закрыть'}">
            ${getIconSvg('x', { size: 16 })}
          </button>
        </div>
        <div class="events-detail-drawer__content" id="events-detail-drawer-content">
          <!-- Dynamically populated on timeline bar or card selection -->
        </div>
      </div>
    </aside>
  `;
}

export function EventsTimeline(eventsList, gamesList, options) {
  return renderEventsTimeline(eventsList, gamesList, options);
}
