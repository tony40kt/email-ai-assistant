#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function readIssue(issuePathArg) {
  if (!issuePathArg) {
    throw new Error('缺少 Issue JSON 路徑（第一個參數）。');
  }

  const issuePath = path.resolve(process.cwd(), issuePathArg);
  if (!fs.existsSync(issuePath)) {
    throw new Error(`找不到 Issue JSON 檔案：${issuePath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(issuePath, 'utf8'));
  } catch (error) {
    throw new Error(`Issue JSON 解析失敗：${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Issue JSON 必須是物件。');
  }

  if (!Number.isInteger(parsed.number) || parsed.number <= 0) {
    throw new Error('Issue JSON「number」必須是正整數。');
  }

  if (typeof parsed.title !== 'string' || parsed.title.trim() === '') {
    throw new Error('Issue JSON「title」必須是非空字串。');
  }

  if (parsed.body != null && typeof parsed.body !== 'string') {
    throw new Error('Issue JSON「body」在提供時必須為字串。');
  }

  return {
    number: parsed.number,
    title: parsed.title.trim(),
    body: parsed.body || ''
  };
}

function generateFallbackMarkdown(issue) {
  const localizedGeneratedAt = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());

  return [
    `# Issue #${issue.number}: ${issue.title}`,
    '',
    '## 背景內容',
    '',
    issue.body.trim() || '_尚未提供 Issue 內容。_',
    '',
    '## 自動產生說明',
    '',
    '此檔案由 Node-only fallback generator 自動產生。',
    `產生時間（台北時間）：${localizedGeneratedAt}`,
    ''
  ].join('\n');
}

function main() {
  const issue = readIssue(process.argv[2]);
  const outDir = path.join(process.cwd(), '.autogen');
  fs.mkdirSync(outDir, { recursive: true });

  const outputPath = path.join(outDir, `issue-${issue.number}.md`);
  fs.writeFileSync(outputPath, generateFallbackMarkdown(issue), 'utf8');
  console.log(`已產生 fallback 檔案：${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
