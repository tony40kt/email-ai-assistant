'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const supabase = require('../services/supabase');

const router = Router();
router.use(authMiddleware);

/**
 * 將 DB 列轉為 API 回傳格式
 */
function formatRule(row) {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    priority: row.priority,
    conditions: {
      from: row.cond_from || [],
      to: row.cond_to || [],
      keyword: row.cond_keyword || [],
      subject: row.cond_subject || [],
      body: row.cond_body || [],
      isRead: row.cond_is_read
    },
    labels: row.labels || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 驗證規則至少有一個有效條件
 */
function validateConditions(conditions = {}) {
  const hasFrom = (conditions.from || []).some(Boolean);
  const hasTo = (conditions.to || []).some(Boolean);
  const hasKeyword = (conditions.keyword || []).some(Boolean);
  const hasSubject = (conditions.subject || []).some(Boolean);
  const hasBody = (conditions.body || []).some(Boolean);
  const hasIsRead = conditions.isRead !== undefined && conditions.isRead !== null;
  return hasFrom || hasTo || hasKeyword || hasSubject || hasBody || hasIsRead;
}

/**
 * GET /api/rules
 * 取得所有分類規則（依優先順序排序）
 */
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('user_id', req.user.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data.map(formatRule));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/rules
 * 新增分類規則
 * Body: { name, enabled?, priority?, conditions, labels? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, enabled = true, priority = 100, conditions = {}, labels = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '規則名稱不可為空' });
    }
    if (!validateConditions(conditions)) {
      return res.status(400).json({ error: '至少需要一個條件（寄件人、收件人、關鍵字、主旨、內文、已讀狀態）' });
    }

    const { data, error } = await supabase
      .from('classification_rules')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        enabled,
        priority,
        cond_from: conditions.from || null,
        cond_to: conditions.to || null,
        cond_keyword: conditions.keyword || null,
        cond_subject: conditions.subject || null,
        cond_body: conditions.body || null,
        cond_is_read: conditions.isRead !== undefined ? conditions.isRead : null,
        labels
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(formatRule(data));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/rules/:id
 * 更新分類規則
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, enabled, priority, conditions, labels } = req.body;

    if (conditions && !validateConditions(conditions)) {
      return res.status(400).json({ error: '至少需要一個條件' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (enabled !== undefined) updates.enabled = enabled;
    if (priority !== undefined) updates.priority = priority;
    if (labels !== undefined) updates.labels = labels;
    if (conditions !== undefined) {
      updates.cond_from = conditions.from || null;
      updates.cond_to = conditions.to || null;
      updates.cond_keyword = conditions.keyword || null;
      updates.cond_subject = conditions.subject || null;
      updates.cond_body = conditions.body || null;
      updates.cond_is_read = conditions.isRead !== undefined ? conditions.isRead : null;
    }

    const { data, error } = await supabase
      .from('classification_rules')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: '規則不存在' });
    res.json(formatRule(data));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/rules/:id
 * 刪除分類規則
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('classification_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/rules/:id/toggle
 * 快速切換規則啟用/停用
 */
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 先取得現有狀態
    const { data: existing, error: fetchError } = await supabase
      .from('classification_rules')
      .select('enabled')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !existing) return res.status(404).json({ error: '規則不存在' });

    const { data, error } = await supabase
      .from('classification_rules')
      .update({ enabled: !existing.enabled })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(formatRule(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
