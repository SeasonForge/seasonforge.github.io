import fs from 'fs';
import path from 'path';
import { Validator } from './updater/Validator.js';

// Setup directories
const dataDir = path.join(process.cwd(), 'data');
const cacheDir = path.join(dataDir, 'cache');
const logsDir = path.join(dataDir, 'logs');

[dataDir, cacheDir, logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function atomicWriteFileSync(filePath, content, encoding = 'utf-8') {
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tmpPath, content, encoding);
  fs.renameSync(tmpPath, filePath);
}

function isNameEmptyOrTba(name) {
  if (!name) return true;
  if (typeof name === 'string') return name === '' || name === 'TBA';
  if (typeof name === 'object') {
    return (!name.en || name.en === '' || name.en === 'TBA') &&
           (!name.ru || name.ru === '' || name.ru === 'TBA');
  }
  return false;
}

function isFeaturesEmpty(feat) {
  if (!feat) return true;
  if (Array.isArray(feat)) return feat.length === 0;
  if (typeof feat === 'object') {
    return (!feat.en || feat.en.length === 0) && (!feat.ru || feat.ru.length === 0);
  }
  return false;
}

/**
 * Removes log files older than keepDays from the logs directory.
 * Prevents unbounded log accumulation over time.
 * @param {string} dir - Absolute path to the logs directory
 * @param {number} keepDays - Number of days of logs to retain (default: 30)
 */
function cleanOldLogs(dir, keepDays = 30) {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  try {
    const files = fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    for (const file of files) {
      const fileDate = new Date(file.replace('.json', '')).getTime();
      if (!Number.isNaN(fileDate) && fileDate < cutoff) {
        fs.unlinkSync(path.join(dir, file));
        console.log(`[Orchestrator] Cleaned old log: ${file}`);
      }
    }
  } catch (e) {
    console.warn('[Orchestrator] Could not clean old logs:', e.message);
  }
}

function mergeGameData(existingGame, newGame) {
  if (!existingGame) return newGame;
  
  const merged = { ...existingGame, ...newGame };
  
  // Merge status
  if (existingGame.status && newGame.status) {
    merged.status = {
      code: newGame.status.code || existingGame.status.code,
      label: newGame.status.label || existingGame.status.label,
      updatedAt: newGame.status.updatedAt || existingGame.status.updatedAt
    };
  }
  
  // Merge currentSeason
  if (existingGame.currentSeason && newGame.currentSeason) {
    merged.currentSeason = {
      ...existingGame.currentSeason,
      ...newGame.currentSeason
    };
    if (isNameEmptyOrTba(newGame.currentSeason.name)) {
      merged.currentSeason.name = existingGame.currentSeason.name;
    } else if (existingGame.currentSeason.name && typeof existingGame.currentSeason.name === 'object' && typeof newGame.currentSeason.name === 'object') {
      merged.currentSeason.name = {
        en: newGame.currentSeason.name.en || existingGame.currentSeason.name.en || 'TBA',
        ru: newGame.currentSeason.name.ru || existingGame.currentSeason.name.ru || 'TBA'
      };
    }
    if (!newGame.currentSeason.startDate || newGame.currentSeason.startDate === 'TBA') {
      merged.currentSeason.startDate = existingGame.currentSeason.startDate;
    }
    if (!newGame.currentSeason.endDate || newGame.currentSeason.endDate === 'TBA') {
      merged.currentSeason.endDate = existingGame.currentSeason.endDate;
    }
    if (newGame.currentSeason.isActive === undefined) {
      merged.currentSeason.isActive = existingGame.currentSeason.isActive;
    }
    if (newGame.currentSeason.startDate === existingGame.currentSeason.startDate) {
      merged.currentSeason.verification = existingGame.currentSeason.verification || newGame.currentSeason.verification;
      merged.currentSeason.sourceUrl = newGame.currentSeason.sourceUrl || existingGame.currentSeason.sourceUrl;
    }
  }

  // Merge nextSeason
  if (existingGame.nextSeason && newGame.nextSeason) {
    merged.nextSeason = {
      ...existingGame.nextSeason,
      ...newGame.nextSeason
    };
    if (isNameEmptyOrTba(newGame.nextSeason.name)) {
      merged.nextSeason.name = existingGame.nextSeason.name;
    } else if (existingGame.nextSeason.name && typeof existingGame.nextSeason.name === 'object' && typeof newGame.nextSeason.name === 'object') {
      merged.nextSeason.name = {
        en: newGame.nextSeason.name.en || existingGame.nextSeason.name.en || 'TBA',
        ru: newGame.nextSeason.name.ru || existingGame.nextSeason.name.ru || 'TBA'
      };
    }
    if (!newGame.nextSeason.startDate || newGame.nextSeason.startDate === 'TBA') {
      merged.nextSeason.startDate = existingGame.nextSeason.startDate;
    }
    if (!newGame.nextSeason.endDate || newGame.nextSeason.endDate === 'TBA') {
      merged.nextSeason.endDate = existingGame.nextSeason.endDate;
    }
    if (newGame.nextSeason.isActive === undefined) {
      merged.nextSeason.isActive = existingGame.nextSeason.isActive;
    }
    if (newGame.nextSeason.startDate === existingGame.nextSeason.startDate) {
      merged.nextSeason.verification = existingGame.nextSeason.verification || newGame.nextSeason.verification;
      merged.nextSeason.sourceUrl = newGame.nextSeason.sourceUrl || existingGame.nextSeason.sourceUrl;
    }
  }

  // Merge features (keep existing if new features is empty)
  if (isFeaturesEmpty(newGame.features) && existingGame.features) {
    merged.features = existingGame.features;
  } else if (existingGame.features && typeof existingGame.features === 'object' && typeof newGame.features === 'object') {
    merged.features = {
      en: newGame.features.en || existingGame.features.en || [],
      ru: newGame.features.ru || existingGame.features.ru || []
    };
  }
  
  return merged;
}

