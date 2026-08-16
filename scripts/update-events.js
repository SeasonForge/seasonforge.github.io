import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWriteFileSync } from './updater/fileUtils.js';

// Simple native .env loader if file exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch (e) {
    // ignore
  }
}

import { Validator } from './updater/Validator.js';
import { PoEEventAdapter } from './updater/eventAdapters/PoEEventAdapter.js';
import { PoE2EventAdapter } from './updater/eventAdapters/PoE2EventAdapter.js';
import { DiabloEventAdapter } from './updater/eventAdapters/DiabloEventAdapter.js';
import { LastEpochEventAdapter } from './updater/eventAdapters/LastEpochEventAdapter.js';
import { TorchlightEventAdapter } from './updater/eventAdapters/TorchlightEventAdapter.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsFilePath = path.join(__dirname, '../data/events.json');

export function getEventStatus(startDate, endDate, now = new Date()) {
  const nowMs = now.getTime();
  const startMs = new Date(startDate).getTime();
  const endMs = endDate ? new Date(endDate).getTime() : null;

  if (startMs > nowMs) {
    return 'upcoming';
  }
  if (endMs && nowMs > endMs) {
    return 'ended';
  }
  return 'active';
}

async function updateEvents() {
  console.log('=== Starting ARPG Events & Drops Updater ===');

  let currentData = { lastCheckedAt: new Date().toISOString(), events: [] };
  if (fs.existsSync(eventsFilePath)) {
    try {
      currentData = JSON.parse(fs.readFileSync(eventsFilePath, 'utf-8'));
    } catch (e) {
      console.warn('Could not read existing events.json, creating new structure.');
    }
  }

  const existingEvents = Array.isArray(currentData.events) ? currentData.events : [];

  const adapters = [
    new PoEEventAdapter(),
    new PoE2EventAdapter(),
    new DiabloEventAdapter(),
    new LastEpochEventAdapter(),
    new TorchlightEventAdapter()
  ];

  let allMergedEvents = [];

  for (const adapter of adapters) {
    const gameId = adapter.gameId;
    const currentGameEvents = existingEvents.filter(e => e.gameId === gameId);

    try {
      const updatedGameEvents = await adapter.fetchAndExtract(currentGameEvents);
      allMergedEvents.push(...updatedGameEvents);
    } catch (err) {
      console.error(`[Events Updater] Failed updating events for ${gameId}: ${err.message}`);
      allMergedEvents.push(...currentGameEvents);
    }
  }

  // Preserve any events from other games if present
  const handledGames = new Set(adapters.map(a => a.gameId));
  const unhandledEvents = existingEvents.filter(e => !handledGames.has(e.gameId));
  allMergedEvents.push(...unhandledEvents);

  // Compute live statuses and purge ancient events ended > 30 days ago
  const now = new Date();
  const thirtyDaysMs = 30 * 86400000;
  const nowMs = now.getTime();

  const validEvents = allMergedEvents.filter(evt => {
    try {
      Validator.validateEvent(evt);
    } catch (valErr) {
      console.warn(`[Events Updater] Skipping invalid event: ${valErr.message}`);
      return false;
    }
    if (!evt.endDate) return true;
    const endMs = new Date(evt.endDate).getTime();
    return (nowMs - endMs) <= thirtyDaysMs;
  });

  const sortedEvents = validEvents.map(evt => ({
    ...evt,
    status: getEventStatus(evt.startDate, evt.endDate, now)
  })).sort((a, b) => {
    // Active first, then Upcoming, then Ended
    const statusWeight = { active: 1, upcoming: 2, ended: 3 };
    const wA = statusWeight[a.status] || 2;
    const wB = statusWeight[b.status] || 2;
    if (wA !== wB) return wA - wB;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const outputData = {
    lastCheckedAt: now.toISOString(),
    events: sortedEvents
  };

  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.log(`\n[Events Updater] DRY RUN MODE: Extracted ${sortedEvents.length} events. Skipping file write.`);
    return;
  }

  atomicWriteFileSync(eventsFilePath, JSON.stringify(outputData, null, 2));

  const activeCount = sortedEvents.filter(e => e.status === 'active').length;
  const upcomingCount = sortedEvents.filter(e => e.status === 'upcoming').length;
  const endedCount = sortedEvents.filter(e => e.status === 'ended').length;

  console.log(`\n[Events Updater] Summary:`);
  console.log(`- Total events: ${sortedEvents.length}`);
  console.log(`- Active: ${activeCount}`);
  console.log(`- Upcoming: ${upcomingCount}`);
  console.log(`- Ended: ${endedCount}`);
  console.log(`- Saved to: ${eventsFilePath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateEvents().catch(err => {
    console.error('Fatal error in updateEvents:', err);
    process.exit(1);
  });
}

export { updateEvents };
