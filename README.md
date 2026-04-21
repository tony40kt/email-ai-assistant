# Email AI Assistant（電子郵件 AI 助手）

> iOS 郵件整理應用專案（繁體中文 UI、以免費資源為優先）

## 快速導覽

- [專案里程碑（Roadmap）](#4-專案里程碑mvp--可用版)
- [GitHub 專案管理方式](#5-github-專案管理方式)
- [只用 GitHub 網頁版：Issue 建立與追蹤](#6-給只用-github-網頁版的操作步驟issue-建立與追蹤)
- [安全與隱私原則](#7-安全與隱私原則)
- [常見問題與排錯指南（FAQ）](#8-常見問題與排錯指南faq)
- [目前狀態](#9-目前狀態)
- [快速啟動](#10-快速啟動開發環境)

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

### 4.1 路線圖追蹤方式（Roadmap Tracking）

1. 使用 `docs/ISSUES_DESIGN.md` 依里程碑建立對應 Issues。
2. 每張 Issue 維持：Priority、Checklist、DoD。
3. 執行中以 Issue checklist 勾選進度，完成後關閉 Issue。
4. 里程碑進度以「已關閉 Issue / 總 Issue」快速檢查。

## 5. GitHub 專案管理方式

本 repo 已包含：

- `docs/ISSUES_DESIGN.md`：完整 Issue 規劃清單（Title、Type、Priority、Labels、目的、工作項目、DoD、備註）
- `docs/OAUTH_IOS_IMPLEMENTATION.md`：iOS OAuth（Gmail 優先）登入流程、Outlook 擴充點與 Token 安全策略
- `.github/ISSUE_TEMPLATE/*.yml`：可直接在 GitHub 網頁新增 Issue 的表單
- `.github/workflows/issue-automation.yml`：Issue 自動處理流程（標籤、優先級、檢查提示）
- `.github/workflows/bootstrap-issues.yml`：一鍵解析 `docs/ISSUES_DESIGN.md` 並建立對應的全套 Issues
- `.github/workflows/copilot-auto-implement.yml`：Issue 觸發器（檢查 `auto:implement`、驗證 actor 權限、去重 marker、指派與驗證 Copilot assignee）
- `.github/workflows/copilot-auto-implement-monitor.yml`：Monitor / Backfill（手動 `workflow_dispatch` 為主，schedule 預設關閉；補齊 assignee/marker、偵測久未出現 PR 的告警）
- `.github/workflows/sync-linked-issue-status.yml`：PR Sync（驗證 PR 與 `auto:implement` issue 關聯、同步 Issue 留言與 Project Status）

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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務金鑰（僅後端） | ❌ | ✅ |
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

### 5.5 `auto:implement` 使用方式

1. 建立或選擇一張 **open** 的 Issue。
2. 加上 `auto:implement` label（可透過 repo variable `AUTO_IMPLEMENT_LABEL` 自訂）。
3. 觸發 `copilot-auto-implement.yml`：
   - 驗證觸發者是否為可信 actor（`admin/maintain/write` 或可信自動化帳號）
   - 指派 Copilot assignee（已存在則跳過）
   - 留下去重 marker comment（已存在則跳過）
   - 重新讀取 issue 驗證 assignee 是否成功
4. 之後由 `sync-linked-issue-status.yml` 在 PR 事件中做關聯驗證與狀態同步。

### 5.6 Monitor / Backfill（手動補跑）

- Workflow：`.github/workflows/copilot-auto-implement-monitor.yml`
- 觸發方式：`workflow_dispatch`（預設主流程）
- 輸入參數：
  - `dry_run`：只檢查不寫入
  - `stale_days_without_pr`：超過 N 天無 linked PR 時留言警示
  - `max_issues`：掃描上限
- Schedule 為可選機制，需設定 repository variable `AUTO_IMPLEMENT_MONITOR_SCHEDULE_ENABLED=true` 才會啟用；預設關閉。

### 5.7 Debug / 排查重點

- 先看 `copilot-auto-implement.yml` log：
  - 是否 `Issue is open`
  - 是否偵測到 `AUTO_IMPLEMENT_LABEL`
  - actor 是否 trusted
  - assignee verification 是否 `confirmed`
  - marker 是否已存在（去重）
- 若長時間無 PR，手動執行 monitor/backfill：
  - 看是否補上 assignee / marker
  - 看是否出現 monitor warning comment
- PR 建立後看 `sync-linked-issue-status.yml`：
  - 是否辨識到 linked auto:implement issue
  - 是否成功寫入同步留言
  - 是否成功更新 Project Status

### 5.8 可驗證 vs 無法保證

- 可驗證：
  - 觸發條件（open issue + label）
  - actor 權限檢查
  - assignee API 呼叫與回讀驗證
  - marker 去重
  - linked PR 偵測與狀態同步
  - backfill 補跑與告警留言
- 無法保證（需明確接受）：
  - Copilot cloud agent 是否一定接單
  - Copilot 是否一定會建立 PR
  - PR 建立時機與內容品質

### 5.9 測試案例與範例驗證

建議至少驗證以下案例：

1. 正常流程：trusted actor + `auto:implement` label，應完成 assignee + marker。
2. 無 label：應直接 skip。
3. 無權限 actor：應 skip 並記錄 warning。
4. 已有 assignee：不重複指派。
5. marker 已存在：不重複留言。
6. backfill：可補齊缺少 assignee/marker 的 open issue。
7. PR sync：linked PR 事件應回寫 issue 同步留言與（可用時）project status。
8. API 失敗：單一 issue 失敗不應中止整批 monitor/backfill。

範例 issue（可手動建立）：

- Title: `[task] demo auto implement pipeline`
- Labels: `type:task`, `priority:P2`, `area:workflow`, `auto:implement`
- Body: 含 checklist 與 DoD，並要求 Copilot 實作可驗證的小改動。

### 5.10 文件導覽（可搜尋）

- `README.md`：專案總覽、Roadmap、流程、FAQ
- `docs/README.md`：文件索引（依主題快速查找）
- `docs/ARCHITECTURE.md`：系統架構與資料流程
- `docs/GITHUB_WEB_MANUAL.md`：GitHub 網頁版操作手冊（Issue 建立/追蹤）
- `docs/ISSUES_DESIGN.md`：Issue 規劃母表
- `docs/OAUTH_IOS_IMPLEMENTATION.md`：OAuth 實作細節
- `docs/SECURITY_PRIVACY_GOVERNANCE.md`：安全與隱私治理

## 6. 給「只用 GitHub 網頁版」的操作步驟（Issue 建立與追蹤）

1. 到 **Issues** 頁面點選 **New issue**
2. 選擇對應模板（Epic/Feature/Task/Bug）
3. 依表單填寫：目標、工作項目、DoD、備註
4. 建立後，Workflow 會自動補上建議標籤與檢查留言
5. 進入 Issue 右側 **Labels**，確認至少有：`type:*`、`priority:*`、`area:*`
6. 在 Issue 描述持續勾選 checklist，並在留言回報進度（含驗證結果）
7. 需要實作時建立 PR，於描述加上 `Closes #<issue-number>`
8. PR 合併後回到 Issue，確認狀態已關閉且 checklist 全勾選
9. 若要自動啟動 Copilot 開發流程，先確保該 Issue 已有 `auto:implement` 標籤；之後加標、更新或重新開啟該 Issue 都可觸發流程

## 7. 安全與隱私原則

- 郵件資料只在授權範圍內使用
- OAuth Token 與金鑰必須放在 Secrets，不可寫入程式碼
- 翻譯功能採「手動觸發」，降低資料外送風險
- Token 需加密保存，並採用到期刷新與失效撤銷策略
- 日誌僅記錄必要欄位，敏感資訊必須遮罩或雜湊後再寫入
- 第三方服務（如翻譯）必須先告知用途並取得使用者同意

詳細治理規範請參考：`docs/SECURITY_PRIVACY_GOVERNANCE.md`

## 8. 常見問題與排錯指南（FAQ）

### Q1：我看不到 Issue Template（Epic/Feature/Task/Bug）怎麼辦？
- 先確認目前在正確 repo 的 **Issues** 頁面。
- 點 **New issue** 後應出現模板選單；若沒出現，重新整理頁面再試一次。

### Q2：Issue 建好後沒有自動補標籤？
- 到 **Actions** 查看 `Issue Automation` 是否執行成功。
- 確認 Issue 內容有包含 Priority 與 Checklist（`- [ ]`）。

### Q3：PR 沒有自動關閉 Issue？
- 在 PR 描述加入 `Closes #<issue-number>`（或 `Fixes #<issue-number>`）。
- 確認 PR 與 Issue 在同一個 repository。

### Q4：加了 `auto:implement` 但沒有後續動作？
- 到 **Actions** 檢查 `copilot-auto-implement.yml` log。
- 確認 Issue 為 open、標籤正確、觸發者權限符合流程要求。

## 9. 目前狀態

- ✅ 需求盤點完成
- ✅ README 與 Issue/Workflow 設計完成
- ✅ 後端業務邏輯全部完成（`src/`，43 個測試全通過）
- ✅ 後端 API 伺服器完成（`api/`，Express + Gmail OAuth + Supabase）
- ✅ 資料庫 Schema 完成（`supabase/schema.sql`）
- ✅ iOS App 完成（`mobile/`，React Native + Expo）
- ⏳ 下一步：填入真實的 Supabase、Gmail OAuth 憑證後即可啟動

## 10. 快速啟動（開發環境）

### 前置條件

1. [Node.js 20+](https://nodejs.org)
2. [Supabase 帳號](https://supabase.com)（免費層即可）
3. [Google Cloud Console](https://console.cloud.google.com)（建立 OAuth 2.0 Client ID）
4. [Expo Go App](https://expo.dev/go)（裝在 iPhone 上）

### 步驟 1：設定 Supabase 資料庫

1. 登入 Supabase，建立新專案
2. 到「SQL Editor」，貼上並執行 `supabase/schema.sql` 全部內容
3. 記下「Settings > API」中的 **Project URL** 與 **anon key / service_role key**

### 步驟 2：取得 Gmail OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com) > API 和服務 > 憑證
2. 建立「OAuth 2.0 用戶端 ID」，類型選「網頁應用程式」
3. 「已授權的重新導向 URI」加入：`http://localhost:3000/api/auth/callback`
4. 記下 **Client ID** 與 **Client Secret**

### 步驟 3：設定環境變數

```bash
# 複製範本
cp .env.example .env
```

編輯 `.env` 填入各項值：

```env
NODE_ENV=development
APP_BASE_URL=http://localhost:19006
API_BASE_URL=http://localhost:3000

GMAIL_CLIENT_ID=你的_client_id
GMAIL_CLIENT_SECRET=你的_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/callback

SUPABASE_URL=https://你的專案.supabase.co
SUPABASE_ANON_KEY=你的_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key

LIBRETRANSLATE_API_URL=https://libretranslate.com/translate
LIBRETRANSLATE_API_KEY=（可選）
```

### 步驟 4：啟動後端 API

```bash
cd api
npm install
npm start
# API 啟動於 http://localhost:3000
```

### 步驟 5：啟動 iOS App

```bash
cd mobile
npm install
# 設定 App 用的環境變數（新增 mobile/.env）
echo "EXPO_PUBLIC_API_BASE_URL=http://你的電腦IP:3000" > .env
echo "EXPO_PUBLIC_SUPABASE_URL=https://你的專案.supabase.co" >> .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key" >> .env
npm start
```

用手機上的 Expo Go 掃描 QR code 即可預覽。

### 步驟 6：執行測試（業務邏輯）

```bash
# 在根目錄
npm test
# 43 個測試全部通過
```

## 11. 授權

MIT License
