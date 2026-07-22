export async function sendFeedback(data) {
  // Pre-open target window synchronously to prevent popup blocker in async context
  let targetWin = null;
  try {
    targetWin = window.open('about:blank', '_blank');
    if (targetWin) {
      targetWin.opener = null;
    }
  } catch (e) {
    // Popup might be blocked
  }

  const basePath = window.location.pathname.includes('/games/') ? '../../' : './';
  let issuesUrl = 'https://github.com/seasonforge/seasonforge.github.io/issues/new';

  try {
    const configRes = await fetch(`${basePath}data/feedback.json`);
    if (configRes.ok) {
      const config = await configRes.json();
      if (config.issuesUrl) {
        const parsed = new URL(config.issuesUrl, window.location.origin);
        if (parsed.hostname === 'github.com') {
          issuesUrl = config.issuesUrl;
        }
      }
    }
  } catch (err) {
    console.warn('Could not load feedback config, falling back to default GitHub URL:', err);
  }

  const title = encodeURIComponent(`[Feedback] ${data.type.toUpperCase()}: ${data.message.slice(0, 50)}...`);
  const body = encodeURIComponent(
`### Feedback Details
**Type:** ${data.type}
**Email:** ${data.email || 'N/A'}

**Message:**
${data.message}

---
### Telemetry
- **URL:** ${data.telemetry.url}
- **Language:** ${data.telemetry.lang}
- **Game:** ${data.telemetry.game || 'None'}
- **Resolution:** ${data.telemetry.resolution}
- **User-Agent:** ${data.telemetry.userAgent}
- **Timestamp:** ${data.telemetry.timestamp}`
  );

  const fullUrl = `${issuesUrl}?title=${title}&body=${body}`;

  if (targetWin && !targetWin.closed) {
    targetWin.location.href = fullUrl;
  } else {
    // Fallback if popup blocker intercepted window.open
    window.location.href = fullUrl;
  }

  return true;
}
