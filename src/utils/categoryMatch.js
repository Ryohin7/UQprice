// 次分類比對：以官網穩定的分類代碼 (categoryCodes，例如 all_men-outer) 為主，
// 並保留舊版「分類名稱完整比對」作為相容 (兩者任一符合即歸入)。
const GROUP_PREFIX = { men: 'all_men', women: 'all_women', kids: 'all_kids', baby: 'all_baby' };

// 內建次分類 (tops/bottoms/...) 對應的官網大分類代碼後綴；後台未明確設定 selectedCodes 時使用
const COMMON = {
  tops: ['tops', 'shirts', 'ut-contents', 'knit', 'dresses-and-skirts'],
  bottoms: ['bottoms', 'dresses-and-skirts'],
  outerwear: ['outer'],
  innerwear: ['inner-wear', 'heattech', 'airism', 'room', 'lounge-and-underwear'],
  accessories: ['accessories', 'accesories'], // 官網童裝配件代碼拼字為 accesories
};
const BABY = {
  tops: ['toddler-tops', 'newborn-allinone', 'newborn-bodysuit', 'ut-contents'],
  bottoms: ['toddler-bottoms'],
  outerwear: ['toddler-outer'],
  innerwear: ['toddler-lounge-wear', 'toddler-heattech', 'toddler-inner-wear', 'newborn-socks'],
  accessories: ['toddler-accessories', 'newborn-socks'],
};

export function defaultCodes(mainSex, subCode) {
  const prefix = GROUP_PREFIX[mainSex];
  const suffixes = (mainSex === 'baby' ? BABY : COMMON)[subCode];
  return prefix && suffixes ? suffixes.map((s) => `${prefix}-${s}`) : [];
}

export const effectiveCodes = (sub, mainSex) => sub.selectedCodes ?? defaultCodes(mainSex, sub.code);

// 商品的某個代碼是否落在指定代碼之下 (相同或為其子分類)
export const codeUnder = (productCode, code) => productCode === code || productCode.startsWith(`${code}-`);

export function matchesSubCategory(p, sub, mainSex) {
  const names = sub.selectedCategories || [];
  if (p.categoryNames && names.length && p.categoryNames.some((n) => names.includes(n))) return true;
  const codes = effectiveCodes(sub, mainSex);
  return !!(codes.length && p.categoryCodes && p.categoryCodes.some((pc) => codes.some((c) => codeUnder(pc, c))));
}
