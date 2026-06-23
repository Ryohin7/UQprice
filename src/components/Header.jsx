import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function Header() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.logoContainer}>
        {/* UNIQLO 紅白極簡雙模Logo視覺 */}
        <div style={styles.logoRed}>
          <span style={styles.logoText}>UNI</span>
          <span style={styles.logoText}>QLO</span>
        </div>
        <div style={styles.logoWhite}>
          <span style={styles.logoTextDark}>比價</span>
          <span style={styles.logoTextDark}>首選</span>
        </div>
      </div>
      <div style={styles.navActions}>
        {showInstallBtn && (
          <button onClick={handleInstallClick} style={styles.installBtn} className="btn btn-primary">
            <Download size={16} style={{ marginRight: 6 }} />
            安裝桌面 App
          </button>
        )}
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-white)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  logoRed: {
    backgroundColor: 'var(--uq-red)',
    color: '#ffffff',
    padding: '6px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1,
    fontWeight: 'bold',
    fontFamily: '"Helvetica Neue", Arial, sans-serif',
    borderRadius: '2px',
  },
  logoWhite: {
    border: '1px solid var(--uq-red)',
    backgroundColor: '#ffffff',
    color: 'var(--uq-red)',
    padding: '5px 7px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1,
    fontWeight: 'bold',
    fontFamily: '"Noto Sans TC", sans-serif',
    borderRadius: '2px',
  },
  logoText: {
    fontSize: '12px',
    letterSpacing: '1px',
  },
  logoTextDark: {
    fontSize: '12px',
    letterSpacing: '1px',
    color: 'var(--uq-primary)',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  installBtn: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    padding: '8px 14px',
    borderRadius: '20px', // 精緻膠囊按鈕
  }
};
