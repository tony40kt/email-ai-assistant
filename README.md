# Email AI Assistant（電子郵件 AI 助手）

簡介
----
Email AI Assistant 是一個針對 iOS 的郵件處理應用構想，功能包括：
- 自動分類郵件（支援寄件人 / 關鍵字 / 收件人 條件與優先順序）
- 搜尋與篩選郵件
- 重要郵件即時或依排程推送（含條件、時間與次數設定）
- 按需翻譯郵件（英 -> 繁體中文，由使用者按鈕觸發）
- UI 介面為繁體中文

專案目標
----
建立一個以隱私及免費資源為優先的系統原型，能：
- 在 iOS 上提供方便的郵件分類、搜尋、通知與翻譯功能
- 使用免費或免費層級的後端資源與第三方 API（盡可能避免付費 API；有必要時標註替代方案）
- 在 GitHub 上以開放開發流程管理（Issues、Workflow、自動化）

技術與架構建議（初步）
----
- iOS 前端：React Native + Expo（較友善給非專業 iOS 開發者的工具；可快速測試）。或者原生 Swift（需 Apple 開發者帳號以發佈到 App Store）。
- 後端 API：Node.js / Next.js API routes 或小型 Express 服務；部署在 Vercel / Render / Railway（皆有免費層，取決於需求）。
- 郵件連線：使用 OAuth 與郵件提供者的官方 API（例如 Gmail API、Microsoft Graph）。Gmail/Outlook 都提供免費配額，但需在各自雲端主控台申請。
- 翻譯：LibreTranslate（開源，公有實例可暫用但有流量限制；可自建於免費平台）或 HuggingFace 免費推理（限額）。避免馬上使用付費翻譯 API（如 Google Translate / DeepL）除非願意付費。
- 自動化 / CI：GitHub Actions（免費做自動化 Issue 標註、測試、部署流程）
- 資料儲存：Supabase 或 Firebase（都有免費層，可儲存設定、標籤、使用者偏好等）

功能規格（概要）
----
1) 郵件分類
- 自訂分類條件：寄件人、關鍵字（Subject 與內文）、收件人（含副本）
- 條件可設優先順序（高到低）
- 分類後可自動新增標籤（Label）

2) 篩選與搜尋
- 支援多條件組合搜尋（寄件人、日期區間、標籤、是否已讀）

3) 重要郵件推送
- 自定條件（寄件人、關鍵字、收件人、是否已讀）
- 推送方式：即時、固定次數在特定時間、每天特定時間推送
- 推送規則有優先順序（例如：VIP 寄件人比關鍵字優先）

4) 翻譯郵件內容
- 英文轉繁體中文
- 僅在使用者按下翻譯按鈕時才執行（避免自動上傳內文）
- 使用免費或自託管的翻譯服務（列出可選方案）

開發與部署（非程式人員友善步驟）
----
- 第一步：建立 GitHub repo（你已經有）
- 第二步：建立 Google Cloud Console 或 Microsoft Azure 應用（設定 OAuth 用於連接 Gmail/Outlook���
- 第三步：先以最小可行 MVP（分類 + 標籤顯示 + 手動翻譯）開發並在模擬器測試
- 第四步：部署後端到免費主機（Vercel / Render），前端用 Expo 測試 iOS Simulator
- 注意：要把敏感金鑰（OAuth client secret）放到 GitHub Secrets / Vercel 環境變數中

隱私與安全
----
- 僅在使用者授權下存取郵件
- 翻譯與處理盡量在用戶端或自家後端進行；若使用第三方翻譯 API，明確告知使用者並在設定提供同意選項
- 加密儲存使用者的 Token（在後端與資料庫中）

如何貢獻（給非程式開發者）
----
- 如果你要我代為建立 README / Issue / Workflow：回覆「請代為建立」
- 若要自行貼上檔案：在 GitHub repo → Add file → Create new file，貼上內容並 Commit
- 若看到 Issue 模板或工作項目不清楚，回覆問我我會逐步幫你修改文字或拆分任務

聯絡與開發流程
----
- 我會將整個專案拆成可操作的 Issues（含每個 Issue 的工作項目與驗收條件），你可以在 GitHub 的 Issues 頁面逐項追蹤
- 我也會提供一個自動化 Workflow（放在 .github/workflows）來協助 Issue 自動標記與建立基本檢查表

授權
----
- 本專案採用 MIT 或你想要的開源授權（可在 repo 新增 LICENSE）。若你未決定，我建議使用 MIT。
