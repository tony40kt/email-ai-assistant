import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const SUPABASE_JWT_KEY = 'supabase_jwt';
const GMAIL_LINKED_KEY = 'gmail_linked';

// ── Axios 實例 ────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// 自動附加 JWT
api.interceptors.request.use(async (config) => {
  const jwt = await SecureStore.getItemAsync(SUPABASE_JWT_KEY);
  if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

// ── Token 儲存 ────────────────────────────────────────────
export async function saveJwt(jwt) {
  await SecureStore.setItemAsync(SUPABASE_JWT_KEY, jwt);
}

export async function getJwt() {
  return SecureStore.getItemAsync(SUPABASE_JWT_KEY);
}

export async function clearJwt() {
  await SecureStore.deleteItemAsync(SUPABASE_JWT_KEY);
  await SecureStore.deleteItemAsync(GMAIL_LINKED_KEY);
}

export async function setGmailLinked(linked) {
  await SecureStore.setItemAsync(GMAIL_LINKED_KEY, linked ? '1' : '0');
}

export async function isGmailLinked() {
  return (await SecureStore.getItemAsync(GMAIL_LINKED_KEY)) === '1';
}

// ── Auth ──────────────────────────────────────────────────
/** 取得 Gmail OAuth 授權 URL */
export async function getGmailAuthUrl() {
  const { data } = await api.get('/api/auth/url');
  return data.url;
}

/** 完成 OAuth 授權（帶入 code 與 supabaseJwt） */
export async function completeGmailOAuth(code, supabaseJwt) {
  const { data } = await api.post('/api/auth/callback', { code, supabaseJwt });
  return data;
}

/** 撤銷 Gmail 授權 */
export async function revokeGmailAuth() {
  await api.delete('/api/auth/revoke');
}

// ── 分類規則 ──────────────────────────────────────────────
export async function getRules() {
  const { data } = await api.get('/api/rules');
  return data;
}

export async function createRule(rule) {
  const { data } = await api.post('/api/rules', rule);
  return data;
}

export async function updateRule(id, rule) {
  const { data } = await api.put(`/api/rules/${id}`, rule);
  return data;
}

export async function deleteRule(id) {
  await api.delete(`/api/rules/${id}`);
}

export async function toggleRule(id) {
  const { data } = await api.patch(`/api/rules/${id}/toggle`);
  return data;
}

// ── 郵件 ──────────────────────────────────────────────────
export async function syncEmails(maxPages = 4) {
  const { data } = await api.post('/api/emails/sync', { maxPages });
  return data;
}

export async function getEmails(params = {}) {
  const { data } = await api.get('/api/emails', { params });
  return data;
}

export async function getEmail(id) {
  const { data } = await api.get(`/api/emails/${id}`);
  return data;
}

export async function reclassifyEmails() {
  const { data } = await api.post('/api/emails/reclassify');
  return data;
}

// ── 翻譯 ──────────────────────────────────────────────────
export async function translateText(text) {
  const { data } = await api.post('/api/translate', { text });
  return data.translated;
}

// ── 通知規則 ──────────────────────────────────────────────
export async function getNotificationRules() {
  const { data } = await api.get('/api/notifications/rules');
  return data;
}

export async function createNotificationRule(rule) {
  const { data } = await api.post('/api/notifications/rules', rule);
  return data;
}

export async function updateNotificationRule(id, rule) {
  const { data } = await api.put(`/api/notifications/rules/${id}`, rule);
  return data;
}

export async function deleteNotificationRule(id) {
  await api.delete(`/api/notifications/rules/${id}`);
}

export async function previewSchedule(schedule) {
  const { data } = await api.post('/api/notifications/schedule', { schedule });
  return data;
}

export default api;
