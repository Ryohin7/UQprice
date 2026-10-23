# Google 登入與 Telegram 降價通知：部署步驟

## 運作方式
1. 使用者用 Google 登入，「我的追蹤」同步到 Firestore `users/{uid}`。
2. 使用者按「連結 Telegram」→ 前端寫入一次性 `linkCode` → 開啟 `t.me/UGpricebot?start=<linkCode>`。
3. Telegram 把 `/start <linkCode>` 推送到 `api/telegram.js`（Vercel），以 Admin SDK 寫入 `telegram.chatId`。
4. 爬蟲（GitHub Actions）偵測到降價 → `notify_price_drops.cjs` 比對追蹤清單 → 用 Bot 發送通知。

## 一次性設定
1. **Firebase Console → Authentication → Sign-in method**：啟用 **Google**，並在 Settings → Authorized domains 加入正式網域。
2. **Firestore rules**（管理員白名單已設為 jacky4976@gmail.com）。⚠️ 部署會讓舊版後台（Email/密碼登入）失去寫入權限，請在新版前端上線後再部署：
   `firebase deploy --only firestore:rules --project uqprice`
3. **Firebase Console → 專案設定 → 服務帳戶 → 產生新的私密金鑰**，下載 JSON。
4. **Vercel 環境變數**（Production）：
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`（自訂隨機字串，例如 `openssl rand -hex 24`）
   - `FIREBASE_SERVICE_ACCOUNT`（步驟 3 的整份 JSON）
   - `ADMIN_EMAILS`（伺服端驗證後台「Telegram 測試」用，逗號分隔，例如 `jacky4976@gmail.com`）
   - `VITE_ADMIN_EMAILS`（管理員信箱，逗號分隔）、`VITE_TELEGRAM_BOT_USERNAME`
5. **GitHub → Settings → Secrets → Actions**：新增 `TELEGRAM_BOT_TOKEN`。
6. 部署後，註冊 webhook（把 `<TOKEN>`、`<SECRET>`、`<DOMAIN>` 換成實際值）：
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<DOMAIN>/api/telegram" \
     -d "secret_token=<SECRET>"
   ```
7. 舊的管理員 Email/Password 帳號 `admin@uqprice.com` 可在 Firebase Authentication 中刪除或停用。

## 安全注意
- Bot Token 只能放在 Vercel / GitHub Secrets，不可放進 `VITE_` 變數或提交到 git。
- 前端無法寫入 `users/{uid}.telegram`（rules 限制），只有 Admin SDK 能綁定，防止把通知導向他人。

## 後台「Telegram 測試」
管理員先在前台用 Google 登入並連結自己的 Telegram，再到後台 → Telegram 通知測試，選商品後按發送，訊息會用與真實降價通知完全相同的格式送到你自己的 Telegram。需設定 `ADMIN_EMAILS` 與 `FIREBASE_SERVICE_ACCOUNT`。
