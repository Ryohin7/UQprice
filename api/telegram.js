// Telegram webhook (Vercel Serverless Function)
// 綁定：使用者在網站按「連結 Telegram」會帶著一次性綁定碼開啟 t.me/<bot>?start=<code>，
// Telegram 把 `/start <code>` 推送到這裡。之後的指令 (/list /add /target /settings ...) 與按鈕回呼
// 也都由這裡處理，詳見 _bot.js。
import { initAdmin } from './_lib.js';
import { handleMessage, handleCallback } from './_bot.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // 只接受帶有正確密鑰的 Telegram 請求
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).end();
  }

  try {
    initAdmin();
    const update = req.body || {};
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message?.text && update.message.chat?.type === 'private') {
      await handleMessage(update.message);
    }
  } catch (err) {
    // 一律回 200，避免 Telegram 不斷重送同一則更新
    console.error('telegram webhook error:', err);
  }
  return res.status(200).end();
}