function upgradeToBilingualSchema(game) {
  if (!game) return game;
  
  const upgraded = { ...game };
  
  // Upgrade game name
  if (upgraded.name) {
    if (typeof upgraded.name === 'string') {
      upgraded.name = {
        en: upgraded.name,
        ru: upgraded.name
      };
    } else if (typeof upgraded.name === 'object') {
      upgraded.name = {
        en: upgraded.name.en || upgraded.name.ru || '',
        ru: upgraded.name.ru || upgraded.name.en || ''
      };
    }
  }
  
  // Upgrade status label
  if (upgraded.status) {
    if (upgraded.status.label && typeof upgraded.status.label === 'string') {
      const label = upgraded.status.label;
      const mapping = {
        'Ранний доступ': { en: 'Early Access', ru: 'Ранний доступ' },
        'В разгаре': { en: 'In Progress', ru: 'В разгаре' },
        'Активен': { en: 'Active', ru: 'Активен' },
        'Только начался': { en: 'Just Started', ru: 'Только начался' },
        'В разработке': { en: 'In Development', ru: 'В разработке' },
        'Техобслуживание': { en: 'Maintenance', ru: 'Техобслуживание' },
        'Завершается': { en: 'Ending', ru: 'Завершается' },
        'Active': { en: 'Active', ru: 'Активен' },
        'In Development': { en: 'In Development', ru: 'В разработке' },
        'Maintenance': { en: 'Maintenance', ru: 'Техобслуживание' }
      };
      
      upgraded.status.label = mapping[label] || { en: label, ru: label };
    } else if (typeof upgraded.status.label === 'object') {
      upgraded.status.label = {
        en: upgraded.status.label.en || upgraded.status.label.ru || '',
        ru: upgraded.status.label.ru || upgraded.status.label.en || ''
      };
    }
  }
  
  // Upgrade currentSeason name
  if (upgraded.currentSeason) {
    if (upgraded.currentSeason.name) {
      if (typeof upgraded.currentSeason.name === 'string') {
        upgraded.currentSeason.name = {
          en: upgraded.currentSeason.name,
          ru: upgraded.currentSeason.name
        };
      } else if (typeof upgraded.currentSeason.name === 'object') {
        upgraded.currentSeason.name = {
          en: upgraded.currentSeason.name.en || upgraded.currentSeason.name.ru || 'TBA',
          ru: upgraded.currentSeason.name.ru || upgraded.currentSeason.name.en || 'TBA'
        };
      }
    }
  }
  
  // Upgrade nextSeason name
  if (upgraded.nextSeason) {
    if (upgraded.nextSeason.name) {
      if (typeof upgraded.nextSeason.name === 'string') {
        upgraded.nextSeason.name = {
          en: upgraded.nextSeason.name,
          ru: upgraded.nextSeason.name
        };
      } else if (typeof upgraded.nextSeason.name === 'object') {
        upgraded.nextSeason.name = {
          en: upgraded.nextSeason.name.en || upgraded.nextSeason.name.ru || 'TBA',
          ru: upgraded.nextSeason.name.ru || upgraded.nextSeason.name.en || 'TBA'
        };
      }
    }
  }
  
  // Upgrade features
  if (upgraded.features) {
    if (Array.isArray(upgraded.features)) {
      upgraded.features = {
        en: upgraded.features,
        ru: upgraded.features
      };
    } else if (typeof upgraded.features === 'object') {
      const en = upgraded.features.en || [];
      const ru = upgraded.features.ru || [];
      if (en.length === 0 && ru.length > 0) {
        upgraded.features = {
          en: [...ru],
          ru: ru
        };
      } else if (ru.length === 0 && en.length > 0) {
        upgraded.features = {
          en: en,
          ru: [...en]
        };
      }
    }
  }
  
  return upgraded;
}

