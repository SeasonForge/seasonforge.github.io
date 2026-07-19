import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Mock browser globals for Node.js SSG execution
globalThis.localStorage = {
  getItem: () => 'en',
  setItem: () => {}
};
Object.defineProperty(globalThis, 'navigator', {
  value: {
    language: 'en-US',
    userLanguage: 'en-US'
  },
  configurable: true,
  writable: true
});
globalThis.document = {
  documentElement: {
    lang: 'en'
  },
  querySelector: () => null
};
globalThis.window = globalThis;

// 2. Import frontend components dynamically after mocks are set
const { render: renderGameCard } = await import('../src/components/GameCard.js');
const { render: renderProgressBar } = await import('../src/components/ProgressBar.js');
const { getVal } = await import('../src/i18n/index.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
const templatePath = path.join(__dirname, '../src/templates/game.html');

// Helper to calculate progress percent
function getProgressPercent(game) {
  const startDate = game?.currentSeason?.startDate;
  const nextStartDate = game?.nextSeason?.startDate;

  if (!startDate || !nextStartDate) {
    return 0;
  }

  const start = new Date(startDate);
  const nextStart = new Date(nextStartDate);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(nextStart.getTime())) {
    return 0;
  }

  const total = nextStart.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

// Helper to calculate countdown
function calculateCountdown(targetDateStr) {
  if (!targetDateStr) return {};
  const targetDate = new Date(targetDateStr);
  if (Number.isNaN(targetDate.getTime())) return {};

  const total = targetDate.getTime() - Date.now();
  if (total <= 0) return {};

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds };
}

async function build() {
  console.log('=== Starting Static Site Generation (SSG) ===');

  const seasonsPath = path.join(dataDir, 'seasons.json');
  if (!fs.existsSync(seasonsPath)) {
    console.error('Database file seasons.json not found. Run update-seasons first.');
    process.exit(1);
  }

  if (!fs.existsSync(templatePath)) {
    console.error('Layout template file src/templates/game.html not found.');
    process.exit(1);
  }

  const database = JSON.parse(fs.readFileSync(seasonsPath, 'utf-8'));
  const games = database.games || [];
  const template = fs.readFileSync(templatePath, 'utf-8');

  for (const game of games) {
    const gameId = game.id;
    const gameName = getVal(game.name, 'en'); // Pre-render name in English
    const gameColor = game.color || '#4b5563';

    console.log(`[SSG] Compiling page for: ${gameName} (${gameId})...`);

    // 1. Calculate and pre-render components
    const progress = getProgressPercent(game);
    const progressBarHtml = renderProgressBar(progress);
    const countdown = calculateCountdown(game.nextSeason?.startDate);
    const cardHtml = renderGameCard(game, { 
      countdown, 
      progressBar: progressBarHtml,
      isDetailPage: true 
    });

    // 2. Inject placeholders into layout
    let html = template;
    html = html.replace(/{{GAME_ID}}/g, gameId);
    html = html.replace(/{{GAME_NAME}}/g, gameName);
    html = html.replace(/{{GAME_COLOR}}/g, gameColor);
    html = html.replace(/{{GAME_CARD_HTML}}/g, cardHtml);

    // 3. Write target index.html
    const targetDir = path.join(__dirname, `../games/${gameId}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
  }

  console.log(`=== SSG Complete: Generated detail pages for ${games.length} games ===`);
}

build().catch(error => {
  console.error('[SSG] Build process failed:', error);
  process.exit(1);
});
