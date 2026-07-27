import { execSync } from 'child_process';

function shouldBuild() {
  const commitRef = process.env.COMMIT_REF || 'HEAD';
  const cachedCommitRef = process.env.CACHED_COMMIT_REF;

  let commitMsg = '';
  try {
    commitMsg = execSync(`git log -1 --pretty=%B ${commitRef}`, { encoding: 'utf8' }).trim();
  } catch (err) {
    console.log('[Netlify Ignore] Could not fetch commit message, proceeding with build.');
    return true;
  }

  const msgLower = commitMsg.toLowerCase();

  // 1. Explicit skip flag
  if (msgLower.includes('[skip ci]') || msgLower.includes('[skip netlify]') || msgLower.includes('[no deploy]')) {
    console.log(`[Netlify Ignore] Skipping build: Explicit skip tag in commit message "${commitMsg}"`);
    return false;
  }

  // 2. Explicit deploy flag or important commit type
  if (
    msgLower.includes('[deploy]') ||
    msgLower.includes('[netlify]') ||
    msgLower.includes('[release]') ||
    msgLower.includes('[major]') ||
    msgLower.startsWith('feat:') ||
    msgLower.startsWith('fix:')
  ) {
    console.log(`[Netlify Ignore] Triggering build: Explicit deploy tag or feature commit found.`);
    return true;
  }

  // 3. Check changed files between CACHED_COMMIT_REF and COMMIT_REF
  let diffCommand = `git diff --name-only HEAD~1 HEAD`;
  if (cachedCommitRef && cachedCommitRef !== commitRef) {
    diffCommand = `git diff --name-only ${cachedCommitRef} ${commitRef}`;
  }

  let changedFiles = [];
  try {
    const diffOutput = execSync(diffCommand, { encoding: 'utf8' });
    changedFiles = diffOutput.split('\n').map(f => f.trim()).filter(Boolean);
  } catch (err) {
    console.log('[Netlify Ignore] Could not determine changed files, proceeding with build.');
    return true;
  }

  if (changedFiles.length === 0) {
    console.log('[Netlify Ignore] No changed files detected. Skipping build.');
    return false;
  }

  // Critical patterns that require Netlify build
  const criticalPatterns = [
    /^netlify\.toml$/,
    /^netlify\//,
    /^package\.json$/,
    /^package-lock\.json$/,
    /^index\.html$/,
    /^src\//,
    /^assets\//,
    /^scripts\/build\.js$/,
    /^scripts\/netlify-ignore\.js$/,
    /^CNAME$/
  ];

  const hasSignificantChanges = changedFiles.some(file =>
    criticalPatterns.some(pattern => pattern.test(file))
  );

  if (hasSignificantChanges) {
    console.log('[Netlify Ignore] Significant site files changed. Triggering build.');
    return true;
  }

  console.log('[Netlify Ignore] Only minor/data updates changed. Skipping build.');
    return false;
}

const build = shouldBuild();
// Exit code 0 tells Netlify to IGNORE (skip) the build.
// Exit code 1 (or non-zero) tells Netlify to EXECUTE the build.
process.exit(build ? 1 : 0);
