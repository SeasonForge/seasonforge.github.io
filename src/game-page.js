import { SeasonService } from './services/SeasonService.js';
import { getState, setLanguage, setGames } from './store/state.js';
import { t, getVal } from './i18n/index.js';
import { render as renderGameCard } from './components/GameCard.js';
import { render as renderProgressBar } from './components/ProgressBar.js';
import { getProgressPercent, calculateCountdown } from './utils/countdown.js';
import { formatLastUpdated } from './utils/date.js';
import { escapeAttr } from './utils/helpers.js';
import { initFeedback } from './utils/initFeedback.js';
import { initStreamer } from './utils/initStreamer.js';

// SeasonService receives the path directly to avoid mutating the shared CONFIG object
const seasonService = new SeasonService('../../data/seasons.json');
let activeGame = null;
let countdownTimer = null;



function updateSeo(game) {
  if (!game) return;
  const gameName = getVal(game.name);
  const activeLang = getState().settings?.lang || 'en';
  
  // Construct dynamic description
  const currentSeasonName = getVal(game.currentSeason?.name, activeLang) || 'TBA';
  const nextSeasonName = getVal(game.nextSeason?.name, activeLang) || 'TBA';
  const nextSeasonStart = game.nextSeason?.startDate || '';
  
  let desc = '';
  if (activeLang === 'ru') {
    desc = `Следите за сезонами ${gameName}. Текущий сезон: ${currentSeasonName}. `;
    if (nextSeasonStart) {
      desc += `Следующий сезон: ${nextSeasonName} начнется ${nextSeasonStart}. `;
    } else {
      desc += `Следующий сезон: ${nextSeasonName} (дата уточняется). `;
    }
    desc += `Таймеры обратного отсчета, хронология и ссылки.`;
  } else {
    desc = `Track ${gameName} seasons. Current: ${currentSeasonName}. `;
    if (nextSeasonStart) {
      desc += `Next season: ${nextSeasonName} starts on ${nextSeasonStart}. `;
    } else {
      desc += `Next season: ${nextSeasonName} date TBA. `;
    }
    desc += `Live countdowns, history timeline, and links.`;
  }

  const pageTitle = `${gameName} - ${activeLang === 'ru' ? 'Мониторинг Сезонов' : 'ARPG Season Tracker'}`;
  document.title = pageTitle;
  document.documentElement.lang = activeLang;
  
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.setAttribute('content', desc);
  
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', pageTitle);
  
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', desc);
  
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', pageTitle);
  
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', desc);
}

