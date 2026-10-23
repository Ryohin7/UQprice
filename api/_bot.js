// Telegram 機器人的指令與按鈕處理。所有回覆不使用 emoji。
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import notify from '../notifications.cjs';
import { getCatalog, searchCatalog } from './_catalog.js';

// 測試時可替換為假的 Firestore
export const deps = { getDb: () => getFirestore(), FV: FieldValue };

const MAX_FAVORITES = 300;
const MAX_LIST = 30;
const PCT_STEPS = [0, 5, 10, 20, 30];
const GROUPS = [['men', '男裝'], ['women', '女裝'], ['kids', '童裝'], ['baby', '嬰幼兒']];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const token = () => process.env.TELEGRAM_BOT_TOKEN;

async function findUser(db, chatId) {
  const snap = await db.collection('users').where('telegram.chatId', '==', chatId).limit(1).get();
  return snap.empty ? null : { ref: snap.docs[0].ref, data: snap.docs[0].data() };
}

const say = (chatId, text, extra = {}) => notify.sendTelegram(token(), chatId, text, 'HTML', extra);
const NOT_LINKED = '尚未連結網站帳號。請從網站「我的帳號」按「連結 Telegram」。';

const HELP = [
  '可用指令：',
  '/list  查看我的追蹤清單（可直接按鈕移除）',
  '/add 關鍵字  搜尋商品並加入追蹤',
  '/remove 編號  依 /list 的編號取消追蹤',
  '/target 編號 價格  設定目標價，降到該價格以下才通知（/target 編號 off 取消）',
  '/settings  通知設定（降價、補貨、限定價格、新品、降幅門檻）',
  '/stop  取消 Telegram 通知',
].join('\n');

// ---------- 追蹤清單 ----------
// 組出追蹤清單的文字與「移除」按鈕 (供 /list 與按鈕回呼後重畫共用)
async function buildList(user) {
  const { byId } = await getCatalog();
  const favs = user.data.favorites || [];
  if (!favs.length) return { text: '你目前沒有追蹤任何商品。用 /add 關鍵字 搜尋並加入。', markup: { inline_keyboard: [] } };
  const targets = user.data.targets || {};
  const shown = favs.slice(0, MAX_LIST);
  const lines = shown.map((id, i) => {
    const p = byId.get(id);
    const price = p ? `${notify.formatPrice(p.price)} 元` : '已下架或查無資料';
    const t = typeof targets[id] === 'number' ? `（目標 ${notify.formatPrice(targets[id])} 元）` : '';
    return `${i + 1}. ${esc(p ? p.name : id)}　${price}${t}`;
  });
  if (favs.length > MAX_LIST) lines.push(`另有 ${favs.length - MAX_LIST} 件，請至網站查看。`);
  const rows = [];
  for (let i = 0; i < shown.length; i += 5) {
    rows.push(shown.slice(i, i + 5).map((id, j) => ({ text: `移除 ${i + j + 1}`, callback_data: `rm:${id}` })));
  }
  return { text: `<b>你追蹤的商品（${favs.length} 件）</b>\n\n${lines.join('\n')}`, markup: { inline_keyboard: rows } };
}

async function showList(chatId, user) {
  const view = await buildList(user);
  return say(chatId, view.text, { reply_markup: view.markup });
}

async function addFavorite(user, id) {
  const favs = user.data.favorites || [];
  if (favs.includes(id)) return '已經在追蹤清單中';
  if (favs.length >= MAX_FAVORITES) return `追蹤清單已達上限 ${MAX_FAVORITES} 件`;
  await user.ref.update({ favorites: deps.FV.arrayUnion(id) });
  return '已加入追蹤';
}

async function removeFavorite(user, id) {
  if (!(user.data.favorites || []).includes(id)) return '這件商品已不在追蹤清單中';
  await user.ref.update({ favorites: deps.FV.arrayRemove(id), [`targets.${id}`]: deps.FV.delete() });
  return '已取消追蹤';
}

