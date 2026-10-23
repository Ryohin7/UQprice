import React from 'react';
import { X, Send, LogOut, CheckCircle2 } from 'lucide-react';

export default function AccountModal({ user, telegramLinked, onLinkTelegram, onSignOut, onClose }) {
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
        <button style={styles.closeBtn} onClick={onClose} aria-label="關閉">
          <X size={18} />
        </button>

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

        <button style={styles.signOutBtn} onClick={onSignOut}>
          <LogOut size={16} /> 登出
        </button>
      </div>
    </div>
  );
}

const styles = {
  modal: {
    backgroundColor: 'var(--bg-white)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '420px',
    padding: '28px 24px',
    position: 'relative',
    boxShadow: 'var(--shadow-md)',
  },
  closeBtn: {
    position: 'absolute',
    top: '14px',
    right: '14px',
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
