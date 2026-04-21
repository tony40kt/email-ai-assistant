# 系統架構說明（Architecture）

## 1. 架構總覽

- **iOS App（React Native + Expo）**：登入、規則設定、郵件列表、翻譯按鈕
- **Backend API（Node.js）**：OAuth 流程、郵件同步、分類與通知邏輯
- **Mail Providers**：Gmail API（MVP）／Microsoft Graph（後續）
- **Database（Supabase）**：儲存規則、標籤、偏好與同步狀態
- **Translation Service（LibreTranslate）**：使用者手動觸發翻譯

## 2. 主要資料流程

1. 使用者在 App 完成 OAuth 登入。
2. Backend 以 Token 向郵件服務拉取郵件資料。
3. 郵件資料進入分類引擎，依規則決定標籤與優先處理。
4. 若符合通知規則，進行推送排程或即時通知。
5. 使用者按下翻譯按鈕時才呼叫翻譯服務。

## 3. MVP 邊界

- 優先完成 Gmail OAuth、規則分類、搜尋與推送基線。
- Microsoft Graph、進階翻譯治理屬後續擴充。

## 4. 文件對照

- 流程與操作：`README.md`
- OAuth 細節：`docs/OAUTH_IOS_IMPLEMENTATION.md`
- 安全治理：`docs/SECURITY_PRIVACY_GOVERNANCE.md`
