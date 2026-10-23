// 建置後處理：把 dist 內的檔案清單與版本號寫入 dist/sw.js，並產生 404.html (SPA 備援)。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dist = path.resolve('dist');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]
);

// 預先快取：App 外殼與靜態資源。products.json (3 MB)、sw.js 本身不預先快取
const EXCLUDE = new Set(['sw.js', 'products.json', '404.html', 'icons.svg']);
const files = walk(dist)
  .map((f) => '/' + path.relative(dist, f).split(path.sep).join('/'))
  .filter((f) => !EXCLUDE.has(f.slice(1)) && !f.endsWith('.map'));
const precache = Array.from(new Set(['/', ...files])).sort();

// 版本號：由所有預先快取檔案的內容雜湊而來，任何檔案變動都會產生新版本
const hash = crypto.createHash('sha1');
for (const f of precache) {
  const p = path.join(dist, f === '/' ? 'index.html' : f);
  hash.update(f).update(fs.readFileSync(p));
}
const version = hash.digest('hex').slice(0, 10);

const swPath = path.join(dist, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace('/*__PRECACHE__*/[]', JSON.stringify(precache)).replace("/*__VERSION__*/'dev'", JSON.stringify(version));
fs.writeFileSync(swPath, sw);

fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
console.log(`sw.js: version ${version}, precache ${precache.length} files`);
