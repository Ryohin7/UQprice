// 降價通知：把「這次爬到的降價商品」比對每位使用者的追蹤清單，透過 Telegram 機器人通知。
// 由 crawl_all_men.cjs 在同步完成後呼叫；缺少 TELEGRAM_BOT_TOKEN 時只印出預覽、不發送。

const MAX_ITEMS_PER_MESSAGE = 10;

const escapeHtml = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatPrice = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// drops: [{ id, name, productCode, oldPrice, newPrice, isLowest }]
// users: [{ chatId, favorites: [id] }]
// 回傳 [{ chatId, text }]，每位使用者依追蹤到的降價商品分批成多則訊息
function buildMessages(drops, users) {
  const dropMap = new Map(drops.map((d) => [d.id, d]));
  const messages = [];

  for (const u of users) {
    if (!u.chatId || !Array.isArray(u.favorites)) continue;
    const hits = u.favorites.map((id) => dropMap.get(id)).filter(Boolean);
    for (let i = 0; i < hits.length; i += MAX_ITEMS_PER_MESSAGE) {
      const chunk = hits.slice(i, i + MAX_ITEMS_PER_MESSAGE);
      const lines = chunk.map((d) => {
        const url = `https://www.uniqlo.com/tw/zh_TW/product-detail.html?productCode=${encodeURIComponent(d.productCode)}`;
        const lowest = d.isLowest ? ' 🏆 歷史新低' : '';
        return `<a href="${url}">${escapeHtml(d.name)}</a>\n${formatPrice(d.oldPrice)} → <b>${formatPrice(d.newPrice)}</b> 元（降 ${formatPrice(d.oldPrice - d.newPrice)}）${lowest}`;
      });
      messages.push({ chatId: u.chatId, text: `📉 你追蹤的商品降價了！\n\n${lines.join('\n\n')}` });
    }
  }
  return messages;
}

async function sendTelegram(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.description || `HTTP ${res.status}`);
    err.status = res.status;
    err.retryAfter = body.parameters?.retry_after;
    throw err;
  }
}

async function notifyPriceDrops({ db, firestore, drops }) {
  if (!drops.length) {
    console.log('  🔔 本次沒有降價商品，略過通知');
    return { sent: 0, failed: 0 };
  }
  const { collection, getDocs } = firestore;

  const snap = await getDocs(collection(db, 'users'));
  const users = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.telegram?.chatId) users.push({ chatId: data.telegram.chatId, favorites: data.favorites || [] });
  });

  const messages = buildMessages(drops, users);
  console.log(`  🔔 降價商品 ${drops.length} 件，已綁定 Telegram 的使用者 ${users.length} 位，待發送 ${messages.length} 則`);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('  ⚠️ 未設定 TELEGRAM_BOT_TOKEN，僅預覽不發送');
    messages.slice(0, 3).forEach((m) => console.log(`     → chat ${m.chatId}: ${m.text.split('\n').slice(0, 3).join(' | ')}`));
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const m of messages) {
    try {
      await sendTelegram(token, m.chatId, m.text);
      sent++;
    } catch (err) {
      if (err.status === 429 && err.retryAfter) {
        await new Promise((r) => setTimeout(r, (err.retryAfter + 1) * 1000));
        try { await sendTelegram(token, m.chatId, m.text); sent++; continue; } catch { /* 落入 failed */ }
      }
      failed++;
      // 403 = 使用者封鎖了機器人；不影響其他人
      console.warn(`  ⚠️ 通知 chat ${m.chatId} 失敗: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 60)); // 遵守 Telegram 發送頻率限制
  }
  console.log(`  🔔 通知完成：成功 ${sent}、失敗 ${failed}`);
  return { sent, failed };
}

module.exports = { buildMessages, notifyPriceDrops };
