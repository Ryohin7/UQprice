import React, { useEffect, useRef } from 'react';

// Google AdSense 資訊流廣告 (In-feed)；版面配置於 AdSense 後台設定，layout key 需與後台一致
const AD_CLIENT = 'ca-pub-3829421603567990';
const AD_SLOT = '1531932808';
const AD_LAYOUT_KEY = '+2v+qq+5f-2l-8w';

// 商品網格內的廣告卡：必須標示「廣告」(由 CSS 在廣告填入後顯示)，未填入時整張卡收合
export default function AdCard() {
  const insRef = useRef(null);

  useEffect(() => {
    const ins = insRef.current;
    // 同一個 <ins> 只能 push 一次 (StrictMode 開發模式會重複掛載)
    if (!ins || ins.dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn('AdSense push failed:', err.message);
    }
  }, []);

  return (
    <div className="uq-ad-card" aria-label="廣告">
      <div className="uq-ad-label">廣告</div>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key={AD_LAYOUT_KEY}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
      />
    </div>
  );
}
