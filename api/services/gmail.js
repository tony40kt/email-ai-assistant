'use strict';

const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

/**
 * 建立 OAuth2 客戶端
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

/**
 * 產生 Gmail 授權 URL
 */
function getAuthUrl() {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'   // 確保每次都回傳 refresh_token
  });
}

/**
 * 用授權碼換取 Token
 * @param {string} code
 * @returns {{ access_token, refresh_token, expiry_date }}
 */
async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * 用 refresh_token 刷新 access_token
 * @param {string} refreshToken
 * @returns {{ access_token, expiry_date }}
 */
async function refreshAccessToken(refreshToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

/**
 * 取得已授權的 Gmail API 實例
 * @param {string} accessToken
 */
function getGmailClient(accessToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * 取得使用者基本資訊（email、name）
 * @param {string} accessToken
 */
async function getUserInfo(accessToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return { email: data.email, name: data.name, picture: data.picture };
}

/**
 * 讀取郵件列表（支援分頁與增量同步）
 * @param {string} accessToken
 * @param {{ pageToken?: string, maxResults?: number, q?: string }} options
 */
async function listMessages(accessToken, options = {}) {
  const gmail = getGmailClient(accessToken);
  const { data } = await gmail.users.messages.list({
    userId: 'me',
    maxResults: options.maxResults || 25,
    pageToken: options.pageToken,
    q: options.q || ''
  });
  return {
    messages: data.messages || [],
    nextPageToken: data.nextPageToken || null,
    resultSizeEstimate: data.resultSizeEstimate || 0
  };
}

/**
 * 取得單封郵件完整內容
 * @param {string} accessToken
 * @param {string} messageId
 */
async function getMessage(accessToken, messageId) {
  const gmail = getGmailClient(accessToken);
  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });
  return data;
}

/**
 * 將 Gmail raw message 轉換為標準郵件物件
 * @param {object} rawMessage Gmail message 資源
 */
function parseGmailMessage(rawMessage) {
  const headers = rawMessage.payload?.headers || [];
  const getHeader = (name) => headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )?.value || '';

  const subject = getHeader('Subject');
  const sender = getHeader('From');
  const toRaw = getHeader('To');
  const recipients = toRaw ? toRaw.split(',').map((r) => r.trim()) : [];
  const dateRaw = getHeader('Date');
  const receivedAt = dateRaw ? new Date(dateRaw).toISOString() : null;

  // 取得純文字內文（遞迴找 text/plain part）
  const extractText = (part) => {
    if (!part) return '';
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part.parts) {
      for (const child of part.parts) {
        const text = extractText(child);
        if (text) return text;
      }
    }
    return '';
  };

  const bodyText = extractText(rawMessage.payload);
  const isRead = !(rawMessage.labelIds || []).includes('UNREAD');
  const gmailLabels = (rawMessage.labelIds || []).filter(
    (l) => !['UNREAD', 'INBOX'].includes(l)
  );

  return {
    providerId: rawMessage.id,
    threadId: rawMessage.threadId,
    subject,
    sender,
    recipients,
    snippet: rawMessage.snippet || '',
    bodyText,
    isRead,
    labels: gmailLabels,
    receivedAt
  };
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getUserInfo,
  listMessages,
  getMessage,
  parseGmailMessage
};
