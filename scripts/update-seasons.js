import fs from 'fs';
import path from 'path';
import { Validator } from './updater/Validator.js';
import { atomicWriteFileSync } from './updater/fileUtils.js';

// Setup directories
const dataDir = path.join(process.cwd(), 'data');
const cacheDir = path.join(dataDir, 'cache');
const logsDir = path.join(dataDir, 'logs');

[dataDir, cacheDir, logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});



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

import { cleanOldLogs } from './updater/logUtils.js';

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
    const isExistingOfficial = existingGame.nextSeason.verification === 'official';
    const isNewOfficial = newGame.nextSeason.verification === 'official';

    merged.nextSeason = {
      ...existingGame.nextSeason,
      ...newGame.nextSeason
    };

    if (isExistingOfficial && !isNewOfficial) {
      merged.nextSeason.startDate = existingGame.nextSeason.startDate;
      merged.nextSeason.verification = existingGame.nextSeason.verification;
      if (existingGame.nextSeason.verificationNote) {
        merged.nextSeason.verificationNote = existingGame.nextSeason.verificationNote;
      }
    }

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

  // Merge events with fuzzy deduplication (type + ±2 days window)
  const existingEvents = Array.isArray(existingGame.events) ? existingGame.events : [];
  const newEvents = Array.isArray(newGame.events) ? newGame.events : [];

  if (existingEvents.length === 0) {
    merged.events = newEvents;
  } else if (newEvents.length === 0) {
    merged.events = existingEvents;
  } else {
    const mergedEvents = [...existingEvents];

    for (const newEv of newEvents) {
      const newTime = newEv.startDate ? new Date(newEv.startDate).getTime() : null;
      
      const matchIndex = mergedEvents.findIndex(exEv => {
        if (exEv.id && newEv.id && exEv.id === newEv.id) return true;
        if (exEv.type && newEv.type && exEv.type === newEv.type && newTime && exEv.startDate) {
          const exTime = new Date(exEv.startDate).getTime();
          const diffHours = Math.abs(newTime - exTime) / (1000 * 60 * 60);
          return diffHours <= 48; // Within ±2 days window
        }
        return false;
      });

      if (matchIndex >= 0) {
        // Merge & enrich existing event without destroying manual/confirmed data
        const exEv = mergedEvents[matchIndex];
        mergedEvents[matchIndex] = {
          ...exEv,
          ...newEv,
          title: {
            en: newEv.title?.en || exEv.title?.en || '',
            ru: newEv.title?.ru || exEv.title?.ru || ''
          },
          verification: exEv.verification === 'official' ? 'official' : (newEv.verification || exEv.verification)
        };
      } else {
        mergedEvents.push(newEv);
      }
    }

    // Event Lifetime Expiration: mark past events or archive items older than 48 hours after completion
    const nowMs = Date.now();
    merged.events = mergedEvents.map(ev => {
      const eventEnd = ev.endDate ? new Date(ev.endDate).getTime() : (ev.startDate ? new Date(ev.startDate).getTime() + (24 * 60 * 60 * 1000) : null);
      if (eventEnd && (nowMs - eventEnd > 48 * 60 * 60 * 1000)) {
        return { ...ev, isPast: true, status: 'archived' };
      }
      return ev;
    });
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

function normalizeGameDates(gameData, defaultTime = 'T00:00:00Z') {
  if (!gameData) return gameData;

  // Work on shallow copies — never mutate the input object
  const result = { ...gameData };
  if (result.currentSeason) result.currentSeason = { ...result.currentSeason };
  if (result.nextSeason)    result.nextSeason    = { ...result.nextSeason };
  if (result.status)        result.status        = { ...result.status };

  const appendDefaultTime = (dateStr) => {
    if (!dateStr || dateStr === 'TBA') return dateStr;
    if (dateStr.includes('T') || dateStr.includes(':')) return dateStr;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return `${dateStr}${defaultTime}`;
    }
    return dateStr;
  };

  if (result.currentSeason) {
    result.currentSeason.startDate = appendDefaultTime(result.currentSeason.startDate);
    result.currentSeason.endDate   = appendDefaultTime(result.currentSeason.endDate);
  }
  if (result.nextSeason) {
    result.nextSeason.startDate = appendDefaultTime(result.nextSeason.startDate);
    result.nextSeason.endDate   = appendDefaultTime(result.nextSeason.endDate);
  }

  // Auto-transition: if nextSeason startDate has passed, shift nextSeason → currentSeason
  if (result.nextSeason?.startDate && result.nextSeason.startDate !== 'TBA') {
    const nextStartMs = new Date(result.nextSeason.startDate).getTime();
    const nowMs = Date.now();

    if (!Number.isNaN(nextStartMs) && nextStartMs <= nowMs) {
      const curStartMs = result.currentSeason?.startDate ? new Date(result.currentSeason.startDate).getTime() : 0;

      if (nextStartMs >= curStartMs) {
        result.currentSeason = { ...result.nextSeason, isActive: true };
      }

      result.nextSeason = {
        name: { en: 'TBA', ru: 'TBA' },
        startDate: '',
        endDate: '',
        isActive: false,
        verification: 'estimated',
        sourceUrl: result.currentSeason?.sourceUrl || ''
      };

      if (result.status) {
        result.status.code  = 'active';
        result.status.label = { en: 'Active', ru: 'Активен' };
      }
    }
  }

  return result;
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
      existingGames = (oldSeasons.games || []).map(g => {
        const cfg = gamesConfig.find(c => c.id === g.id);
        return normalizeGameDates(upgradeToBilingualSchema(g), cfg?.defaultLaunchTime);
      });
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
      gameData = normalizeGameDates(gameData, gameConfig.defaultLaunchTime);

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
        finalGames.push(normalizeGameDates(outcome.data, configGame?.defaultLaunchTime));
        
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

async function sendTelegramApprovalMessage(messageText, draftId) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_FEEDBACK_CHAT_ID;

  if (botToken && chatId) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Одобрить и выпустить', callback_data: `approve_${draftId}` },
                { text: '❌ Отклонить', callback_data: `reject_${draftId}` }
              ]
            ]
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[Orchestrator] Telegram moderation request sent successfully.');
        return data.result?.message_id;
      }
    } catch (err) {
      console.warn('[Orchestrator] Direct Telegram call failed:', err.message);
    }
  }

  return null;
}

