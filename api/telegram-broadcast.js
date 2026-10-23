// 後台「Telegram 推播」：count 取得已連結人數、self 發給自己預覽、send 推播給所有已連結使用者。
// 呼叫者必須是 ADMIN_EMAILS 白名單內的管理員。
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import notify from '../notify_price_drops.cjs';
import { requireAdmin } from './_lib.js';

const MAX_RECIPIENTS = 1400;   // 每秒 25 則，60 秒內可完成
const BATCH_SIZE = 25;         // Telegram 全域限制約每秒 30 則
const isHttps = (u) => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u) && u.length <= 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function validateMessage(m) {
  if (!m || typeof m.text !== 'string' || !m.text.trim()) return '請輸入訊息內容';
  const limit = m.image ? 1024 : 4000;
  if (m.text.length > limit) return `訊息過長（${m.image ? '附圖時' : ''}上限 ${limit} 字）`;
  if (m.image && !isHttps(m.image)) return '圖片網址必須是 https 開頭';
  if (m.buttonText || m.buttonUrl) {
    if (!m.buttonText || m.buttonText.length > 30) return '按鈕文字必填且不超過 30 字';
    if (!isHttps(m.buttonUrl)) return '按鈕連結必須是 https 開頭';
  }
  return null;
}

const clean = (m) => ({
  text: m.text.trim(),
  image: m.image || undefined,
  buttonText: m.buttonText || undefined,
  buttonUrl: m.buttonUrl || undefined,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const decoded = await requireAdmin(req, res);
    if (!decoded) return;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const db = getFirestore();
    const linkedQuery = db.collection('users').where('telegram.chatId', '!=', null);
    const { action, message, confirmCount } = req.body || {};

    if (action === 'count') {
      const snap = await linkedQuery.count().get();
      return res.status(200).json({ linked: snap.data().count });
    }

    if (action !== 'self' && action !== 'send') return res.status(400).json({ error: '未知的操作' });
    const invalid = validateMessage(message);
    if (invalid) return res.status(400).json({ error: invalid });
    const msg = clean(message);

    if (action === 'self') {
      const me = await db.collection('users').doc(decoded.uid).get();
      const chatId = me.data()?.telegram?.chatId;
      if (!chatId) return res.status(409).json({ error: '尚未連結 Telegram：請先在前台「我的帳號」連結你自己的 Telegram' });
      try {
        await notify.sendBroadcast(token, { ...msg, chatId, text: `[測試推播]\n\n${msg.text}`.slice(0, msg.image ? 1024 : 4000) });
      } catch (err) {
        return res.status(502).json({ error: `Telegram 發送失敗：${err.message}` });
      }
      return res.status(200).json({ ok: true });
    }

    // action === 'send'
    const snap = await linkedQuery.get();
    const recipients = snap.docs.map((d) => ({ ref: d.ref, chatId: d.data().telegram.chatId }));
    // 防止在人數已變動 (或畫面過期) 的情況下誤發
    if (confirmCount !== recipients.length) {
      return res.status(409).json({ error: `已連結人數已變為 ${recipients.length}，請重新確認後再發送`, linked: recipients.length });
    }
    if (recipients.length === 0) return res.status(409).json({ error: '目前沒有已連結 Telegram 的使用者' });
    if (recipients.length > MAX_RECIPIENTS) {
      return res.status(413).json({ error: `收件人超過單次上限 ${MAX_RECIPIENTS}，請改用背景工作分批發送` });
    }

    let sent = 0;
    const failed = [];
    const blocked = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(async (r) => {
        try {
          await notify.sendBroadcast(token, { ...msg, chatId: r.chatId });
        } catch (err) {
          if (err.status === 429 && err.retryAfter) {
            await sleep((err.retryAfter + 1) * 1000);
            return notify.sendBroadcast(token, { ...msg, chatId: r.chatId });
          }
          throw err;
        }
      }));
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') sent++;
        else {
          failed.push(batch[idx]);
          // 403 = 使用者封鎖了機器人，之後不再發送
          if (result.reason?.status === 403) blocked.push(batch[idx]);
        }
      });
      if (i + BATCH_SIZE < recipients.length) await sleep(1100);
    }

    if (blocked.length) {
      const wb = db.batch();
      blocked.forEach((r) => wb.update(r.ref, { telegram: FieldValue.delete() }));
      await wb.commit();
    }

    await db.collection('telegram_broadcasts').add({
      sentBy: decoded.email,
      at: Date.now(),
      total: recipients.length,
      sent,
      failed: failed.length,
      unlinkedBlocked: blocked.length,
      textPreview: msg.text.slice(0, 200),
    });

    return res.status(200).json({ ok: true, total: recipients.length, sent, failed: failed.length, unlinkedBlocked: blocked.length });
  } catch (err) {
    console.error('telegram-broadcast error:', err);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
}
