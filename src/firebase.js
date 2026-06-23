import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase 配置
// 使用 env 環境變數以確保安全性與 Vercel 部署相容
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 初始化 Firebase
let app;
let db;

try {
  // 如果提供了 env 變數，則進行初始化
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
  } else {
    console.log("Firebase environment variables missing. Running in offline/local-only mode.");
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { db };
export default app;
