# GitHub 網頁版操作手冊（Issue 建立與追蹤）

## 1. 建立 Issue（不使用 CLI）

1. 開啟 repository 的 **Issues** 頁面，點 **New issue**。
2. 選擇模板：Epic / Feature / Task / Bug。
3. 填寫必要欄位：
   - 目的
   - 工作項目（Checklist）
   - DoD（完成定義）
   - Priority（P0/P1/P2/P3）
4. 建立後確認 Labels 至少包含：
   - `type:*`
   - `priority:*`
   - `area:*`

## 2. 追蹤 Issue 進度

1. 實作進行中，直接在 Issue 內容勾選 checklist。
2. 在留言區回報目前進度、驗證方式與風險。
3. 若有對應 PR，於 PR 描述加入 `Closes #<issue-number>`。
4. PR 合併後確認 Issue 已自動關閉。

## 3. 常見排錯

### 3.1 沒看到 Issue 模板
- 重新整理 **Issues > New issue** 頁面。
- 確認你在正確 repository。

### 3.2 沒有自動補標籤
- 到 **Actions** 查看 `Issue Automation` 執行紀錄。
- 確認 Issue 內容包含 Priority、Checklist、DoD。

### 3.3 `auto:implement` 沒反應
- 到 **Actions** 檢查 `copilot-auto-implement.yml`。
- 確認 Issue 為 open 且 label 名稱為 `auto:implement`。
