import { getIconSvg } from '../../utils/icons.js';
import { getVal } from '../../i18n/index.js';
import { escapeHtml } from '../../utils/helpers.js';

export function renderVe4HbluWidget(game, state = {}) {
  const lang = state.settings?.lang || 'ru';
  const gameName = escapeHtml(game ? getVal(game.name) : 'Last Epoch');
  const avatarPath = './assets/streamers/ve4hblu-avatar.webp';
  const bgPath = './assets/streamers/ve4hblu-bg.webp';

  // Current Season Info
  const currentSeason = game?.currentSeason || game?.seasons?.[0];
  const currentTitle = currentSeason ? escapeHtml(getVal(currentSeason.title) || getVal(currentSeason.name) || getVal(currentSeason.league) || 'Cycle 4: Shattered Omens') : 'Cycle 4: Shattered Omens';
  const numPrefix = currentSeason?.number ? `${currentSeason.number}: ` : '';

  // Next Season Info
  const nextSeason = game?.nextSeason;
  const nextTitle = nextSeason ? escapeHtml(getVal(nextSeason.title) || getVal(nextSeason.name) || 'Cycle 5 (Estimated)') : 'Cycle 5 (Estimated)';

  // Format Launch Date
  let launchDateFormatted = 'OCT 7, 2026';
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

  const calendarSvg = getIconSvg('calendar', { size: 14, class: 'obs-widget-svg-icon' });
  const hourglassSvg = getIconSvg('hourglass', { size: 13, class: 'obs-widget-svg-icon' });

  return `
    <div class="obs-standalone-widget obs-standalone-widget--ve4hblu">
      <div class="obs-standalone-widget__bg" style="background-image: url('${bgPath}');"></div>
      <div class="obs-standalone-widget__overlay"></div>
      
      <div class="obs-standalone-widget__content">
        <!-- Top Header: Avatar + Title + Streamer Nick -->
        <div class="obs-standalone-widget__header">
          <div class="obs-standalone-widget__game-group">
            <img src="${avatarPath}" alt="Ve4Hblu" class="obs-ve4hblu-avatar" />
            <h2 class="obs-standalone-widget__game-title">${gameName}</h2>
          </div>
          <div class="obs-ve4hblu-nick-badge">Ve4Hblu</div>
        </div>

        <!-- Current Season Section -->
        <div class="obs-widget-current-group">
          <div class="obs-widget-section-label">
            <span>${lang === 'ru' ? 'ТЕКУЩИЙ СЕЗОН / ЛИГА' : 'CURRENT SEASON / LEAGUE'}:</span>
            <strong class="obs-widget-season-name obs-ve4hblu-current-title">${numPrefix}${currentTitle}</strong>
          </div>
          
          <div class="obs-widget-progress-row">
            <div class="obs-widget-progress-track obs-ve4hblu-progress-track">
              <div class="obs-widget-progress-fill obs-ve4hblu-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <span class="obs-widget-progress-val obs-ve4hblu-percent">${progressPercent}%</span>
          </div>
        </div>

        <!-- Next Season & Countdown Section -->
        <div class="obs-widget-next-group obs-ve4hblu-next-group">
          <div class="obs-widget-section-label">
            <span style="display: flex; align-items: center; gap: 0.35rem; color: #c084fc;">
              <span class="obs-widget-icon-wrap" style="color: #c084fc;">${hourglassSvg}</span>
              <span>${lang === 'ru' ? 'СЛЕДУЮЩИЙ СЕЗОН' : 'NEXT SEASON'}</span>
            </span>
          </div>
          <div class="obs-widget-next-title">${nextTitle}</div>

          <!-- 4 Countdown Blocks -->
          <div class="obs-widget-countdown-grid" id="obs-countdown-grid" data-target="${nextSeason?.startDate || '2026-10-07'}">
            <div class="obs-widget-countdown-box obs-ve4hblu-box">
              <strong id="obs-cnt-days">00</strong>
              <span>${lang === 'ru' ? 'ДНЕЙ' : 'DAYS'}</span>
            </div>
            <div class="obs-widget-countdown-box obs-ve4hblu-box">
              <strong id="obs-cnt-hours">00</strong>
              <span>${lang === 'ru' ? 'ЧАСОВ' : 'HOURS'}</span>
            </div>
            <div class="obs-widget-countdown-box obs-ve4hblu-box">
              <strong id="obs-cnt-min">00</strong>
              <span>${lang === 'ru' ? 'МИН' : 'MIN'}</span>
            </div>
            <div class="obs-widget-countdown-box obs-ve4hblu-box">
              <strong id="obs-cnt-sec">00</strong>
              <span>${lang === 'ru' ? 'СЕК' : 'SEC'}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="obs-widget-footer">
          <div class="obs-widget-launch-date">
            <span class="obs-widget-icon-wrap" style="color: #c084fc;">${calendarSvg}</span>
            <span>${lang === 'ru' ? 'Запуск' : 'Launch'}: ${launchDateFormatted}</span>
          </div>
          <div class="obs-widget-brand-pill obs-ve4hblu-brand">
            <span class="obs-widget-brand-dot obs-ve4hblu-dot"></span>
            <span>SEASONFORGE.ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
