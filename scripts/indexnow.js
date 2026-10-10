import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  } else {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
}

const KEY = process.env.INDEXNOW_KEY;
if (!KEY) {
  console.error('[IndexNow] Error: INDEXNOW_KEY not found in .env');
  process.exit(1);
}
const HOST = process.env.INDEXNOW_HOST || 'seasonforge.online';
const BASE_URL = process.env.BASE_URL || `https://${HOST}`;
const KEY_LOCATION = `${BASE_URL}/${KEY}.txt`;

const SITEMAP_PATH = path.join(__dirname, '../sitemap.xml');

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('=== IndexNow Protocol Ping ===');
  console.log(`Host: ${HOST}`);
  console.log(`Key Location: ${KEY_LOCATION}`);

  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error(`[IndexNow] Error: sitemap.xml not found at ${SITEMAP_PATH}. Run build first.`);
    process.exit(1);
  }

  const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf-8');
  const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g) || [];
  const urls = urlMatches
    .map(m => m.replace(/<\/?loc>/g, '').trim())
    .filter(Boolean);

  if (urls.length === 0) {
    console.warn('[IndexNow] Warning: No URLs found in sitemap.xml.');
    process.exit(0);
  }

  console.log(`[IndexNow] Found ${urls.length} URLs to submit:`);
  urls.forEach(u => console.log(` - ${u}`));

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls
  };

  if (isDryRun) {
    console.log('[IndexNow] Dry run enabled. Payload preview:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('[IndexNow] Dry run completed successfully.');
    return;
  }

  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://yandex.com/indexnow'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`[IndexNow] Sending ping to ${endpoint}...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok || response.status === 202) {
        console.log(`[IndexNow] Successfully submitted to ${endpoint} (Status: ${response.status})`);
      } else {
        const errorText = await response.text().catch(() => '');
        console.warn(`[IndexNow] Warning: ${endpoint} responded with HTTP ${response.status}: ${errorText}`);
      }
    } catch (err) {
      console.warn(`[IndexNow] Failed to ping ${endpoint}:`, err.message);
    }
  }

  console.log('=== IndexNow ping completed ===');
}

main().catch(err => {
  console.error('[IndexNow] Fatal error:', err);
  process.exit(1);
});
