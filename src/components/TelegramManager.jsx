import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { auth } from '../firebase';
import TelegramTester from './TelegramTester';
import TelegramBroadcast from './TelegramBroadcast';

export default function TelegramManager({ products = [] }) {
  const [linked, setLinked] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch('/api/telegram-broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ action: 'count' }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) setLinked(data.linked);
        else setError(data.error || `讀取失敗 (${res.status})`);
      } catch (err) {
        if (!cancelled) setError(err.message || '讀取失敗');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.statCard}>
        <Users size={20} style={{ color: 'var(--info)' }} />
        <div>
          <div style={styles.statLabel}>已連結 Telegram 的使用者</div>
          <div style={styles.statValue}>{linked ?? (error ? '—' : '…')}</div>
        </div>
        {error && <div style={styles.error}>{error}</div>}
      </div>
      <TelegramBroadcast linked={linked} onLinkedChange={setLinked} />
      <TelegramTester products={products} />
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '20px' },
  statCard: {
    maxWidth: '560px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
    backgroundColor: 'var(--bg-white)', borderRadius: '20px', padding: '18px 24px', boxShadow: 'var(--shadow-sm)',
  },
  statLabel: { fontSize: '13px', color: 'var(--text-secondary)' },
  statValue: { fontSize: '26px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--text-primary)' },
  error: { fontSize: '13px', color: 'var(--uq-red)' },
};
