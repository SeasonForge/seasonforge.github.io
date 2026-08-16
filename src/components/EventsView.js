import { renderEventCard } from './EventCard.js';
import { getIconSvg } from '../utils/icons.js';
import { calculateCountdown } from '../utils/countdown.js';

export class EventsView {
  constructor({ containerId = 'events-view-container', lang = 'en', events = [] } = {}) {
    this.containerId = containerId;
    this.lang = lang;
    this.events = events;
    this.activeType = 'all';
    this.activeGames = new Set();
    this.timerId = null;

    this.initFilterState();
  }

  initFilterState() {
    try {
      const saved = localStorage.getItem('sf_selected_games');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.activeGames = new Set(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  startCountdownLoop() {
    this.stopCountdownLoop();

    const updateTickers = () => {
      const tickerElements = document.querySelectorAll('.event-card[data-target-date]');
      const now = new Date();

      tickerElements.forEach(card => {
        const targetIso = card.getAttribute('data-target-date');
        const tickerEl = card.querySelector('.event-countdown-ticker');
        if (!targetIso || !tickerEl) return;

        const targetDate = new Date(targetIso);
        const diffMs = targetDate.getTime() - now.getTime();

        if (diffMs <= 0) {
          tickerEl.textContent = this.lang === 'en' ? ' — Ended' : ' — Завершено';
          return;
        }

        const totalSecs = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);

        if (days > 0) {
          tickerEl.textContent = ` — ${days}d ${hours}h`;
        } else if (hours > 0) {
          tickerEl.textContent = ` — ${hours}h ${mins}m`;
        } else {
          tickerEl.textContent = ` — ${mins}m`;
        }
      });
    };

    updateTickers();
    this.timerId = setInterval(updateTickers, 10000);
  }

  stopCountdownLoop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  renderFiltersHtml() {
    const isEn = this.lang === 'en';
    const pills = [
      { id: 'all', icon: 'filter', label: isEn ? 'All Activities' : 'Все активности' },
      { id: 'twitch_drops', icon: 'twitch', label: 'Twitch Drops' },
      { id: 'ptr', icon: 'flask', label: 'PTR / Betas' },
      { id: 'race', icon: 'trophy', label: isEn ? 'Races & Ladders' : 'Гонки и ладдеры' },
      { id: 'login', icon: 'gift', label: isEn ? 'Login & Rewards' : 'Раздачи и логин' },
      { id: 'collab', icon: 'users', label: isEn ? 'Collabs' : 'Коллаборации' }
    ];

    return `
<div class="events-controls-bar">
  <div class="events-filter-group" id="events-type-filters">
    ${pills.map(p => `
      <button type="button" 
              class="events-filter-pill ${p.id === this.activeType ? 'active' : ''}" 
              data-filter-type="${p.id}">
        ${getIconSvg(p.icon, { size: 14 })}
        <span>${p.label}</span>
      </button>
    `).join('')}
  </div>
</div>
    `.trim();
  }

  renderEventsListHtml() {
    const isEn = this.lang === 'en';
    
    // Filter events
    const filtered = this.events.filter(event => {
      // Type filter
      if (this.activeType !== 'all' && event.type !== this.activeType) {
        return false;
      }
      // Game filter (if any selected)
      if (this.activeGames.size > 0 && !this.activeGames.has(event.gameId)) {
        return false;
      }
      return true;
    });

    const activeEvents = filtered.filter(e => e.status === 'active');
    const upcomingEvents = filtered.filter(e => e.status === 'upcoming');
    const endedEvents = filtered.filter(e => e.status === 'ended');

    if (filtered.length === 0) {
      return `
<div class="events-empty-state">
  <div class="events-empty-icon">${getIconSvg('search', { size: 36 })}</div>
  <p>${isEn ? 'No activities match the selected filters.' : 'Нет событий, соответствующих выбранным фильтрам.'}</p>
</div>
      `.trim();
    }

    return `
      ${activeEvents.length > 0 ? `
        <div class="events-section">
          <h2 class="events-section-title">
            <span class="event-status-dot" style="background: #10b981;"></span>
            <span>${isEn ? 'Active Activities' : 'Активные события'}</span>
            <span class="events-section-count">${activeEvents.length}</span>
          </h2>
          <div class="events-grid">
            ${activeEvents.map(e => renderEventCard(e, { lang: this.lang })).join('')}
          </div>
        </div>
      ` : ''}

      ${upcomingEvents.length > 0 ? `
        <div class="events-section">
          <h2 class="events-section-title">
            <span class="event-status-dot" style="background: #f59e0b;"></span>
            <span>${isEn ? 'Upcoming Activities' : 'Скоро начнутся'}</span>
            <span class="events-section-count">${upcomingEvents.length}</span>
          </h2>
          <div class="events-grid">
            ${upcomingEvents.map(e => renderEventCard(e, { lang: this.lang })).join('')}
          </div>
        </div>
      ` : ''}

      ${endedEvents.length > 0 ? `
        <div class="events-section">
          <h2 class="events-section-title">
            <span class="event-status-dot" style="background: #64748b;"></span>
            <span>${isEn ? 'Recently Ended' : 'Недавно завершённые'}</span>
            <span class="events-section-count">${endedEvents.length}</span>
          </h2>
          <div class="events-grid">
            ${endedEvents.map(e => renderEventCard(e, { lang: this.lang })).join('')}
          </div>
        </div>
      ` : ''}
    `.trim();
  }

  mount(container) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;

    el.innerHTML = `
      ${this.renderFiltersHtml()}
      <div id="events-cards-container">
        ${this.renderEventsListHtml()}
      </div>
    `;

    // Attach filter pill handlers
    const pillButtons = el.querySelectorAll('.events-filter-pill');
    pillButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-filter-type');
        this.activeType = type;

        pillButtons.forEach(b => b.classList.toggle('active', b === btn));
        const cardsEl = document.getElementById('events-cards-container');
        if (cardsEl) {
          cardsEl.innerHTML = this.renderEventsListHtml();
          this.startCountdownLoop();
        }
      });
    });

    this.startCountdownLoop();
  }

  unmount() {
    this.stopCountdownLoop();
  }
}
