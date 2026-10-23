import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 橫向商品列：電腦版 (有滑鼠) 顯示左右箭頭並隱藏捲軸；觸控裝置維持手指滑動，不顯示箭頭。
export default function HorizontalScroller({ children }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, children]);

  const scrollByPage = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className="hscroll">
      <button
        type="button"
        className={`hscroll-btn left ${canLeft ? 'visible' : ''}`}
        onClick={() => scrollByPage(-1)}
        aria-label="往左瀏覽"
        tabIndex={canLeft ? 0 : -1}
      >
        <ChevronLeft size={22} />
      </button>
      <div className="horizontal-scroll-container" ref={ref} onScroll={update}>
        {children}
      </div>
      <button
        type="button"
        className={`hscroll-btn right ${canRight ? 'visible' : ''}`}
        onClick={() => scrollByPage(1)}
        aria-label="往右瀏覽"
        tabIndex={canRight ? 0 : -1}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
