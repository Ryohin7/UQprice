// 一次性遷移：把 product_views/{id}.views 彙整成 product_views/all.counts
// 用法：node scripts_migrate_views.mjs [--apply]   (預設 dry-run，只讀不寫)
import fs from 'fs';
const apply = process.argv.includes('--apply');
const cfg = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/configstore/firebase-tools.json', 'utf8'));
const r = await fetch('https://www.googleapis.com/oauth2/v3/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    refresh_token: cfg.tokens.refresh_token,
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    grant_type: 'refresh_token',
  }),
});
const H = { Authorization: 'Bearer ' + (await r.json()).access_token, 'Content-Type': 'application/json' };
const base = 'https://firestore.googleapis.com/v1/projects/uqprice/databases/(default)/documents/product_views';
const counts = {};
let token = '';
do {
  const j = await (await fetch(`${base}?pageSize=300${token ? '&pageToken=' + token : ''}`, { headers: H })).json();
  for (const d of j.documents || []) {
    const id = d.name.split('/').pop();
    if (id === 'all') continue;
    counts[id] = Number(d.fields?.views?.integerValue || 0);
  }
  token = j.nextPageToken || '';
} while (token);
const fields = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, { integerValue: String(v) }]));
console.log(`商品數 ${Object.keys(counts).length}，總瀏覽 ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
if (!apply) { console.log('dry-run，未寫入。加上 --apply 才會建立 product_views/all'); process.exit(0); }
const res = await fetch(`${base}/all`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: { counts: { mapValue: { fields } } } }) });
console.log('寫入結果', res.status);
