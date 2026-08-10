import { t, getVal } from '../i18n/index.js';
import { getState } from '../store/state.js';
import { calculateDynamicStatus } from '../utils/status.js';
import { escapeHtml } from '../utils/helpers.js';
import { getIconSvg } from '../utils/icons.js';


export function render(games = [], activeGame = null, activeView = 'card') {
  const items = Array.isArray(games) ? games : [];
  const activeId = activeGame?.id || activeGame?.slug || '';
  const now = new Date();
  const state = getState ? getState() : {};
  const lang = state.settings?.lang || (typeof document !== 'undefined' ? document.documentElement.lang : 'en') || 'en';

  let newestGameId = null;
  let minAgeMs = Infinity;

  items.forEach((g) => {
    if (g.currentSeason?.startDate) {
      const st = new Date(g.currentSeason.startDate);
      if (!Number.isNaN(st.getTime()) && st.getTime() <= now.getTime()) {
        const age = now.getTime() - st.getTime();
        if (age < minAgeMs) {
          minAgeMs = age;
          newestGameId = g.id || g.slug;
        }
      }
    }
  });

  const links = items
    .map((game) => {
      const id = game.id || game.slug || '';
      const name = escapeHtml(getVal(game.name) || 'Untitled Game');
      const currentSeason = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
      
      let statusCode = id === newestGameId ? 'newest' : calculateDynamicStatus(game);
      const statusLabel = escapeHtml(t(`statuses.${statusCode}`) || game.status?.label || 'Active');
      const color = escapeHtml(game.color || '#6366f1');
      const icon = escapeHtml(game.icon || '🎮');
      const logo = game.logo ? escapeHtml(game.logo) : '';
      
      let ptrBadge = '';
      if (game.ptr || (game.events && game.events.some(e => e.type === 'ptr'))) {
        const ptrItem = game.ptr || game.events.find(e => e.type === 'ptr');
        let datePart = lang === 'ru' ? '4 АВГ' : 'AUG 4';
        if (ptrItem?.startDate) {
          const d = new Date(ptrItem.startDate);
          if (!Number.isNaN(d.getTime())) {
            const monthNames = lang === 'ru' 
              ? ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК']
              : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const m = monthNames[d.getMonth()];
            const day = d.getDate();
            datePart = lang === 'ru' ? `${day} ${m}` : `${m} ${day}`;
          }
        }
        ptrBadge = `<span class="navbar__status navbar__status--ptr">PTR ${datePart}</span>`;
      }

      const isActive = (activeView === 'card' || activeView === 'game') && activeId && id === activeId;
      const activeClass = isActive ? 'navbar__link--active' : '';

      const iconHtml = logo 
        ? `<img src="./assets/logos/${logo}" alt="${name}" class="navbar__tab-logo" />`
        : getIconSvg(game.icon, { size: 18, class: 'navbar__tab-svg' });

      return `
        <div class="navbar__tab ${activeClass}" data-game-id="${escapeHtml(id)}" style="--tab-color: ${color};">
          <div class="navbar__tab-main">
            <div class="navbar__tab-icon">${iconHtml}</div>
            <div class="navbar__tab-copy">
              <h3 class="navbar__name">${name}</h3>
              <p class="navbar__season">${currentSeason}</p>
            </div>
          </div>
          <div class="navbar__status-stack">
            ${ptrBadge}
            <span class="navbar__status navbar__status--${statusCode}">${statusLabel}</span>
          </div>
        </div>
      `;
    })
    .join('');

  const cardBtnClass = activeView === 'card' ? 'navbar-panel__action--active' : '';
  const timelineBtnClass = activeView === 'timeline' ? 'navbar-panel__action--active' : 'navbar-panel__action--secondary';

  return `
    <section class="navbar-panel">
      <div class="navbar-panel__header">
        <div>
          <p class="navbar-panel__eyebrow">${t('navbar.eyebrow')}</p>
          <h2 class="navbar-panel__title">SeasonForge</h2>
        </div>
        <div class="navbar-panel__icon" style="padding: 0; overflow: hidden; background: transparent; border: none;">
          <img src="./assets/favicon.png" alt="SeasonForge Icon" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" />
        </div>
      </div>
      <p class="navbar-panel__caption">${t('navbar.caption')}</p>
      <div class="navbar__list">${links}</div>
      <div class="navbar-panel__footer">
        <button id="view-card-btn" class="navbar-panel__action ${cardBtnClass}">${t('navbar.btnCard')}</button>
        <button id="view-timeline-btn" class="navbar-panel__action ${timelineBtnClass}">${t('navbar.btnTimeline')}</button>
      </div>
      
      <div class="navbar-app-card">
        <div class="navbar-app-card__header">
          <span class="navbar-app-card__badge">${t('mobileApp.badge')}</span>
          <h3 class="navbar-app-card__title">${getIconSvg('smartphone', { size: 16 })} ${t('mobileApp.title')}</h3>
        </div>
        <p class="navbar-app-card__desc">${t('mobileApp.desc')}</p>
        <div class="navbar-app-card__actions">
          <a href="https://github.com/SeasonForge/SeasonForgeMobile/releases/latest" target="_blank" rel="noopener noreferrer" class="navbar-app-card__btn-download">
            ${getIconSvg('copy', { size: 14 })} ${t('mobileApp.btnDownload')}
          </a>
          <button class="navbar-app-card__btn-guide mobile-app-trigger-btn">
            ${getIconSvg('lightbulb', { size: 14 })} ${t('mobileApp.btnGuide')}
          </button>
        </div>
      </div>
    </section>
  `;
}

export function Navbar(games, activeGame, activeView) {
  return render(games, activeGame, activeView);
}