function normalizeGameDates(gameData) {
  if (!gameData) return gameData;
  const gameId = gameData.id;
  
  const appendDefaultTime = (dateStr) => {
    if (!dateStr || dateStr === 'TBA') return dateStr;
    if (dateStr.includes('T') || dateStr.includes(':')) return dateStr;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const defaultTimes = {
        'path-of-exile': 'T20:00:00Z',
        'path-of-exile-2': 'T20:00:00Z',
        'diablo-iv': 'T17:00:00Z',
        'last-epoch': 'T16:00:00Z',
        'torchlight-infinite': 'T02:00:00Z'
      };
      return `${dateStr}${defaultTimes[gameId] || 'T00:00:00Z'}`;
    }
    return dateStr;
  };

  if (gameData.currentSeason) {
    gameData.currentSeason.startDate = appendDefaultTime(gameData.currentSeason.startDate);
    gameData.currentSeason.endDate = appendDefaultTime(gameData.currentSeason.endDate);
  }
  if (gameData.nextSeason) {
    gameData.nextSeason.startDate = appendDefaultTime(gameData.nextSeason.startDate);
    gameData.nextSeason.endDate = appendDefaultTime(gameData.nextSeason.endDate);
  }

  // Auto-transition: If nextSeason startDate has passed or matches currentSeason startDate, shift nextSeason -> currentSeason and set nextSeason -> TBA
  if (gameData.nextSeason?.startDate && gameData.nextSeason.startDate !== 'TBA') {
    const nextStartMs = new Date(gameData.nextSeason.startDate).getTime();
    const nowMs = Date.now();
    
    if (!Number.isNaN(nextStartMs) && nextStartMs <= nowMs) {
      const curStartMs = gameData.currentSeason?.startDate ? new Date(gameData.currentSeason.startDate).getTime() : 0;
      
      if (nextStartMs >= curStartMs) {
        gameData.currentSeason = {
          ...gameData.nextSeason,
          isActive: true
        };
      }
      
      gameData.nextSeason = {
        name: { en: 'TBA', ru: 'TBA' },
        startDate: '',
        endDate: '',
        isActive: false,
        verification: 'estimated',
        sourceUrl: gameData.currentSeason?.sourceUrl || ''
      };

      if (gameData.status) {
        gameData.status.code = 'active';
        gameData.status.label = { en: 'Active', ru: 'Активен' };
      }
    }
  }
  
  return gameData;
}


