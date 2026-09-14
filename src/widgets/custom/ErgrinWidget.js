import { getIconSvg } from '../../utils/icons.js';
import { getVal } from '../../i18n/index.js';
import { escapeHtml } from '../../utils/helpers.js';

export function renderErgrinWidget(game, state = {}) {
  const lang = state.settings?.lang || 'ru';
  const gameName = escapeHtml(game ? getVal(game.name) : 'Diablo IV');
  const avatarPath = '/assets/streamers/ergrin-avatar.webp';
  const bgPath = '/assets/streamers/ergrin-bg.webp';

  // Next Season Info
  const nextSeason = game?.nextSeason;
  const nextTitle = nextSeason ? escapeHtml(getVal(nextSeason.title) || getVal(nextSeason.name) || 'Next Season') : 'Next Season';

  // Format Launch Date
  let launchDateFormatted = 'TBA';
  if (nextSeason?.startDate) {
    try {
      const d = new Date(nextSeason.startDate);
      launchDateFormatted = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).toUpperCase();
    } catch (e) {
      launchDateFormatted = nextSeason.startDate;
    }
  }

  const calendarSvg = getIconSvg('calendar', { size: 14, class: 'obs-widget-svg-icon' });
  const hourglassSvg = getIconSvg('hourglass', { size: 13, class: 'obs-widget-svg-icon' });

  const customOpacity = state.bgOpacity !== undefined && state.bgOpacity !== null ? ` opacity: ${state.bgOpacity / 100};` : '';

  return `
    <div class="obs-standalone-widget obs-standalone-widget--ergrin">
      <div class="obs-standalone-widget__bg" style="background-image: url('${bgPath}');${customOpacity}"></div>
      <div class="obs-standalone-widget__overlay"></div>
      
      <div class="obs-standalone-widget__content">
        <!-- Header: Avatar + Game + Nick -->
        <div class="obs-standalone-widget__header">
          <div class="obs-standalone-widget__game-group">
            <img src="${avatarPath}" alt="ErgrinTheRed" class="obs-ergrin-avatar" />
            <h2 class="obs-standalone-widget__game-title">${gameName}</h2>
          </div>
          <div class="obs-ergrin-nick-badge">ErgrinTheRed</div>
        </div>

        <!-- Countdown Section -->
        <div class="obs-widget-next-group obs-ergrin-next-group">
          <div class="obs-widget-section-label">
            <span style="display: flex; align-items: center; gap: 0.35rem; color: #ef4444;">
              <span class="obs-widget-icon-wrap" style="color: #ef4444;">${hourglassSvg}</span>
              <span>${lang === 'ru' ? 'СЛЕДУЮЩИЙ СЕЗОН' : 'NEXT SEASON'}</span>
            </span>
          </div>
          <div class="obs-widget-next-title">${nextTitle}</div>

          <div class="obs-widget-countdown-grid" id="obs-countdown-grid" data-target="${nextSeason?.startDate || ''}">
            <div class="obs-widget-countdown-box obs-ergrin-box">
              <strong id="obs-cnt-days">00</strong>
              <span>${lang === 'ru' ? 'ДНЕЙ' : 'DAYS'}</span>
            </div>
            <div class="obs-widget-countdown-box obs-ergrin-box">
              <strong id="obs-cnt-hours">00</strong>
              <span>${lang === 'ru' ? 'ЧАСОВ' : 'HOURS'}</span>
            </div>
            <div class="obs-widget-countdown-box obs-ergrin-box">
              <strong id="obs-cnt-min">00</strong>
              <span>${lang === 'ru' ? 'МИН' : 'MIN'}</span>
            </div>
            <div class="obs-widget-countdown-box obs-ergrin-box">
              <strong id="obs-cnt-sec">00</strong>
              <span>${lang === 'ru' ? 'СЕК' : 'SEC'}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="obs-widget-footer">
          <div class="obs-widget-launch-date">
            <span class="obs-widget-icon-wrap" style="color: #ef4444;">${calendarSvg}</span>
            <span>${lang === 'ru' ? 'Запуск' : 'Launch'}: ${launchDateFormatted}</span>
          </div>
          <div class="obs-widget-brand-pill obs-ergrin-brand">
            <span class="obs-widget-brand-dot obs-ergrin-dot"></span>
            <span>SEASONFORGE.ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
