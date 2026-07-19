// Render a game card from provided props only.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function formatLocalDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} г.`;
}

function getVerificationBadge(verification, sourceUrl) {
  if (!verification) return '';
  
  let icon = '';
  let text = '';
  let className = '';
  let tooltip = '';

  switch (verification) {
    case 'official':
      return ''; // No badge for official dates, keeping it clean
    case 'ai':
    case 'estimated':
      icon = '▲';
      text = 'Предварительно';
      className = 'verification-badge--estimated';
      tooltip = 'Предварительная дата (требует подтверждения разработчиками)';
      break;
    default:
      return '';
  }

  const badgeHtml = `<span class="verification-badge ${className}" title="${escapeAttr(tooltip)}">${icon} ${escapeHtml(text)}</span>`;
  
  if (sourceUrl) {
    return `<a href="${escapeAttr(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="verification-badge__link">${badgeHtml}</a>`;
  }
  
  return badgeHtml;
}

function getRussianStatusLabel(code) {
  const mapping = {
    'ending': 'Завершается',
    'early-access': 'Ранний доступ',
    'in-progress': 'В разгаре',
    'active': 'Активен',
    'just-started': 'Только начался',
    'in-development': 'В разработке',
    'maintenance': 'Техобслуживание'
  };
  return mapping[code] || code;
}

