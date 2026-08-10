/**
 * Cloudflare Worker for SeasonForge Telegram Moderation Bot & Website Feedback Form
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      const botToken = env.TELEGRAM_BOT_TOKEN || env.BOT_TOKEN || env.TG_BOT_TOKEN;
      const targetChatId = env.CHAT_ID || env.TARGET_TELEGRAM_ID || TARGET_TELEGRAM_ID;
      let body = {};
      if (request.method === 'POST') {
        body = await request.json().catch(() => ({}));
      }

      // 1. Endpoint for GitHub Actions to submit draft update for moderation
      if (url.pathname === '/api/pending-log' && request.method === 'POST') {
        const { diffs, updatedSeasonsJson, authKey } = body;

        if (env.WORKER_AUTH_KEY && authKey !== env.WORKER_AUTH_KEY) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }

        if (!Array.isArray(diffs) || diffs.length === 0) {
          return new Response(JSON.stringify({ message: 'No diffs provided' }), { status: 400, headers: corsHeaders });
        }

        const draftId = `draft_${Date.now()}`;
        
        // Save draft dataset to Cloudflare KV (if KV binding SEASONS_KV exists)
        if (env.SEASONS_KV && updatedSeasonsJson) {
          await env.SEASONS_KV.put(`draft:${draftId}`, updatedSeasonsJson, { expirationTtl: 86400 });
        }

        // Format Telegram Message
        const diffListText = diffs.map(d => `• <b>${escapeHtml(d.ru || d.en || '')}</b>`).join('\n');
        const messageText = 
          `<b>🔍 SeasonForge: Обнаружены новые данные на проверку!</b>\n\n` +
          `${diffListText}\n\n` +
          `<i>Нажмите кнопку ниже для подтверждения публикации на сайте.</i>`;

        // Send Telegram Message with Inline Buttons
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChatId,
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
          return new Response(JSON.stringify({ error: 'Telegram API failed', details: errText }), { status: 500, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: true, draftId }), { status: 200, headers: corsHeaders });
      }

      // 2. Telegram Webhook Endpoint (handles button clicks & TG updates)
      const isTelegramUpdate = body.update_id !== undefined || body.callback_query !== undefined || url.pathname === '/telegram-webhook';

      if (isTelegramUpdate && request.method === 'POST') {
        if (body.callback_query) {
          const callback = body.callback_query;
          const fromId = callback.from.id;
          const callbackId = callback.id;
          const cbData = callback.data || '';
          const messageId = callback.message?.message_id;

          // Security check: Only targetChatId is allowed to approve/reject
          if (String(fromId) !== String(targetChatId)) {
            await answerCallback(botToken, callbackId, '⛔ Доступ запрещён!');
            return new Response('OK', { status: 200, headers: corsHeaders });
          }

          if (cbData.startsWith('approve:') || cbData.startsWith('approve_')) {
            const draftId = cbData.replace(/^approve[:_]/, '');
            
            // Retrieve approved dataset from KV if available
            let approvedJson = null;
            if (env.SEASONS_KV) {
              approvedJson = await env.SEASONS_KV.get(`draft:${draftId}`);
            }

            // Trigger GitHub Repository Dispatch workflow
            await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`, {
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

            await answerCallback(botToken, callbackId, '✅ Публикация запущена!');

            // Update Telegram message text
            if (messageId) {
              await editTelegramMessage(botToken, targetChatId, messageId,
                `<b>✅ Опубликовано на seasonforge.online</b>\n\nИзменения успешно отправлены на сборку.`
              );
            }

            if (env.SEASONS_KV) {
              await env.SEASONS_KV.delete(`draft:${draftId}`);
            }
          } else if (cbData.startsWith('reject:') || cbData.startsWith('reject_')) {
            const draftId = cbData.replace(/^reject[:_]/, '');
            await answerCallback(botToken, callbackId, '❌ Изменения отклонены');

            if (messageId) {
              await editTelegramMessage(botToken, targetChatId, messageId,
                `<b>❌ Изменения отклонены</b>\n\nПубликация отменена.`
              );
            }

            if (env.SEASONS_KV) {
              await env.SEASONS_KV.delete(`draft:${draftId}`);
            }
          }
        }

        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      // 3. Website Feedback / Contact Form Endpoint
      if (request.method === 'POST' && (body.message !== undefined || body.name !== undefined || url.pathname === '/api/feedback' || url.pathname === '/')) {
        const name = body.name || 'Аноним';
        const email = body.email || '-';
        const message = body.message || '-';

        const tgMessage = 
          `📩 <b>Новая заявка с сайта</b>\n\n` +
          `👤 <b>Имя:</b> ${escapeHtml(name)}\n` +
          `📧 <b>Email:</b> ${escapeHtml(email)}\n\n` +
          `💬 <b>Сообщение:</b>\n${escapeHtml(message)}`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: tgMessage,
            parse_mode: 'HTML'
          })
        });

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      return new Response('SeasonForge Moderation & Feedback Worker API', { status: 200, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
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