function renderLangSwitcher() {
  const switcherRoot = document.getElementById('lang-switcher');
  if (!switcherRoot) return;
  const state = getState();
  const currentLang = state.settings.lang;
  
  switcherRoot.innerHTML = `
    <button class="lang-switcher__btn ${currentLang === 'en' ? 'lang-switcher__btn--active' : ''}" data-lang-val="en">
      <img src="https://flagcdn.com/w20/us.png" class="lang-switcher__flag" alt="EN"> EN
    </button>
    <button class="lang-switcher__btn ${currentLang === 'ru' ? 'lang-switcher__btn--active' : ''}" data-lang-val="ru">
      <img src="https://flagcdn.com/w20/ru.png" class="lang-switcher__flag" alt="RU"> RU
    </button>
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

  // Translate Timeline Section headings
  const lblHistoryTitle = document.getElementById('lbl-history-title');
  if (lblHistoryTitle) lblHistoryTitle.textContent = t('card.historyTitle');
  const lblThSeason = document.getElementById('lbl-th-season');
  if (lblThSeason) lblThSeason.textContent = t('card.thSeason');
  const lblThStart = document.getElementById('lbl-th-start');
  if (lblThStart) lblThStart.textContent = t('card.thStart');
  const lblThEnd = document.getElementById('lbl-th-end');
  if (lblThEnd) lblThEnd.textContent = t('card.thEnd');
  const lblThDuration = document.getElementById('lbl-th-duration');
  if (lblThDuration) lblThDuration.textContent = t('card.thDuration');
  const lblThLink = document.getElementById('lbl-th-link');
  if (lblThLink) lblThLink.textContent = t('card.thLink');

  // Hydrate Timeline Table rows dynamically
  const historyDataEl = document.getElementById('history-translations-data');
  const historyTableBody = document.getElementById('history-table-body');
  if (historyDataEl && historyTableBody) {
    try {
      const historyData = JSON.parse(historyDataEl.textContent);
      const activeLang = getState().settings?.lang || 'en';
      const locale = activeLang === 'ru' ? 'ru-RU' : 'en-US';
      
      const rows = [];
      for (const item of historyData) {
        const seasonName = item.season[activeLang] || item.season.en || '';
        const start = item.startDate;
        const end = item.endDate;
        
        let durationStr = '—';
        if (start) {
          const startDateObj = new Date(start);
          if (end) {
            const endDateObj = new Date(end);
            const diffDays = Math.round((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
            durationStr = `${diffDays} ${t('card.days')}`;
          } else {
            durationStr = t('card.ongoing');
          }
        }
        
        const formattedStart = start ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(start)) : '—';
        const formattedEnd = end ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(end)) : '—';
        const linkHtml = item.sourceUrl 
          ? `<a href="${escapeAttr(item.sourceUrl)}" target="_blank" class="history-table__link">${t('card.readUrl')}</a>` 
          : '—';
          
        rows.push(`
          <tr style="border-bottom: 1px solid #1f2937;">
            <td style="padding: 0.75rem 0.5rem; font-weight: 600; color: #ffffff;">${seasonName}</td>
            <td style="padding: 0.75rem 0.5rem;">${formattedStart}</td>
            <td style="padding: 0.75rem 0.5rem;">${formattedEnd}</td>
            <td style="padding: 0.75rem 0.5rem;">${durationStr}</td>
            <td style="padding: 0.75rem 0.5rem;">${linkHtml}</td>
          </tr>
        `);
      }
      historyTableBody.innerHTML = rows.join('\n');
    } catch (e) {
      console.error('[Detail Page] Error parsing Timeline translation data:', e.message);
    }
  }
  // Translate Useful Links Section headings and content
  const lblLinksTitle = document.getElementById('lbl-links-title');
  if (lblLinksTitle) lblLinksTitle.textContent = t('card.linksTitle');

  const linksDataEl = document.getElementById('links-translations-data');
  const linksGrid = document.getElementById('links-grid');
  if (linksDataEl && linksGrid) {
    try {
      const linksData = JSON.parse(linksDataEl.textContent);
      const activeLang = getState().settings?.lang || 'en';
      
      const boxes = [];
      for (const item of linksData) {
        const categoryKey = item.category || 'Official';
        const categoryLabel = t(`categories.${categoryKey}`) || categoryKey;
        const label = item.label[activeLang] || item.label.en || '';
        const url = item.url || '#';
        
        boxes.push(`
          <div class="game-card__link-item">
            <span class="game-card__link-category">${categoryLabel}</span>
            <a href="${escapeAttr(url)}" target="_blank" class="game-card__link-anchor">${label}</a>
          </div>
        `);
      }
      linksGrid.innerHTML = boxes.join('\n');
    } catch (e) {
      console.error('[Detail Page] Error parsing Links translation data:', e.message);
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
    timeEl.textContent = formatLastUpdated(latestTime, state.settings?.lang);
  }

  const feedbackBtn = document.getElementById('lbl-feedback-btn');
  if (feedbackBtn) {
    feedbackBtn.textContent = t('feedback.btnLabel');
  }

  const streamerBtn = document.getElementById('lbl-streamer-btn');
  if (streamerBtn) {
    streamerBtn.textContent = t('streamer.btnLabel');
  }

  initFeedback(() => activeGame?.id || 'None');
  initStreamer(state.games);
}

/**
 * Updates only the countdown number elements in the DOM without a full re-render.
 * Falls back to a full renderApp() when the countdown expires (state change).
 */
function tickCountdown() {
  if (!activeGame) return;

  const targetDateStr = activeGame.nextSeason?.startDate;
  if (!targetDateStr) return; // TBA — no live countdown to maintain

  const targetDate = new Date(targetDateStr);
  if (targetDate <= new Date()) {
    // Countdown just expired — full re-render to show "Just Launched" state
    renderApp();
    return;
  }

  const total = targetDate.getTime() - Date.now();
  const update = (attr, val) => {
    const el = document.querySelector(`[data-countdown="${attr}"]`);
    if (el) el.textContent = val;
  };
  update('days',    Math.floor(total / (1000 * 60 * 60 * 24)));
  update('hours',   Math.floor((total / (1000 * 60 * 60)) % 24));
  update('minutes', Math.floor((total / (1000 * 60)) % 60));
  update('seconds', Math.floor((total / 1000) % 60));
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

    // Check overlay parameters
    const params = new URLSearchParams(window.location.search);
    const isOverlay = params.get('overlay') === 'true';
    if (isOverlay) {
      document.body.classList.add('app-layout--overlay');
      const type = params.get('type') || 'status';
      document.body.classList.add(`overlay-type-${type}`);
    }

    renderApp();

    // Start targeted countdown ticker — updates only the 4 number nodes per second
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(tickCountdown, 1000);

  } catch (error) {
    console.error('[Detail Page] Initialization failed:', error.message);
  }
}

// Boot page controller
init();
