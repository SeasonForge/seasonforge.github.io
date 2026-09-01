import { t, getVal } from '../i18n/index.js';
import { escapeHtml } from '../utils/helpers.js';
import { getIconSvg } from '../utils/icons.js';

export function renderGamesCatalog(games = [], { basePath = './' } = {}) {
  const catalogCards = games.map(game => {
    const id = game.id;
    const name = escapeHtml(getVal(game.name) || 'Untitled Game');
    const currentSeason = escapeHtml(getVal(game.currentSeason?.name) || 'TBA');
    const statusCode = game.status?.code || 'active';
    const statusLabel = escapeHtml(t(`statuses.${statusCode}`) || game.status?.label || 'Active');
    const color = escapeHtml(game.color || '#6366f1');
    const logo = game.logo ? escapeHtml(game.logo) : '';
    
    const iconHtml = logo 
      ? `<img src="${basePath}assets/logos/${logo}" alt="${name}" class="catalog-card__logo" />`
      : getIconSvg(game.icon || 'skull', { size: 22, class: 'catalog-card__svg' });
      
    return `
      <a class="catalog-card" href="${basePath}games/${id}/" style="--game-color: ${color};">
        <div class="catalog-card__main">
          <div class="catalog-card__icon">${iconHtml}</div>
          <div class="catalog-card__info">
            <div class="catalog-card__top">
              <h3 class="catalog-card__name">${name}</h3>
              <span class="game-card__pill game-card__pill--${statusCode}">${statusLabel.toUpperCase()}</span>
            </div>
            <p class="catalog-card__season">${t('card.currentSeasonLabel')}: <strong>${currentSeason}</strong></p>
          </div>
        </div>
        <div class="catalog-card__action">
          <span>${t('card.gamePageLinkTitle') || 'Page'}</span>
          <span class="catalog-card__arrow">→</span>
        </div>
      </a>
    `;
  }).join('');

  return `
    <div class="games-catalog">
      <h2 class="games-catalog__title">
        <span style="display: inline-flex; vertical-align: -2px; margin-right: 6px;">${getIconSvg('gamepad', { size: 20 })}</span>${t('navbar.btnGames') || 'Games'}
      </h2>
      <div class="games-catalog__grid">${catalogCards}</div>
    </div>
  `;
}
