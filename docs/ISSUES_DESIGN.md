# Email AI Assistant — 全專案 Issue 設計

> 本文件提供「可直接在 GitHub 建立」的 Issue 規格，已包含：Title、Body Type、Priority、Labels、目的、工作項目、DoD、備註。  
> Priority 定義：P0（最高）/ P1（高）/ P2（中）/ P3（低）。

---

## Issue 1
- **Title**：\[EPIC\] 專案初始化與技術基線建立
- **Body Type**：Epic
- **Priority**：P0
- **Labels**：`type:epic`, `priority:P0`, `area:project`
- **目的**：建立可持續開發的專案骨架與流程。
- **工作項目**：
  - [ ] 決定前端與後端技術棧（以免費資源為優先）
  - [ ] 建立環境變數與 Secrets 清單
  - [ ] 建立基本分支策略與命名規範
  - [ ] 定義 Issue/PR 流程
- **DoD**：
  - [ ] 文件可讓新成員 30 分鐘內理解流程
  - [ ] 關鍵設定有範例與說明
- **相關備註**：由於是個人團隊，流程必須簡單可維護。

## Issue 2
- **Title**：\[FEATURE\] iOS 登入流程與 OAuth 連線（Gmail / Outlook）
- **Body Type**：Feature
- **Priority**：P0
- **Labels**：`type:feature`, `priority:P0`, `area:oauth`, `area:ios`
- **目的**：讓使用者安全授權郵件帳號。
- **工作項目**：
  - [ ] 設計 OAuth 登入畫面（繁中）
  - [ ] 實作 Gmail OAuth
  - [ ] 預留 Outlook OAuth 擴充點
  - [ ] Token 儲存安全策略
- **DoD**：
  - [ ] 可成功登入並取得郵件讀取權限
  - [ ] Token 不出現在前端日誌
- **相關備註**：免費方案先以 Gmail 優先，Outlook 可次階段。

## Issue 3
- **Title**：\[FEATURE\] 郵件同步與基本資料模型建立
- **Body Type**：Feature
- **Priority**：P0
- **Labels**：`type:feature`, `priority:P0`, `area:mail-sync`, `area:backend`
- **目的**：建立郵件讀取與本地/雲端資料模型。
- **工作項目**：
  - [ ] 設計郵件欄位模型（寄件人、收件人、主旨、已讀）
  - [ ] 建立同步機制（分頁/增量）
  - [ ] 建立錯誤重試流程
- **DoD**：
  - [ ] 可穩定載入郵件列表
  - [ ] 同步失敗可提示使用者並可重試
- **相關備註**：避免一次載入過多郵件造成卡頓。

## Issue 4
- **Title**：\[FEATURE\] 分類規則管理（寄件人/關鍵字/收件人 + 優先順序）
- **Body Type**：Feature
- **Priority**：P0
- **Labels**：`type:feature`, `priority:P0`, `area:classification`, `area:ui`
- **目的**：使用者可建立、排序、啟用/停用分類規則。
- **工作項目**：
  - [ ] 規則 CRUD（新增/編輯/刪除）
  - [ ] 規則啟用/停用切換
  - [ ] 優先順序排序 UI
  - [ ] 規則驗證（寄件人/關鍵字/收件人不可同時為空）
- **DoD**：
  - [ ] 規則可成功儲存並排序
  - [ ] 同優先序時排序穩定（按建立時間）
  - [ ] 非法輸入有明確提示
- **相關備註**：排序邏輯要穩定（同優先時按建立時間）。

## Issue 5
- **Title**：\[FEATURE\] 郵件分類引擎與標籤套用
- **Body Type**：Feature
- **Priority**：P0
- **Labels**：`type:feature`, `priority:P0`, `area:classification`, `area:label`
- **目的**：依規則自動分類並加上標籤。
- **工作項目**：
  - [ ] 規則比對引擎（多條件）
  - [ ] 優先順序衝突解決
  - [ ] 標籤套用與更新
- **DoD**：
  - [ ] 命中規則的郵件可正確加標籤
  - [ ] 規則衝突時結果符合優先順序
- **相關備註**：需保留可追蹤性（顯示命中哪條規則）。

## Issue 6
- **Title**：\[FEATURE\] 郵件篩選與搜尋功能
- **Body Type**：Feature
- **Priority**：P1
- **Labels**：`type:feature`, `priority:P1`, `area:search`, `area:ui`
- **目的**：提高找信效率。
- **工作項目**：
  - [ ] 依寄件人/標籤/已讀/日期篩選
  - [ ] 關鍵字搜尋（主旨+內文）
  - [ ] 搜尋結果排序與分頁
- **DoD**：
  - [ ] 常見條件組合可在可接受時間內回應
  - [ ] 空結果與錯誤狀態有清楚提示
- **相關備註**：行動裝置需優化搜尋輸入體驗。

## Issue 7
- **Title**：\[FEATURE\] 重要郵件推送規則管理
- **Body Type**：Feature
- **Priority**：P1
- **Labels**：`type:feature`, `priority:P1`, `area:notification`, `area:ui`
- **目的**：可自訂推送條件與優先序。
- **工作項目**：
  - [ ] 推送條件設定（寄件人/關鍵字/收件人/已讀）
  - [ ] 推送規則優先順序管理
  - [ ] 規則啟用/停用開關
- **DoD**：
  - [ ] 規則可新增、排序、儲存
  - [ ] 規則生效結果可被驗證
- **相關備註**：與分類規則可共用條件編輯元件。