// ---------- 通知設定 ----------
function settingsView(raw) {
  const s = notify.normalizeSettings(raw);
  const onOff = (v) => (v ? '開' : '關');
  const text = [
    '<b>通知設定</b>',
    '',
    `降價通知：${onOff(s.drop)}`,
    `補貨通知：${onOff(s.restock)}`,
    `限定價格通知：${onOff(s.limited)}`,
    `只通知歷史新低：${onOff(s.onlyLowest)}`,
    `降幅門檻：${s.minDropPct ? `至少 ${s.minDropPct}%` : '不限'}`,
    `新品訂閱：${s.newArrival.length ? GROUPS.filter(([k]) => s.newArrival.includes(k)).map(([, n]) => n).join('、') : '無'}`,
    '',
    '設有目標價的商品不受上述降價條件限制，降到目標價以下就會通知。',
  ].join('\n');
  const btn = (label, key) => ({ text: label, callback_data: `set:${key}` });
  const markup = {
    inline_keyboard: [
      [btn(`降價通知 ${onOff(s.drop)}`, 'drop'), btn(`補貨通知 ${onOff(s.restock)}`, 'restock')],
      [btn(`限定價格 ${onOff(s.limited)}`, 'limited'), btn(`只通知新低 ${onOff(s.onlyLowest)}`, 'onlyLowest')],
      [btn(`降幅門檻 ${s.minDropPct ? s.minDropPct + '%' : '不限'}（點擊切換）`, 'pct')],
      GROUPS.map(([k, n]) => btn(`${n} ${onOff(s.newArrival.includes(k))}`, `ng:${k}`)),
    ],
  };
  return { text, markup, settings: s };
}

function applyToggle(raw, key) {
  const s = notify.normalizeSettings(raw);
  if (key === 'pct') s.minDropPct = PCT_STEPS[(PCT_STEPS.indexOf(s.minDropPct) + 1) % PCT_STEPS.length];
  else if (key.startsWith('ng:')) {
    const g = key.slice(3);
    s.newArrival = s.newArrival.includes(g) ? s.newArrival.filter((x) => x !== g) : [...s.newArrival, g];
  } else if (['drop', 'restock', 'limited', 'onlyLowest'].includes(key)) s[key] = !s[key];
  return s;
}

// ---------- 訊息指令 ----------
export async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const [rawCmd, ...rest] = text.split(/\s+/);
  const command = rawCmd.split('@')[0].toLowerCase();
  const arg = rest.join(' ');
  const db = deps.getDb();

  if (command === '/start' && arg) return linkAccount(db, msg, arg);
  if (command === '/stop') {
    const dup = await db.collection('users').where('telegram.chatId', '==', chatId).get();
    const batch = db.batch();
    dup.forEach((d) => batch.update(d.ref, { telegram: deps.FV.delete() }));
    await batch.commit();
    return say(chatId, '已取消通知。想再開啟，請到網站重新連結 Telegram。');
  }
  if (command === '/start' || command === '/help') return say(chatId, `${command === '/start' ? '請從網站「我的帳號」按「連結 Telegram」才能綁定你的追蹤清單。\n\n' : ''}${HELP}`, { parse_mode: undefined });

  const user = await findUser(db, chatId);
  if (!user) return say(chatId, NOT_LINKED);

  if (command === '/list') return showList(chatId, user);

  if (command === '/add') {
    if (!arg) return say(chatId, '用法：/add 關鍵字（商品名稱或編號）');
    const { list } = await getCatalog();
    const results = searchCatalog(list, arg);
    if (!results.length) return say(chatId, `找不到符合「${esc(arg)}」的商品。`);
    const favs = new Set(user.data.favorites || []);
    const rows = results.map((p) => [{
      text: `${favs.has(p.id) ? '已追蹤' : '追蹤'}　${p.name.slice(0, 22)}　${notify.formatPrice(p.price)} 元`,
      callback_data: `add:${p.id}`,
    }]);
    return say(chatId, `找到 ${results.length} 件商品，按按鈕加入追蹤：`, { reply_markup: { inline_keyboard: rows } });
  }

  if (command === '/remove' || command === '/target') {
    const [numStr, valueStr] = rest;
    const idx = Number(numStr) - 1;
    const favs = user.data.favorites || [];
    if (!Number.isInteger(idx) || idx < 0 || idx >= favs.length) {
      return say(chatId, `編號不正確。請先用 /list 查看編號。\n用法：${command === '/remove' ? '/remove 編號' : '/target 編號 價格'}`);
    }
    const id = favs[idx];
    if (command === '/remove') return say(chatId, await removeFavorite(user, id));
    if ((valueStr || '').toLowerCase() === 'off') {
      await user.ref.update({ [`targets.${id}`]: deps.FV.delete() });
      return say(chatId, '已取消這件商品的目標價。');
    }
    const price = Number(valueStr);
    if (!Number.isInteger(price) || price < 1 || price > 99999) return say(chatId, '請輸入正確的目標價（整數），例如：/target 1 790');
    await user.ref.update({ [`targets.${id}`]: price });
    const { byId } = await getCatalog();
    return say(chatId, `已設定：${esc(byId.get(id)?.name || id)} 降到 ${notify.formatPrice(price)} 元以下時通知你。`);
  }

  if (command === '/settings') {
    const view = settingsView(user.data.settings);
    return say(chatId, view.text, { reply_markup: view.markup });
  }

  return say(chatId, `看不懂這個指令。\n\n${HELP}`, { parse_mode: undefined });
}

