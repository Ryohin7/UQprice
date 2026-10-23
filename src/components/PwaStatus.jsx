import React, { useEffect, useState } from 'react';
import { Share, X, WifiOff } from 'lucide-react';

const IOS_HINT_KEY = 'uq_ios_install_hint_dismissed';

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches);

// PWA 狀態列：新版本提示、離線提示、iOS 加入主畫面說明
export default function PwaStatus() {
  const [updateWorker, setUpdateWorker] = useState(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const onUpdate = (e) => setUpdateWorker(e.detail);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('pwa-update', onUpdate);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('pwa-update', onUpdate);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // iOS 沒有 beforeinstallprompt，進站幾秒後提示一次如何加入主畫面
  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(IOS_HINT_KEY) === '1'; } catch { /* 隱私模式 */ }
    if (!isIOS() || isStandalone() || dismissed) return undefined;
    const t = setTimeout(() => setShowIosHint(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const dismissIosHint = () => {
    setShowIosHint(false);
    try { localStorage.setItem(IOS_HINT_KEY, '1'); } catch { /* 隱私模式 */ }
  };

  return (
    <>
      {!online && (
        <div className="pwa-banner pwa-offline" role="status">
          <WifiOff size={16} /> 目前離線，顯示的是上次載入的資料
        </div>
      )}

      {updateWorker && (
        <div className="pwa-toast" role="status">
          <span>有新版本可用</span>
          <button className="pwa-toast-action" onClick={() => updateWorker.postMessage({ type: 'SKIP_WAITING' })}>
            立即更新
          </button>
          <button className="pwa-toast-close" onClick={() => setUpdateWorker(null)} aria-label="稍後再說">
            <X size={16} />
          </button>
        </div>
      )}

      {showIosHint && !updateWorker && (
        <div className="pwa-toast pwa-ios" role="status">
          <span>
            安裝到主畫面：點 Safari 的 <Share size={14} style={{ verticalAlign: '-2px' }} /> 分享，再選「加入主畫面」
          </span>
          <button className="pwa-toast-close" onClick={dismissIosHint} aria-label="關閉提示">
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
