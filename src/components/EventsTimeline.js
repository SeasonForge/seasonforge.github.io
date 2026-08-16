/**
 * SeasonForge Dual-UI EventsTimeline Facade Component
 * Renders both Desktop and Mobile optimized timelines for SSG/SEO and zero-CLS CSS switching.
 */

import { render as renderDesktop } from '../desktop/components/EventsTimelineDesktop.js';
import { render as renderMobile } from '../mobile/components/EventsTimelineMobile.js';

export function renderEventsTimeline(eventsList = [], gamesList = [], options = {}) {
  return `
    <div class="sf-desktop-only">
      ${renderDesktop(eventsList, gamesList, options)}
    </div>
    <div class="sf-mobile-only">
      ${renderMobile(eventsList, gamesList, options)}
    </div>
  `;
}

export function EventsTimeline(eventsList, gamesList, options) {
  return renderEventsTimeline(eventsList, gamesList, options);
}