export function render(game = {}, options = {}) {
  const name = escapeHtml(game.name || 'Untitled Game');
  const developer = escapeHtml(game.developer || 'Unknown developer');
  const color = escapeAttr(game.color || '#4b5563');
  const statusCode = (game.status?.code || 'default');
  const statusLabel = escapeHtml(getRussianStatusLabel(statusCode) || game.status?.label || 'Unknown');
  
  const currentSeason = escapeHtml(game.currentSeason?.name || 'TBA');
  const currentSeasonDate = formatLocalDate(game.currentSeason?.startDate);
  
  const rawNextSeason = game.nextSeason?.name || 'TBA';
  const nextSeasonClean = rawNextSeason.startsWith('Сезон') || rawNextSeason.startsWith('Season') || rawNextSeason.startsWith('Cycle') || rawNextSeason.startsWith('Цикл') || rawNextSeason === 'TBA'
    ? rawNextSeason
    : `Сезон ${rawNextSeason}`;
  const nextSeason = escapeHtml(nextSeasonClean);
  const nextSeasonDate = formatLocalDate(game.nextSeason?.startDate);
  
  const countdown = options.countdown || {};
  const progressBar = options.progressBar || '';
  const website = escapeAttr(game.website || '#');
  const features = Array.isArray(game.features) ? game.features : [];
  
  const pillModifier = statusCode && statusCode !== 'default' ? ` game-card__pill--${escapeAttr(statusCode)}` : '';
  const featureItems = features
    .map((feature) => `
      <li class="game-card__feature-item">
        <span class="game-card__feature-check">✓</span>
        <span class="game-card__feature-text">${escapeHtml(feature)}</span>
      </li>
    `)
    .join('');

  // Check if we have a valid next season date to countdown to
  const hasNextSeasonDate = game.nextSeason?.startDate && game.nextSeason.startDate !== '';
  const now = new Date();
  const targetDateObj = new Date(game.nextSeason?.startDate);
  const nextSeasonPassed = hasNextSeasonDate && !Number.isNaN(targetDateObj.getTime()) && targetDateObj.getTime() <= now.getTime();
  
  let countdownHtml = '';
  if (!hasNextSeasonDate) {
    countdownHtml = `
      <div class="game-card__countdown game-card__countdown--tba">
        <div class="game-card__tba-icon">📅</div>
        <span class="game-card__tba-label">Дата старта не объявлена</span>
      </div>
    `;
  } else if (nextSeasonPassed) {
    countdownHtml = `
      <div class="game-card__countdown game-card__countdown--launched">
        <div class="game-card__tba-icon">⚡</div>
        <span class="game-card__tba-label">Запуск нового сезона!</span>
      </div>
    `;
  } else {
    countdownHtml = `
      <div class="game-card__countdown">
        <div class="game-card__countdown-item"><strong>${countdown.days ?? 0}</strong><span>дней</span></div>
        <div class="game-card__countdown-item"><strong>${countdown.hours ?? 0}</strong><span>часов</span></div>
        <div class="game-card__countdown-item"><strong>${countdown.minutes ?? 0}</strong><span>мин</span></div>
        <div class="game-card__countdown-item"><strong>${countdown.seconds ?? 0}</strong><span>сек</span></div>
      </div>
    `;
  }

  // Use sourceUrl for more details if available, otherwise fallback to official website
  const moreDetailsUrl = game.nextSeason?.sourceUrl || game.currentSeason?.sourceUrl || website;
  const uppercaseStatusPill = `Active Status: ${statusLabel}`.toUpperCase();

  let sourceHtml = '';
  if (game.latestNews && game.latestNews.url) {
    const newsTitle = escapeHtml(game.latestNews.title || 'анонс');
    const newsUrl = escapeAttr(game.latestNews.url);
    const rawDate = game.latestNews.publishDate;
    const formattedNewsDate = rawDate ? formatLocalDate(rawDate) : '';
    const dateText = formattedNewsDate ? ` от ${formattedNewsDate}` : '';
    const sourceLabel = escapeHtml(game.latestNews.source || 'Official Source');
    sourceHtml = `
      <p class="game-card__source-info">
        Источник: <span class="game-card__source-badge">📰 ${sourceLabel}</span> • 
        <span class="game-card__source-title" title="${newsTitle}">${newsTitle}</span>${dateText} • 
        <a href="${newsUrl}" target="_blank" class="game-card__source-link">Читать оригинал ↗</a>
      </p>
    `;
  }

  return `
    <article class="game-card" data-game-id="${escapeAttr(game.id || '')}" style="--game-color: ${color};">
      <div class="game-card__glow"></div>
      <div class="game-card__header">
        <div class="game-card__title-block">
          <span class="game-card__pill${pillModifier}">${uppercaseStatusPill}</span>
          <h2 class="game-card__title">${name}</h2>
          <p class="game-card__subtitle">Текущий сезон: ${currentSeason}</p>
          ${sourceHtml}
        </div>
        <div class="game-card__next-season">
          <span class="game-card__label">Следующий сезон</span>
          <div class="game-card__next-season-title">
            <strong>${nextSeason}</strong>
            ${getVerificationBadge(game.nextSeason?.verification, game.nextSeason?.sourceUrl)}
          </div>
          <p class="game-card__next-season-date">${nextSeasonDate || 'TBA'}</p>
        </div>
      </div>

      <div class="game-card__body">
        <section class="game-card__panel game-card__panel--main">
          <span class="game-card__label">Текущий сезон / Лига</span>
          <h3 class="game-card__season">
            ${currentSeason}
            ${getVerificationBadge(game.currentSeason?.verification, game.currentSeason?.sourceUrl)}
          </h3>
          <div class="game-card__meta-row">
            <span>Запуск:</span>
            <span>${currentSeasonDate || 'TBA'}</span>
          </div>

          <div class="game-card__progress-block">
            <div class="game-card__progress-meta">
              <span>Прогресс сезона:</span>
            </div>
            ${hasNextSeasonDate && !nextSeasonPassed ? progressBar : '<div class="game-card__progress-bar-placeholder"></div>'}
          </div>
        </section>

        <section class="game-card__panel game-card__panel--side">
          <span class="game-card__label">До старта нового сезона: ${nextSeason}</span>
          ${countdownHtml}
          <div class="game-card__developer">
            <span class="game-card__label">Разработчик</span>
            <strong>${developer}</strong>
          </div>
          <a class="game-card__link" href="${moreDetailsUrl}" target="_blank" rel="noopener noreferrer">Подробнее →</a>
        </section>
      </div>

      <section class="game-card__panel game-card__panel--features">
        <div class="game-card__features-header">
          <span class="game-card__label"><span class="game-card__features-compass">🧭</span> КЛЮЧЕВЫЕ ФИЧИ И НОВОВВЕДЕНИЯ:</span>
        </div>
        <ul class="game-card__feature-grid">${featureItems}</ul>
      </section>
    </article>
  `;
}

export function GameCard(game, options) {
  return render(game, options);
}
