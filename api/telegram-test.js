// 後台「Telegram 測試」：以與真實降價通知相同的格式，發送一則範例訊息給管理員自己已綁定的 Telegram。
// 呼叫者必須帶 Firebase ID Token，且信箱在 ADMIN_EMAILS 白名單內。
import { getFirestore } from 'firebase-admin/firestore';
import notify from '../notify_price_drops.cjs';
import { requireAdmin } from './_lib.js';

const isPrice = (n) => Number.isInteger(n) && n > 0 && n < 1000000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const decoded = await requireAdmin(req, res);
    if (!decoded) return;

    const { name, productCode, image, oldPrice, newPrice, isLowest } = req.body || {};
    if (typeof name !== 'string' || !name || name.length > 100 ||
        typeof productCode !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(productCode) ||
        (image != null && (typeof image !== 'string' || !image.startsWith('https://www.uniqlo.com/'))) ||
        !isPrice(oldPrice) || !isPrice(newPrice) || newPrice >= oldPrice) {
      return res.status(400).json({ error: '商品資料不正確（新價格必須低於舊價格）' });
    }

    const userSnap = await getFirestore().collection('users').doc(decoded.uid).get();
    const chatId = userSnap.data()?.telegram?.chatId;
    if (!chatId) return res.status(409).json({ error: '尚未連結 Telegram：請先在前台「我的帳號」連結你自己的 Telegram' });

    const drop = { id: 'test', name, productCode, image: image || null, oldPrice, newPrice, isLowest: !!isLowest };
    const card = {
      chatId,
      image: drop.image,
      caption: notify.buildCaption(drop, { test: true }),
      url: notify.productUrl(productCode),
    };

    try {
      await notify.sendCard(process.env.TELEGRAM_BOT_TOKEN, card);
    } catch (err) {
      return res.status(502).json({ error: `Telegram 發送失敗：${err.message}` });
    }
    return res.status(200).json({ ok: true, image: card.image, caption: card.caption, url: card.url });
  } catch (err) {
    console.error('telegram-test error:', err);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
}
