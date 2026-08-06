import { getIconSvg } from '../utils/icons.js';
import { getVal } from '../i18n/index.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderCountdownWidget(game, state = {}) {
  if (!game) return '<div class="obs-standalone-widget">Game data unavailable</div>';

  const lang = state.settings?.lang || 'ru';
  const gameName = escapeHtml(getVal(game.name) || 'Game');
  const gameIconSvg = game.icon ? getIconSvg(game.icon, { size: 22 }) : getIconSvg('gamepad', { size: 22 });

  const nextSeason = game.nextSeason;
  const nextTitle = nextSeason ? escapeHtml(getVal(nextSeason.title) || getVal(nextSeason.name) || 'Next Season') : (lang === 'ru' ? 'Ожидаемый сезон' : 'Upcoming Season');

  let launchDateFormatted = '';
  if (nextSeason?.startDate) {
    try {
      const d = new Date(nextSeason.startDate);
      launchDateFormatted = d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).toUpperCase();
    } catch (e) {
      launchDateFormatted = nextSeason.startDate;
    }
  }

  return `
    <div class="obs-standalone-widget obs-standalone-widget--countdown">
      <div class="obs-standalone-widget__content">
        <div class="obs-standalone-widget__header">
          <div class="obs-standalone-widget__game-group">
            <span class="obs-standalone-widget__game-icon">${gameIconSvg}</span>
            <h2 class="obs-standalone-widget__game-title">${gameName}</h2>
          </div>
          <span class="obs-widget-pill obs-widget-pill--forecast">COUNTDOWN</span>
        </div>

        <div>
          <div class="obs-widget-section-label">⏳ ${lang === 'ru' ? 'СЛЕДУЮЩИЙ СЕЗОН' : 'NEXT SEASON'}</div>
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
            <span>📅</span>
            <span>${lang === 'ru' ? 'Старт' : 'Starts'}: ${launchDateFormatted || 'TBA'}</span>
          </div>
          <div class="obs-widget-brand-pill">
            <span class="obs-widget-brand-dot"></span>
            <span>SEASONFORGE.ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
