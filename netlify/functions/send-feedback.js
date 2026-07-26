export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { type, message, email, telemetry } = data;

    if (!message || message.length < 10) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Message is too short' })
      };
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables.');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Escape HTML special characters for safety in Telegram HTML parse mode
    const escapeHtml = (str) =>
      String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const typeEmoji = type === 'Bug' ? '🐛' : type === 'Idea' ? '💡' : '💬';
    const cleanType = escapeHtml(type || 'Feedback');
    const cleanEmail = email ? escapeHtml(email) : '<i>Не указан</i>';
    const cleanMessage = escapeHtml(message);

    const cleanUrl = escapeHtml(telemetry?.url || 'N/A');
    const cleanLang = escapeHtml(telemetry?.lang || 'N/A');
    const cleanGame = escapeHtml(telemetry?.game || 'N/A');
    const cleanRes = escapeHtml(telemetry?.resolution || 'N/A');
    const cleanUserAgent = escapeHtml(telemetry?.userAgent || 'N/A');

    const text = `<b>${typeEmoji} Новый отзыв на SeasonForge!</b>

<b>Тип:</b> ${cleanType}
<b>Email:</b> ${cleanEmail}

<b>Сообщение:</b>
${cleanMessage}

----------------------------------
<b>Телеметрия:</b>
• <b>Игра:</b> ${cleanGame}
• <b>Язык:</b> ${cleanLang}
• <b>Экран:</b> ${cleanRes}
• <b>URL:</b> ${cleanUrl}
• <b>User-Agent:</b> <code>${cleanUserAgent}</code>`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const resData = await response.json();

    if (!response.ok || !resData.ok) {
      console.error('Telegram API error:', resData);
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to send message to Telegram', details: resData.description })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Error processing feedback:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
}
