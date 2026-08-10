import { getVal } from '../i18n/index.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderCountdownWidget(game, state = {}) {
  if (!game) return '<div class="obs-standalone-widget">Game data unavailable</div>';

  const lang = state.settings?.lang || 'ru';
  const gameName = escapeHtml(getVal(game.name) || 'Game');
  const logoFileName = game.logo || `${game.id}.png`;

  const nextSeason = game.nextSeason;
  const nextTitle = nextSeason ? escapeHtml(getVal(nextSeason.title) || getVal(nextSeason.name) || 'Next Season') : (lang === 'ru' ? 'Ожидаемый сезон' : 'Upcoming Season');

  let launchDateFormatted = '';
  if (nextSeason?.startDate) {
    try {
      const d = new Date(nextSeason.startDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      launchDateFormatted = `${day}.${month}.${year}`;
    } catch (e) {
      launchDateFormatted = nextSeason.startDate;
    }
  }

  return `
    <div class="obs-standalone-widget obs-standalone-widget--countdown">
      <div class="obs-standalone-widget__content">
        <div class="obs-standalone-widget__header">
          <div class="obs-standalone-widget__game-group">
            <img src="./assets/logos/${logoFileName}" alt="${gameName}" class="obs-standalone-widget__game-logo-img" onerror="this.style.display='none'" />
            <h2 class="obs-standalone-widget__game-title">${gameName}</h2>
          </div>
          <span class="obs-widget-pill obs-widget-pill--forecast">COUNTDOWN</span>
        </div>

        <div>
          <div class="obs-widget-section-label">${lang === 'ru' ? 'СЛЕДУЮЩИЙ СЕЗОН' : 'NEXT SEASON'}</div>
          <div class="obs-widget-next-title">${nextTitle}</div>

          <div class="obs-widget-countdown-grid" id="obs-countdown-grid" data-target="${nextSeason?.startDate || ''}">
            <div class="obs-widget-countdown-box">
              <strong id="obs-cnt-days">00</strong>
              <span>${lang === 'ru' ? 'ДНЕЙ' : 'DAYS'}</span>
            </div>
            <div class="obs-widget-countdown-box">
              <strong id="obs-cnt-hours">00</strong>
              <span>${lang === 'ru' ? 'ЧАСОВ' : 'HOURS'}</span>
            </div>
            <div class="obs-widget-countdown-box">
              <strong id="obs-cnt-min">00</strong>
              <span>${lang === 'ru' ? 'МИН' : 'MIN'}</span>
            </div>
            <div class="obs-widget-countdown-box">
              <strong id="obs-cnt-sec">00</strong>
              <span>${lang === 'ru' ? 'СЕК' : 'SEC'}</span>
            </div>
          </div>
        </div>

        <div class="obs-widget-footer">
          <div class="obs-widget-launch-date">
            <span>${lang === 'ru' ? 'Старт' : 'Starts'}: ${launchDateFormatted || 'TBA'}</span>
          </div>
          <a href="https://seasonforge.online" target="_blank" rel="noopener noreferrer" class="obs-widget-brand-pill" style="text-decoration: none; color: inherit;">
            <span class="obs-widget-brand-dot"></span>
            <span>SEASONFORGE.ONLINE</span>
          </a>
        </div>
      </div>
    </div>
  `;
}
