// 通知設定預設值。需與 notifications.cjs 的 DEFAULT_SETTINGS / normalizeSettings 保持一致。
export const DEFAULT_SETTINGS = {
  drop: true,
  restock: true,
  limited: true,
  onlyLowest: false,
  minDropPct: 0,
  newArrival: [],
};

export const DROP_PCT_OPTIONS = [0, 5, 10, 20, 30];

export function normalizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    drop: s.drop !== false,
    restock: s.restock !== false,
    limited: s.limited !== false,
    onlyLowest: s.onlyLowest === true,
    minDropPct: DROP_PCT_OPTIONS.includes(s.minDropPct) ? s.minDropPct : 0,
    newArrival: Array.isArray(s.newArrival) ? s.newArrival.filter((g) => ['men', 'women', 'kids', 'baby'].includes(g)) : [],
  };
}
