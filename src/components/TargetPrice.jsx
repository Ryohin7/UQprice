import React, { useEffect, useState } from 'react';

// 追蹤商品的目標價：降到這個價格以下才通知 (未設定則依「通知設定」)
export default function TargetPrice({ productId, currentPrice, target, onSave }) {
  const [value, setValue] = useState(target ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setValue(target ?? ''); }, [productId, target]);

  const num = Number(value);
  const valid = Number.isInteger(num) && num >= 1 && num <= 99999;
  const changed = value === '' ? target != null : valid && num !== target;

  const save = async (next) => {
    setSaving(true);
    try { await onSave(productId, next); } finally { setSaving(false); }
  };

  return (
    <div style={styles.box}>
      <div style={styles.label}>目標價通知（選填）</div>
      <div style={styles.row}>
        <input
          className="input-field"
          type="number"
          inputMode="numeric"
          min="1"
          placeholder={`目前 ${currentPrice} 元`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ flex: 1 }}
        />
        <span style={styles.unit}>元</span>
        <button
          style={{ ...styles.btn, opacity: changed && (value === '' || valid) && !saving ? 1 : 0.5 }}
          disabled={!changed || (value !== '' && !valid) || saving}
          onClick={() => save(value === '' ? null : num)}
        >
          {value === '' && target != null ? '清除' : '儲存'}
        </button>
      </div>
      <div style={styles.hint}>
        {target != null ? `降到 ${target} 元以下時通知你。` : '設定後，降到這個價格以下才會通知；未設定則依帳號的通知設定。'}
      </div>
    </div>
  );
}

const styles = {
  box: { backgroundColor: 'var(--bg-light)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' },
  row: { display: 'flex', alignItems: 'center', gap: '8px' },
  unit: { fontSize: '14px', color: 'var(--text-secondary)' },
  btn: { minHeight: '44px', padding: '0 18px', border: 'none', borderRadius: '12px', backgroundColor: 'var(--text-primary)', color: 'var(--bg-white)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  hint: { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 },
};
