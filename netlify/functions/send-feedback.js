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

    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (!trimmedMessage || trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Message length must be between 10 and 2000 characters' })
      };
    }

    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    if (trimmedEmail && (trimmedEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid email address' })
      };
    }

    const ALLOWED_TYPES = ['Bug', 'Idea', 'General', 'Feedback'];
    const validatedType = ALLOWED_TYPES.includes(type) ? type : 'General';

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
    const escapeHtml = (str, maxLen = 200) =>
      String(str || '')
        .slice(0, maxLen)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const typeEmoji = validatedType === 'Bug' ? '🐛' : validatedType === 'Idea' ? '💡' : '💬';
    const cleanType = escapeHtml(validatedType, 50);
    const cleanEmail = trimmedEmail ? escapeHtml(trimmedEmail, 100) : '<i>Не указан</i>';
    const cleanMessage = escapeHtml(trimmedMessage, 2000);

    const cleanUrl = escapeHtml(telemetry?.url, 200) || 'N/A';
    const cleanLang = escapeHtml(telemetry?.lang, 20) || 'N/A';
    const cleanGame = escapeHtml(telemetry?.game, 50) || 'N/A';
    const cleanRes = escapeHtml(telemetry?.resolution, 30) || 'N/A';
    const cleanUserAgent = escapeHtml(telemetry?.userAgent, 300) || 'N/A';

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