async function waitForTelegramApproval(draftId, messageId, timeoutMinutes = 15) {
  if (!messageId) return false;

  console.log(`[Orchestrator] Waiting up to ${timeoutMinutes} minutes for Telegram approval (draftId: ${draftId})...`);
  const startTime = Date.now();
  let offset = 0;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn('[Orchestrator] TELEGRAM_BOT_TOKEN not provided. Auto-skipping Telegram approval wait.');
    return false;
  }

  while (Date.now() - startTime < timeoutMinutes * 60 * 1000) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=10`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        for (const update of (data.result || [])) {
          offset = update.update_id + 1;
          if (update.callback_query && update.callback_query.message?.message_id === Number(messageId)) {
            const cbData = update.callback_query.callback_data;
            const callbackId = update.callback_query.id;

            fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: callbackId, text: cbData.startsWith('approve') ? 'Одобрено!' : 'Отклонено!' })
            }).catch(() => {});

            if (cbData === `approve_${draftId}`) {
              console.log('[Orchestrator] Update APPROVED via Telegram.');
              return true;
            } else if (cbData === `reject_${draftId}`) {
              console.log('[Orchestrator] Update REJECTED via Telegram.');
              return false;
            }
          }
        }
      }
    } catch (e) {
      // Ignore transient errors
    }
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('[Orchestrator] Approval timeout reached. Auto-rejecting changes.');
  return false;
}

  // Check CLI arguments for dry-run or auto mode
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isAutoApprove = args.includes('--auto');

  // 3. Compare with old seasons.json to check if we have actual changes
  let hasActualChanges = true;
  let existingChangelog = [];
  const detectedDiffs = [];
  
  if (fs.existsSync(seasonsPath)) {
    try {
      const oldSeasons = JSON.parse(fs.readFileSync(seasonsPath, 'utf-8'));
      existingChangelog = Array.isArray(oldSeasons.changelog) ? oldSeasons.changelog : [];
      
      if (Array.isArray(oldSeasons.games)) {
        finalGames.forEach(newG => {
          const oldG = oldSeasons.games.find(g => g.id === newG.id);
          if (!oldG) return;

          const gNameEn = newG.name?.en || newG.id;
          const gNameRu = newG.name?.ru || gNameEn;

          const oldNewsId = oldG.latestNews?.id;
          const newNewsId = newG.latestNews?.id;
          const newsTitle = newG.latestNews?.title || '';

          const oldCur = oldG.currentSeason?.name?.en;
          const newCur = newG.currentSeason?.name?.en;
          const oldNext = oldG.nextSeason?.startDate;
          const newNext = newG.nextSeason?.startDate;

          if (oldNewsId && newNewsId && oldNewsId !== newNewsId && newsTitle) {
            detectedDiffs.push({
              gameId: newG.id,
              url: newG.latestNews?.url || newG.currentSeason?.sourceUrl || newG.website,
              type: 'article',
              en: `${gNameEn}: New article published — "${newsTitle}"`,
              ru: `${gNameRu}: Опубликована новость — «${newsTitle}»`
            });
          } else if (oldCur !== newCur && newCur) {
            detectedDiffs.push({
              gameId: newG.id,
              url: newG.currentSeason?.sourceUrl || newG.website,
              type: 'launch',
              en: `${gNameEn}: Current season updated — ${newG.currentSeason?.name?.en || 'TBA'}`,
              ru: `${gNameRu}: Текущий сезон обновлён — ${newG.currentSeason?.name?.ru || 'TBA'}`
            });
          } else if (oldNext !== newNext && newNext) {
            detectedDiffs.push({
              gameId: newG.id,
              url: newG.nextSeason?.sourceUrl || newG.website,
              type: 'announcement',
              en: `${gNameEn}: Next season start date announced (${newG.nextSeason?.name?.en || 'TBA'})`,
              ru: `${gNameRu}: Анонсирована дата старта следующего сезона (${newG.nextSeason?.name?.ru || 'TBA'})`
            });
          }
        });
      }

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

  // 4. Save seasons.json or request Telegram approval
  const nowIso = new Date().toISOString();

  if (isDryRun) {
    console.log('\n--- DRY RUN MODE: Outputting detected diffs ---');
    console.log(detectedDiffs.length > 0 ? detectedDiffs : 'No diffs detected.');
    console.log('Skipping file write and build due to --dry-run.\n');
    return;
  }

  let isApproved = true;

  if (hasActualChanges && detectedDiffs.length > 0 && process.env.WORKER_ENDPOINT && !isAutoApprove) {
    console.log(`[Orchestrator] Sending draft changes to Cloudflare Worker moderation endpoint (${process.env.WORKER_ENDPOINT})...`);
    try {
      const payload = {
        diffs: detectedDiffs,
        updatedSeasonsJson: JSON.stringify({
          lastCheckedAt: nowIso,
          changelog: [...detectedDiffs.map(d => ({ timestamp: nowIso, gameId: d.gameId, url: d.url, type: d.type, text: { en: d.en, ru: d.ru } })), ...existingChangelog].slice(0, 15),
          games: finalGames
        }, null, 2)
      };
      const res = await fetch(process.env.WORKER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        console.log('[Orchestrator] Successfully submitted draft to Cloudflare Worker for Telegram approval.');
        console.log('[Orchestrator] Aborting direct build/commit on GitHub Actions. Awaiting approval via Telegram button.');
        return;
      } else {
        console.warn(`[Orchestrator] Worker endpoint returned ${res.status}: ${await res.text()}`);
      }
    } catch (workerErr) {
      console.warn('[Orchestrator] Failed to notify Cloudflare Worker:', workerErr.message);
    }
  }

  if (hasActualChanges && detectedDiffs.length > 0 && !isAutoApprove && !process.env.WORKER_ENDPOINT) {
    const draftId = `draft-${Date.now().toString(36)}`;
    const tgMsg = `<b>🔍 SeasonForge: Обнаружены новые данные!</b>\n\n` + 
      detectedDiffs.map(d => `• ${d.ru}`).join('\n') + 
      `\n\n<i>Требуется подтверждение публикации на сайте.</i>`;

    const messageId = await sendTelegramApprovalMessage(tgMsg, draftId);
    if (messageId) {
      isApproved = await waitForTelegramApproval(draftId, messageId, 15);
    }
  }

  if (!isApproved) {
    console.log('[Orchestrator] Update was not approved. Aborting website deployment.');
    return;
  }

  if (hasActualChanges && detectedDiffs.length > 0) {
    const newEntries = detectedDiffs.map(d => ({
      timestamp: nowIso,
      gameId: d.gameId,
      url: d.url,
      type: d.type,
      text: { en: d.en, ru: d.ru }
    }));
    existingChangelog = [...newEntries, ...existingChangelog].slice(0, 15);
  }

  atomicWriteFileSync(seasonsPath, JSON.stringify({
    lastCheckedAt: nowIso,
    changelog: existingChangelog,
    games: finalGames
  }, null, 2), 'utf-8');

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
