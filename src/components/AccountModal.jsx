import React from 'react';
import { X, Send, LogOut, CheckCircle2 } from 'lucide-react';
import { DROP_AMOUNT_OPTIONS } from '../utils/userSettings';

const GROUPS = [['men', '男裝'], ['women', '女裝'], ['kids', '童裝'], ['baby', '嬰幼兒']];

export default function AccountModal({ user, telegramLinked, onLinkTelegram, onSignOut, settings, onChangeSettings, onClose }) {
  const set = (patch) => onChangeSettings({ ...settings, ...patch });
  const toggleGroup = (g) =>
    set({ newArrival: settings.newArrival.includes(g) ? settings.newArrival.filter((x) => x !== g) : [...settings.newArrival, g] });

  return (
    <div className="sheet-overlay" onClick={onClose} role="presentation">
      <div
        className="sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-label="我的帳號"
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-close">
          <button style={styles.closeBtn} onClick={onClose} aria-label="關閉">
            <X size={18} />
          </button>
        </div>

        <div style={styles.profile}>
          {user.photoURL && <img src={user.photoURL} alt="" style={styles.avatar} referrerPolicy="no-referrer" />}
          <div>
            <div style={styles.name}>{user.displayName || '使用者'}</div>
            <div style={styles.email}>{user.email}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Send size={16} /> Telegram 降價通知
          </div>
          {telegramLinked ? (
            <p style={styles.ok}>
              <CheckCircle2 size={16} /> 已連結。「我的追蹤」中的商品降價時，機器人會通知你。
            </p>
          ) : (
            <>
              <p style={styles.desc}>
                連結 Telegram 後，「我的追蹤」中的商品只要降價，就會收到通知。點擊下方按鈕會開啟 Telegram，請按「開始 (Start)」完成連結。
              </p>
              <button style={styles.primaryBtn} onClick={onLinkTelegram}>
                連結 Telegram
              </button>
            </>
          )}
          {telegramLinked && (
            <button style={styles.linkBtn} onClick={onLinkTelegram}>
              重新連結其他 Telegram 帳號
            </button>
          )}
        </div>

        <div style={{ ...styles.card, marginTop: '12px' }}>
          <div style={styles.cardTitle}>通知設定</div>
          <Check label="降價通知" checked={settings.drop} onChange={(v) => set({ drop: v })} />
          <Check label="限定價格開始與即將結束" checked={settings.limited} onChange={(v) => set({ limited: v })} />
          <Check label="降價時只通知歷史新低" checked={settings.onlyLowest} onChange={(v) => set({ onlyLowest: v })} />
          <label style={styles.selectRow}>
            降幅至少
            <select
              value={settings.minDropAmount}
              onChange={(e) => set({ minDropAmount: Number(e.target.value) })}
              style={styles.select}
            >
              {DROP_AMOUNT_OPTIONS.map((n) => <option key={n} value={n}>{n === 0 ? '不限' : `${n} 元`}</option>)}
            </select>
            才通知
          </label>
          <div style={styles.groupLabel}>訂閱新品上市</div>
          <div style={styles.groupRow}>
            {GROUPS.map(([k, n]) => (
              <Check key={k} label={n} checked={settings.newArrival.includes(k)} onChange={() => toggleGroup(k)} />
            ))}
          </div>
          <p style={styles.desc}>設有目標價的商品不受降價條件限制，降到目標價以下就會通知。也可以在 Telegram 輸入 /settings 調整。</p>
        </div>

        <button style={styles.signOutBtn} onClick={onSignOut}>
          <LogOut size={16} /> 登出
        </button>
      </div>
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label style={styles.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const styles = {
  check: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-primary)', minHeight: '32px' },
  selectRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-primary)' },
  select: { padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-white)', color: 'var(--text-primary)', fontSize: '14px' },
  groupLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '4px' },
  groupRow: { display: 'flex', flexWrap: 'wrap', gap: '4px 16px' },
  modal: {
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-white)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '420px',
    padding: '28px 24px',
    position: 'relative',
    boxShadow: 'var(--shadow-md)',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '50%',
    backgroundColor: 'var(--fill)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  profile: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%' },
  name: { fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)' },
  email: { fontSize: '13px', color: 'var(--text-secondary)' },
  card: {
    backgroundColor: 'var(--bg-light)',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cardTitle: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' },
  desc: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 },
  ok: { display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '13px', color: 'var(--ok)', lineHeight: 1.5 },
  primaryBtn: {
    minHeight: '44px',
    border: 'none',
    borderRadius: '12px',
    backgroundColor: 'var(--uq-red)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  linkBtn: { background: 'none', border: 'none', color: 'var(--info)', fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-start', padding: 0 },
  signOutBtn: {
    marginTop: '16px',
    width: '100%',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: 'none',
    borderRadius: '12px',
    backgroundColor: 'var(--fill)',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};
