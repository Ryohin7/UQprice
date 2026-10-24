# Google 登入與 Telegram 降價通知：部署步驟

## 運作方式
1. 使用者用 Google 登入，「我的追蹤」同步到 Firestore `users/{uid}`。
2. 使用者按「連結 Telegram」→ 前端寫入一次性 `linkCode` → 開啟 `t.me/UGpricebot?start=<linkCode>`。
3. Telegram 把 `/start <linkCode>` 推送到 `api/telegram.js`（Vercel），以 Admin SDK 寫入 `telegram.chatId`。
4. 爬蟲（GitHub Actions）偵測到降價 → `notifications.cjs` 比對追蹤清單 → 用 Bot 發送通知：每件商品一張卡片（商品圖 + 價格 + 「前往官網購買」按鈕），訊息內不使用 emoji。

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
6. 部署後執行 `npm run telegram:setup`（可附網址參數），會讀取 `.env` 註冊 webhook（含按鈕需要的 `callback_query`）並設定機器人指令選單。手動註冊方式如下（把 `<TOKEN>`、`<SECRET>`、`<DOMAIN>` 換成實際值，且需加上 `allowed_updates=["message","callback_query"]`）：
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<DOMAIN>/api/telegram" \
     -d "secret_token=<SECRET>"
   ```
7. 舊的管理員 Email/Password 帳號 `admin@uqprice.com` 可在 Firebase Authentication 中刪除或停用。

## 安全注意
- Bot Token 只能放在 Vercel / GitHub Secrets，不可放進 `VITE_` 變數或提交到 git。
- 前端無法寫入 `users/{uid}.telegram`（rules 限制），只有 Admin SDK 能綁定，防止把通知導向他人。

## 後台「Telegram 管理」
- 已連結人數、降價通知卡片測試、以及「推播」：可對所有已連結使用者發送一則自訂訊息（純文字，可選圖片與一顆按鈕）。建議先按「發送給我自己」預覽；全員推播前會跳出確認視窗並核對人數，單次上限 1400 人，每筆推播會記錄在 Firestore `telegram_broadcasts`（僅後端可讀寫），已封鎖機器人的使用者會自動解除連結。

### 測試說明
管理員先在前台用 Google 登入並連結自己的 Telegram，再到後台 → Telegram 通知測試，選商品後按發送，訊息會用與真實降價通知完全相同的格式送到你自己的 Telegram。需設定 `ADMIN_EMAILS` 與 `FIREBASE_SERVICE_ACCOUNT`。

## 使用者可用的 Telegram 指令與通知
- `/list` 查看追蹤清單並用按鈕移除；`/add 關鍵字` 搜尋並加入追蹤；`/remove 編號`；`/target 編號 價格`（`off` 取消）；`/settings` 通知設定；`/stop` 取消通知。
- 通知類型：降價、限定價格開始與結束前 48 小時（皆為商品卡片，附「取消追蹤」按鈕）、新品上市（依訂閱分組，文字彙整）。
- 通知條件（降價/限定價格開關、只通知歷史新低、降幅門檻 100～1000 元、新品分組）可在網站「我的帳號」或 Telegram `/settings` 調整；商品可設目標價，設有目標價的商品只在降到目標價以下通知。
- 限定價格、新品的比對基準存於 `system/sync_baseline`；功能首次部署的那一次爬蟲只建立基準、不發通知，避免一次通知所有商品。
- 通知皆由爬蟲執行時發送（週三、四、五早上），不是即時。
