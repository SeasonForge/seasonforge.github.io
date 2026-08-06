import { renderFullCardWidget } from './FullCardWidget.js';
import { renderStatusWidget } from './StatusWidget.js';
import { renderCountdownWidget } from './CountdownWidget.js';
import { renderTimelineWidget } from './TimelineWidget.js';

let countdownTimerInterval = null;

export function initOBSOverlay(games = [], state = {}) {
  // Ensure obs-widgets.css is loaded in head
  ensureWidgetStylesheet();

  const params = new URLSearchParams(window.location.search);
  const widgetType = params.get('widget') || params.get('type') || 'fullcard';
  const gameId = params.get('game') || '';
  
  const container = document.getElementById('content') || document.body;
  if (!container) return;

  const matchedGame = games.find(g => g.id === gameId) || games[0];

  let widgetHtml = '';
  if (widgetType === 'timeline') {
    widgetHtml = renderTimelineWidget(games, state);
  } else if (widgetType === 'status') {
    widgetHtml = renderStatusWidget(matchedGame, state);
  } else if (widgetType === 'countdown') {
    widgetHtml = renderCountdownWidget(matchedGame, state);
  } else {
    // Default or 'card' / 'fullcard'
    widgetHtml = renderFullCardWidget(matchedGame, state);
  }

  container.innerHTML = widgetHtml;

  // Start live ticking countdown if grid exists
  startLiveCountdown();
}

function ensureWidgetStylesheet() {
  if (document.getElementById('obs-widgets-stylesheet')) return;
  const link = document.createElement('link');
  link.id = 'obs-widgets-stylesheet';
  link.rel = 'stylesheet';
  link.href = '/src/styles/obs-widgets.css';
  document.head.appendChild(link);
}

function startLiveCountdown() {
  if (countdownTimerInterval) clearInterval(countdownTimerInterval);

  const grid = document.getElementById('obs-countdown-grid');
  if (!grid) return;

  const targetStr = grid.getAttribute('data-target');
  if (!targetStr) return;

  const targetTime = new Date(targetStr).getTime();
  if (Number.isNaN(targetTime)) return;

  const daysEl = document.getElementById('obs-cnt-days');
  const hoursEl = document.getElementById('obs-cnt-hours');
  const minEl = document.getElementById('obs-cnt-min');
  const secEl = document.getElementById('obs-cnt-sec');

  const update = () => {
    const now = Date.now();
    const diff = Math.max(0, targetTime - now);

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
    if (minEl) minEl.textContent = String(m).padStart(2, '0');
    if (secEl) secEl.textContent = String(s).padStart(2, '0');
  };

  update();
  countdownTimerInterval = setInterval(update, 1000);
}
