import { t, getVal } from '../i18n/index.js';

// Render a simple timeline from an array of games.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function render(games = []) {
  const items = Array.isArray(games) ? games : [];

  if (!items.length) {
    return `<section class="timeline-card"><h3>${t('timeline.fallbackTitle')}</h3><p>${t('timeline.fallbackNoGames')}</p></section>`;
  }

  const htmlItems = items
    .map((game) => {
      const name = escapeHtml(getVal(game.name) || 'Untitled Game');
      const nextSeason = escapeHtml(getVal(game.nextSeason?.name) || t('timeline.tba'));
      const nextDate = escapeHtml(game.nextSeason?.startDate || t('timeline.tba'));
      const currentSeason = escapeHtml(getVal(game.currentSeason?.name) || t('timeline.tba'));

      return `
        <li class="timeline__item">
          <span class="timeline__date">${nextDate}</span>
          <div class="timeline__content">
            <strong>${name}</strong>
            <p>${nextSeason}</p>
            <small>${currentSeason}</small>
          </div>
        </li>
      `;
    })
    .join('');

  return `
    <section class="timeline-card">
      <div class="timeline-card__header">
        <h3 class="timeline-card__title">${t('timeline.title')}</h3>
        <p class="timeline-card__caption">${t('timeline.subtitle')}</p>
      </div>
      <div class="timeline__container">
        <ol class="timeline">
          ${htmlItems}
        </ol>
      </div>
    </section>
  `;
}

export function Timeline(games) {
  return render(games);
}
