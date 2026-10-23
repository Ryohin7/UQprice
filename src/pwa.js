// Service Worker 註冊與更新通知 (僅正式環境啟用，避免開發時快取干擾)。
export function registerSW() {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  // 第一次安裝時 clients.claim 也會觸發 controllerchange，只有「更新」才需要重新載入
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const announce = (worker) => window.dispatchEvent(new CustomEvent('pwa-update', { detail: worker }));

      if (reg.waiting && navigator.serviceWorker.controller) announce(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker);
        });
      });
      // 長時間開著的 PWA 每小時檢查一次新版本
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch (err) {
      console.warn('Service Worker 註冊失敗:', err);
    }
  });
}