## Issue 8
- **Title**：\[FEATURE\] 推送排程（即時 / 固定時間 X 次 / 每日定時）
- **Body Type**：Feature
- **Priority**：P1
- **Labels**：`type:feature`, `priority:P1`, `area:notification`, `area:scheduler`
- **目的**：讓推送符合使用者偏好節奏。
- **工作項目**：
  - [ ] 即時推送流程
  - [ ] 固定時間推送 X 次
  - [ ] 每日定時推送
  - [ ] 時區處理
- **DoD**：
  - [ ] 三種推送模式均可運作
  - [ ] 跨日與時區行為符合預期
- **相關備註**：避免深夜大量通知，提供安靜時段選項。

## Issue 9
- **Title**：\[FEATURE\] 英文郵件按鈕觸發翻譯（英→繁中）
- **Body Type**：Feature
- **Priority**：P1
- **Labels**：`type:feature`, `priority:P1`, `area:translation`, `area:ui`
- **目的**：在需要時快速閱讀英文郵件。
- **工作項目**：
  - [ ] 郵件詳情頁加入「翻譯」按鈕
  - [ ] 翻譯 API 串接（免費方案）
  - [ ] 錯誤/超時/重試處理
- **DoD**：
  - [ ] 未點按按鈕不會自動翻譯
  - [ ] 翻譯結果正確顯示且可還原原文
- **相關備註**：需清楚提示「翻譯可能將內容送至外部服務」。

## Issue 10
- **Title**：\[FEATURE\] 全繁體中文 UI 與可用性調整
- **Body Type**：Feature
- **Priority**：P1
- **Labels**：`type:feature`, `priority:P1`, `area:ui`, `area:i18n`
- **目的**：確保介面符合繁中使用者習慣。
- **工作項目**：
  - [ ] 全介面文字繁中化
  - [ ] 日期時間格式在地化
  - [ ] 重要互動文案（錯誤、提示、引導）優化
- **DoD**：
  - [ ] 無殘留英文系統文案（技術代碼除外）
  - [ ] 主要流程文案可理解且一致
- **相關備註**：優先簡潔、可操作導向文案。

## Issue 11
- **Title**：\[TASK\] 安全與隱私治理（Token、日誌、資料最小化）
- **Body Type**：Task
- **Priority**：P0
- **Labels**：`type:task`, `priority:P0`, `area:security`
- **目的**：降低敏感資料外洩風險。
- **工作項目**：
  - [ ] Token 加密與到期刷新策略
  - [ ] 日誌去識別化
  - [ ] 第三方服務資料外送告知與同意
- **DoD**：
  - [ ] 不可在 Repo/Log 中找到敏感資訊
  - [ ] 權限與資料使用有文件記錄
- **相關備註**：此 Issue 必須在 MVP 上線前完成。

## Issue 12
- **Title**：\[TASK\] 測試策略與品質檢查（分類/推送/翻譯）
- **Body Type**：Task
- **Priority**：P1
- **Labels**：`type:task`, `priority:P1`, `area:qa`
- **目的**：確保核心流程穩定可回歸驗證。
- **工作項目**：
  - [ ] 分類規則單元測試
  - [ ] 推送排程整合測試
  - [ ] 翻譯功能錯誤情境測試
- **DoD**：
  - [ ] 核心模組有可重複執行的測試
  - [ ] 重大缺陷可被測試攔截
- **相關備註**：先覆蓋高風險流程，再逐步擴充。

## Issue 13
- **Title**：\[TASK\] GitHub Action：Issue 自動標籤與檢查提示
- **Body Type**：Task
- **Priority**：P1
- **Labels**：`type:task`, `priority:P1`, `area:workflow`
- **目的**：降低手動整理 Issue 的成本。
- **工作項目**：
  - [ ] 建立自動標籤規則
  - [ ] 建立優先級判定規則
  - [ ] 建立 DoD 缺漏提醒留言
- **DoD**：
  - [ ] 新 Issue 建立後可自動標籤
  - [ ] 缺少 DoD 時會自動提醒
- **相關備註**：需與 Issue Template 欄位名稱一致。

## Issue 14
- **Title**：\[TASK\] 文件完善（README、架構、操作手冊）
- **Body Type**：Task
- **Priority**：P2
- **Labels**：`type:task`, `priority:P2`, `area:docs`
- **目的**：讓非工程背景也能維護專案。
- **工作項目**：
  - [ ] README 補齊路線圖與流程
  - [ ] 以網頁版 GitHub 操作為主的教學
  - [ ] 常見問題與排錯指南
- **DoD**：
  - [ ] 新使用者可依文件完成 Issue 建立與追蹤
  - [ ] 文件結構清楚、可搜尋
- **相關備註**：維持短段落、清楚步驟。

## Issue 15
- **Title**：\[BUG\] 郵件分類結果與預期不一致（保留）
- **Body Type**：Bug
- **Priority**：P1（預設，可調整）
- **Labels**：`type:bug`, `priority:P1`, `area:classification`
- **目的**：提供正式缺陷通道，快速修正核心體驗問題。
- **工作項目**：
  - [ ] 蒐集重現步驟與樣本資料
  - [ ] 比對規則命中流程
  - [ ] 修復並回歸測試
- **DoD**：
  - [ ] 可穩定重現與修復
  - [ ] 修復後測試通過且無副作用
- **相關備註**：此為常駐模板型 Issue，視實際狀況複製建立。

---

## 建議 Labels 清單（先建立）
- `type:epic`
- `type:feature`
- `type:task`
- `type:bug`
- `priority:P0`
- `priority:P1`
- `priority:P2`
- `priority:P3`
- `area:project`
- `area:ios`
- `area:backend`
- `area:oauth`
- `area:mail-sync`
- `area:classification`
- `area:label`
- `area:search`
- `area:notification`
- `area:scheduler`
- `area:translation`
- `area:ui`
- `area:i18n`
- `area:security`
- `area:qa`
- `area:workflow`
- `area:docs`
