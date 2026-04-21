'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const rulesRoutes = require('./routes/rules');
const emailsRoutes = require('./routes/emails');
const translateRoutes = require('./routes/translate');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// ── 中介軟體 ──────────────────────────────────────────────
const allowedOrigin = process.env.APP_BASE_URL;
app.use(cors({
  origin: allowedOrigin || false,   // 若未設定，不允許跨域請求
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

// ── 路由 ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/notifications', notificationsRoutes);

// ── 健康檢查 ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 ──────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: '找不到此路由' }));

// ── 全域錯誤處理 ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || '伺服器錯誤，請稍後再試' });
});

// ── 啟動 ──────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Email AI Assistant API 已啟動：http://localhost:${PORT}`);
  });
}

module.exports = app;
