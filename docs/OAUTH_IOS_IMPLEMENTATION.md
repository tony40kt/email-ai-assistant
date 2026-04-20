# iOS 登入流程與 OAuth 連線實作（Gmail 優先）

> 對應 Issue：`[FEATURE] iOS 登入流程與 OAuth 連線（Gmail / Outlook）`

## 1) OAuth 登入畫面（繁中）

- 標題：`連接你的信箱`
- 說明：`請選擇郵件服務並完成授權，我們只會在你授權的範圍內讀取郵件。`
- 主要按鈕：`使用 Gmail 登入`
- 次要按鈕（預留）：`使用 Outlook 登入（即將推出）`
- 安全提示：
  - `不會在前端日誌顯示 OAuth Token`
  - `你可隨時撤銷授權`

## 2) Gmail OAuth（MVP）

- OAuth 提供者：Google OAuth 2.0
- 建議授權範圍（最小權限）：
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `openid`
  - `email`
  - `profile`
- 流程：
  1. iOS 端開啟 Google 授權頁（Authorization Code + PKCE）。
  2. 使用 redirect URI 回到 App。
  3. App 將 authorization code 傳到後端兌換 access/refresh token。
  4. 後端以安全儲存保存 token，回傳前端短時效 session 資訊（建議自簽發起算 15 分鐘到期，且不回傳 refresh token；時效可依安全與使用體驗需求調整，延長時應同步評估 token 撤銷策略）。
  5. 後端代為呼叫 Gmail API 讀取郵件資料。

## 3) Outlook OAuth 擴充點（次階段）

- 提供者抽象介面（建議）：
  - `OAuthProvider.buildAuthorizeUrl()`
  - `OAuthProvider.exchangeCode()`
  - `OAuthProvider.refreshToken()`
  - `OAuthProvider.fetchMail()`
- Gmail 先行實作為 `GoogleOAuthProvider`。
- Outlook 後續以 `MicrosoftOAuthProvider` 實作同介面，避免改動上層流程。

## 4) Token 安全儲存策略

- 前端：
  - 不保存 refresh token。
  - 僅保存必要且短時效的登入態資訊，MVP（React Native + Expo）統一使用 `expo-secure-store`（iOS 底層使用 Keychain；Android 底層使用 Keystore）。
  - 禁止將 token、authorization code、mail payload 寫入 console log。
- 後端：
  - refresh token 僅存後端（建議加密後保存）。
  - 使用環境變數管理 OAuth client secrets。
  - 設定 token rotation / refresh 失敗重試與失效清理。

## 5) 驗收（DoD）

- 可完成 Gmail OAuth 登入並取得郵件讀取權限。
- 前端日誌與錯誤訊息中不可出現 token（含 access/refresh token）。
- Outlook 按鈕與 provider 擴充介面已預留，不影響 Gmail 主流程。
