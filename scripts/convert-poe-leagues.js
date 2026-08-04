import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFilePath = 'C:\\Users\\pupki\\Documents\\poe_leagues.js (3).md';
const targetFilePath = path.join(__dirname, '../data/history/path-of-exile.json');

function convert() {
  console.log('[Convert] Reading source dataset:', sourceFilePath);
  if (!fs.existsSync(sourceFilePath)) {
    console.error('[Convert] Source file not found!');
    process.exit(1);
  }

  const rawContent = fs.readFileSync(sourceFilePath, 'utf-8');
  
  // Extract JSON array from markdown/js block
  const match = rawContent.match(/const\s+poeLeagues\s*=\s*(\[\s*[\s\S]*?\n\]\s*;?)/);
  if (!match) {
    console.error('[Convert] Could not parse poeLeagues array from source file');
    process.exit(1);
  }

  let arrayStr = match[1].trim();
  if (arrayStr.endsWith(';')) {
    arrayStr = arrayStr.slice(0, -1);
  }

  let sourceData = [];
  try {
    sourceData = JSON.parse(arrayStr);
  } catch (err) {
    console.error('[Convert] Error parsing JSON:', err.message);
    process.exit(1);
  }

  console.log(`[Convert] Parsed ${sourceData.length} leagues from dataset.`);

  // Transform into SeasonForge format
  const transformed = sourceData.map((item) => {
    const version = item.league_version || '';
    const nameEn = item.name_en || '';
    const nameRu = item.name_ru || nameEn;

    let seasonNameEn = nameEn;
    let seasonNameRu = nameRu;

    if (version) {
      const vClean = version.replace(/\.0$/, '');
      seasonNameEn = `League ${vClean}: ${nameEn}`;
      seasonNameRu = `Лига ${vClean}: ${nameRu}`;
    }

    let sourceUrl = '';
    if (Array.isArray(item.official_link) && item.official_link.length > 0) {
      sourceUrl = item.official_link[0];
    } else if (typeof item.official_link === 'string') {
      sourceUrl = item.official_link;
    }

    return {
      season: {
        en: seasonNameEn,
        ru: seasonNameRu
      },
      startDate: item.start_date || null,
      endDate: item.end_date || null,
      sourceUrl: sourceUrl || null,
      summary: {
        en: item.theme_description_en || '',
        ru: item.theme_description_ru || ''
      },
      mechanics: {
        en: Array.isArray(item.key_mechanics_and_activities_en) ? item.key_mechanics_and_activities_en : [],
        ru: Array.isArray(item.key_mechanics_and_activities_ru) ? item.key_mechanics_and_activities_ru : []
      },
      rewards: {
        en: Array.isArray(item.challenge_rewards_en) ? item.challenge_rewards_en : [],
        ru: Array.isArray(item.challenge_rewards_ru) ? item.challenge_rewards_ru : []
      }
    };
  });

  // Sort newest first (descending by startDate)
  transformed.sort((a, b) => {
    if (!a.startDate) return -1;
    if (!b.startDate) return 1;
    return new Date(b.startDate) - new Date(a.startDate);
  });

  fs.writeFileSync(targetFilePath, JSON.stringify(transformed, null, 2), 'utf-8');
  console.log(`[Convert] Successfully written ${transformed.length} leagues to ${targetFilePath}`);
}

convert();
