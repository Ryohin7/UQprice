// 偵測「補貨 / 限定價格開始與即將結束 / 新品上市」事件 (降價事件由爬蟲在價格比對時產生)。
// 以 system/sync_baseline 保存的上次狀態為基準；某個功能的基準欄位尚不存在時 (首次部署)，
// 只記錄當前狀態、不發事件，避免第一次執行就把所有商品通知出去。
const { imageUrl } = require('./notifications.cjs');

const ENDING_SOON_MS = 48 * 3600 * 1000;

// products: 爬蟲結果；baseline: 上次的 sync_baseline 文件資料或 null
// groupsOf(p) → ['men', ...]；isLimited(p) → boolean
function detectEvents({ products, baseline, now, groupsOf, isLimited }) {
  const events = [];
  const newArrivals = [];
  const next = { sizes: {}, limited: {}, endNotified: {}, newArrival: {} };
  const seeded = {
    sizes: !!(baseline && baseline.sizes),
    limited: !!(baseline && baseline.limited),
    newArrival: !!(baseline && baseline.newArrival),
  };

  for (const p of products) {
    const base = {
      id: p.id,
      name: p.shortName || p.name,
      productCode: p.productCode,
      image: imageUrl(p.colors?.[0]?.largePicUrl || p.mainPic),
      price: p.minPrice,
    };

    // 補貨：這次有、上次沒有的尺寸 (size 陣列只含目前有貨的尺寸)
    const sizesNow = Array.isArray(p.size) ? p.size : [];
    next.sizes[p.id] = sizesNow.join(',');
    if (seeded.sizes && typeof baseline.sizes[p.id] === 'string') {
      const prev = new Set(baseline.sizes[p.id] ? baseline.sizes[p.id].split(',') : []);
      const added = sizesNow.filter((s) => !prev.has(s));
      if (added.length) events.push({ type: 'restock', ...base, sizes: added });
    }

    // 限定價格：開始，以及結束前 48 小時 (同一個結束時間只通知一次)
    if (isLimited(p)) {
      next.limited[p.id] = 1;
      if (seeded.limited && !baseline.limited[p.id]) {
        events.push({ type: 'limited_start', ...base, endTs: p.timeLimitedEnd || null });
      }
      const end = p.timeLimitedEnd;
      if (end && end > now && end - now <= ENDING_SOON_MS) {
        if (seeded.limited && baseline.endNotified?.[p.id] !== end) {
          events.push({ type: 'limited_end', ...base, endTs: end });
        }
        next.endNotified[p.id] = end;
      }
    }

    // 新品上市：本次才被標記為新品的商品
    if (p.isNewArrival) {
      next.newArrival[p.id] = 1;
      if (seeded.newArrival && !baseline.newArrival[p.id]) {
        newArrivals.push({ id: p.id, name: base.name, productCode: p.productCode, price: p.minPrice, groups: groupsOf(p) });
      }
    }
  }

  return { events, newArrivals, next };
}

module.exports = { detectEvents };
