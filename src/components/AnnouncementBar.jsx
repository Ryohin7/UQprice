import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

const MIN_ROW_HEIGHT = 36;
const INTERVAL_MS = 4000;
const SLIDE_MS = 500;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

// 首頁 Header 下方的黑色公告列：進站時從 Header 下方滑出；
// 單則靜態顯示，多則由下而上輪播 (跑馬燈)；文字過長時自動換行，公告列隨內容加高
export default function AnnouncementBar({ announcements = [] }) {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [heights, setHeights] = useState([]);
  const rowRefs = useRef([]);
  const count = announcements.length;
  const texts = announcements.map((a) => `${a.text}|${a.link || ''}`).join('\n');

  useEffect(() => {
    setIndex(0);
    setAnimate(true);
  }, [count]);

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => setIndex((i) => i + 1), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count]);

  // 捲到複製的第一則後，無動畫跳回真正的第一則，形成無縫循環
  useEffect(() => {
    if (count < 2 || index < count) return;
    const t = setTimeout(() => {
      setAnimate(false);
      setIndex(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    }, SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, count]);

  // 量測每一列實際高度 (文字換行後會變高)，視窗尺寸或內容改變時重新量測
  const measure = () => {
    const next = rowRefs.current.map((el) => (el ? Math.max(MIN_ROW_HEIGHT, el.offsetHeight) : MIN_ROW_HEIGHT));
    setHeights((prev) => (prev.length === next.length && prev.every((h, i) => h === next[i]) ? prev : next));
  };
  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [texts]);

  if (count === 0) return null;

  const rows = count > 1 ? [...announcements, announcements[0]] : announcements;
  const rowHeight = (i) => heights[i] ?? MIN_ROW_HEIGHT;
  const offset = rows.slice(0, index).reduce((sum, _, i) => sum + rowHeight(i), 0);
  const viewportHeight = rowHeight(Math.min(index, rows.length - 1));
  const t = animate ? `${SLIDE_MS}ms ${EASE}` : '0s';

  return (
    <div style={styles.bar} className="uq-ann-bar" role="region" aria-label="網站公告">
      <style>{css}</style>
      <div className="uq-ann-clip">
       <div className="uq-ann-slide">
        <div style={{ ...styles.viewport, height: `${viewportHeight}px`, transition: `height ${t}` }}>
          <div style={{ transform: `translateY(-${offset}px)`, transition: `transform ${t}` }}>
            {rows.map((a, i) => {
              const isClone = count > 1 && i === count;
              const inner = <span style={styles.text}>{a.text}</span>;
              return (
                <div
                  key={`${a.id}-${i}`}
                  ref={(el) => { rowRefs.current[i] = el; }}
                  style={styles.row}
                  aria-hidden={isClone || undefined}
                >
                  {a.link ? (
                    <a href={a.link} target="_blank" rel="noopener noreferrer" style={styles.link}>{inner}</a>
                  ) : inner}
                </div>
              );
            })}
          </div>
        </div>
       </div>
      </div>
    </div>
  );
}

const css = `
  @keyframes uqAnnReveal {
    from { grid-template-rows: 0fr; }
    to { grid-template-rows: 1fr; }
  }
  @keyframes uqAnnDrop {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
  .uq-ann-bar { position: relative; z-index: 0; display: grid; grid-template-rows: 1fr; animation: uqAnnReveal 0.6s 0.25s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  .uq-ann-clip { min-height: 0; overflow: hidden; }
  .uq-ann-slide { animation: uqAnnDrop 0.6s 0.25s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  @media (prefers-reduced-motion: reduce) {
    .uq-ann-bar, .uq-ann-slide { animation: none; }
  }
`;

const styles = {
  bar: {
    width: '100%',
    backgroundColor: '#000',
    color: '#f5f5f7',
  },
  viewport: {
    overflow: 'hidden',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
  },
  row: {
    minHeight: `${MIN_ROW_HEIGHT}px`,
    padding: '8px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: '13px',
    lineHeight: 1.4,
    textAlign: 'center',
    overflowWrap: 'anywhere',
  },
  link: {
    color: 'inherit',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    maxWidth: '100%',
    display: 'inline-flex',
  },
};
