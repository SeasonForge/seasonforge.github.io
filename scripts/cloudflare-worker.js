/**
 * Cloudflare Worker for SeasonForge Telegram Moderation Bot
 * 
 * Target User Telegram ID: 8956396085
 * 
 * Required Secrets in Cloudflare Worker:
 * - TELEGRAM_BOT_TOKEN: Token of your Telegram Bot from @BotFather
 * - GITHUB_PAT: Personal Access Token with repo/contents write access to SeasonForge/seasonforge.github.io
 * - WORKER_AUTH_KEY: (Optional) Secret key to verify requests from GitHub Actions
 */

const TARGET_TELEGRAM_ID = 8956396085;
const REPO_OWNER = 'SeasonForge';
const REPO_NAME = 'seasonforge.github.io';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Endpoint for GitHub Actions to submit draft update for moderation
    if (url.pathname === '/api/pending-log' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { diffs, updatedSeasonsJson, authKey } = body;

        if (env.WORKER_AUTH_KEY && authKey !== env.WORKER_AUTH_KEY) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!Array.isArray(diffs) || diffs.length === 0) {
          return new Response(JSON.stringify({ message: 'No diffs provided' }), { status: 400 });
        }

        const draftId = `draft_${Date.now()}`;
        
        // Save draft dataset to Cloudflare KV (if KV binding SEASONS_KV exists) or memory
        if (env.SEASONS_KV && updatedSeasonsJson) {
          await env.SEASONS_KV.put(`draft:${draftId}`, updatedSeasonsJson, { expirationTtl: 86400 }); // Expire in 24h
        }

        // Format Telegram Message
        const diffListText = diffs.map(d => `• <b>${escapeHtml(d.ru || d.en || '')}</b>`).join('\n');
        const messageText = 
          `<b>🔍 SeasonForge: Обнаружены новые данные на проверку!</b>\n\n` +
          `${diffListText}\n\n` +
          `<i>Нажмите кнопку ниже для подтверждения публикации на сайте.</i>`;

        // Send Telegram Message with Inline Buttons
        const tgRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TARGET_TELEGRAM_ID,
            text: messageText,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Одобрить и выпустить', callback_data: `approve:${draftId}` },
                  { text: '❌ Отклонить', callback_data: `reject:${draftId}` }
                ]
              ]
            }
          })
        });

        if (!tgRes.ok) {
          const errText = await tgRes.text();
          return new Response(JSON.stringify({ error: 'Telegram API failed', details: errText }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true, draftId }), { status: 200 });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // 2. Telegram Webhook Endpoint (handles button clicks)
    if (url.pathname === '/telegram-webhook' && request.method === 'POST') {
      try {
        const update = await request.json();

        if (update.callback_query) {
          const callback = update.callback_query;
          const fromId = callback.from.id;
          const callbackId = callback.id;
          const cbData = callback.data || '';
          const messageId = callback.message?.message_id;

          // Security check: Only TARGET_TELEGRAM_ID is allowed to approve/reject
          if (Number(fromId) !== TARGET_TELEGRAM_ID) {
            await answerCallback(env.TELEGRAM_BOT_TOKEN, callbackId, '⛔ Доступ запрещён!');
            return new Response('OK', { status: 200 });
          }

          if (cbData.startsWith('approve:')) {
            const draftId = cbData.replace('approve:', '');
            
            // Retrieve approved dataset from KV if available
            let approvedJson = null;
            if (env.SEASONS_KV) {
              approvedJson = await env.SEASONS_KV.get(`draft:${draftId}`);
            }

            // Trigger GitHub Repository Dispatch workflow
            const ghRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.GITHUB_PAT}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'SeasonForge-Cloudflare-Worker'
              },
              body: JSON.stringify({
                event_type: 'deploy-approved',
                client_payload: {
                  draftId,
                  approvedJson: approvedJson || ''
                }
              })
            });

            await answerCallback(env.TELEGRAM_BOT_TOKEN, callbackId, '✅ Публикация запущена!');

            // Update Telegram message text
            if (messageId) {
              await editTelegramMessage(env.TELEGRAM_BOT_TOKEN, TARGET_TELEGRAM_ID, messageId,
                `<b>✅ Опубликовано на seasonforge.online</b>\n\nИзменения успешно отправлены на сборку.`
              );
            }

            if (env.SEASONS_KV) {
              await env.SEASONS_KV.delete(`draft:${draftId}`);
            }
          } else if (cbData.startsWith('reject:')) {
            const draftId = cbData.replace('reject:', '');
            await answerCallback(env.TELEGRAM_BOT_TOKEN, callbackId, '❌ Изменения отклонены');

            if (messageId) {
              await editTelegramMessage(env.TELEGRAM_BOT_TOKEN, TARGET_TELEGRAM_ID, messageId,
                `<b>❌ Изменения отклонены</b>\n\nПубликация отменена.`
              );
            }

            if (env.SEASONS_KV) {
              await env.SEASONS_KV.delete(`draft:${draftId}`);
            }
          }
        }

        return new Response('OK', { status: 200 });
      } catch (err) {
        return new Response(`Error: ${err.message}`, { status: 500 });
      }
    }

    return new Response('SeasonForge Moderation Worker API', { status: 200 });
  }
};

async function answerCallback(botToken, callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  }).catch(() => {});
}

async function editTelegramMessage(botToken, chatId, messageId, text) {
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML'
    })
  }).catch(() => {});
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
