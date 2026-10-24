import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Megaphone, Check } from 'lucide-react';

// 後台公告管理：新增、編輯、啟用/停用、排序、刪除；啟用中的公告會顯示在首頁 Header 下方
export default function AnnouncementManager({ announcements = [], onSave, onDelete }) {
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState({});

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      alert('公告儲存失敗：' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const nextOrder = announcements.reduce((m, a) => Math.max(m, a.order ?? 0), 0) + 1;

  const handleAdd = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const l = link.trim();
    if (l && !/^https?:\/\//i.test(l)) {
      alert('連結需以 http:// 或 https:// 開頭');
      return;
    }
    run(async () => {
      await onSave({ id: `ann_${Date.now()}`, text: t, link: l, active: true, order: nextOrder, createdAt: Date.now() });
      setText('');
      setLink('');
    });
  };

  const move = (idx, dir) => {
    const a = announcements[idx];
    const b = announcements[idx + dir];
    if (!a || !b) return;
    run(async () => {
      await onSave({ ...a, order: b.order });
      await onSave({ ...b, order: a.order });
    });
  };

  const draftOf = (a) => drafts[a.id] ?? { text: a.text, link: a.link || '' };
  const setDraft = (a, patch) => setDrafts((d) => ({ ...d, [a.id]: { ...draftOf(a), ...patch } }));
  const dirty = (a) => drafts[a.id] && (drafts[a.id].text.trim() !== a.text || drafts[a.id].link.trim() !== (a.link || ''));

  const saveDraft = (a) => {
    const d = draftOf(a);
    if (!d.text.trim()) return alert('公告內容不可為空');
    if (d.link.trim() && !/^https?:\/\//i.test(d.link.trim())) return alert('連結需以 http:// 或 https:// 開頭');
    run(async () => {
      await onSave({ ...a, text: d.text.trim(), link: d.link.trim() });
      setDrafts((all) => { const n = { ...all }; delete n[a.id]; return n; });
    });
  };

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleAdd} style={styles.card}>
        <h3 style={styles.h3}><Megaphone size={18} /> 新增公告</h3>
        <p style={styles.hint}>啟用中的公告會顯示在首頁 Header 下方的黑色區塊；有多則時以由下而上的跑馬燈輪播。</p>
        <input style={styles.input} placeholder="公告內容" value={text} maxLength={120} onChange={(e) => setText(e.target.value)} />
        <input style={styles.input} placeholder="連結（選填，https://…）" value={link} onChange={(e) => setLink(e.target.value)} />
        <button type="submit" disabled={busy || !text.trim()} style={{ ...styles.primary, opacity: busy || !text.trim() ? 0.5 : 1 }}>
          <Plus size={16} /> 新增公告
        </button>
      </form>

      <div style={styles.card}>
        <h3 style={styles.h3}>公告列表（{announcements.length}）</h3>
        {announcements.length === 0 && <p style={styles.hint}>尚無公告。</p>}
        {announcements.map((a, i) => {
          const d = draftOf(a);
          return (
            <div key={a.id} style={styles.item}>
              <div style={styles.fields}>
                <input style={styles.input} value={d.text} maxLength={120} onChange={(e) => setDraft(a, { text: e.target.value })} aria-label="公告內容" />
                <input style={styles.input} value={d.link} placeholder="連結（選填）" onChange={(e) => setDraft(a, { link: e.target.value })} aria-label="公告連結" />
              </div>
              <div style={styles.actions}>
                <label style={styles.toggle}>
                  <input type="checkbox" checked={a.active !== false} disabled={busy} onChange={(e) => run(() => onSave({ ...a, active: e.target.checked }))} />
                  顯示
                </label>
                {dirty(a) && (
                  <button type="button" style={styles.iconBtn} disabled={busy} onClick={() => saveDraft(a)} aria-label="儲存變更"><Check size={16} /></button>
                )}
                <button type="button" style={styles.iconBtn} disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="上移"><ArrowUp size={16} /></button>
                <button type="button" style={styles.iconBtn} disabled={busy || i === announcements.length - 1} onClick={() => move(i, 1)} aria-label="下移"><ArrowDown size={16} /></button>
                <button
                  type="button"
                  style={{ ...styles.iconBtn, color: 'var(--uq-red)' }}
                  disabled={busy}
                  onClick={() => { if (window.confirm('確定刪除這則公告？')) run(() => onDelete(a.id)); }}
                  aria-label="刪除"
                ><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: {
    backgroundColor: 'var(--bg-white)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  h3: { fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' },
  hint: { fontSize: '13px', color: 'var(--text-secondary)' },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '16px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-page)',
    color: 'var(--text-primary)',
  },
  primary: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--uq-red)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  item: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-color)',
  },
  fields: { flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 },
  actions: { display: 'flex', alignItems: 'center', gap: '8px' },
  toggle: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' },
  iconBtn: {
    width: '36px',
    height: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--fill)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
};
