// 註冊 Telegram webhook 與機器人指令選單。用法：npm run telegram:setup [網站網址]
// 從 .env 讀取 TELEGRAM_BOT_TOKEN 與 TELEGRAM_WEBHOOK_SECRET (只讀這兩個鍵，不輸出內容)。
const fs = require('fs');

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^(TELEGRAM_BOT_TOKEN|TELEGRAM_WEBHOOK_SECRET)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const token = env.TELEGRAM_BOT_TOKEN;
const secret = env.TELEGRAM_WEBHOOK_SECRET;
const site = (process.argv[2] || 'https://uq.coinyapp.com').replace(/\/$/, '');
if (!token || !secret) {
  console.error('.env 缺少 TELEGRAM_BOT_TOKEN 或 TELEGRAM_WEBHOOK_SECRET');
  process.exit(1);
}

const call = async (method, payload) => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  console.log(`${method}:`, body.ok ? 'ok' : body.description);
  return body;
};

(async () => {
  // callback_query 是按鈕 (取消追蹤、通知設定) 必要的更新類型
  await call('setWebhook', {
    url: `${site}/api/telegram`,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
  });
  await call('setMyCommands', {
    commands: [
      { command: 'list', description: '查看我的追蹤清單' },
      { command: 'add', description: '搜尋商品並加入追蹤' },
      { command: 'target', description: '設定目標價' },
      { command: 'settings', description: '通知設定' },
      { command: 'help', description: '指令說明' },
      { command: 'stop', description: '取消通知' },
    ],
  });
  const info = await (await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)).json();
  console.log('webhook:', info.result.url, '| allowed:', (info.result.allowed_updates || []).join(','), '| error:', info.result.last_error_message || '無');
})();
