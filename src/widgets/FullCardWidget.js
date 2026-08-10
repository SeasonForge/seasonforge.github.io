import { getIconSvg } from '../utils/icons.js';
import { getVal } from '../i18n/index.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderFullCardWidget(game, state = {}) {
  if (!game) return '<div class="obs-standalone-widget">Game data unavailable</div>';

  const lang = state.settings?.lang || 'ru';
  const gameName = escapeHtml(getVal(game.name) || 'Game');
  const gameIconSvg = game.icon ? getIconSvg(game.icon, { size: 24 }) : getIconSvg('gamepad', { size: 24 });
  const bgImage = game.cardImage || game.heroImage || `./assets/images/cards/${game.id}.webp`;
  const logoFileName = game.logo || `${game.id}.png`;

  // Current Season Info
  const currentSeason = game.currentSeason || game.seasons?.[0];
  const currentTitle = currentSeason ? escapeHtml(getVal(currentSeason.title) || getVal(currentSeason.name) || getVal(currentSeason.league) || 'Active Season') : (lang === 'ru' ? 'Текущий сезон' : 'Active Season');
  const numPrefix = currentSeason?.number ? `${currentSeason.number}: ` : '';

  // Next Season Info
  const nextSeason = game.nextSeason;
  const nextTitle = nextSeason ? escapeHtml(getVal(nextSeason.title) || getVal(nextSeason.name) || 'Next Season') : (lang === 'ru' ? 'Следующий сезон' : 'Upcoming Season');
  const isForecast = nextSeason?.isForecast ?? true;
  const badgeLabel = isForecast ? (lang === 'ru' ? 'ПРОГНОЗ' : 'FORECAST') : (lang === 'ru' ? 'ИДЁТ СЕЙЧАС' : 'IN PROGRESS');
  const badgeClass = isForecast ? 'obs-widget-pill--forecast' : 'obs-widget-pill--in_progress';

  // Format Launch Date
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

  // Calculate Progress Percentage
  let progressPercent = 50;
  const start = currentSeason?.startDate ? new Date(currentSeason.startDate).getTime() : 0;
  const end = (currentSeason?.endDate ? new Date(currentSeason.endDate).getTime() : 0) || (nextSeason?.startDate ? new Date(nextSeason.startDate).getTime() : 0);
  const now = Date.now();

  if (start && end && end > start) {
    progressPercent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  } else if (start) {
    const estDuration = 90 * 24 * 60 * 60 * 1000; // ~90 days default
    progressPercent = Math.min(100, Math.max(0, Math.round(((now - start) / estDuration) * 100)));
  }

  const customOpacity = state.bgOpacity !== undefined && state.bgOpacity !== null ? ` opacity: ${state.bgOpacity / 100};` : '';
  const bgStyle = `style="background-image: url('${bgImage}');${customOpacity}"`;

  return `
    <div class="obs-standalone-widget obs-standalone-widget--fullcard">
      <div class="obs-standalone-widget__bg" ${bgStyle}></div>
      <div class="obs-standalone-widget__overlay"></div>
      
      <div class="obs-standalone-widget__content">
        <!-- Top Header -->
        <div class="obs-standalone-widget__header">
          <div class="obs-standalone-widget__game-group">
            <img src="./assets/logos/${logoFileName}" alt="${gameName}" class="obs-standalone-widget__game-logo-img" onerror="this.style.display='none'" />
            <h2 class="obs-standalone-widget__game-title">${gameName}</h2>
          </div>
          <span class="obs-widget-pill ${badgeClass}">${badgeLabel}</span>
        </div>

        <!-- Current Season Section -->
        <div class="obs-widget-current-group">
          <div class="obs-widget-section-label">${lang === 'ru' ? 'ТЕКУЩИЙ СЕЗОН / ЛИГА' : 'CURRENT SEASON / LEAGUE'}</div>
          <div class="obs-widget-season-name">${numPrefix}${currentTitle}</div>
          
          <div class="obs-widget-progress-row">
            <div class="obs-widget-progress-track">
              <div class="obs-widget-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <span class="obs-widget-progress-val">${progressPercent}%</span>
          </div>
        </div>

        <!-- Next Season & Countdown Section -->
        <div class="obs-widget-next-group">
          <div class="obs-widget-section-label">${lang === 'ru' ? 'СЛЕДУЮЩИЙ СЕЗОН' : 'NEXT SEASON'}</div>
          <div class="obs-widget-next-title">${nextTitle}</div>

          <!-- 4 Countdown Blocks -->
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

        <!-- Footer -->
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
