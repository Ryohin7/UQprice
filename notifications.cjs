// Telegram 通知：降價、限定價格、新品上市。
// 降價/限定價格以「商品卡片」發送 (商品圖 + 說明 + 官網按鈕 + 取消追蹤按鈕)，新品上市以文字彙整發送。
// 由 crawl_all_men.cjs 在同步完成後呼叫；缺少 TELEGRAM_BOT_TOKEN 時只印出預覽、不發送。
// 注意：Telegram 訊息內一律不放 emoji。

const MAX_CARDS_PER_USER = 15;
const MAX_NEW_ARRIVALS_LISTED = 10;
const BUTTON_TEXT = '前往官網購買';
const UNFOLLOW_TEXT = '取消追蹤';
const UNIQLO_BASE = 'https://www.uniqlo.com/tw';

const DEFAULT_SETTINGS = {
  drop: true,          // 降價通知
  limited: true,       // 限定價格開始/即將結束
  onlyLowest: false,   // 降價時只在歷史新低才通知
  minDropAmount: 0,    // 降幅至少 N 元才通知 (0 = 不限；100 ~ 1000，每 100 一級)
  newArrival: [],      // 訂閱新品的分組：men / women / kids / baby
};

function normalizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    drop: s.drop !== false,
    limited: s.limited !== false,
    onlyLowest: s.onlyLowest === true,
    minDropAmount: Number.isFinite(s.minDropAmount) ? Math.max(0, Math.min(1000, Math.round(s.minDropAmount / 100) * 100)) : 0,
    newArrival: Array.isArray(s.newArrival) ? s.newArrival.filter((g) => ['men', 'women', 'kids', 'baby'].includes(g)) : [],
  };
}

