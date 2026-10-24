// 通知設定預設值。需與 notifications.cjs 的 DEFAULT_SETTINGS / normalizeSettings 保持一致。
export const DEFAULT_SETTINGS = {
  drop: true,
  limited: true,
  onlyLowest: false,
  minDropAmount: 0,
  newArrival: [],
};

// 降幅門檻 (元)：0 = 不限，其餘 100 ~ 1000 每 100 一級；需與 notifications.cjs / api/_bot.js 一致
export const DROP_AMOUNT_OPTIONS = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

export function normalizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    drop: s.drop !== false,
    limited: s.limited !== false,
    onlyLowest: s.onlyLowest === true,
    minDropAmount: DROP_AMOUNT_OPTIONS.includes(s.minDropAmount) ? s.minDropAmount : 0,
    newArrival: Array.isArray(s.newArrival) ? s.newArrival.filter((g) => ['men', 'women', 'kids', 'baby'].includes(g)) : [],
  };
}