async function main() {
  console.log('=== Starting SeasonForge Data Update ===');
  const todayStr = new Date().toISOString().split('T')[0];
  const logFile = path.join(logsDir, `${todayStr}.json`);

  // 1. Load config
  const configPath = path.join(dataDir, 'games.config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Configuration file games.config.json not found');
    process.exit(1);
  }

  const gamesConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const enabledGames = gamesConfig.filter(game => game.enabled);

  // Load existing seasons.json to preserve dates if scrapers return TBA
  const seasonsPath = path.join(dataDir, 'seasons.json');
  let existingGames = [];
  if (fs.existsSync(seasonsPath)) {
    try {
      const oldSeasons = JSON.parse(fs.readFileSync(seasonsPath, 'utf-8'));
      existingGames = (oldSeasons.games || []).map(g => normalizeGameDates(upgradeToBilingualSchema(g)));
    } catch (e) {
      console.warn('[Orchestrator] Could not load existing seasons.json for merging:', e.message);
    }
  }

  const results = [];
  const logSummary = {
    timestamp: new Date().toISOString(),
    gamesCount: enabledGames.length,
    updates: []
  };

  // 2. Run adapters in controlled batches (concurrency limit: 3)
  const runAdapter = async (gameConfig) => {
    const adapterName = gameConfig.adapter;
    const displayName = gameConfig.name?.en || gameConfig.name;
    console.log(`[Orchestrator] Loading adapter ${adapterName} for ${displayName}...`);
    let existingGame = existingGames.find(g => g.id === gameConfig.id);
    if (existingGame) {
      existingGame = upgradeToBilingualSchema(existingGame);
    }

    try {
      // Dynamic import of the adapter
      const adapterModule = await import(`./updater/adapters/${adapterName}.js`);
      const AdapterClass = adapterModule[adapterName];
      const adapter = new AdapterClass();

      // Fetch and normalize
      const passExisting = process.env.FORCE_UPDATE === 'true' ? undefined : existingGame;
      let gameData = await adapter.fetchAndNormalize(gameConfig, passExisting);

      // Merge with existing data to preserve dates/features if scraper returned TBA
      gameData = mergeGameData(existingGame, gameData);
      gameData = normalizeGameDates(gameData);

      // Validate
      Validator.validateGame(gameData);

      // Save to local cache folder ONLY after successful validation!
      const cachePath = path.join(cacheDir, `${gameConfig.id}.json`);
      atomicWriteFileSync(cachePath, JSON.stringify(gameData, null, 2), 'utf-8');

      return {
        gameId: gameConfig.id,
        status: 'success',
        data: gameData,
        source: gameData.latestNews?.source || 'rss'
      };
    } catch (error) {
      console.error(`[Orchestrator] Error running adapter for ${gameConfig.name}:`, error.message);
      
      // 1. Fallback to cache if possible
      const cachePath = path.join(cacheDir, `${gameConfig.id}.json`);
      if (fs.existsSync(cachePath)) {
        console.log(`[Orchestrator] Found cache fallback for ${gameConfig.name}`);
        const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        return {
          gameId: gameConfig.id,
          status: 'fallback',
          data: cachedData,
          error: error.message
        };
      }

      // 2. Fallback to existing seasons.json if possible
      const seasonsPath = path.join(dataDir, 'seasons.json');
      if (fs.existsSync(seasonsPath)) {
        try {
          const oldSeasons = JSON.parse(fs.readFileSync(seasonsPath, 'utf-8'));
          const oldGameData = (oldSeasons.games || []).find(g => g.id === gameConfig.id);
          if (oldGameData) {
            console.log(`[Orchestrator] Found seasons.json fallback for ${gameConfig.name}`);
            return {
              gameId: gameConfig.id,
              status: 'fallback',
              data: oldGameData,
              error: `Adapter error: ${error.message}. Recovered from previous seasons.json.`
            };
          }
        } catch (e) {
          // ignore
        }
      }

      return {
        gameId: gameConfig.id,
        status: 'failed',
        error: error.message
      };
    }
  };

  const settledResults = [];
  const CONCURRENCY_LIMIT = 3;
  for (let i = 0; i < enabledGames.length; i += CONCURRENCY_LIMIT) {
    const chunk = enabledGames.slice(i, i + CONCURRENCY_LIMIT);
    const chunkResults = await Promise.allSettled(chunk.map(gameConfig => runAdapter(gameConfig)));
    settledResults.push(...chunkResults);
  }

  const finalGames = [];
  let changesCount = 0;

  settledResults.forEach((res, index) => {
    const configGame = enabledGames[index];
    if (res.status === 'fulfilled') {
      const outcome = res.value;
      if (outcome.status === 'success' || outcome.status === 'fallback') {
        finalGames.push(normalizeGameDates(outcome.data));
        
        logSummary.updates.push({
          game: outcome.gameId,
          status: outcome.status,
          source: outcome.source || 'cache',
          error: outcome.error || null
        });

        if (outcome.status === 'success') {
          changesCount++;
        }
      } else {
        logSummary.updates.push({
          game: configGame.id,
          status: 'failed',
          error: outcome.error
        });
      }
    } else {
      logSummary.updates.push({
        game: configGame.id,
        status: 'failed',
        error: res.reason?.message || 'Unknown settled failure'
      });
    }
  });

  if (finalGames.length === 0) {
    console.error('[Orchestrator] No games were successfully processed or recovered from cache. Aborting update.');
    fs.writeFileSync(logFile, JSON.stringify(logSummary, null, 2), 'utf-8');
    process.exit(1);
  }

  // 3. Compare with old seasons.json to check if we have actual changes
  let hasActualChanges = true;
  
  if (fs.existsSync(seasonsPath)) {
    try {
      const oldSeasons = JSON.parse(fs.readFileSync(seasonsPath, 'utf-8'));
      
      // Helper to strip dynamic timestamps for comparison
      const stripDynamicFields = (games) => {
        return games.map(g => {
          const clone = JSON.parse(JSON.stringify(g));
          if (clone.status) delete clone.status.updatedAt;
          return clone;
        });
      };

      const oldStripped = JSON.stringify(stripDynamicFields(oldSeasons.games || []));
      const newStripped = JSON.stringify(stripDynamicFields(finalGames));

      if (oldStripped === newStripped) {
        hasActualChanges = false;
        console.log('[Orchestrator] No content changes detected in seasons data.');
      }
    } catch (e) {
      console.warn('[Orchestrator] Could not parse existing seasons.json for comparison, rewriting...');
    }
  }

  // 4. Save seasons.json (always update lastCheckedAt timestamp)
  const nowIso = new Date().toISOString();
  atomicWriteFileSync(seasonsPath, JSON.stringify({ lastCheckedAt: nowIso, games: finalGames }, null, 2), 'utf-8');
  if (hasActualChanges) {
    console.log(`[Orchestrator] seasons.json updated successfully with ${finalGames.length} games (data changed).`);
    logSummary.saved = true;
  } else {
    console.log(`[Orchestrator] seasons.json updated with new lastCheckedAt (${nowIso}).`);
    logSummary.saved = true;
  }

  // 5. Write log
  let existingLogs = [];
  if (fs.existsSync(logFile)) {
    try {
      existingLogs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      if (!Array.isArray(existingLogs)) existingLogs = [existingLogs];
    } catch (e) {
      existingLogs = [];
    }
  }
  existingLogs.push(logSummary);
  atomicWriteFileSync(logFile, JSON.stringify(existingLogs, null, 2), 'utf-8');
  console.log(`[Orchestrator] Log written to ${logFile}`);
  cleanOldLogs(logsDir); // Remove logs older than 30 days

  // 6. Run static site generator to rebuild pages
  console.log('[Orchestrator] Running static site generator build...');
  try {
    const { execSync } = await import('child_process');
    execSync('node scripts/build.js', { stdio: 'inherit' });
  } catch (buildError) {
    console.error('[Orchestrator] Static site generator build failed:', buildError.message);
  }

  console.log('=== SeasonForge Data Update Completed ===');
}

main().catch(err => {
  console.error('Fatal orchestrator failure:', err);
  process.exit(1);
});
