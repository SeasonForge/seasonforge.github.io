import { t, getVal } from '../i18n/index.js';

// Render navigation from a list of games and an active game.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function render(games = [], activeGame = null, activeView = 'card') {
  const items = Array.isArray(games) ? games : [];
  const activeId = activeGame?.id || activeGame?.slug || '';

  const links = items
    .map((game) => {
      const id = game.id || game.slug || '';
      const name = escapeHtml(getVal(game.name) || 'Untitled Game');
      const currentSeason = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
      const statusCode = game.status?.code || 'active';
      const statusLabel = escapeHtml(t(`statuses.${statusCode}`) || game.status?.label || 'Active');
      const color = escapeHtml(game.color || '#6366f1');
      const icon = escapeHtml(game.icon || '🎮');
      
      const isActive = activeId && id === activeId;
      const activeClass = isActive ? 'navbar__link--active' : '';

      return `
        <div class="navbar__tab ${activeClass}" data-game-id="${escapeHtml(id)}" style="--tab-color: ${color};">
          <div class="navbar__tab-main">
            <div class="navbar__tab-icon">${icon}</div>
            <div class="navbar__tab-copy">
              <h3 class="navbar__name">${name}</h3>
              <p class="navbar__season">${currentSeason}</p>
            </div>
          </div>
          <span class="navbar__status navbar__status--${statusCode}">${statusLabel}</span>
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
    </section>
  `;
}

export function Navbar(games, activeGame, activeView) {
  return render(games, activeGame, activeView);
}
