# Email AI Assistant（電子郵件 AI 助手）

> iOS 郵件整理應用專案（繁體中文 UI、以免費資源為優先）

## 1. 專案定位

此專案目標是打造一個「個人團隊也能推進」的 iOS 郵件助手，核心能力：

1. 郵件分類（含自訂條件、優先順序、標籤）
2. 郵件篩選與搜尋
3. 重要郵件推送（條件 + 時間策略 + 優先順序）
4. 郵件翻譯（英 → 繁中，按鈕觸發才翻譯）

## 2. 需求總覽

### 2.1 郵件分類
- 可設定分類條件：寄件人、關鍵字、收件人
- 支援規則 CRUD（新增/編輯/刪除）與啟用/停用
- 每條規則可設定優先順序（數字越小優先）
- 排序邏輯需穩定（同優先序時依建立時間）
- 規則驗證：儲存時至少需填寫一項條件（寄件人/關鍵字/收件人）
- 命中規則後可自動加標籤（Label）

### 2.2 篩選與搜尋
- 依寄件人、標籤、日期區間、是否已讀快速篩選
- 支援關鍵字搜尋主旨與內文

### 2.3 重要郵件推送
- 推送條件：寄件人、關鍵字、收件人、是否已讀
- 推送時間/次數：
  - 即時推送
  - 固定時間推送 X 次
  - 每天特定時間推送
- 推送規則需有優先順序

### 2.4 翻譯
- 只做英文翻譯繁體中文
- 必須由使用者按「翻譯」按鈕才執行（避免不必要資料外送）

## 3. 建議技術架構（免費資源優先）

- **iOS App**：React Native + Expo（對非工程背景較友善）
- **後端 API**：Node.js（部署至 Vercel/Render 免費層）
- **郵件來源**：Gmail API / Microsoft Graph（OAuth）
- **資料庫**：Supabase 免費層（存規則、標籤、偏好）
- **翻譯服務**：LibreTranslate（可先用公有節點，再評估自架）
- **專案自動化**：GitHub Issues + GitHub Actions

## 4. 專案里程碑（MVP → 可用版）

### M1：規則與分類（MVP）
- 完成 OAuth 登入
- 讀取郵件基本欄位
- 可新增/編輯/刪除分類規則
- 可依規則套標籤

### M2：搜尋與重要推送
- 多條件篩選與搜尋
- 推送規則與排程
- iOS 通知整合

### M3：翻譯與體驗優化
- 郵件內文英翻繁中
- 翻譯按鈕/快取/錯誤處理
- UI 全繁中與操作優化

## 5. GitHub 專案管理方式

本 repo 已包含：

- `docs/ISSUES_DESIGN.md`：完整 Issue 規劃清單（Title、Type、Priority、Labels、目的、工作項目、DoD、備註）
- `docs/OAUTH_IOS_IMPLEMENTATION.md`：iOS OAuth（Gmail 優先）登入流程、Outlook 擴充點與 Token 安全策略
- `.github/ISSUE_TEMPLATE/*.yml`：可直接在 GitHub 網頁新增 Issue 的表單
- `.github/workflows/issue-automation.yml`：Issue 自動處理流程（標籤、優先級、檢查提示）
- `.github/workflows/bootstrap-issues.yml`：一鍵解析 `docs/ISSUES_DESIGN.md` 並建立對應的全套 Issues
- `.github/workflows/issue-auto-pr.yml`：Issue 具備 `auto:implement` 後自動指派 Copilot（由 Copilot cloud agent 產生實作 PR）

### 5.1 技術棧基線（免費資源優先）

- **前端（iOS 首發）**：React Native + Expo（同一套程式可保留 Android/Web 擴充彈性）
- **後端 API**：Node.js（優先部署 Vercel / Render 免費層）
- **資料庫**：Supabase 免費層
- **郵件 API**：Gmail API（MVP），後續擴充 Microsoft Graph
- **翻譯**：LibreTranslate（先公有節點，必要時再自架；公有節點可能有速率限制與穩定性波動，限制值依節點公告）

### 5.2 環境變數與 Secrets 清單

請參考根目錄 `.env.example`，本機開發使用 `.env`，正式憑證一律放 GitHub Secrets。

| 變數 | 用途 | 本機 `.env` | GitHub Secrets |
| --- | --- | --- | --- |
| `NODE_ENV` | 執行環境（development/production） | ✅ | - |
| `APP_BASE_URL` | App/前端連線基礎網址 | ✅ | - |
| `API_BASE_URL` | 後端 API 基礎網址 | ✅ | - |
| `GMAIL_CLIENT_ID` | Gmail OAuth Client ID | ✅ | ✅ |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth Client Secret | ✅ | ✅ |
| `GMAIL_REDIRECT_URI` | Gmail OAuth Redirect URI | ✅ | ✅ |
| `SUPABASE_URL` | Supabase 專案 URL | ✅ | ✅ |
| `SUPABASE_ANON_KEY` | Supabase 公開金鑰 | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務金鑰（僅後端） | ❌ 前端 / ✅ 後端本機安全環境 | ✅ |
| `LIBRETRANSLATE_API_URL` | 翻譯服務 URL | ✅ | ✅ |
| `LIBRETRANSLATE_API_KEY` | 翻譯服務金鑰（若需要） | ✅ | ✅ |

> `SUPABASE_SERVICE_ROLE_KEY` 權限高，僅限後端安全環境使用，禁止放入前端或客戶端程式。

### 5.3 分支策略與命名規範（簡化版）

- `main`：穩定分支，僅接受 PR 合併
- 功能分支：`feat/<issue-number>-<short-name>`
- 任務分支：`task/<issue-number>-<short-name>`
- 修補分支：`fix/<issue-number>-<short-name>`
- 文件分支：`docs/<issue-number>-<short-name>`

範例：
- `feat/12-oauth-login`
- `task/1-project-baseline`
- `docs/14-readme-guide`

### 5.4 Issue / PR 流程

1. 建立 Issue（使用 Epic/Feature/Task/Bug 模板）
2. 填寫 Priority、工作項目、DoD
3. 建立對應分支（依 5.3 命名）
4. 完成變更後發 PR，標題建議：`[type] #<issue-number> <summary>`
5. PR 描述至少包含：目的、變更摘要、驗證方式、風險
6. 合併前確認：
   - 關聯 Issue 已標註
   - 敏感資訊未進版控
   - 文件有同步更新（若流程/設定有改動）

## 6. 給「只用 GitHub 網頁版」的操作步驟

1. 到 **Issues** 頁面點選 **New issue**
2. 選擇對應模板（Epic/Feature/Task/Bug）
3. 依表單填寫：目標、工作項目、DoD、備註
4. 建立後，Workflow 會自動補上建議標籤與檢查留言
5. 完成工作時，在該 Issue 勾選工作項目並更新狀態
6. 若要自動啟動 Copilot 開發流程，先確保該 Issue 已有 `auto:implement` 標籤；之後加標、更新或重新開啟該 Issue 都可觸發流程

## 7. 安全與隱私原則

- 郵件資料只在授權範圍內使用
- OAuth Token 與金鑰必須放在 Secrets，不可寫入程式碼
- 翻譯功能採「手動觸發」，降低資料外送風險

## 8. 目前狀態

- ✅ 需求盤點完成
- ✅ README 與 Issue/Workflow 設計完成
- ⏳ 下一步：依 `docs/ISSUES_DESIGN.md` 逐張開 Issue 並開始開發

## 9. 授權

建議使用 MIT License（可後續新增 `LICENSE` 檔案）。
