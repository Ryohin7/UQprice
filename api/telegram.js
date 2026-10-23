// Telegram webhook (Vercel Serverless Function)
// 使用者在網站按「連結 Telegram」會帶著一次性綁定碼開啟 t.me/<bot>?start=<code>，
// Telegram 把 `/start <code>` 推送到這裡，我們用 Admin SDK 找到對應使用者並寫入 chatId。
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function getDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return getFirestore();
}

async function reply(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // 只接受帶有正確密鑰的 Telegram 請求
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).end();
  }

  try {
    const msg = req.body?.message;
    // 僅處理私訊文字，其餘一律回 200 避免 Telegram 重送
    if (!msg?.text || msg.chat?.type !== 'private') return res.status(200).end();

    const chatId = msg.chat.id;
    const [command, arg] = msg.text.trim().split(/\s+/);
    const db = getDb();

    if (command === '/start' && arg) {
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(arg)) {
        await reply(chatId, '綁定碼格式不正確，請回到網站重新點擊「連結 Telegram」。');
        return res.status(200).end();
      }
      const found = await db.collection('users').where('linkCode', '==', arg).limit(1).get();
      if (found.empty) {
        await reply(chatId, '綁定碼無效或已使用，請回到網站重新點擊「連結 Telegram」。');
        return res.status(200).end();
      }
      // 同一個 Telegram 只綁定一個網站帳號：先解除舊的綁定
      const dup = await db.collection('users').where('telegram.chatId', '==', chatId).get();
      const batch = db.batch();
      dup.forEach((d) => batch.update(d.ref, { telegram: FieldValue.delete() }));
      batch.update(found.docs[0].ref, {
        telegram: { chatId, username: msg.from?.username || null, linkedAt: Date.now() },
        linkCode: FieldValue.delete(),
      });
      await batch.commit();
      await reply(chatId, '✅ 已連結！你在「我的追蹤」中的商品降價時，我會在這裡通知你。\n輸入 /stop 可隨時取消通知。');
    } else if (command === '/stop') {
      const dup = await db.collection('users').where('telegram.chatId', '==', chatId).get();
      const batch = db.batch();
      dup.forEach((d) => batch.update(d.ref, { telegram: FieldValue.delete() }));
      await batch.commit();
      await reply(chatId, '已取消降價通知。想再開啟，請到網站重新連結 Telegram。');
    } else if (command === '/start') {
      await reply(chatId, '請從網站「我的帳號 → 連結 Telegram」進入，才能綁定你的追蹤清單。');
    }
  } catch (err) {
    console.error('telegram webhook error:', err);
  }
  return res.status(200).end();
}
