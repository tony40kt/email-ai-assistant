'use strict';

const { Router } = require('express');
const gmailService = require('../services/gmail');
const supabase = require('../services/supabase');

const router = Router();

/**
 * GET /api/auth/url
 * 回傳 Gmail OAuth 授權 URL，讓 App 導向此 URL 進行登入
 */
router.get('/url', (req, res) => {
  const url = gmailService.getAuthUrl();
  res.json({ url });
});

/**
 * POST /api/auth/callback
 * App 收到授權碼後呼叫此端點完成 OAuth 流程
 * Body: { code: string, supabaseJwt: string }
 */
router.post('/callback', async (req, res, next) => {
  try {
    const { code, supabaseJwt } = req.body;
    if (!code || !supabaseJwt) {
      return res.status(400).json({ error: '缺少 code 或 supabaseJwt' });
    }

    // 驗證 Supabase 使用者
    const { data: { user }, error: authError } = await supabase.auth.getUser(supabaseJwt);
    if (authError || !user) {
      return res.status(401).json({ error: '身份驗證失敗' });
    }

    // 交換 Token
    const tokens = await gmailService.exchangeCodeForTokens(code);
    const userInfo = await gmailService.getUserInfo(tokens.access_token);

    // 寫入 oauth_tokens
    const { error: upsertError } = await supabase
      .from('oauth_tokens')
      .upsert({
        user_id: user.id,
        provider: 'gmail',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: tokens.scope || null
      }, { onConflict: 'user_id,provider' });

    if (upsertError) throw upsertError;

    // 建立或更新 user_profiles
    await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: userInfo.email,
        display_name: userInfo.name,
        avatar_url: userInfo.picture
      }, { onConflict: 'id' });

    res.json({ success: true, email: userInfo.email });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/auth/revoke
 * 撤銷 Gmail 授權（刪除 Token）
 */
router.delete('/revoke', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '缺少 Authorization header' });
    }
    const jwt = authHeader.slice('Bearer '.length);
    const { data: { user }, error } = await supabase.auth.getUser(jwt);
    if (error || !user) return res.status(401).json({ error: '身份驗證失敗' });

    await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'gmail');

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
