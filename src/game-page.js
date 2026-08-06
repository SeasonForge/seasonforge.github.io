import { SeasonService } from './services/SeasonService.js';
import { getState, setLanguage, setGames, setRawData } from './store/state.js';
import { t, getVal } from './i18n/index.js';
import { render as renderGameCard } from './components/GameCard.js';
import { render as renderProgressBar } from './components/ProgressBar.js';
import { getProgressPercent, calculateCountdown, updateCountdownDOM } from './utils/countdown.js';
import { formatLastUpdated } from './utils/date.js';
import { escapeAttr, escapeHtml } from './utils/helpers.js';
import { initFeedback } from './utils/initFeedback.js';
import { initStreamer } from './utils/initStreamer.js';
import { initMobileAppModal } from './utils/initMobileAppModal.js';
import { setMetaTags } from './utils/seo.js';
import { renderLangSwitcher as renderLangSwitcherComponent } from './components/LangSwitcher.js';
import { Header } from './components/Header.js';
import { ModalManager } from './components/ModalManager.js';
import { MobileNav } from './components/MobileNav.js';
import { trackEvent } from './utils/analytics.js';
import { initOBSOverlay } from './widgets/WidgetRenderer.js';

import { FALLBACK_SEASONS_DATA } from './data/fallback-seasons.js';

// Dynamic relative path for SeasonService based on URL depth
const isSeasonPage = typeof document !== 'undefined' && document.getElementById('game-page-root')?.classList.contains('season-page-root');
const seasonsDataPath = isSeasonPage ? '../../../data/seasons.json' : '../../data/seasons.json';
const seasonService = new SeasonService(seasonsDataPath);

let activeGame = null;
let countdownTimer = null;
let _analyticsPageSourceBound = false;

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
  setMetaTags({ title: pageTitle, description: desc, lang: activeLang });
}

function renderLangSwitcher() {
  const state = getState();
  renderLangSwitcherComponent('lang-switcher', state.settings.lang, (selected) => {
    setLanguage(selected);
    renderApp();
  });
}

