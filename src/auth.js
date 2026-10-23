import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './firebase';

// 僅作前端顯示判斷；真正的管理員權限由 firestore.rules 的信箱白名單強制執行
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'UGpricebot';

export const isAdminUser = (user) =>
  !!user && !!user.email && user.emailVerified !== false && ADMIN_EMAILS.includes(user.email.toLowerCase());

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase 尚未設定');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export const signOutUser = () => (auth ? signOut(auth) : Promise.resolve());
