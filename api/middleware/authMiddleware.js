'use strict';

const supabase = require('../services/supabase');
const gmailService = require('../services/gmail');

/**
 * 驗證 Bearer Token，解析 Supabase 使用者，並附加存取 Gmail 所需的 access_token。
 * 若 Token 即將過期（< 5 分鐘），自動刷新。
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '缺少 Authorization header' });
  }

  const jwt = authHeader.slice('Bearer '.length);

  // 用 Supabase 驗證 JWT 取得使用者
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return res.status(401).json({ error: '身份驗證失敗，請重新登入' });
  }

  // 讀取 Gmail OAuth token
  const { data: oauthRow, error: dbError } = await supabase
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'gmail')
    .single();

  if (dbError || !oauthRow) {
    return res.status(403).json({ error: '尚未連結 Gmail，請先登入授權' });
  }

  let { access_token, refresh_token, expires_at } = oauthRow;

  // 若 access_token 即將過期，刷新之
  const expiresAtMs = expires_at ? new Date(expires_at).getTime() : 0;
  if (Date.now() + 5 * 60 * 1000 > expiresAtMs && refresh_token) {
    try {
      const newCreds = await gmailService.refreshAccessToken(refresh_token);
      access_token = newCreds.access_token;
      const newExpiresAt = newCreds.expiry_date
        ? new Date(newCreds.expiry_date).toISOString()
        : null;

      await supabase
        .from('oauth_tokens')
        .update({ access_token, expires_at: newExpiresAt })
        .eq('user_id', user.id)
        .eq('provider', 'gmail');
    } catch {
      return res.status(401).json({ error: 'Token 刷新失敗，請重新授權 Gmail' });
    }
  }

  req.user = user;
  req.gmailAccessToken = access_token;
  next();
}

module.exports = authMiddleware;
