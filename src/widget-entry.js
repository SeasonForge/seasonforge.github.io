import { VALID_WIDGET_TYPES, VALID_WIDGET_THEMES, VALID_WIDGET_LANGS } from './utils/widgetEmbed.js';
import { renderFullCardWidget } from './widgets/FullCardWidget.js';
import { renderStatusWidget } from './widgets/StatusWidget.js';
import { renderCountdownWidget } from './widgets/CountdownWidget.js';
import { renderTimelineWidget } from './widgets/TimelineWidget.js';
import { FALLBACK_SEASONS_DATA } from './data/fallback-seasons.js';

let countdownTimerInterval = null;

async function initWidgetPage() {
  const params = new URLSearchParams(window.location.search);
  
  const gameParam = params.get('game') || 'all';
  const rawType = params.get('type') || 'status';
  const rawTheme = params.get('theme') || 'dark';
  const rawLang = params.get('lang') || 'ru';

  const type = VALID_WIDGET_TYPES.includes(rawType) ? rawType : 'status';
  const theme = VALID_WIDGET_THEMES.includes(rawTheme) ? rawTheme : 'dark';
  const lang = VALID_WIDGET_LANGS.includes(rawLang) ? rawLang : 'ru';

  // Apply theme styling to body
  document.body.classList.remove('theme-dark', 'theme-light', 'theme-transparent');
  document.body.classList.add(`theme-${theme}`);

  if (theme === 'transparent') {
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
  } else if (theme === 'light') {
    document.body.style.backgroundColor = '#f8fafc';
    document.body.style.color = '#0f172a';
  } else {
    document.body.style.backgroundColor = '#0b0f19';
    document.body.style.color = '#f8fafc';
  }

  // Load Seasons Data
  let games = FALLBACK_SEASONS_DATA?.games || [];
  try {
    const res = await fetch('/data/seasons.json');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.games)) {
        games = data.games;
      }
    }
  } catch (err) {
    console.warn('Using fallback data for widget:', err);
  }

  const container = document.getElementById('widget-root') || document.body;
  const stateObj = { settings: { lang } };

  const matchedGame = games.find(g => g.id === gameParam) || games[0];

  let html = '';
  if (type === 'timeline') {
    html = renderTimelineWidget(games, stateObj);
  } else if (type === 'countdown') {
    html = renderCountdownWidget(matchedGame, stateObj);
  } else if (type === 'card') {
    html = renderFullCardWidget(matchedGame, stateObj);
  } else {
    html = renderStatusWidget(matchedGame, stateObj);
  }

  container.innerHTML = html;

  // Start live ticking timer
  const grid = document.getElementById('obs-countdown-grid');
  if (grid) {
    const targetStr = grid.getAttribute('data-target');
    if (targetStr) {
      const targetTime = new Date(targetStr).getTime();
      if (!Number.isNaN(targetTime)) {
        const update = () => {
          const now = Date.now();
          const diff = Math.max(0, targetTime - now);

          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const m = Math.floor((diff / (1000 * 60)) % 60);
          const s = Math.floor((diff / 1000) % 60);

          const daysEl = document.getElementById('obs-cnt-days');
          const hoursEl = document.getElementById('obs-cnt-hours');
          const minEl = document.getElementById('obs-cnt-min');
          const secEl = document.getElementById('obs-cnt-sec');

          if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
          if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
          if (minEl) minEl.textContent = String(m).padStart(2, '0');
          if (secEl) secEl.textContent = String(s).padStart(2, '0');
        };
        update();
        if (countdownTimerInterval) clearInterval(countdownTimerInterval);
        countdownTimerInterval = setInterval(update, 1000);
      }
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidgetPage);
} else {
  initWidgetPage();
}
