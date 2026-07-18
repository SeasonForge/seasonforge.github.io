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

  const results = [];
  const logSummary = {
    timestamp: new Date().toISOString(),
    gamesCount: enabledGames.length,
    updates: []
  };

  // 2. Run adapters in parallel using Promise.allSettled
  const adapterPromises = enabledGames.map(async (gameConfig) => {
    const adapterName = gameConfig.adapter;
    console.log(`[Orchestrator] Loading adapter ${adapterName} for ${gameConfig.name}...`);

    try {
      // Dynamic import of the adapter
      const adapterModule = await import(`./updater/adapters/${adapterName}.js`);
      const AdapterClass = adapterModule[adapterName];
      const adapter = new AdapterClass();

      // Fetch and normalize
      const gameData = await adapter.fetchAndNormalize(gameConfig);

      // Validate
      Validator.validateGame(gameData);

      return {
        gameId: gameConfig.id,
        status: 'success',
        data: gameData,
        source: gameData.latestNewsId ? 'steam_api' : 'rss'
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
  });

  const settledResults = await Promise.allSettled(adapterPromises);

  const finalGames = [];
  let changesCount = 0;

  settledResults.forEach((res, index) => {
    const configGame = enabledGames[index];
    if (res.status === 'fulfilled') {
      const outcome = res.value;
      if (outcome.status === 'success' || outcome.status === 'fallback') {
        finalGames.push(outcome.data);
        
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
  const seasonsPath = path.join(dataDir, 'seasons.json');
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

  // 4. Save seasons.json only if changed or missing
  if (hasActualChanges) {
    fs.writeFileSync(seasonsPath, JSON.stringify({ games: finalGames }, null, 2), 'utf-8');
    console.log(`[Orchestrator] seasons.json updated successfully with ${finalGames.length} games.`);
    logSummary.saved = true;
  } else {
    console.log('[Orchestrator] seasons.json not modified (avoiding empty commits).');
    logSummary.saved = false;
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
  fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2), 'utf-8');
  console.log(`[Orchestrator] Log written to ${logFile}`);
  console.log('=== SeasonForge Data Update Completed ===');
}

main().catch(err => {
  console.error('Fatal orchestrator failure:', err);
  process.exit(1);
});
