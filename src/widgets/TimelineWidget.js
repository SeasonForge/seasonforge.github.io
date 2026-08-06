import { getIconSvg } from '../utils/icons.js';
import { getVal } from '../i18n/index.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderTimelineWidget(games = [], state = {}) {
  const lang = state.settings?.lang || 'ru';

  const rowsHtml = (games || []).map(g => {
    const name = escapeHtml(getVal(g.name));
    const iconSvg = g.icon ? getIconSvg(g.icon, { size: 18 }) : getIconSvg('gamepad', { size: 18 });
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: rgba(30, 41, 59, 0.6); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="color: #a78bfa;">${iconSvg}</span>
          <span style="font-weight: 700; font-size: 0.9rem; color: #f8fafc;">${name}</span>
        </div>
        <div style="height: 6px; flex: 1; margin: 0 1rem; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
          <div style="width: 70%; height: 100%; background: linear-gradient(90deg, #818cf8 0%, #c4b5fd 100%);"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="obs-standalone-widget obs-standalone-widget--timeline">
      <div class="obs-standalone-widget__content">
        <div class="obs-standalone-widget__header">
          <div class="obs-standalone-widget__game-group">
            <h2 class="obs-standalone-widget__game-title">${lang === 'ru' ? 'Общий таймлайн сезонов' : 'Global Season Timeline'}</h2>
          </div>
          <span class="obs-widget-pill obs-widget-pill--ptr">TIMELINE</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
          ${rowsHtml}
        </div>

        <div class="obs-widget-footer">
          <div></div>
          <div class="obs-widget-brand-pill">
            <span class="obs-widget-brand-dot"></span>
            <span>SEASONFORGE.ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
