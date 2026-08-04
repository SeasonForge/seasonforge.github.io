import fs from 'fs';

/**
 * Writes content to a file atomically using a temp file + rename.
 * Prevents corrupt files if the process crashes mid-write.
 * @param {string} filePath - Target file path
 * @param {string} content - Content to write
 * @param {string} encoding - File encoding (default: 'utf-8')
 */
export function atomicWriteFileSync(filePath, content, encoding = 'utf-8') {
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tmpPath, content, encoding);
  fs.renameSync(tmpPath, filePath);
}
