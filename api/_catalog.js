// 商品目錄：從網站的 /products.json 讀取並在函式實例內快取 (Vercel 暖機期間共用)，供 Telegram 機器人搜尋與顯示價格。
const SITE_URL = process.env.SITE_URL || 'https://uq.coinyapp.com';
const TTL_MS = 10 * 60 * 1000;

let cache = { at: 0, list: [], byId: new Map() };

export async function getCatalog() {
  if (Date.now() - cache.at < TTL_MS && cache.list.length) return cache;
  const res = await fetch(`${SITE_URL}/products.json`);
  if (!res.ok) throw new Error(`products.json HTTP ${res.status}`);
  const raw = await res.json();
  const list = raw.map((p) => ({
    id: p.id,
    name: p.shortName || p.name,
    fullName: p.name || '',
    code: String(p.code || ''),
    price: p.minPrice,
  }));
  cache = { at: Date.now(), list, byId: new Map(list.map((p) => [p.id, p])) };
  return cache;
}

// 以名稱關鍵字 (空白分隔，需全部符合) 或商品編號搜尋
export function searchCatalog(list, keyword, limit = 5) {
  const words = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return list
    .filter((p) => {
      const hay = `${p.name} ${p.fullName} ${p.code}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .slice(0, limit);
}
