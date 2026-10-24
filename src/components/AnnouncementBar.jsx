import React, { useState, useEffect, useRef } from 'react';

const ROW_HEIGHT = 36;
const INTERVAL_MS = 4000;
const SLIDE_MS = 500;

// 首頁 Header 下方的黑色公告列：單則靜態顯示，多則由下而上輪播 (跑馬燈)
export default function AnnouncementBar({ announcements = [] }) {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const count = announcements.length;
  const trackRef = useRef(null);

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

  if (count === 0) return null;

  const rows = count > 1 ? [...announcements, announcements[0]] : announcements;

  return (
    <div style={styles.bar} role="region" aria-label="網站公告">
      <div style={styles.viewport}>
        <div
          ref={trackRef}
          style={{
            transform: `translateY(-${index * ROW_HEIGHT}px)`,
            transition: animate ? `transform ${SLIDE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` : 'none',
          }}
        >
          {rows.map((a, i) => {
            const inner = <span style={styles.text}>{a.text}</span>;
            const isClone = count > 1 && i === count;
            return (
              <div key={`${a.id}-${i}`} style={styles.row} aria-hidden={isClone || undefined}>
                {a.link ? (
                  <a href={a.link} target="_blank" rel="noopener noreferrer" style={styles.link}>{inner}</a>
                ) : inner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  bar: {
    width: '100%',
    backgroundColor: '#000',
    color: '#f5f5f7',
  },
  viewport: {
    height: `${ROW_HEIGHT}px`,
    overflow: 'hidden',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
  },
  row: {
    height: `${ROW_HEIGHT}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: '13px',
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  link: {
    color: 'inherit',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    maxWidth: '100%',
    display: 'inline-flex',
  },
};
