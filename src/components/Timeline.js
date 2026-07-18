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
    return '<section class="timeline-card"><h3>Timeline</h3><p>No games available</p></section>';
  }

  const htmlItems = items
    .map((game) => {
      const name = escapeHtml(game.name || 'Untitled Game');
      const nextSeason = escapeHtml(game.nextSeason?.name || 'TBA');
      const nextDate = escapeHtml(game.nextSeason?.startDate || 'TBA');
      const currentSeason = escapeHtml(game.currentSeason?.name || 'TBA');

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
        <h3 class="timeline-card__title">Chronological map</h3>
        <p class="timeline-card__caption">Upcoming season launches</p>
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