function renderApp() {
  const state = getState();
  const activeLang = state.settings?.lang || 'en';

  // 1. Sync lang switcher component & season page translations
  renderLangSwitcher();

  // 2. Always translate shared header, breadcrumbs, footer, tool buttons, and mobile nav
  const appHeaderSubtitle = document.getElementById('app-header-subtitle');
  if (appHeaderSubtitle) appHeaderSubtitle.textContent = t('header.subtitle');
  const lblLastUpdated = document.getElementById('lbl-last-updated');
  if (lblLastUpdated) lblLastUpdated.textContent = t('header.lastUpdated');
  const lblStatusCheck = document.getElementById('lbl-status-check');
  if (lblStatusCheck) lblStatusCheck.innerHTML = `<span class="status-dot"></span> ${t('header.statusCheck')}`;
  const lblDataSource = document.getElementById('lbl-data-source');
  if (lblDataSource) lblDataSource.textContent = t('header.dataSource');
  const lblFooterCopy = document.getElementById('lbl-footer-copy');
  if (lblFooterCopy) lblFooterCopy.textContent = t('footer.copy') || `© 2026 SeasonForge. ${t('header.subtitle')}`;
  const lblFooterChangelog = document.getElementById('lbl-footer-changelog');
  if (lblFooterChangelog) lblFooterChangelog.textContent = t('footer.changelog') || 'Changelog';
  const lblFooterPrivacy = document.getElementById('lbl-footer-privacy');
  if (lblFooterPrivacy) lblFooterPrivacy.textContent = t('footer.privacy') || 'Privacy Policy';

  const breadHome = document.getElementById('breadcrumbs-home');
  if (breadHome) breadHome.textContent = t('breadcrumbs.home');
  const breadGames = document.getElementById('breadcrumbs-games');
  if (breadGames) breadGames.textContent = t('breadcrumbs.games');

  const feedbackBtn = document.getElementById('lbl-feedback-btn');
  if (feedbackBtn) feedbackBtn.textContent = t('feedback.btnLabel');
  const streamerBtn = document.getElementById('lbl-streamer-btn');
  if (streamerBtn) streamerBtn.textContent = t('streamer.btnLabel');
  const mobileAppBtn = document.getElementById('lbl-mobile-app-btn');
  if (mobileAppBtn) mobileAppBtn.textContent = t('mobileApp.headerBtn') || t('mobileApp.btnLabel') || (activeLang === 'ru' ? 'Приложение' : 'App');

  const mobLblTracker = document.getElementById('mob-lbl-tracker');
  if (mobLblTracker) mobLblTracker.textContent = t('navbar.btnCard');
  const mobLblTimeline = document.getElementById('mob-lbl-timeline');
  if (mobLblTimeline) mobLblTimeline.textContent = t('navbar.btnTimeline');
  const mobLblGames = document.getElementById('mob-lbl-games');
  if (mobLblGames) mobLblGames.textContent = t('navbar.btnGames');
  const mobLblMore = document.getElementById('mob-lbl-more');
  if (mobLblMore) mobLblMore.textContent = t('navbar.btnMore');

  // Initialize modular UI components
  const basePath = isSeasonPage ? '../../../' : '../../';
  ModalManager.initAll();
  MobileNav.init({ basePath });
  Header.update({ lang: activeLang });

  const gameRoot = document.getElementById('game-page-root');
  if (gameRoot && gameRoot.classList.contains('season-page-root')) {
    updateSeasonPageTranslations(activeLang);
  }

  if (!activeGame) return;

  // 3. Sync translations & seo tags
  updateSeo(activeGame);

  // Translate About section heading and description
  const lblAboutTitle = document.getElementById('lbl-about-title');
  if (lblAboutTitle) lblAboutTitle.textContent = t('card.aboutTitle');

  const aboutDataEl = document.getElementById('about-translations-data');
  const aboutContent = document.getElementById('about-content');
  if (aboutDataEl && aboutContent) {
    try {
      const data = JSON.parse(aboutDataEl.textContent);
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
      const locale = activeLang === 'ru' ? 'ru-RU' : 'en-US';
      
      const slugify = (str) => String(str || '').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
      const rows = [];
      for (const item of historyData) {
        const seasonName = item.season[activeLang] || item.season.en || '';
        const seasonSlug = item.slug || slugify(item.season.en || seasonName);
        const seasonUrl = `./${seasonSlug}/`;
        const start = item.startDate;
        const end = item.endDate;
        const sourceType = escapeAttr(item.sourceType || 'official_history');
        
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
        const svgExternalIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.85; margin-left: 2px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
        const linkHtml = item.sourceUrl 
          ? `<a href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="history-table__link" data-analytics-source="official_source" data-source-type="${sourceType}" data-date-status="official" data-game-id="${escapeAttr(activeGame.id)}"><span class="lbl-official-source-text">${t('card.readUrl')}</span>${svgExternalIcon}</a>`
          : '—';
          
        rows.push(`
          <tr style="border-bottom: 1px solid #1f2937;">
            <td style="padding: 0.75rem 0.5rem; font-weight: 600;">
              <a href="${escapeAttr(seasonUrl)}" class="history-table__season-link" style="color: #818cf8; text-decoration: none; transition: color 0.2s;">${escapeHtml(seasonName)} →</a>
            </td>
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
      
      const boxes = [];
      for (const item of linksData) {
        const categoryKey = item.category || 'Official';
        const categoryLabel = t(`categories.${categoryKey}`) || categoryKey;
        const label = item.label[activeLang] || item.label.en || '';
        const url = item.url || '#';
        
        boxes.push(`
          <div class="game-card__link-item">
            <span class="game-card__link-category">${escapeHtml(categoryLabel)}</span>
            <a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="game-card__link-anchor">${escapeHtml(label)}</a>
          </div>
        `);
      }
      linksGrid.innerHTML = boxes.join('\n');
    } catch (e) {
      console.error('[Detail Page] Error parsing Links translation data:', e.message);
    }
  }

  // 4. Calculate countdown & progress bar
  const countdown = calculateCountdown(activeGame?.nextSeason?.startDate);
  const progress = getProgressPercent(activeGame);
  const progressBarHtml = renderProgressBar(progress);

  // 5. Render Game Card into game page container (only if on main game detail page, not season page)
  if (activeGame && gameRoot && gameRoot.classList.contains('game-page-content')) {
    gameRoot.innerHTML = renderGameCard(activeGame, { 
      countdown, 
      progressBar: progressBarHtml,
      isDetailPage: true
    });
  } else if (gameRoot && gameRoot.classList.contains('season-page-root')) {
    updateSeasonPageTranslations(activeLang);
  }

  // 6. Update header timestamps
  const lastChecked = state.rawData?.lastCheckedAt || state.lastCheckedAt;
  const checkedEl = document.getElementById('last-checked-time');
  if (checkedEl && lastChecked) {
    checkedEl.textContent = formatLastUpdated(lastChecked, state.settings?.lang);
  }

  const updateTimes = state.games.map(g => new Date(g.status?.updatedAt).getTime()).filter(ts => !Number.isNaN(ts));
  const latestTime = updateTimes.length > 0 ? Math.max(...updateTimes) : null;
  const timeEl = document.getElementById('last-updated-time');
  if (timeEl && latestTime) {
    timeEl.textContent = formatLastUpdated(latestTime, state.settings?.lang);
  }

  // Ensure countdown loop is active for activeGame
  if (activeGame) {
    startCountdownLoop();
  }
}

let isExpiredRendered = false;

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
    // Countdown just expired — full re-render to show "Just Launched" state once
    if (!isExpiredRendered) {
      isExpiredRendered = true;
      renderApp();
    }
    return;
  }

  const countdownValues = calculateCountdown(targetDateStr);
  if (typeof document !== 'undefined') {
    const safeGameId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(activeGame.id) : activeGame.id;
    const cardEl = document.querySelector(`.game-card[data-game-id="${safeGameId}"] .game-card__countdown`);
    if (cardEl) {
      updateCountdownDOM(cardEl, countdownValues);
    }
  }
}

function startCountdownLoop() {
  if (countdownTimer) clearInterval(countdownTimer);
  tickCountdown();
  countdownTimer = window.setInterval(tickCountdown, 1000);
}

async function init() {
  try {
    const rootEl = document.getElementById('game-page-root');
    if (!rootEl) return;

    const gameId = rootEl.getAttribute('data-game-id');
    
    // 1. Immediately set activeGame synchronously from fallback data so countdown ticks instantly on load
    const initialGames = FALLBACK_SEASONS_DATA?.games || [];
    activeGame = initialGames.find(g => g.id === gameId) || null;
    
    // 2. Immediately render UI and start countdown loop without waiting for async fetch
    renderApp();
    if (activeGame) {
      startCountdownLoop();
    }

    // Attach click listener for official date/news sources (once per module)
    if (!_analyticsPageSourceBound) {
      _analyticsPageSourceBound = true;
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-analytics-source="official_source"]');
        if (link) {
          const gId = link.getAttribute('data-game-id');
          const sType = link.getAttribute('data-source-type');
          const dStatus = link.getAttribute('data-date-status');
          if (gId && sType && dStatus) {
            trackEvent('official_source_opened', {
              game_id: gId,
              source_type: sType,
              date_status: dStatus
            });
          }
        }
      });
    }

    // Check overlay parameters
    const params = new URLSearchParams(window.location.search);
    const isOverlay = params.get('overlay') === 'true';
    if (isOverlay) {
      document.body.classList.add('app-layout--overlay');
      initOBSOverlay(initialGames, getState());
      return;
    }

    // 3. Fetch latest seasons asynchronously
    const rawData = await seasonService.loadSeasons().catch(() => null);
    if (rawData?.games) {
      const games = rawData.games;
      setRawData(rawData);
      setGames(games);
      const fetchedActiveGame = games.find(g => g.id === gameId);
      if (fetchedActiveGame) {
        activeGame = fetchedActiveGame;
        renderApp();
        startCountdownLoop();
      }
    }

    if (activeGame) {
      trackEvent('game_page_opened', {
        game_id: activeGame.id,
        game_name: getVal(activeGame.name) || 'Untitled Game'
      });

      const isForecast = activeGame?.nextSeason?.verification === 'estimated' || activeGame?.nextSeason?.verification === 'ai';
      if (isForecast && activeGame?.nextSeason?.startDate) {
        trackEvent('forecast_viewed', {
          game_id: activeGame.id,
          season_name: getVal(activeGame.nextSeason.name) || 'Estimated Season'
        });
      }
    }

  } catch (error) {
    console.error('[Detail Page] Initialization failed:', error.message);
  }
}

function updateSeasonPageTranslations(activeLang) {
  const seasonJsonEl = document.getElementById('season-data-json');
  if (!seasonJsonEl) return;

  try {
    const item = JSON.parse(seasonJsonEl.textContent);
    const isRu = activeLang === 'ru';
    const locale = isRu ? 'ru-RU' : 'en-US';

    // 0. Breadcrumbs & Game Tag
    if (activeGame) {
      const breadGameEl = document.getElementById('breadcrumbs-game');
      if (breadGameEl) breadGameEl.textContent = activeGame.name[activeLang] || activeGame.name.en || '';
      
      const seasonTagEl = document.getElementById('season-game-tag-text');
      if (seasonTagEl) seasonTagEl.textContent = activeGame.name[activeLang] || activeGame.name.en || '';
    }
    const currentSeasonBreadcrumb = document.getElementById('breadcrumbs-season-current');
    if (currentSeasonBreadcrumb && item.season) {
      currentSeasonBreadcrumb.textContent = item.season[activeLang] || item.season.en || '';
    }

    // 1. Season Title
    const titleEl = document.getElementById('season-title');
    if (titleEl && item.season) {
      titleEl.textContent = item.season[activeLang] || item.season.en || '';
    }

    // 2. Season Description (summary)
    const descEl = document.getElementById('season-desc');
    if (descEl && item.summary) {
      descEl.textContent = item.summary[activeLang] || item.summary.en || '';
    }

    // 3. Stat labels and formatted values
    const lblStart = document.getElementById('lbl-stat-start');
    if (lblStart) lblStart.textContent = isRu ? 'Дата начала' : 'Start Date';

    const lblEnd = document.getElementById('lbl-stat-end');
    if (lblEnd) lblEnd.textContent = isRu ? 'Дата окончания' : 'End Date';

    const lblDuration = document.getElementById('lbl-stat-duration');
    if (lblDuration) lblDuration.textContent = isRu ? 'Длительность' : 'Duration';

    const lblLink = document.getElementById('lbl-stat-link');
    if (lblLink) lblLink.textContent = isRu ? 'Анонс' : 'Announcement';

    document.querySelectorAll('.lbl-official-source-text').forEach(el => {
      el.textContent = t('card.readUrl');
    });

    const startValEl = document.getElementById('stat-val-start');
    if (startValEl) {
      startValEl.textContent = item.startDate 
        ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.startDate))
        : (isRu ? 'Уточняется' : 'TBA');
    }

    const endValEl = document.getElementById('stat-val-end');
    if (endValEl) {
      endValEl.textContent = item.endDate 
        ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.endDate))
        : (item.startDate ? (isRu ? 'В процессе' : 'Ongoing') : (isRu ? 'Уточняется' : 'TBA'));
    }

    const durationValEl = document.getElementById('stat-val-duration');
    if (durationValEl) {
      if (item.startDate) {
        if (item.endDate) {
          const diffDays = Math.round((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
          durationValEl.textContent = isRu ? `${diffDays} дн.` : `${diffDays} days`;
        } else {
          durationValEl.textContent = isRu ? 'В процессе' : 'Ongoing';
        }
      } else {
        durationValEl.textContent = '—';
      }
    }

    const badgeContainer = document.getElementById('season-status-badge-container');
    if (badgeContainer) {
      const now = new Date();
      if (item.startDate && new Date(item.startDate) > now) {
        badgeContainer.innerHTML = `<span style="background: rgba(99,102,241,0.15); color: #818cf8; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600;">${isRu ? 'Скоро' : 'Upcoming'}</span>`;
      } else if (!item.endDate && item.startDate) {
        badgeContainer.innerHTML = `<span style="background: rgba(34,197,94,0.15); color: #4ade80; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600;">${isRu ? 'Активный сезон' : 'Active Season'}</span>`;
      } else {
        badgeContainer.innerHTML = `<span style="background: rgba(156,163,175,0.15); color: #9ca3af; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600;">${isRu ? 'Завершен' : 'Ended'}</span>`;
      }
    }

    // 4. Mechanics Title & List
    const mechTitle = document.getElementById('lbl-mechanics-title');
    if (mechTitle) mechTitle.textContent = isRu ? 'Ключевые механики и особенности' : 'Key Mechanics & Features';

    const mechanicsListEl = document.getElementById('mechanics-list');
    if (mechanicsListEl && item.mechanics) {
      const list = item.mechanics[activeLang] || item.mechanics.en || [];
      mechanicsListEl.innerHTML = list.map(m => `<li style="margin-bottom: 0.5rem; color: #d1d5db; line-height: 1.5;">${escapeHtml(m)}</li>`).join('');
    }

    // 5. Rewards Title & List
    const rewTitle = document.getElementById('lbl-rewards-title');
    if (rewTitle) rewTitle.textContent = isRu ? 'Награды за испытания' : 'Challenge Rewards';

    const rewardsListEl = document.getElementById('rewards-list');
    if (rewardsListEl && item.rewards) {
      const list = item.rewards[activeLang] || item.rewards.en || [];
      rewardsListEl.innerHTML = list.map(r => `<li style="margin-bottom: 0.5rem; color: #d1d5db; line-height: 1.5;">${escapeHtml(r)}</li>`).join('');
    }

    // 6. FAQ Section
    const faqTitle = document.getElementById('lbl-faq-title');
    if (faqTitle) faqTitle.textContent = isRu ? 'Часто задаваемые вопросы' : 'Frequently Asked Questions';

    const sName = item.season ? (item.season[activeLang] || item.season.en) : '';
    const gName = activeGame ? (activeGame.name[activeLang] || activeGame.name.en) : '';
    const startFormatted = item.startDate ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.startDate)) : (isRu ? 'Уточняется' : 'TBA');
    
    let durationStr = '—';
    if (item.startDate) {
      if (item.endDate) {
        const diffDays = Math.round((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
        durationStr = isRu ? `${diffDays} дней` : `${diffDays} days`;
      } else {
        durationStr = isRu ? 'В процессе' : 'Ongoing';
      }
    }
    const endFormatted = item.endDate ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.endDate)) : (item.startDate ? (isRu ? 'В процессе' : 'Ongoing') : 'TBA');

    const faqQ1 = document.getElementById('faq-q1');
    if (faqQ1) faqQ1.textContent = isRu ? `Когда началась ${sName}?` : `When did ${sName} start?`;

    const faqA1 = document.getElementById('faq-a1');
    if (faqA1) faqA1.innerHTML = isRu ? `${sName} для ${gName} началась <strong>${startFormatted}</strong>.` : `${sName} for ${gName} started on <strong>${startFormatted}</strong>.`;

    const faqQ2 = document.getElementById('faq-q2');
    if (faqQ2) faqQ2.textContent = isRu ? `Сколько длится ${sName}?` : `How long does ${sName} last?`;

    const faqA2 = document.getElementById('faq-a2');
    if (faqA2) faqA2.innerHTML = isRu ? `Длительность ${sName} составляет <strong>${durationStr}</strong> (Дата окончания: ${endFormatted}).` : `The duration for ${sName} is <strong>${durationStr}</strong> (End date: ${endFormatted}).`;

  } catch (e) {
    console.error('[Detail Page] Error updating season page translations:', e.message);
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}

// Boot page controller
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