async function linkAccount(db, msg, code) {
  const chatId = msg.chat.id;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(code)) {
    return say(chatId, '綁定碼格式不正確，請回到網站重新點擊「連結 Telegram」。');
  }
  const found = await db.collection('users').where('linkCode', '==', code).limit(1).get();
  if (found.empty) return say(chatId, '綁定碼無效或已使用，請回到網站重新點擊「連結 Telegram」。');
  // 同一個 Telegram 只綁定一個網站帳號：先解除舊的綁定
  const dup = await db.collection('users').where('telegram.chatId', '==', chatId).get();
  const batch = db.batch();
  dup.forEach((d) => batch.update(d.ref, { telegram: deps.FV.delete() }));
  batch.update(found.docs[0].ref, {
    telegram: { chatId, username: msg.from?.username || null, linkedAt: Date.now() },
    linkCode: deps.FV.delete(),
  });
  await batch.commit();
  return say(chatId, `已連結。你追蹤的商品有變動時，我會在這裡通知你。\n\n${HELP}`, { parse_mode: undefined });
}

// ---------- 按鈕回呼 ----------
export async function handleCallback(cb) {
  const chatId = cb.message?.chat?.id;
  const data = cb.data || '';
  const answer = (text) => notify.callTelegram(token(), 'answerCallbackQuery', { callback_query_id: cb.id, text }).catch(() => {});
  if (!chatId) return answer();

  const db = deps.getDb();
  const user = await findUser(db, chatId);
  if (!user) return answer(NOT_LINKED);

  if (data.startsWith('rm:')) {
    const result = await removeFavorite(user, data.slice(3));
    const rows = cb.message.reply_markup?.inline_keyboard || [];
    const isCard = rows.some((r) => r.some((b) => b.url)); // 通知卡片有「前往官網購買」連結按鈕
    if (isCard) {
      // 通知卡片：保留官網按鈕，只移除「取消追蹤」
      await notify.callTelegram(token(), 'editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: cb.message.message_id,
        reply_markup: { inline_keyboard: rows.filter((r) => !r.some((b) => b.callback_data === data)) },
      }).catch(() => {});
    } else {
      // /list 清單：重新讀取後重畫
      const fresh = await findUser(db, chatId);
      if (fresh) {
        const view = await buildList(fresh);
        await notify.callTelegram(token(), 'editMessageText', {
          chat_id: chatId, message_id: cb.message.message_id, text: view.text, parse_mode: 'HTML', reply_markup: view.markup,
        }).catch(() => {});
      }
    }
    return answer(result);
  }

  if (data.startsWith('add:')) {
    return answer(await addFavorite(user, data.slice(4)));
  }

  if (data.startsWith('set:')) {
    const next = applyToggle(user.data.settings, data.slice(4));
    await user.ref.set({ settings: next }, { merge: true });
    const view = settingsView(next);
    await notify.callTelegram(token(), 'editMessageText', {
      chat_id: chatId, message_id: cb.message.message_id, text: view.text, parse_mode: 'HTML', reply_markup: view.markup,
    }).catch(() => {});
    return answer();
  }

  return answer();
}
