// Service Worker：離線可開啟、新版本由使用者確認後再更新。
// 建置時 scripts/build_sw.cjs 會把下面兩個標記替換成實際的預先快取清單與版本號。
const PRECACHE = /*__PRECACHE__*/[];
const VERSION = /*__VERSION__*/'dev';

const STATIC_CACHE = `uq-static-${VERSION}`;
const DATA_CACHE = 'uq-data'; // 跨版本保留，products.json 走 stale-while-revalidate

self.addEventListener('install', (e) => {
  // 不主動 skipWaiting：由頁面在使用者按「更新」後送出 SKIP_WAITING，避免新舊檔案混用
  e.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('uq-static-') && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
};

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // 第三方 (Firestore、UNIQLO 圖片、Google 登入) 與 API 一律交給瀏覽器，不快取
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // 頁面導覽：優先走網路，離線時回退到快取的 App 外殼 (SPA)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  if (url.pathname === '/products.json') {
    e.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  // 其餘同源靜態檔 (含帶雜湊的 /assets/*)：先查快取，沒有再走網路並補進快取
  e.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
      }
      return res;
    }))
  );
});
