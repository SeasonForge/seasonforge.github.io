import { getState } from '../store/state.js';
import { renderEventDetailContent } from '../desktop/components/EventsTimelineDesktop.js';

let eventsDrawerAbortController = null;
let selectedEventId = null;

export function getSelectedEventId() {
  return selectedEventId;
}

export function closeEventsDrawer() {
  const container = document.querySelector('.events-dashboard-desktop');
  const drawer = document.getElementById('events-detail-drawer');
  selectedEventId = null;
  if (drawer) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (container) {
    container.querySelectorAll('.events-timeline__bar.is-selected').forEach(bar => {
      bar.classList.remove('is-selected');
    });
  }
}

export function openEventsDrawer(eventId, eventsData = []) {
  const container = document.querySelector('.events-dashboard-desktop');
  const drawer = document.getElementById('events-detail-drawer');
  const drawerContent = document.getElementById('events-detail-drawer-content');

  const event = eventsData.find(e => e.id === eventId) || 
                (getState().games || []).flatMap(g => g.events || []).find(e => e.id === eventId);
  if (!event || !drawer || !drawerContent) return;

  selectedEventId = eventId;
  const state = getState();
  const lang = state.settings?.lang || 'en';
  const isEventsPage = typeof window !== 'undefined' && window.location.pathname.includes('/events');
  const basePath = isEventsPage ? '../' : './';

  drawerContent.innerHTML = renderEventDetailContent(event, { lang, basePath });
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');

  if (container) {
    container.querySelectorAll('.events-timeline__bar').forEach(bar => {
      if (bar.dataset.eventId === eventId) {
        bar.classList.add('is-selected');
        bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        bar.classList.remove('is-selected');
      }
    });
  }
}

export function attachEventsDetailDrawer(getEventsData) {
  const container = document.querySelector('.events-dashboard-desktop');
  const drawer = document.getElementById('events-detail-drawer');
  const drawerContent = document.getElementById('events-detail-drawer-content');

  if (!container || !drawer || !drawerContent) return;

  if (eventsDrawerAbortController) {
    eventsDrawerAbortController.abort();
  }
  eventsDrawerAbortController = new AbortController();
  const { signal } = eventsDrawerAbortController;

  container.addEventListener('click', (e) => {
    const bar = e.target.closest('.events-timeline__bar[data-event-id]');
    if (bar) {
      const eventId = bar.dataset.eventId;
      if (selectedEventId === eventId) {
        closeEventsDrawer();
      } else {
        const events = typeof getEventsData === 'function' ? getEventsData() : [];
        openEventsDrawer(eventId, events);
      }
      return;
    }

    if (e.target.closest('#events-detail-drawer-close')) {
      closeEventsDrawer();
    }
  }, { signal });

  document.addEventListener('click', (e) => {
    if (!drawer.classList.contains('is-open')) return;
    if (drawer.contains(e.target)) return;
    if (e.target.closest('.events-timeline__bar')) return;
    closeEventsDrawer();
  }, { signal });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      closeEventsDrawer();
    }
  }, { signal });
}
