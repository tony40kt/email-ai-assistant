'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const supabase = require('../services/supabase');
const gmailService = require('../services/gmail');
const { classifyEmail } = require('../../src/classification-engine');
const { searchEmails } = require('../../src/mail-search');

const router = Router();
router.use(authMiddleware);

/**
 * 將 DB 郵件列轉為 API 格式
 */
function formatEmail(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    threadId: row.thread_id,
    subject: row.subject,
    sender: row.sender,
    recipients: row.recipients || [],
    snippet: row.snippet,
    isRead: row.is_read,
    labels: row.labels || [],
    classification: {
      matchedRuleId: row.matched_rule_id,
      matchedRuleName: row.matched_rule_name,
      appliedLabels: row.applied_labels || [],
      priority: row.classification_priority
    },
    receivedAt: row.received_at
  };
}

/**
 * POST /api/emails/sync
 * 觸發郵件同步（從 Gmail 拉取並分類儲存）
 * Body: { maxPages?: number }
 */
router.post('/sync', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const maxPages = Math.min(Number(req.body.maxPages) || 4, 10);

    // 取得現有分類規則
    const { data: rulesRows } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true)
      .order('priority')
      .order('created_at');

    const rules = (rulesRows || []).map((row) => ({
      id: row.id,
      name: row.name,
      priority: row.priority,
      createdAt: row.created_at,
      labels: row.labels,
      conditions: {
        from: row.cond_from || [],
        to: row.cond_to || [],
        keyword: row.cond_keyword || [],
        subject: row.cond_subject || [],
        body: row.cond_body || [],
        isRead: row.cond_is_read
      }
    }));

    // 取得上次同步的 pageToken（增量同步）
    const { data: syncState } = await supabase
      .from('sync_states')
      .select('sync_token, resume_cursor')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .single();

    let pageToken = syncState?.resume_cursor || null;
    let totalSynced = 0;
    let newPageToken = null;

    for (let page = 0; page < maxPages; page++) {
      const result = await gmailService.listMessages(req.gmailAccessToken, {
        maxResults: 25,
        pageToken: pageToken || undefined
      });

      if (!result.messages.length) break;

      // 逐封取得完整內容並分類
      const emailsToUpsert = [];
      await Promise.all(result.messages.map(async (msg) => {
        try {
          const raw = await gmailService.getMessage(req.gmailAccessToken, msg.id);
          const parsed = gmailService.parseGmailMessage(raw);
          const classified = classifyEmail(parsed, rules);
          const email = classified.email;

          emailsToUpsert.push({
            user_id: userId,
            provider: 'gmail',
            provider_id: parsed.providerId,
            thread_id: parsed.threadId,
            subject: parsed.subject,
            sender: parsed.sender,
            recipients: parsed.recipients,
            snippet: parsed.snippet,
            body_text: parsed.bodyText,
            is_read: parsed.isRead,
            labels: email.labels,
            matched_rule_id: email.classification.matchedRuleId || null,
            matched_rule_name: email.classification.matchedRuleName || null,
            applied_labels: email.classification.appliedLabels || [],
            classification_priority: email.classification.priority,
            received_at: parsed.receivedAt
          });
        } catch {
          // 單封失敗不中斷整批
        }
      }));

      if (emailsToUpsert.length) {
        await supabase
          .from('emails')
          .upsert(emailsToUpsert, { onConflict: 'user_id,provider,provider_id' });
      }

      totalSynced += emailsToUpsert.length;
      newPageToken = result.nextPageToken;
      if (!newPageToken) break;
      pageToken = newPageToken;
    }

    // 更新同步狀態
    await supabase
      .from('sync_states')
      .upsert({
        user_id: userId,
        provider: 'gmail',
        last_synced_at: new Date().toISOString(),
        resume_cursor: newPageToken || null
      }, { onConflict: 'user_id,provider' });

    res.json({
      success: true,
      synced: totalSynced,
      hasMore: Boolean(newPageToken)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/emails
 * 搜尋與篩選郵件（從本地快取查詢）
 * Query: sender, label, isRead, dateFrom, dateTo, keyword, page, pageSize
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sender, label, isRead, dateFrom, dateTo, keyword, page = 1, pageSize = 25 } = req.query;

    let query = supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('received_at', { ascending: false });

    if (sender) query = query.ilike('sender', `%${sender}%`);
    if (label) query = query.contains('labels', [label]);
    if (isRead !== undefined) query = query.eq('is_read', isRead === 'true');
    if (dateFrom) query = query.gte('received_at', dateFrom);
    if (dateTo) query = query.lte('received_at', dateTo);
    if (keyword) {
      query = query.or(`subject.ilike.%${keyword}%,snippet.ilike.%${keyword}%`);
    }

    const offset = (Number(page) - 1) * Number(pageSize);
    query = query.range(offset, offset + Number(pageSize) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      emails: (data || []).map(formatEmail),
      page: Number(page),
      pageSize: Number(pageSize),
      total: count || 0,
      hasMore: offset + (data || []).length < (count || 0)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/emails/:id
 * 取得單封郵件（含完整內文）
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: '郵件不存在' });
    res.json({ ...formatEmail(data), bodyText: data.body_text });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emails/reclassify
 * 用最新規則重新分類所有本地郵件
 */
router.post('/reclassify', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: rulesRows } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true)
      .order('priority')
      .order('created_at');

    const rules = (rulesRows || []).map((row) => ({
      id: row.id,
      name: row.name,
      priority: row.priority,
      createdAt: row.created_at,
      labels: row.labels,
      conditions: {
        from: row.cond_from || [],
        to: row.cond_to || [],
        keyword: row.cond_keyword || [],
        subject: row.cond_subject || [],
        body: row.cond_body || [],
        isRead: row.cond_is_read
      }
    }));

    // 批次分類（每次 100 封）
    let offset = 0;
    let updated = 0;
    while (true) {
      const { data: batch, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .range(offset, offset + 99);

      if (error) throw error;
      if (!batch || !batch.length) break;

      const updates = batch.map((row) => {
        const emailForEngine = {
          from: row.sender,
          to: row.recipients,
          subject: row.subject,
          body: row.body_text,
          isRead: row.is_read,
          labels: row.labels,
          classification: { appliedLabels: row.applied_labels }
        };
        const result = classifyEmail(emailForEngine, rules);
        const c = result.email.classification;
        return {
          id: row.id,
          user_id: userId,
          labels: result.email.labels,
          matched_rule_id: c.matchedRuleId || null,
          matched_rule_name: c.matchedRuleName || null,
          applied_labels: c.appliedLabels || [],
          classification_priority: c.priority
        };
      });

      await supabase.from('emails').upsert(updates, { onConflict: 'id' });
      updated += updates.length;
      offset += 100;
      if (batch.length < 100) break;
    }

    res.json({ success: true, updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
