export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_FEEDBACK_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables in Netlify.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Telegram environment variables not configured' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { action, text, draftId, messageId, offset = 0 } = data;

    if (action === 'send_request') {
      if (!text || !draftId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing text or draftId' })
        };
      }

      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Одобрить и выпустить', callback_data: `approve_${draftId}` },
                { text: '❌ Отклонить', callback_data: `reject_${draftId}` }
              ]
            ]
          }
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Telegram API error', details: resData })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, messageId: resData.result?.message_id })
      };
    }

    if (action === 'check_status') {
      if (!draftId || !messageId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing draftId or messageId' })
        };
      }

      const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=5`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true, status: 'pending', newOffset: offset })
        };
      }

      const updatesData = await res.json();
      let currentOffset = offset;
      let status = 'pending';

      for (const update of (updatesData.result || [])) {
        currentOffset = update.update_id + 1;
        if (update.callback_query && update.callback_query.message?.message_id === Number(messageId)) {
          const cbData = update.callback_query.callback_data;
          const callbackId = update.callback_query.id;

          // Answer callback query
          fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: cbData.startsWith('approve') ? 'Публикация одобрена!' : 'Публикация отклонена!'
            })
          }).catch(() => {});

          if (cbData === `approve_${draftId}`) {
            status = 'approved';
            break;
          } else if (cbData === `reject_${draftId}`) {
            status = 'rejected';
            break;
          }
        }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, status, newOffset: currentOffset })
      };
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid action' })
    };
  } catch (err) {
    console.error('request-approval function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
}
