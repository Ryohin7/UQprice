// 降價通知：把「這次爬到的降價商品」比對每位使用者的追蹤清單，透過 Telegram 機器人通知。
// 每件商品是一張卡片：商品圖 + 價格說明 + 「前往官網購買」按鈕 (sendPhoto + inline keyboard)。
// 由 crawl_all_men.cjs 在同步完成後呼叫；缺少 TELEGRAM_BOT_TOKEN 時只印出預覽、不發送。
// 注意：Telegram 訊息內一律不放 emoji。

const MAX_CARDS_PER_USER = 15;
const BUTTON_TEXT = '前往官網購買';
const UNIQLO_BASE = 'https://www.uniqlo.com/tw';

const escapeHtml = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatPrice = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const productUrl = (productCode) =>
  `${UNIQLO_BASE}/zh_TW/product-detail.html?productCode=${encodeURIComponent(productCode)}`;

const imageUrl = (pic) => (!pic ? null : pic.startsWith('http') ? pic : `${UNIQLO_BASE}${pic}`);

// drop: { id, name, productCode, image, oldPrice, newPrice, isLowest }
function buildCaption(d, { test = false } = {}) {
  const lines = [];
  if (test) lines.push('[測試訊息] 以下為使用者實際會收到的格式', '');
  lines.push('<b>你追蹤的商品降價了</b>');
  lines.push(escapeHtml(d.name));
  lines.push(`<s>${formatPrice(d.oldPrice)}</s> → <b>${formatPrice(d.newPrice)}</b> 元（降 ${formatPrice(d.oldPrice - d.newPrice)} 元）`);
  if (d.isLowest) lines.push('目前為歷史新低價');
  return lines.join('\n');
}

// users: [{ chatId, favorites: [id] }]
// 回傳 [{ chatId, kind: 'card', image, caption, url } | { chatId, kind: 'text', text }]
function buildCards(drops, users) {
  const dropMap = new Map(drops.map((d) => [d.id, d]));
  const items = [];

  for (const u of users) {
    if (!u.chatId || !Array.isArray(u.favorites)) continue;
    const hits = u.favorites.map((id) => dropMap.get(id)).filter(Boolean);
    for (const d of hits.slice(0, MAX_CARDS_PER_USER)) {
      items.push({ chatId: u.chatId, kind: 'card', image: d.image || null, caption: buildCaption(d), url: productUrl(d.productCode) });
    }
    if (hits.length > MAX_CARDS_PER_USER) {
      items.push({ chatId: u.chatId, kind: 'text', text: `另有 ${hits.length - MAX_CARDS_PER_USER} 件追蹤商品也降價了，請至網站的「我的追蹤」查看。` });
    }
  }
  return items;
}

async function callTelegram(token, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.description || `HTTP ${res.status}`);
    err.status = res.status;
    err.retryAfter = body.parameters?.retry_after;
    throw err;
  }
}

// parseMode 預設 HTML；傳 null 表示純文字
function sendTelegram(token, chatId, text, parseMode = 'HTML', extra = {}) {
  return callTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(parseMode ? { parse_mode: parseMode } : {}),
    ...extra,
  });
}

// 傳送商品卡片；圖片無法取得 (例如網址失效) 時退回純文字訊息，按鈕仍保留
async function sendCard(token, { chatId, image, caption, url }) {
  const replyMarkup = { inline_keyboard: [[{ text: BUTTON_TEXT, url }]] };
  if (image) {
    try {
      await callTelegram(token, 'sendPhoto', {
        chat_id: chatId,
        photo: image,
        caption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      return;
    } catch (err) {
      if (err.status !== 400) throw err; // 400 = 圖片抓取失敗等，其餘錯誤 (封鎖、限速) 交給呼叫端
    }
  }
  await sendTelegram(token, chatId, caption, 'HTML', { reply_markup: replyMarkup });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendItem(token, item) {
  if (item.kind === 'card') await sendCard(token, item);
  else await sendTelegram(token, item.chatId, item.text, null);
}

async function notifyPriceDrops({ db, firestore, drops }) {
  if (!drops.length) {
    console.log('  本次沒有降價商品，略過通知');
    return { sent: 0, failed: 0 };
  }
  const { collection, getDocs } = firestore;

  const snap = await getDocs(collection(db, 'users'));
  const users = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.telegram?.chatId) users.push({ chatId: data.telegram.chatId, favorites: data.favorites || [] });
  });

  const items = buildCards(drops, users);
  console.log(`  降價商品 ${drops.length} 件，已綁定 Telegram 的使用者 ${users.length} 位，待發送 ${items.length} 則`);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('  未設定 TELEGRAM_BOT_TOKEN，僅預覽不發送');
    items.slice(0, 3).forEach((m) => console.log(`     chat ${m.chatId}: ${(m.caption || m.text).split('\n').slice(1, 3).join(' | ')}`));
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let prevChat = null;
  for (const item of items) {
    // 同一個聊天室每秒最多約 1 則；不同使用者之間只需短暫間隔
    await sleep(item.chatId === prevChat ? 1100 : 60);
    prevChat = item.chatId;
    try {
      await sendItem(token, item);
      sent++;
    } catch (err) {
      if (err.status === 429 && err.retryAfter) {
        await sleep((err.retryAfter + 1) * 1000);
        try { await sendItem(token, item); sent++; continue; } catch { /* 落入 failed */ }
      }
      failed++;
      // 403 = 使用者封鎖了機器人；不影響其他人
      console.warn(`  通知 chat ${item.chatId} 失敗: ${err.message}`);
    }
  }
  console.log(`  通知完成：成功 ${sent}、失敗 ${failed}`);
  return { sent, failed };
}

module.exports = { buildCards, buildCaption, notifyPriceDrops, sendTelegram, sendCard, productUrl, imageUrl };
