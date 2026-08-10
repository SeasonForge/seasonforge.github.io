import { getVal } from '../i18n/index.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderStatusWidget(game, state = {}) {
  if (!game) return '<div class="obs-standalone-widget">Game data unavailable</div>';

  const lang = state.settings?.lang || 'ru';
  const gameName = escapeHtml(getVal(game.name) || 'Game');
  const logoFileName = game.logo || `${game.id}.png`;

  const currentSeason = game.currentSeason || game.seasons?.[0];
  const seasonTitle = currentSeason ? escapeHtml(getVal(currentSeason.title) || getVal(currentSeason.name) || getVal(currentSeason.league) || 'Current Season') : 'Active Season';
  const numPrefix = currentSeason?.number ? `${currentSeason.number}: ` : '';

  const nextSeason = game.nextSeason;

  let progressPercent = 50;
  const start = currentSeason?.startDate ? new Date(currentSeason.startDate).getTime() : 0;
  const end = (currentSeason?.endDate ? new Date(currentSeason.endDate).getTime() : 0) || (nextSeason?.startDate ? new Date(nextSeason.startDate).getTime() : 0);
  const now = Date.now();

  if (start && end && end > start) {
    progressPercent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  } else if (start) {
    const estDuration = 90 * 24 * 60 * 60 * 1000;
    progressPercent = Math.min(100, Math.max(0, Math.round(((now - start) / estDuration) * 100)));
  }

  return `
    <div class="obs-standalone-widget obs-standalone-widget--status">
      <div class="obs-standalone-widget__content">
        <div class="obs-standalone-widget__header">
          <div class="obs-standalone-widget__game-group">
            <img src="./assets/logos/${logoFileName}" alt="${gameName}" class="obs-standalone-widget__game-logo-img" onerror="this.style.display='none'" />
            <h2 class="obs-standalone-widget__game-title">${gameName}</h2>
          </div>
          <span class="obs-widget-pill obs-widget-pill--active">● ${lang === 'ru' ? 'В ИГРЕ' : 'LIVE'}</span>
        </div>

        <div>
          <div class="obs-widget-season-name">${numPrefix}${seasonTitle}</div>
          <div class="obs-widget-progress-row">
            <div class="obs-widget-progress-track">
              <div class="obs-widget-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <span class="obs-widget-progress-val">${progressPercent}%</span>
          </div>
        </div>

        <div class="obs-widget-footer" style="margin-top: 0.2rem;">
          <div></div>
          <a href="https://seasonforge.online" target="_blank" rel="noopener noreferrer" class="obs-widget-brand-pill" style="text-decoration: none; color: inherit;">
            <span class="obs-widget-brand-dot"></span>
            <span>SEASONFORGE.ONLINE</span>
          </a>
        </div>
      </div>
    </div>
  `;
}
