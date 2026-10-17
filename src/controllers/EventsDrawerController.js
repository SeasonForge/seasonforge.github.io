import { getState } from '../store/state.js';
import { renderEventDetailContent } from '../desktop/components/EventsTimelineDesktop.js';

let eventsDrawerAbortController = null;
let selectedEventId = null;

export function getSelectedEventId() {
  return selectedEventId;
}

export function closeEventsDrawer() {
  const containers = document.querySelectorAll('.events-dashboard-desktop, .events-dashboard-mobile');
  const drawer = document.getElementById('events-detail-drawer');
  selectedEventId = null;
  if (drawer) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  containers.forEach(container => {
    container.querySelectorAll('.events-timeline__bar.is-selected, .urgent-event-card.is-selected').forEach(el => {
      el.classList.remove('is-selected');
    });
  });
}

export function openEventsDrawer(eventId, eventsData = []) {
  const containers = document.querySelectorAll('.events-dashboard-desktop, .events-dashboard-mobile');
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

  containers.forEach(container => {
    container.querySelectorAll('.events-timeline__bar').forEach(bar => {
      if (bar.dataset.eventId === eventId) {
        bar.classList.add('is-selected');
        bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        bar.classList.remove('is-selected');
      }
    });
    container.querySelectorAll('.urgent-event-card').forEach(card => {
      if (card.dataset.eventId === eventId) {
        card.classList.add('is-selected');
      } else {
        card.classList.remove('is-selected');
      }
    });
  });
}

export function attachEventsDetailDrawer(getEventsData) {
  const containers = document.querySelectorAll('.events-dashboard-desktop, .events-dashboard-mobile');
  const drawer = document.getElementById('events-detail-drawer');
  const drawerContent = document.getElementById('events-detail-drawer-content');

  if (containers.length === 0 || !drawer || !drawerContent) return;

  if (eventsDrawerAbortController) {
    eventsDrawerAbortController.abort();
  }
  eventsDrawerAbortController = new AbortController();
  const { signal } = eventsDrawerAbortController;

  const handleClick = (e) => {
    const trigger = e.target.closest('.events-timeline__bar[data-event-id], .urgent-event-card[data-event-id]');
    if (trigger) {
      const eventId = trigger.dataset.eventId;
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
  };

  containers.forEach(container => {
    container.addEventListener('click', handleClick, { signal });
  });

  document.addEventListener('click', (e) => {
    if (!drawer.classList.contains('is-open')) return;
    if (drawer.contains(e.target)) return;
    if (e.target.closest('.events-timeline__bar, .urgent-event-card')) return;
    closeEventsDrawer();
  }, { signal });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      closeEventsDrawer();
    }
  }, { signal });
}
