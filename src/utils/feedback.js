export async function sendFeedback(data) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const WORKER_URL = 'https://contact-form.pupkin-vasya-pupik.workers.dev';

  const typeEmoji = data.type === 'Bug' ? '🐛' : data.type === 'Idea' ? '💡' : '💬';
  const formattedMessage = [
    `[${typeEmoji} ${data.type || 'Feedback'}]`,
    '',
    data.message || '',
    '',
    '--- Telemetry ---',
    `Game: ${data.telemetry?.game || 'N/A'}`,
    `Lang: ${data.telemetry?.lang || 'N/A'}`,
    `Screen: ${data.telemetry?.resolution || 'N/A'}`,
    `URL: ${data.telemetry?.url || 'N/A'}`
  ].join('\n');

  const payload = {
    name: `SeasonForge (${data.type || 'Feedback'})`,
    email: data.email || '',
    message: formattedMessage,
    type: data.type,
    telemetry: data.telemetry
  };

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `HTTP error ${response.status}`);
    }

    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}

