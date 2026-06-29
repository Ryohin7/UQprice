import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

export default function NotFound({ onReturnHome }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 注入 keyframes 動畫到網頁中
    const id = 'uq-notfound-animations';
    if (typeof document !== 'undefined' && !document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = `
        @keyframes uqFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes uqPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes uqFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .uq-float-bag {
          animation: uqFloat 4s ease-in-out infinite;
        }
        .uq-pulse-text {
          animation: uqPulse 2s ease-in-out infinite;
        }
        .uq-fade-container {
          animation: uqFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .uq-home-btn-hover {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .uq-home-btn-hover:hover {
          background-color: var(--text-primary) !important;
          color: var(--bg-white) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      onReturnHome();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onReturnHome]);

  return (
    <div style={styles.container} className="uq-fade-container" id="not-found-page">
      <div style={styles.content}>
        {/* 動態 404 圖示區 */}
        <div style={styles.visualWrapper}>
          <span style={styles.number}>4</span>
          <span style={{ ...styles.number, color: 'var(--uq-red)' }}>0</span>
          <span style={styles.number}>4</span>
        </div>

        {/* 錯誤說明 */}
        <h1 style={styles.title} id="not-found-title">您尋找的網頁已下架或不存在</h1>
        <p style={styles.desc}>
          很抱歉，此商品可能已售罄、連結失效，或目前正在進行系統更新。
        </p>

        {/* 倒數計時與返回首頁 */}
        <div style={styles.actionArea}>
          <button
            id="not-found-return-btn"
            onClick={onReturnHome}
            style={styles.button}
            className="uq-home-btn-hover"
          >
            <span>立即返回首頁</span>
            <ArrowRight size={16} />
          </button>

          <p style={styles.timerText} className="uq-pulse-text">
            將在 <span style={styles.timerHighlight}>{countdown}</span> 秒後自動為您返回首頁...
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '70vh',
    padding: '40px 24px',
    backgroundColor: '#fafafa',
  },
  content: {
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  visualWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
    userSelect: 'none',
  },
  number: {
    fontSize: '120px',
    fontWeight: '900',
    color: '#e5e5e5',
    lineHeight: 1,
    letterSpacing: '-2px',
  },
  bagWrapper: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '120px',
    height: '120px',
  },
  bagIcon: {
    color: 'var(--uq-red)',
  },
  questionMark: {
    position: 'absolute',
    top: '58%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--uq-red)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '12px',
    letterSpacing: '0.5px',
  },
  desc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '32px',
    padding: '0 16px',
  },
  actionArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: 'var(--uq-red)',
    color: 'var(--bg-white)',
    border: 'none',
    padding: '14px 28px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    borderRadius: '2px',
    width: '100%',
    maxWidth: '240px',
    outline: 'none',
  },
  timerText: {
    fontSize: '13px',
    color: 'var(--text-light)',
    marginTop: '8px',
  },
  timerHighlight: {
    color: 'var(--uq-red)',
    fontWeight: '700',
    fontSize: '15px',
    margin: '0 2px',
  }
};
