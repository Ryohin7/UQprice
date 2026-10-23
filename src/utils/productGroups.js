// 商品分組判斷：網站與爬蟲共用 (爬蟲以動態 import 載入此檔)。
export const isKidsProduct = (p) => {
  if (!p.sex) return false;
  const s = p.sex.toLowerCase();
  return s.includes('童裝') || s.includes('男童') || s.includes('女童') || s.includes('kids');
};

export const isBabyProduct = (p) => {
  if (!p.sex) return false;
  const s = p.sex.toLowerCase();
  const g = p.gender ? p.gender.toLowerCase() : '';
  return s.includes('新生兒') || s.includes('嬰幼兒') || s.includes('baby') || g.includes('新生兒') || g.includes('嬰幼兒');
};

// 童裝、嬰幼兒不算男裝/女裝 (否則「男童」「女童」會因為含有「男」「女」而混進男裝、女裝列表)
export const isMenProduct = (p) => {
  if (!p.sex || isKidsProduct(p) || isBabyProduct(p)) return false;
  const s = p.sex.toLowerCase();
  return s.includes('男') || s.includes('men') || s.includes('unisex') || s.includes('適穿');
};

export const isWomenProduct = (p) => {
  if (!p.sex || isKidsProduct(p) || isBabyProduct(p)) return false;
  const s = p.sex.toLowerCase();
  return s.includes('女') || s.includes('women') || s.includes('unisex') || s.includes('適穿');
};

export const isLimitedPrice = (p) =>
  !!p.salesPromotionLabel && p.salesPromotionLabel.some((l) => l.labelText && l.labelText.includes('限定價格'));

export const GROUP_LABELS = { men: '男裝', women: '女裝', kids: '童裝', baby: '嬰幼兒' };

// 一件商品可屬於多個分組 (例如男女適穿同時是 men 與 women)
export const productGroups = (p) => {
  const groups = [];
  if (isMenProduct(p)) groups.push('men');
  if (isWomenProduct(p)) groups.push('women');
  if (isKidsProduct(p)) groups.push('kids');
  if (isBabyProduct(p)) groups.push('baby');
  return groups;
};
