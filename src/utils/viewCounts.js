import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

// 瀏覽次數分散到固定數量的分片文件 (product_views/shard_N)，
// 避免所有點擊都寫入同一份文件而撞到 Firestore 單文件每秒約 1 次的寫入上限。
// 注意：分片數量與 firestore.rules 的 shard_[0-7] 必須一致。
export const VIEW_SHARDS = 8;

export const shardIdFor = (productId) => {
  let sum = 0;
  for (let i = 0; i < productId.length; i++) sum += productId.charCodeAt(i);
  return `shard_${sum % VIEW_SHARDS}`;
};

// 讀取分片與舊版彙總文件 product_views/all (遷移前累積的次數，不再寫入)，
// 加總成 { [productId]: views }，因此不需要資料遷移。
export async function loadViewCounts(db) {
  const ids = ['all', ...Array.from({ length: VIEW_SHARDS }, (_, i) => `shard_${i}`)];
  const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, 'product_views', id))));
  const counts = {};
  snaps.forEach((snap) => {
    if (!snap.exists()) return;
    const part = snap.data().counts || {};
    for (const [id, n] of Object.entries(part)) counts[id] = (counts[id] || 0) + n;
  });
  return counts;
}

export const incrementViewCount = (db, productId) =>
  setDoc(doc(db, 'product_views', shardIdFor(productId)), { counts: { [productId]: increment(1) } }, { merge: true });
