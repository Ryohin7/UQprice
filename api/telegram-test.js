// 後台「Telegram 測試」：以與真實降價通知相同的格式，發送一則範例訊息給管理員自己已綁定的 Telegram。
// 呼叫者必須帶 Firebase ID Token，且信箱在 ADMIN_EMAILS 白名單內。
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import notify from '../notify_price_drops.cjs';

function init() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
}

const isPrice = (n) => Number.isInteger(n) && n > 0 && n < 1000000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    init();
    const idToken = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!idToken) return res.status(401).json({ error: '未登入' });

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ error: '登入已過期，請重新登入' });
    }
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!decoded.email_verified || !admins.includes((decoded.email || '').toLowerCase())) {
      return res.status(403).json({ error: '沒有權限' });
    }

    const { name, productCode, oldPrice, newPrice, isLowest } = req.body || {};
    if (typeof name !== 'string' || !name || name.length > 100 ||
        typeof productCode !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(productCode) ||
        !isPrice(oldPrice) || !isPrice(newPrice) || newPrice >= oldPrice) {
      return res.status(400).json({ error: '商品資料不正確（新價格必須低於舊價格）' });
    }

    const userSnap = await getFirestore().collection('users').doc(decoded.uid).get();
    const chatId = userSnap.data()?.telegram?.chatId;
    if (!chatId) return res.status(409).json({ error: '尚未連結 Telegram：請先在前台「我的帳號」連結你自己的 Telegram' });

    const drop = { id: 'test', name, productCode, oldPrice, newPrice, isLowest: !!isLowest };
    const [message] = notify.buildMessages([drop], [{ chatId, favorites: ['test'] }]);
    const text = `🧪 測試訊息（以下為使用者實際會收到的格式）\n\n${message.text}`;

    try {
      await notify.sendTelegram(process.env.TELEGRAM_BOT_TOKEN, chatId, text);
    } catch (err) {
      return res.status(502).json({ error: `Telegram 發送失敗：${err.message}` });
    }
    return res.status(200).json({ ok: true, html: text });
  } catch (err) {
    console.error('telegram-test error:', err);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
}
