/* ===== App State ===== */
const state = {
  loading: { compose: false, summarize: false, reply: false, improve: false },
};

/* ===== Theme ===== */
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);
})();

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const moonIcon = document.querySelector('.icon-moon');
  const sunIcon = document.querySelector('.icon-sun');
  if (moonIcon && sunIcon) {
    moonIcon.classList.toggle('hidden', theme === 'dark');
    sunIcon.classList.toggle('hidden', theme === 'light');
  }
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', next);
  applyTheme(next);
});

/* ===== Language ===== */
(function initLanguage() {
  const saved = localStorage.getItem('language');
  if (saved) {
    const sel = document.getElementById('language-select');
    if (sel) sel.value = saved;
  }
})();

document.getElementById('language-select')?.addEventListener('change', (e) => {
  localStorage.setItem('language', e.target.value);
});

function getLanguage() {
  return document.getElementById('language-select')?.value || 'English';
}

/* ===== Tabs ===== */
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const panel = document.getElementById(`tab-${tabId}`);
    if (panel) panel.classList.remove('hidden');
  });
});

/* ===== Character Counters ===== */
[
  ['summarize-email', 'summarize-count'],
  ['reply-email', 'reply-count'],
  ['improve-email', 'improve-count'],
].forEach(([inputId, countId]) => {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(countId);
  if (!input || !counter) return;
  input.addEventListener('input', () => {
    counter.textContent = `${input.value.length} / 5000`;
  });
});

/* ===== API Helper ===== */
async function callAPI(endpoint, body) {
  const response = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, language: getLanguage() }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'An error occurred. Please try again.');
  return data.result;
}

/* ===== Set Loading State ===== */
function setLoading(tab, isLoading) {
  state.loading[tab] = isLoading;
  const btn = document.getElementById(`${tab}-btn`);
  if (!btn) return;
  btn.disabled = isLoading;
  if (isLoading) {
    btn.dataset.originalContent = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span><span>Generating...</span>';
  } else {
    if (btn.dataset.originalContent) btn.innerHTML = btn.dataset.originalContent;
  }
}

/* ===== Show Result ===== */
function buildSvgIcon(paths) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.innerHTML = paths;
  return svg;
}

function showResult(tab, text, isError = false) {
  const container = document.getElementById(`${tab}-result`);
  if (!container) return;
  container.className = `result-card${isError ? ' error' : ''}`;

  // Header
  const header = document.createElement('div');
  header.className = 'result-header';

  const label = document.createElement('span');
  label.className = 'result-label';
  label.textContent = isError ? '⚠ Error' : '✓ Result';

  const actions = document.createElement('div');
  actions.className = 'result-actions';

  if (!isError) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy';
    copyBtn.appendChild(buildSvgIcon(
      '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'
    ));
    copyBtn.appendChild(document.createTextNode(' Copy'));
    copyBtn.addEventListener('click', () => copyResult(tab));
    actions.appendChild(copyBtn);
  }

  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn-clear';
  clearBtn.appendChild(buildSvgIcon(
    '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
  ));
  clearBtn.appendChild(document.createTextNode(isError ? ' Dismiss' : ' Clear'));
  clearBtn.addEventListener('click', () => clearResult(tab));
  actions.appendChild(clearBtn);

  header.appendChild(label);
  header.appendChild(actions);

  const body = document.createElement(isError ? 'p' : 'div');
  body.className = isError ? 'error-text' : 'result-text';
  body.textContent = text;

  container.replaceChildren(header, body);
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearResult(tab) {
  const container = document.getElementById(`${tab}-result`);
  if (container) container.className = 'result-card hidden';
}

/* ===== Copy to Clipboard ===== */
async function copyResult(tab) {
  const container = document.getElementById(`${tab}-result`);
  const textEl = container?.querySelector('.result-text');
  if (!textEl) return;
  try {
    await navigator.clipboard.writeText(textEl.textContent || '');
    showToast('Copied to clipboard!');
  } catch {
    showToast('Copy failed. Please select and copy manually.');
  }
}

/* ===== Toast ===== */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

/* ===== Feature Handlers ===== */
async function handleCompose() {
  if (state.loading.compose) return;
  const subject = document.getElementById('compose-subject')?.value.trim();
  if (!subject) { showToast('Please enter a subject.'); return; }

  setLoading('compose', true);
  try {
    const result = await callAPI('compose', {
      subject,
      context: document.getElementById('compose-context')?.value.trim(),
      tone: document.getElementById('compose-tone')?.value,
    });
    showResult('compose', result);
  } catch (err) {
    showResult('compose', err.message, true);
  } finally {
    setLoading('compose', false);
  }
}

async function handleSummarize() {
  if (state.loading.summarize) return;
  const email = document.getElementById('summarize-email')?.value.trim();
  if (!email) { showToast('Please paste an email to summarize.'); return; }

  setLoading('summarize', true);
  try {
    const result = await callAPI('summarize', { email });
    showResult('summarize', result);
  } catch (err) {
    showResult('summarize', err.message, true);
  } finally {
    setLoading('summarize', false);
  }
}

async function handleReply() {
  if (state.loading.reply) return;
  const email = document.getElementById('reply-email')?.value.trim();
  if (!email) { showToast('Please paste the original email.'); return; }

  setLoading('reply', true);
  try {
    const result = await callAPI('reply', {
      email,
      intent: document.getElementById('reply-intent')?.value.trim(),
      tone: document.getElementById('reply-tone')?.value,
    });
    showResult('reply', result);
  } catch (err) {
    showResult('reply', err.message, true);
  } finally {
    setLoading('reply', false);
  }
}

async function handleImprove() {
  if (state.loading.improve) return;
  const email = document.getElementById('improve-email')?.value.trim();
  if (!email) { showToast('Please paste your email draft.'); return; }

  setLoading('improve', true);
  try {
    const result = await callAPI('improve', { email });
    showResult('improve', result);
  } catch (err) {
    showResult('improve', err.message, true);
  } finally {
    setLoading('improve', false);
  }
}

/* ===== Button Event Listeners ===== */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('compose-btn')?.addEventListener('click', handleCompose);
  document.getElementById('summarize-btn')?.addEventListener('click', handleSummarize);
  document.getElementById('reply-btn')?.addEventListener('click', handleReply);
  document.getElementById('improve-btn')?.addEventListener('click', handleImprove);
});
