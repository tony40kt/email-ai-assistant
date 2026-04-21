'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { translateText } = require('../../src/translation-service');

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/translate
 * 翻譯英文文字為繁體中文（必須由使用者主動觸發）
 * Body: { text: string }
 */
router.post('/', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: '翻譯內容不可為空' });
    }
    if (text.length > 10000) {
      return res.status(400).json({ error: '翻譯內容過長（上限 10,000 字元）' });
    }

    const apiUrl = process.env.LIBRETRANSLATE_API_URL;
    const apiKey = process.env.LIBRETRANSLATE_API_KEY || '';

    if (!apiUrl) {
      return res.status(503).json({ error: '翻譯服務尚未設定，請聯絡管理員' });
    }

    const translated = await translateText(text, { apiUrl, apiKey });
    res.json({ translated });
  } catch (err) {
    // translateText 已產生使用者友善訊息
    if (err.userMessage) {
      return res.status(503).json({ error: err.userMessage });
    }
    next(err);
  }
});

module.exports = router;
