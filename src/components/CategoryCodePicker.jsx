import React, { useMemo, useState } from 'react';
import { CheckSquare, Square, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import { effectiveCodes, codeUnder, defaultCodes, matchesSubCategory } from '../utils/categoryMatch';
import { isMenProduct, isWomenProduct, isKidsProduct, isBabyProduct } from '../utils/productGroups';

const GROUP_PREFIX = { men: 'all_men', women: 'all_women', kids: 'all_kids', baby: 'all_baby' };
const GROUP_TEST = { men: isMenProduct, women: isWomenProduct, kids: isKidsProduct, baby: isBabyProduct };

// 次分類的「官網分類代碼」設定 (樹狀)，以及該主分類底下尚未歸類的商品檢查
export default function CategoryCodePicker({ mainCat, subCategory, catalog, products, onChangeCodes }) {
  const [open, setOpen] = useState({});
  const usingDefault = subCategory.selectedCodes === undefined;
  const selected = effectiveCodes(subCategory, mainCat.sex);
  const prefix = GROUP_PREFIX[mainCat.sex];

  // 大分類 → 中分類 (僅限此主分類所屬性別)
  const tree = useMemo(() => {
    if (!catalog) return [];
    const entries = Object.entries(catalog).filter(([code]) => !prefix || code.startsWith(`${prefix}-`));
    return entries
      .filter(([, c]) => c.level === 1)
      .map(([code, c]) => ({
        code,
        name: c.name,
        children: entries.filter(([, ch]) => ch.level === 2 && ch.parent === code).map(([cc, ch]) => ({ code: cc, name: ch.name })),
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [catalog, prefix]);

  const counts = useMemo(() => {
    const map = {};
    for (const p of products) for (const c of p.categoryCodes || []) {
      // 每個代碼的所有上層都計入，樹上的每一層才有正確數量
      const parts = c.split('-');
      for (let i = 2; i <= parts.length; i++) {
        const k = parts.slice(0, i).join('-');
        map[k] = (map[k] || 0) + 1;
      }
    }
    return map;
  }, [products]);

  const isChecked = (code) => selected.some((s) => codeUnder(code, s));
  const toggle = (code) => {
    // 上層已勾選時，子項由上層涵蓋，需先取消上層才能單獨調整
    if (selected.some((s) => s !== code && codeUnder(code, s))) return;
    onChangeCodes(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected.filter((c) => !codeUnder(c, code)), code]);
  };

  // 此主分類所屬性別、但沒有被任何自訂次分類涵蓋的商品
  const unclassified = useMemo(() => {
    const belongs = GROUP_TEST[mainCat.sex];
    if (!belongs) return null;
    const customSubs = (mainCat.subCategories || []).filter((s) => s.matchType === 'custom');
    if (!customSubs.length) return null;
    return products.filter((p) => belongs(p) && !customSubs.some((s) => matchesSubCategory(p, s, mainCat.sex)));
  }, [products, mainCat]);
  const [showUnclassified, setShowUnclassified] = useState(false);

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <strong>官網分類代碼（建議）</strong>
        {usingDefault ? (
          <span style={styles.badge}>使用預設對應</span>
        ) : (
          <button style={styles.reset} onClick={() => onChangeCodes(undefined)} title="還原為系統預設對應">
            <RotateCcw size={13} /> 還原預設
          </button>
        )}
      </div>
      <p style={styles.desc}>
        代碼來自官網分類結構，不會隨季節改名。勾選的分類與其底下所有子分類的商品，都會出現在此次分類。
        {defaultCodes(mainCat.sex, subCategory.code).length === 0 && usingDefault && ' 此次分類沒有預設對應，請自行勾選。'}
      </p>

      {!catalog ? (
        <div style={styles.empty}>尚無分類代碼資料，請等下一次爬蟲執行後再設定（會產生 categories.json）。</div>
      ) : (
        <div style={styles.tree}>
          {tree.map((l1) => {
            const l1Checked = isChecked(l1.code);
            const expanded = !!open[l1.code];
            return (
              <div key={l1.code}>
                <div style={styles.row}>
                  <button style={styles.arrow} onClick={() => setOpen((o) => ({ ...o, [l1.code]: !o[l1.code] }))} aria-label="展開或收合">
                    {l1.children.length ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
                  </button>
                  <button style={styles.check} onClick={() => toggle(l1.code)}>
                    {l1Checked ? <CheckSquare size={16} style={{ color: 'var(--uq-red)' }} /> : <Square size={16} style={{ color: 'var(--text-light)' }} />}
                    <span style={{ fontWeight: l1Checked ? 700 : 500 }}>{l1.name}</span>
                  </button>
                  <span style={styles.count}>{counts[l1.code] || 0}</span>
                </div>
                {expanded && l1.children.map((l2) => {
                  const covered = selected.some((s) => s !== l2.code && codeUnder(l2.code, s));
                  const checked = isChecked(l2.code);
                  return (
                    <div key={l2.code} style={{ ...styles.row, paddingLeft: 38, opacity: covered ? 0.55 : 1 }}>
                      <button style={styles.check} onClick={() => toggle(l2.code)} disabled={covered} title={covered ? '已被上層分類涵蓋' : ''}>
                        {checked ? <CheckSquare size={15} style={{ color: 'var(--uq-red)' }} /> : <Square size={15} style={{ color: 'var(--text-light)' }} />}
                        <span>{l2.name}</span>
                      </button>
                      <span style={styles.count}>{counts[l2.code] || 0}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {unclassified && (
        <div style={styles.unclassified}>
          <button style={styles.unToggle} onClick={() => setShowUnclassified((v) => !v)}>
            {showUnclassified ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            「{mainCat.name}」底下尚未歸入任何次分類的商品：
            <strong style={{ color: unclassified.length ? 'var(--uq-red)' : 'var(--ok)' }}>{unclassified.length}</strong> 件
          </button>
          {showUnclassified && (
            <ul style={styles.unList}>
              {unclassified.slice(0, 60).map((p) => (
                <li key={p.id} style={styles.unItem}>
                  <span>{p.shortName || p.name}</span>
                  <span style={styles.muted}>{(p.categoryCodes || []).filter((c) => c.split('-').length === 2).join('、') || '無分類代碼'}</span>
                </li>
              ))}
              {unclassified.length > 60 && <li style={styles.muted}>另有 {unclassified.length - 60} 件…</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-primary)' },
  badge: { fontSize: '12px', padding: '2px 10px', borderRadius: '999px', backgroundColor: 'var(--info-bg)', color: 'var(--info)' },
  reset: { display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', color: 'var(--info)', fontSize: '12px', cursor: 'pointer' },
  desc: { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 },
  empty: { padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-light)', fontSize: '13px', color: 'var(--text-secondary)' },
  tree: { maxHeight: '340px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px' },
  row: { display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px' },
  arrow: { display: 'flex', alignItems: 'center', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 },
  check: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'left', cursor: 'pointer', padding: '5px 0' },
  count: { fontSize: '12px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' },
  unclassified: { borderRadius: '12px', backgroundColor: 'var(--bg-light)', padding: '10px 12px' },
  unToggle: { display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', padding: 0 },
  unList: { listStyle: 'none', marginTop: '8px', maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' },
  unItem: { display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px' },
  muted: { fontSize: '12px', color: 'var(--text-secondary)' },
};
