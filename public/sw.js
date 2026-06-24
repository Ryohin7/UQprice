const CACHE_NAME = 'uq-price-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('PWA Asset caching failed during install:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 排除第三方 API 還有 UNIQLO 圖片與 API
  if (e.request.url.includes('d.uniqlo.com') || e.request.url.includes('uniqlo.com/tw/hmall')) {
    return;
  }
  
  e.respondWith(
    fetch(e.request).then(response => {
      // 網路請求成功，將最新資源更新到快取中
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      // 網路失敗或離線時，回退使用快取
      return caches.match(e.request);
    })
  );
});
