import { CONFIG } from './config.js';
import { SeasonService } from './services/SeasonService.js';
import { getState, setLanguage, setGames } from './store/state.js';
import { t, getVal } from './i18n/index.js';
import { render as renderGameCard } from './components/GameCard.js';
import { render as renderProgressBar } from './components/ProgressBar.js';

// Re-route the seasons database fetch relative to detail subpage
CONFIG.data.seasonsPath = '../../data/seasons.json';

const seasonService = new SeasonService();
let activeGame = null;
let countdownTimer = null;

function getProgressPercent(game) {
  const startDate = game?.currentSeason?.startDate;
  const nextStartDate = game?.nextSeason?.startDate;

  if (!startDate || !nextStartDate) {
    return 0;
  }

  const start = new Date(startDate);
  const nextStart = new Date(nextStartDate);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(nextStart.getTime())) {
    return 0;
  }

  const total = nextStart.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

function formatLastUpdated(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const state = getState();
  const lang = state.settings?.lang || 'en';
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  };

  const formatted = new Intl.DateTimeFormat(locale, options).format(date);
  return `${formatted} UTC`;
}

function updateSeo(game) {
  if (!game) return;
  const gameName = getVal(game.name);
  document.title = `${gameName} - ${t('seo.title')}`;
  document.documentElement.lang = getState().settings?.lang || 'en';
  
  const desc = t('seo.description');
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.setAttribute('content', desc);
  
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', `${gameName} - ${t('seo.title')}`);
  
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', desc);
  
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', `${gameName} - ${t('seo.title')}`);
  
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', desc);
}

function renderLangSwitcher() {
  const switcherRoot = document.getElementById('lang-switcher');
  if (!switcherRoot) return;
  const state = getState();
  const currentLang = state.settings.lang;
  
  switcherRoot.innerHTML = `
    <button class="lang-switcher__btn ${currentLang === 'en' ? 'lang-switcher__btn--active' : ''}" data-lang-val="en">🇺🇸 EN</button>
    <button class="lang-switcher__btn ${currentLang === 'ru' ? 'lang-switcher__btn--active' : ''}" data-lang-val="ru">🇷🇺 RU</button>
  `;
  
  switcherRoot.querySelectorAll('[data-lang-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-lang-val');
      if (selected !== state.settings.lang) {
        setLanguage(selected);
        renderApp();
      }
    });
  });
}

function calculateCountdown(targetDateStr) {
  if (!targetDateStr) return {};
  const targetDate = new Date(targetDateStr);
  if (Number.isNaN(targetDate.getTime())) return {};

  const total = targetDate.getTime() - Date.now();
  if (total <= 0) return {};

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds };
}

function renderApp() {
  if (!activeGame) return;

  // 1. Sync translations & seo tags
  updateSeo(activeGame);
  renderLangSwitcher();

  // 2. Translate header & breadcrumbs
  const appHeaderSubtitle = document.getElementById('app-header-subtitle');
  if (appHeaderSubtitle) appHeaderSubtitle.textContent = t('header.subtitle');
  const lblLastUpdated = document.getElementById('lbl-last-updated');
  if (lblLastUpdated) lblLastUpdated.textContent = t('header.lastUpdated');
  const lblDataSource = document.getElementById('lbl-data-source');
  if (lblDataSource) lblDataSource.textContent = t('header.dataSource');
  const lblFooterText = document.getElementById('lbl-footer-text');
  if (lblFooterText) lblFooterText.textContent = `© 2026 SeasonForge. ${t('header.subtitle')}`;

  const breadHome = document.getElementById('breadcrumbs-home');
  if (breadHome) breadHome.textContent = t('breadcrumbs.home');
  const breadGames = document.getElementById('breadcrumbs-games');
  if (breadGames) breadGames.textContent = t('breadcrumbs.games');

  // Translate About section heading and description
  const lblAboutTitle = document.getElementById('lbl-about-title');
  if (lblAboutTitle) lblAboutTitle.textContent = t('card.aboutTitle');

  const aboutDataEl = document.getElementById('about-translations-data');
  const aboutContent = document.getElementById('about-content');
  if (aboutDataEl && aboutContent) {
    try {
      const data = JSON.parse(aboutDataEl.textContent);
      const activeLang = getState().settings?.lang || 'en';
      aboutContent.textContent = data[activeLang] || data.en || '';
    } catch (e) {
      console.error('[Detail Page] Error parsing About translation data:', e.message);
    }
  }

  // 3. Calculate countdown & progress bar
  const countdown = calculateCountdown(activeGame.nextSeason?.startDate);
  const progress = getProgressPercent(activeGame);
  const progressBarHtml = renderProgressBar(progress);

  // 4. Render Game Card into game page container
  const gameRoot = document.getElementById('game-page-root');
  if (gameRoot) {
    gameRoot.innerHTML = renderGameCard(activeGame, { 
      countdown, 
      progressBar: progressBarHtml,
      isDetailPage: true
    });
  }

  // 5. Update header last updated timestamp
  const state = getState();
  const updateTimes = state.games.map(g => new Date(g.status?.updatedAt).getTime()).filter(t => !Number.isNaN(t));
  const latestTime = updateTimes.length > 0 ? Math.max(...updateTimes) : null;
  const timeEl = document.getElementById('last-updated-time');
  if (timeEl && latestTime) {
    timeEl.textContent = formatLastUpdated(latestTime);
  }
}

async function init() {
  try {
    const rootEl = document.getElementById('game-page-root');
    if (!rootEl) return;
    const gameId = rootEl.getAttribute('data-game-id');
    
    // Fetch all games
    const games = await seasonService.getGames();
    setGames(games);

    // Locate the active game
    activeGame = games.find(g => g.id === gameId);
    if (!activeGame) {
      console.error(`[Detail Page] Game with ID ${gameId} not found in seasons database`);
      return;
    }

    renderApp();

    // Start timer ticking loop
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      renderApp();
    }, 1000);

  } catch (error) {
    console.error('[Detail Page] Initialization failed:', error.message);
  }
}

// Boot page controller
document.addEventListener('DOMContentLoaded', init);
init();
