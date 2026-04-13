require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10kb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

const staticLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(staticLimiter);

app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Please set it in your .env file.');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No content returned from Gemini API.');
  return text.trim();
}

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.slice(0, 5000).trim();
}

app.post('/api/compose', async (req, res) => {
  try {
    const { subject, context, tone, language } = req.body;
    if (!subject) return res.status(400).json({ error: 'Subject is required.' });

    const lang = sanitizeText(language) || 'English';
    const toneText = sanitizeText(tone) || 'professional';
    const contextText = sanitizeText(context);

    const prompt = `You are an expert email writer. Write a complete, well-structured email in ${lang}.
Subject: ${sanitizeText(subject)}
Tone: ${toneText}
${contextText ? `Additional context: ${contextText}` : ''}

Write only the email body (no subject line header). Keep it concise and appropriate for mobile reading.`;

    const result = await callGemini(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/summarize', async (req, res) => {
  try {
    const { email, language } = req.body;
    if (!email) return res.status(400).json({ error: 'Email content is required.' });

    const lang = sanitizeText(language) || 'English';
    const prompt = `Summarize the following email in ${lang} in 2-3 concise bullet points. Focus on key information, action items, and deadlines. Format using bullet points (•).

Email:
${sanitizeText(email)}`;

    const result = await callGemini(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reply', async (req, res) => {
  try {
    const { email, intent, tone, language } = req.body;
    if (!email) return res.status(400).json({ error: 'Email content is required.' });

    const lang = sanitizeText(language) || 'English';
    const toneText = sanitizeText(tone) || 'professional';
    const intentText = sanitizeText(intent);

    const prompt = `You are an expert email writer. Write a reply to the following email in ${lang} with a ${toneText} tone.
${intentText ? `Reply intent: ${intentText}` : ''}

Original email:
${sanitizeText(email)}

Write only the reply body. Keep it concise and appropriate for mobile reading.`;

    const result = await callGemini(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/improve', async (req, res) => {
  try {
    const { email, language } = req.body;
    if (!email) return res.status(400).json({ error: 'Email content is required.' });

    const lang = sanitizeText(language) || 'English';
    const prompt = `Improve the following email draft in ${lang}. Fix grammar, improve clarity, and make it more professional. Output only the improved email body.

Original draft:
${sanitizeText(email)}`;

    const result = await callGemini(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    model: GEMINI_MODEL,
    apiConfigured: !!GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Email AI Assistant running on http://localhost:${PORT}`);
    if (!GEMINI_API_KEY) {
      console.warn('Warning: GEMINI_API_KEY not set. Set it in .env to enable AI features.');
    }
  });
}

module.exports = app;
