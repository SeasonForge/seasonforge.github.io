import fs from 'fs';
import path from 'path';

/**
 * Removes log files older than keepDays from the logs directory.
 * Prevents unbounded log accumulation over time.
 * @param {string} dir - Absolute path to the logs directory
 * @param {number} keepDays - Number of days of logs to retain (default: 30)
 */
export function cleanOldLogs(dir, keepDays = 30) {
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
