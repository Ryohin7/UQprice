// api/ 內底線開頭的檔案不會被 Vercel 當成路由，僅供各函式共用。
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function initAdmin() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
}

// 驗證 Firebase ID Token，且信箱需在 ADMIN_EMAILS 白名單內。
// 失敗時已送出回應並回傳 null；成功回傳 decoded token。
export async function requireAdmin(req, res) {
  initAdmin();
  const idToken = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!idToken) {
    res.status(401).json({ error: '未登入' });
    return null;
  }
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: '登入已過期，請重新登入' });
    return null;
  }
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!decoded.email_verified || !admins.includes((decoded.email || '').toLowerCase())) {
    res.status(403).json({ error: '沒有權限' });
    return null;
  }
  return decoded;
}