const escapeHtml = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatPrice = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// 以台灣時間 (UTC+8) 顯示 月/日
const formatMD = (ts) => {
  const d = new Date(ts + 8 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

const productUrl = (productCode) =>
  `${UNIQLO_BASE}/zh_TW/product-detail.html?productCode=${encodeURIComponent(productCode)}`;

const imageUrl = (pic) => (!pic ? null : pic.startsWith('http') ? pic : `${UNIQLO_BASE}${pic}`);

const HEADLINES = {
  drop: '你追蹤的商品降價了',
  limited_start: '你追蹤的商品進入限定價格',
  limited_end: '你追蹤的商品限定價格即將結束',
};

// event: { type, id, name, productCode, image, ... }  (未指定 type 視為 drop)
function buildCaption(e, { test = false, targetPrice = null } = {}) {
  const type = e.type || 'drop';
  const lines = [];
  if (test) lines.push('[測試訊息] 以下為使用者實際會收到的格式', '');
  lines.push(`<b>${HEADLINES[type]}</b>`);
  lines.push(escapeHtml(e.name));
  if (type === 'drop') {
    lines.push(`<s>${formatPrice(e.oldPrice)}</s> → <b>${formatPrice(e.newPrice)}</b> 元（降 ${formatPrice(e.oldPrice - e.newPrice)} 元）`);
    if (e.isLowest) lines.push('目前為歷史新低價');
    if (targetPrice != null) lines.push(`已達到你設定的目標價 ${formatPrice(targetPrice)} 元`);
  } else if (type === 'limited_start') {
    lines.push(`限定價格 <b>${formatPrice(e.price)}</b> 元`);
    if (e.endTs) lines.push(`優惠期間至 ${formatMD(e.endTs)}`);
  } else if (type === 'limited_end') {
    lines.push(`限定價格 <b>${formatPrice(e.price)}</b> 元，${formatMD(e.endTs)} 結束`);
  }
  return lines.join('\n');
}

const toCard = (e, user, extra) => ({
  chatId: user.chatId,
  kind: 'card',
  productId: e.id,
  image: e.image || null,
  caption: buildCaption(e, extra),
  url: productUrl(e.productCode),
});

// 依使用者設定決定這位使用者要收到哪些事件
function passesDrop(e, user, settings) {
  const target = user.targets?.[e.id];
  if (typeof target === 'number') {
    // 有設定目標價的商品：降價後價格達標才通知，不受全域條件影響
    return e.newPrice <= target ? { targetPrice: target } : null;
  }
  if (!settings.drop) return null;
  if (settings.onlyLowest && !e.isLowest) return null;
  if (settings.minDropAmount > 0 && e.oldPrice - e.newPrice < settings.minDropAmount) return null;
  return {};
}

// users: [{ chatId, favorites, settings, targets }]
// events: drop / limited_start / limited_end；newArrivals: [{ id, name, productCode, price, groups }]
function buildItems(events, newArrivals, users) {
  const items = [];

  for (const u of users) {
    if (!u.chatId || !Array.isArray(u.favorites)) continue;
    const favs = new Set(u.favorites);
    const settings = normalizeSettings(u.settings);
    const cards = [];

    for (const e of events) {
      if (!favs.has(e.id)) continue;
      if (e.type === 'drop') {
        const pass = passesDrop(e, u, settings);
        if (pass) cards.push(toCard(e, u, pass));
      } else if (settings.limited) {
        cards.push(toCard(e, u));
      }
    }
    items.push(...cards.slice(0, MAX_CARDS_PER_USER));
    if (cards.length > MAX_CARDS_PER_USER) {
      items.push({ chatId: u.chatId, kind: 'text', text: `另有 ${cards.length - MAX_CARDS_PER_USER} 則追蹤商品通知未顯示，請至網站的「我的追蹤」查看。` });
    }

    if (settings.newArrival.length) {
      const hits = newArrivals.filter((n) => n.groups.some((g) => settings.newArrival.includes(g)));
      if (hits.length) {
        const lines = hits.slice(0, MAX_NEW_ARRIVALS_LISTED).map(
          (n) => `<a href="${productUrl(n.productCode)}">${escapeHtml(n.name)}</a>　${formatPrice(n.price)} 元`
        );
        if (hits.length > MAX_NEW_ARRIVALS_LISTED) lines.push(`另有 ${hits.length - MAX_NEW_ARRIVALS_LISTED} 件新品，請至網站查看。`);
        items.push({ chatId: u.chatId, kind: 'html', text: `<b>新品上市</b>\n\n${lines.join('\n')}` });
      }
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
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.description || `HTTP ${res.status}`);
    err.status = res.status;
    err.retryAfter = body.parameters?.retry_after;
    throw err;
  }
  return body.result;
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

function cardMarkup(card) {
  const rows = [[{ text: BUTTON_TEXT, url: card.url }]];
  if (card.productId) rows.push([{ text: UNFOLLOW_TEXT, callback_data: `rm:${card.productId}` }]);
  return { inline_keyboard: rows };
}

// 傳送商品卡片；圖片無法取得 (例如網址失效) 時退回文字訊息，按鈕仍保留
async function sendCard(token, card) {
  const replyMarkup = cardMarkup(card);
  if (card.image) {
    try {
      await callTelegram(token, 'sendPhoto', {
        chat_id: card.chatId,
        photo: card.image,
        caption: card.caption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      return;
    } catch (err) {
      if (err.status !== 400) throw err; // 400 = 圖片抓取失敗等，其餘錯誤 (封鎖、限速) 交給呼叫端
    }
  }
  await sendTelegram(token, card.chatId, card.caption, 'HTML', { reply_markup: replyMarkup });
}

// 後台推播：純文字 (不解析 HTML)，可選商品圖與一顆連結按鈕；圖片失敗時退回純文字
async function sendBroadcast(token, { chatId, text, image, buttonText, buttonUrl }) {
  const replyMarkup = buttonText && buttonUrl ? { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] } : undefined;
  if (image) {
    try {
      await callTelegram(token, 'sendPhoto', { chat_id: chatId, photo: image, caption: text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
      return;
    } catch (err) {
      if (err.status !== 400) throw err;
    }
  }
  await callTelegram(token, 'sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendItem(token, item) {
  if (item.kind === 'card') await sendCard(token, item);
  else if (item.kind === 'html') await sendTelegram(token, item.chatId, item.text, 'HTML');
  else await sendTelegram(token, item.chatId, item.text, null);
}

// 讀取所有使用者 (供通知與「最多人收藏」統計共用，只讀一次)
async function loadUsers({ db, firestore }) {
  const { collection, getDocs } = firestore;
  const snap = await getDocs(collection(db, 'users'));
  const users = [];
  snap.forEach((d) => {
    const data = d.data();
    users.push({
      chatId: data.telegram?.chatId || null,
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      settings: data.settings || null,
      targets: data.targets && typeof data.targets === 'object' ? data.targets : {},
    });
  });
  return users;
}

// { [productId]: 追蹤人數 }
function buildFavoriteCounts(users) {
  const counts = {};
  for (const u of users) {
    for (const id of new Set(u.favorites)) counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

async function notifyAll({ users: allUsers, events = [], newArrivals = [] }) {
  if (!events.length && !newArrivals.length) {
    console.log('  本次沒有需要通知的事件');
    return { sent: 0, failed: 0 };
  }
  const users = allUsers.filter((u) => u.chatId);
  const items = buildItems(events, newArrivals, users);
  const count = (t) => events.filter((e) => e.type === t).length;
  console.log(`  事件：降價 ${count('drop')}、限定價格開始 ${count('limited_start')}、即將結束 ${count('limited_end')}、新品 ${newArrivals.length}；已綁定 Telegram 的使用者 ${users.length} 位，待發送 ${items.length} 則`);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('  未設定 TELEGRAM_BOT_TOKEN，僅預覽不發送');
    items.slice(0, 3).forEach((m) => console.log(`     chat ${m.chatId}: ${(m.caption || m.text).split('\n').slice(0, 2).join(' | ')}`));
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

module.exports = {
  DEFAULT_SETTINGS, normalizeSettings, loadUsers, buildFavoriteCounts, buildItems, buildCaption,
  notifyAll, callTelegram, sendTelegram, sendCard, sendBroadcast, productUrl, imageUrl, formatPrice,
};
