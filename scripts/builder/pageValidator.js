import fs from 'fs';
import path from 'path';

/**
 * Validates generated HTML pages for SEO tags, JSON-LD, and valid local asset links.
 */
export function validatePages(BASE_URL, games, generatedSeasonUrls, rootDir) {
  console.log('\n=== Automated SSG Page Verification ===');
  const errors = [];
  let checkedCount = 0;

  const pagesToValidate = [
    path.join(rootDir, 'index.html'),
    path.join(rootDir, 'events/index.html'),
    path.join(rootDir, 'changelog/index.html'),
    path.join(rootDir, 'donate/index.html'),
    path.join(rootDir, 'privacy/index.html')
  ];

  for (const game of games) {
    pagesToValidate.push(path.join(rootDir, `games/${game.id}/index.html`));
  }

  for (const seasonUrl of generatedSeasonUrls) {
    const relativePath = seasonUrl.replace(BASE_URL, '');
    const filePath = path.join(rootDir, relativePath, 'index.html');
    pagesToValidate.push(filePath);
  }

  for (const filePath of pagesToValidate) {
    checkedCount++;
    const relName = path.relative(rootDir, filePath);

    if (!fs.existsSync(filePath)) {
      errors.push(`[MISSING] ${relName} does not exist.`);
      continue;
    }

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      errors.push(`[EMPTY] ${relName} is 0 bytes.`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    if (!/<title>(.*?)<\/title>/i.test(content)) {
      errors.push(`[NO_TITLE] ${relName} missing <title> tag.`);
    }

    if (!/<meta\s+name="description"\s+content="([^"]*)"/i.test(content) && !/<meta\s+content="([^"]*)"\s+name="description"/i.test(content)) {
      errors.push(`[NO_DESC] ${relName} missing <meta name="description">.`);
    }

    if (!/<link\s+rel="canonical"\s+href="([^"]*)"/i.test(content)) {
      errors.push(`[NO_CANONICAL] ${relName} missing canonical link.`);
    }

    const jsonLdMatch = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    if (!jsonLdMatch) {
      errors.push(`[NO_JSONLD] ${relName} missing Schema.org JSON-LD.`);
    } else {
      try {
        JSON.parse(jsonLdMatch[1]);
      } catch (e) {
        errors.push(`[BAD_JSONLD] ${relName} invalid JSON-LD: ${e.message}`);
      }
    }

    const assetRegex = /(?:src|href)="(\.\.\/[^"]+)"/g;
    let match;
    while ((match = assetRegex.exec(content)) !== null) {
      const assetRelPath = match[1].split('?')[0].split('#')[0];
      const pageDir = path.dirname(filePath);
      const targetAssetPath = path.resolve(pageDir, assetRelPath);
      if (!fs.existsSync(targetAssetPath)) {
        errors.push(`[BROKEN_ASSET] ${relName} references missing asset: ${assetRelPath} -> ${targetAssetPath}`);
      }
    }
  }

  console.log(`[SSG Validator] Checked ${checkedCount} HTML pages.`);
  if (errors.length > 0) {
    console.error(`[SSG Validator] FAILED with ${errors.length} errors:`);
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log(`[SSG Validator] SUCCESS: All ${checkedCount} pages passed validation checks clean!`);
  }
}
