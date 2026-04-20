#!/usr/bin/env node
'use strict';

/*
  範例：這個腳本會讀入 issue.json，呼叫 OpenAI / GPT（text-davinci-或 gpt-4）來產生一個 JSON
  回應 (files: [{ path, content }])，然後把檔案寫到 .autogen/ 目錄下（供 git commit）。
  注意：請在 repo Secrets 設定 OPENAI_API_KEY。
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // 如果沒安裝，請在 package.json 加 node-fetch

async function callOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'You are a code generation assistant. Output ONLY valid JSON with key "files".' },
                 { role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.2
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LLM error: ${res.status} ${t}`);
  }
  const j = await res.json();
  // Expect assistant message content contains JSON
  const content = j.choices?.[0]?.message?.content || '';
  return content;
}

function buildPrompt(issue) {
  return `
Issue Title: ${issue.title}

Issue Body:
${issue.body}

Task: produce an array named "files" in strict JSON format. Each entry:
{ "path": "<relative path>", "content": "<file content>" }

Constraints:
- Generate minimal but working code to address the issue.
- Do not include any secrets or env values.
- If multiple files are produced, include them all in the files array.
- Return only JSON (no explanatory text).
`;
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv[0]) throw new Error('Missing path to issue.json');
  const issueJson = JSON.parse(fs.readFileSync(argv[0], 'utf8'));
  const prompt = buildPrompt(issueJson);
  console.log('Calling LLM to generate files (prompt size:', prompt.length, ')');
  const raw = await callOpenAI(prompt);
  // Attempt to parse JSON from LLM output (strip code fences if present)
  const jsonText = raw.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse JSON from LLM response:', e.message);
    console.error('Raw response:', raw);
    process.exit(1);
  }
  if (!Array.isArray(parsed.files)) {
    console.error('LLM response missing files array');
    process.exit(1);
  }
  // Write files into .autogen/<path>
  const outDir = path.join(process.cwd(), '.autogen');
  for (const f of parsed.files) {
    const dest = path.join(outDir, f.path);
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dest, f.content, 'utf8');
    console.log('Wrote', dest);
  }
  console.log('Generation complete. Files written to .autogen/');
}

main().catch(err => { console.error(err); process.exit(1); });
