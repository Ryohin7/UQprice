import React, { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { auth } from '../firebase';

async function callBroadcast(body) {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch('/api/telegram-broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `發送失敗 (${res.status})`), { data });
  return data;
}

export default function TelegramBroadcast({ linked, onLinkedChange }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [busy, setBusy] = useState(null); // 'self' | 'send'
  const [result, setResult] = useState(null); // { ok, text }

  const message = { text, image: image.trim(), buttonText: buttonText.trim(), buttonUrl: buttonUrl.trim() };
  const limit = message.image ? 1024 : 4000;
  const canSend = text.trim().length > 0 && text.length <= limit && !busy;

  const run = async (kind, body, okText) => {
    setBusy(kind);
    setResult(null);
    try {
      const data = await callBroadcast(body);
      setResult({ ok: true, text: okText(data) });
      return data;
    } catch (err) {
      setResult({ ok: false, text: err.message });
      if (err.data?.linked != null) onLinkedChange?.(err.data.linked);
    } finally {
      setBusy(null);
    }
    return null;
  };

  const sendToSelf = () => run('self', { action: 'self', message }, () => '已發送測試推播到你自己的 Telegram');

  const sendToAll = async () => {
    if (!window.confirm(`確定要推播給 ${linked} 位已連結 Telegram 的使用者嗎？\n\n發送後無法收回。`)) return;
    const data = await run('send', { action: 'send', message, confirmCount: linked }, (d) =>
      `推播完成：共 ${d.total} 位，成功 ${d.sent}，失敗 ${d.failed}` +
      (d.unlinkedBlocked ? `（其中 ${d.unlinkedBlocked} 位已封鎖機器人，已自動解除連結）` : '')
    );
    if (data) onLinkedChange?.(data.total - (data.unlinkedBlocked || 0));
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Telegram 推播</h3>
      <p style={styles.desc}>
        傳送一則訊息給所有已連結 Telegram 的使用者（目前 {linked ?? '…'} 位）。建議先用「發送給我自己」確認內容。
      </p>

      <label style={styles.label}>訊息內容</label>
      <textarea
        className="input-field"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="輸入要推播的內容（純文字）"
        style={{ resize: 'vertical' }}
      />
      <div style={{ ...styles.muted, color: text.length > limit ? 'var(--uq-red)' : 'var(--text-secondary)' }}>
        {text.length} / {limit}{message.image ? '（附圖時上限 1024 字）' : ''}
      </div>

      <label style={styles.label}>圖片網址（選填，https）</label>
      <input className="input-field" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://" />

      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>按鈕文字（選填）</label>
          <input className="input-field" value={buttonText} onChange={(e) => setButtonText(e.target.value)} maxLength={30} placeholder="例如：前往查看" />
        </div>
        <div style={{ flex: 2 }}>
          <label style={styles.label}>按鈕連結（選填，https）</label>
          <input className="input-field" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://" />
        </div>
      </div>

      <div style={styles.actions}>
        <button style={{ ...styles.secondaryBtn, opacity: canSend ? 1 : 0.5 }} disabled={!canSend} onClick={sendToSelf}>
          {busy === 'self' ? '發送中…' : '發送給我自己'}
        </button>
        <button
          style={{ ...styles.sendBtn, opacity: canSend && linked > 0 ? 1 : 0.5 }}
          disabled={!canSend || !linked}
          onClick={sendToAll}
        >
          <Megaphone size={16} /> {busy === 'send' ? '推播中，請勿關閉頁面…' : `推播給全部 ${linked ?? 0} 位`}
        </button>
      </div>

      {result && (
        <div style={result.ok ? styles.ok : styles.error}>{result.text}</div>
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
    gap: '8px',
  },
  title: { fontSize: '19px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--text-primary)' },
  desc: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '6px' },
  muted: { fontSize: '12px' },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  actions: { display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' },
  secondaryBtn: {
    flex: 1, minHeight: '48px', border: 'none', borderRadius: '14px', backgroundColor: 'var(--fill)',
    color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  },
  sendBtn: {
    flex: 1, minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    border: 'none', borderRadius: '14px', backgroundColor: 'var(--uq-red)', color: '#ffffff',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  },
  ok: { padding: '12px', borderRadius: '10px', backgroundColor: 'var(--ok-bg)', color: 'var(--ok)', fontSize: '13px' },
  error: { padding: '12px', borderRadius: '10px', backgroundColor: 'var(--red-bg)', color: 'var(--uq-red)', fontSize: '13px' },
};
