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
const { getProgressPercent, calculateCountdown } = await import('../src/utils/countdown.js');
const { escapeAttr, escapeHtml } = await import('../src/utils/helpers.js');

function escapeJsonForScript(str) {
  return String(str || '')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
const templatePath = path.join(__dirname, '../src/templates/game.html');



async function build() {
  console.log('=== Starting Static Site Generation (SSG) ===');

  const BASE_URL = process.env.BASE_URL || 'https://seasonforge.online';

  // Feedback config loaded statically without secrets

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

    // 2. Load "About Seasons" content file if it exists
    const contentPath = path.join(__dirname, `../content/${gameId}.json`);
    let aboutHtml = '';
    let aboutJson = '{}';
    if (fs.existsSync(contentPath)) {
      try {
        const contentData = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
        if (contentData.about) {
          aboutHtml = contentData.about.en || '';
          aboutJson = JSON.stringify(contentData.about);
        }
      } catch (err) {
        console.error(`[SSG] Error reading content for ${gameId}:`, err.message);
      }
    }

    // 2b. Load "History/Timeline" data file if it exists
    const historyPath = path.join(__dirname, `../data/history/${gameId}.json`);
    let timelineHtml = '';
    let timelineJson = '[]';
    if (fs.existsSync(historyPath)) {
      try {
        const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        timelineJson = JSON.stringify(historyData);
        
        // Render timeline rows in English for static HTML
        const rows = [];
        for (const item of historyData) {
          const seasonName = item.season.en || '';
          const start = item.startDate;
          const end = item.endDate;
          
          let durationStr = '—';
          if (start) {
            const startDateObj = new Date(start);
            if (end) {
              const endDateObj = new Date(end);
              const diffDays = Math.round((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
              durationStr = `${diffDays} days`;
            } else {
              durationStr = 'Ongoing';
            }
          }
          
          const formattedStart = start ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(start)) : '—';
          const formattedEnd = end ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(end)) : '—';
          const linkHtml = item.sourceUrl 
            ? `<a href="${escapeAttr(item.sourceUrl)}" target="_blank" class="history-table__link">Read ↗</a>` 
            : '—';
            
          rows.push(`
            <tr style="border-bottom: 1px solid #1f2937;">
              <td style="padding: 0.75rem 0.5rem; font-weight: 600; color: #ffffff;">${escapeHtml(seasonName)}</td>
              <td style="padding: 0.75rem 0.5rem;">${formattedStart}</td>
              <td style="padding: 0.75rem 0.5rem;">${formattedEnd}</td>
              <td style="padding: 0.75rem 0.5rem;">${durationStr}</td>
              <td style="padding: 0.75rem 0.5rem;">${linkHtml}</td>
            </tr>
          `);
        }
        timelineHtml = rows.join('\n');
      } catch (err) {
        console.error(`[SSG] Error reading history for ${gameId}:`, err.message);
      }
    }

    // 2c. Load "Useful Links" array from content file if it exists
    let linksHtml = '';
    let linksJson = '[]';
    if (fs.existsSync(contentPath)) {
      try {
        const contentData = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
        if (contentData.links && Array.isArray(contentData.links)) {
          linksJson = JSON.stringify(contentData.links);
          
          // Render links in English for static HTML
          const boxes = [];
          for (const item of contentData.links) {
            const category = escapeHtml(item.category || 'Official');
            const label = escapeHtml(item.label.en || '');
            const url = item.url || '#';
            
            boxes.push(`
              <div class="game-card__link-item">
                <span class="game-card__link-category">${category}</span>
                <a href="${escapeAttr(url)}" target="_blank" class="game-card__link-anchor">${label}</a>
              </div>
            `);
          }
          linksHtml = boxes.join('\n');
        }
      } catch (err) {
        console.error(`[SSG] Error parsing useful links for ${gameId}:`, err.message);
      }
    }

    // 3. Construct SEO values
    const canonicalUrl = `${BASE_URL}/games/${gameId}/`;
    
    // Construct dynamic description
    const currentSeasonName = game.currentSeason?.name?.en || 'TBA';
    const nextSeasonName = game.nextSeason?.name?.en || 'TBA';
    const nextSeasonStart = game.nextSeason?.startDate || '';
    
    let dynamicDesc = `Track ${gameName} seasons. Current: ${currentSeasonName}. `;
    if (nextSeasonStart) {
      dynamicDesc += `Next season: ${nextSeasonName} starts on ${nextSeasonStart}. `;
    } else {
      dynamicDesc += `Next season: ${nextSeasonName} date TBA. `;
    }
    dynamicDesc += `Get live countdowns, timeline history, and useful links.`;

    const schemaGraph = [];
    const gameNode = {
      "@type": "VideoGame",
      "name": gameName,
      "description": aboutHtml || `Detailed season information and countdown tracker for ${gameName}.`,
      "applicationCategory": "Game",
      "operatingSystem": "Windows",
      "publisher": {
        "@type": "Organization",
        "name": game.developer || "Unknown Developer"
      },
      "url": canonicalUrl
    };
    if (game.metadata) {
      if (game.metadata.platforms) {
        gameNode.gamePlatform = game.metadata.platforms;
      }
      if (game.metadata.tags) {
        gameNode.genre = game.metadata.tags;
      }
    }
    schemaGraph.push(gameNode);

    // Event for Current Season
    if (game.currentSeason?.startDate) {
      const curName = game.currentSeason.name?.en || 'TBA';
      schemaGraph.push({
        "@type": "Event",
        "name": `${gameName} - ${curName} Launch`,
        "startDate": game.currentSeason.startDate,
        ...(game.currentSeason.endDate ? { "endDate": game.currentSeason.endDate } : {}),
        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {
          "@type": "VirtualLocation",
          "url": canonicalUrl
        },
        "description": `Launch event of the ${curName} season for ${gameName}.`,
        "organizer": {
          "@type": "Organization",
          "name": game.developer || "Unknown Developer"
        }
      });
    }

    // Event for Next Season
    if (game.nextSeason?.startDate) {
      const nxtName = game.nextSeason.name?.en || 'TBA';
      schemaGraph.push({
        "@type": "Event",
        "name": `${gameName} - ${nxtName} Launch`,
        "startDate": game.nextSeason.startDate,
        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {
          "@type": "VirtualLocation",
          "url": canonicalUrl
        },
        "description": `Launch event of the upcoming ${nxtName} season for ${gameName}.`,
        "organizer": {
          "@type": "Organization",
          "name": game.developer || "Unknown Developer"
        }
      });
    }

    const schemaObj = {
      "@context": "https://schema.org",
      "@graph": schemaGraph
    };
    const schemaJson = JSON.stringify(schemaObj, null, 2);

    // 4. Inject placeholders into layout
    let html = template;
    html = html.replace(/{{GAME_ID}}/g, gameId);
    html = html.replace(/{{GAME_NAME}}/g, escapeHtml(gameName));
    html = html.replace(/{{GAME_DESCRIPTION}}/g, escapeAttr(dynamicDesc));
    html = html.replace(/{{BASE_URL}}/g, BASE_URL);
    html = html.replace(/{{GAME_COLOR}}/g, escapeAttr(gameColor));
    html = html.replace(/{{GAME_CARD_HTML}}/g, cardHtml);
    html = html.replace(/{{ABOUT_HTML}}/g, aboutHtml);
    html = html.replace(/{{ABOUT_JSON}}/g, escapeJsonForScript(aboutJson));
    html = html.replace(/{{CANONICAL_URL}}/g, escapeAttr(canonicalUrl));
    html = html.replace(/{{SCHEMA_JSONLD}}/g, escapeJsonForScript(schemaJson));
    html = html.replace(/{{TIMELINE_HTML}}/g, timelineHtml);
    html = html.replace(/{{TIMELINE_JSON}}/g, escapeJsonForScript(timelineJson));
    html = html.replace(/{{LINKS_HTML}}/g, linksHtml);
    html = html.replace(/{{LINKS_JSON}}/g, escapeJsonForScript(linksJson));

    // 5. Write target index.html
    const targetDir = path.join(__dirname, `../games/${gameId}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
  }

  // 6. Generate sitemap.xml
  console.log('[SSG] Generating sitemap.xml...');
  const todayStr = new Date().toISOString().split('T')[0];
  let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  for (const game of games) {
    sitemapXml += `  <url>
    <loc>${BASE_URL}/games/${game.id}/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  sitemapXml += `  <url>
    <loc>${BASE_URL}/privacy/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;

  sitemapXml += `</urlset>\n`;
  fs.writeFileSync(path.join(__dirname, '../sitemap.xml'), sitemapXml, 'utf-8');
  console.log('[SSG] sitemap.xml written successfully.');

  // 7. Generate robots.txt
  console.log('[SSG] Generating robots.txt...');
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(__dirname, '../robots.txt'), robotsTxt, 'utf-8');
  console.log('[SSG] robots.txt written successfully.');

  console.log(`=== SSG Complete: Generated detail pages for ${games.length} games ===`);
}

build().catch(error => {
  console.error('[SSG] Build process failed:', error);
  process.exit(1);
});
