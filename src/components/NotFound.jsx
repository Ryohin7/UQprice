import React, { useState, useEffect } from 'react';

const COUNTDOWN_SECONDS = 8;

// Apple 風格 404：大標題排版、留白、膠囊按鈕，圓環倒數取代閃爍文字；
// 全部使用系統字體與語意色 (自動深色模式)，動畫遵循「減少動態效果」設定
export default function NotFound({ onReturnHome }) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      onReturnHome();
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onReturnHome]);

  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progress = countdown / COUNTDOWN_SECONDS;

  return (
    <div style={styles.container} id="not-found-page">
      <style>{css}</style>
      <div style={styles.content} className="uq-nf-enter">
        <p style={styles.eyebrow}>404</p>
        <h1 style={styles.title} id="not-found-title">找不到這個頁面</h1>
        <p style={styles.desc}>
          商品可能已下架、連結已失效，或網站正在更新。
          <br />
          請回到首頁，重新搜尋你要找的商品。
        </p>

        <button
          id="not-found-return-btn"
          onClick={onReturnHome}
          style={styles.button}
          className="uq-nf-btn"
        >
          回到首頁
        </button>

        <p style={styles.timer} role="timer" aria-live="off">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="11" cy="11" r={radius} fill="none" stroke="var(--fill)" strokeWidth="2" />
            <circle
              cx="11"
              cy="11"
              r={radius}
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span>{countdown} 秒後自動返回</span>
        </p>
      </div>
    </div>
  );
}

const css = `
  @keyframes uqNfEnter {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .uq-nf-enter { animation: uqNfEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .uq-nf-btn { transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s; }
  .uq-nf-btn:hover { background-color: var(--uq-dark-red) !important; }
  .uq-nf-btn:active { transform: scale(0.97); }
`;

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '70vh',
    padding: '48px 24px',
  },
  content: {
    maxWidth: '520px',
    width: '100%',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--uq-red)',
    letterSpacing: '0.02em',
    marginBottom: '8px',
    fontVariantNumeric: 'tabular-nums',
  },
  title: {
    fontSize: 'clamp(32px, 7vw, 48px)',
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  desc: {
    fontSize: '17px',
    lineHeight: 1.47,
    color: 'var(--text-secondary)',
    marginBottom: '32px',
  },
  button: {
    minHeight: '44px',
    padding: '0 28px',
    border: 'none',
    borderRadius: '980px',
    backgroundColor: 'var(--uq-red)',
    color: '#fff',
    fontSize: '17px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  timer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '24px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontVariantNumeric: 'tabular-nums',
  },
};
