import React, { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { auth } from '../firebase';

const toFullUrl = (pic) => (!pic ? null : pic.startsWith('http') ? pic : `https://www.uniqlo.com/tw${pic}`);

export default function TelegramTester({ products = [] }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [discount, setDiscount] = useState(200);
  const [isLowest, setIsLowest] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { ok, html?, error? }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || selected) return [];
    return products
      .filter((p) => p.name?.toLowerCase().includes(q) || String(p.code).includes(q))
      .slice(0, 6);
  }, [query, products, selected]);

  const newPrice = selected ? selected.minPrice : 0;
  const oldPrice = newPrice + Number(discount || 0);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    setResult(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/telegram-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          name: selected.shortName || selected.name,
          productCode: selected.productCode,
          image: toFullUrl(selected.colors?.[0]?.largePicUrl || selected.mainPic),
          oldPrice,
          newPrice,
          isLowest,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setResult(res.ok ? { ok: true, ...data } : { ok: false, error: data.error || `發送失敗 (${res.status})` });
    } catch (err) {
      setResult({ ok: false, error: err.message || '發送失敗' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>降價通知卡片測試</h3>
      <p style={styles.desc}>
        選一個商品並設定降價金額，系統會用與真實降價通知相同的格式，發送到你自己已連結的 Telegram。
        （需先在前台「我的帳號」連結你的 Telegram）
      </p>

      <label style={styles.label}>商品</label>
      <input
        className="input-field"
        placeholder="搜尋商品名稱或編號"
        value={selected ? (selected.shortName || selected.name) : query}
        onChange={(e) => { setSelected(null); setResult(null); setQuery(e.target.value); }}
      />
      {matches.length > 0 && (
        <ul style={styles.list}>
          {matches.map((p) => (
            <li key={p.id}>
              <button style={styles.item} onClick={() => { setSelected(p); setQuery(''); }}>
                <span>{p.shortName || p.name}</span>
                <span style={styles.muted}>{p.minPrice} 元</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>模擬降價金額（元）</label>
          <input
            className="input-field"
            type="number"
            min="1"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>
        <label style={styles.check}>
          <input type="checkbox" checked={isLowest} onChange={(e) => setIsLowest(e.target.checked)} />
          標示歷史新低
        </label>
      </div>

      {selected && (
        <p style={styles.muted}>將以 {oldPrice} → {newPrice} 元 的內容發送</p>
      )}

      <button
        style={{ ...styles.sendBtn, opacity: !selected || Number(discount) < 1 || sending ? 0.5 : 1 }}
        disabled={!selected || Number(discount) < 1 || sending}
        onClick={handleSend}
      >
        <Send size={16} /> {sending ? '發送中…' : '發送測試到我的 Telegram'}
      </button>

      {result && !result.ok && <div style={styles.error}>{result.error}</div>}
      {result?.ok && (
        <div>
          <p style={{ ...styles.label, color: 'var(--ok)' }}>已發送，Telegram 內容如下：</p>
          <div style={styles.bubble}>
            {result.image && <img src={result.image} alt="" style={styles.photo} />}
            <div dangerouslySetInnerHTML={{ __html: result.caption.replace(/\n/g, '<br/>') }} />
          </div>
          <a href={result.url} target="_blank" rel="noreferrer" style={styles.fakeButton}>前往官網購買</a>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'var(--bg-white)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    maxWidth: '560px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  title: { fontSize: '19px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--text-primary)' },
  desc: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '6px' },
  list: { listStyle: 'none', backgroundColor: 'var(--bg-light)', borderRadius: '12px', overflow: 'hidden' },
  item: {
    width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 14px',
    border: 'none', background: 'none', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', textAlign: 'left',
  },
  muted: { fontSize: '12px', color: 'var(--text-secondary)' },
  row: { display: 'flex', gap: '16px', alignItems: 'flex-end' },
  check: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-primary)', minHeight: '44px' },
  sendBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '48px',
    border: 'none', borderRadius: '14px', backgroundColor: 'var(--uq-red)', color: '#ffffff',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '6px',
  },
  error: { padding: '12px', borderRadius: '10px', backgroundColor: 'var(--red-bg)', color: 'var(--uq-red)', fontSize: '13px' },
  photo: { width: '100%', borderRadius: '10px', marginBottom: '10px', display: 'block' },
  fakeButton: {
    display: 'block', marginTop: '4px', padding: '10px', textAlign: 'center', borderRadius: '10px',
    backgroundColor: 'var(--info-bg)', color: 'var(--info)', fontSize: '14px', fontWeight: '500', textDecoration: 'none',
  },
  bubble: {
    backgroundColor: 'var(--bg-light)', borderRadius: '16px', padding: '14px 16px', fontSize: '14px',
    lineHeight: 1.6, color: 'var(--text-primary)', wordBreak: 'break-word',
  },
};
