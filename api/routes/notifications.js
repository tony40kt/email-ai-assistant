'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const supabase = require('../services/supabase');
const { scheduleNotification } = require('../../src/notification-scheduler');

const router = Router();
router.use(authMiddleware);

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
      isRead: row.cond_is_read
    },
    schedule: {
      mode: row.schedule_mode,
      times: row.schedule_times || [],
      quietStart: row.quiet_start,
      quietEnd: row.quiet_end,
      timezone: row.timezone
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * GET /api/notifications/rules
 * 取得通知規則列表
 */
router.get('/rules', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('user_id', req.user.id)
      .order('priority')
      .order('created_at');

    if (error) throw error;
    res.json((data || []).map(formatRule));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/rules
 * 新增通知規則
 * Body: { name, enabled?, priority?, conditions, schedule }
 */
router.post('/rules', async (req, res, next) => {
  try {
    const { name, enabled = true, priority = 100, conditions = {}, schedule = {} } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '規則名稱不可為空' });
    }

    const validModes = ['immediate', 'fixed_times', 'daily'];
    const mode = schedule.mode || 'immediate';
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: `推送模式必須是 ${validModes.join(' / ')} 其中之一` });
    }

    const { data, error } = await supabase
      .from('notification_rules')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        enabled,
        priority,
        cond_from: conditions.from || null,
        cond_to: conditions.to || null,
        cond_keyword: conditions.keyword || null,
        cond_is_read: conditions.isRead !== undefined ? conditions.isRead : null,
        schedule_mode: mode,
        schedule_times: schedule.times || null,
        quiet_start: schedule.quietStart || null,
        quiet_end: schedule.quietEnd || null,
        timezone: schedule.timezone || 'Asia/Taipei'
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
 * PUT /api/notifications/rules/:id
 * 更新通知規則
 */
router.put('/rules/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, enabled, priority, conditions, schedule } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (enabled !== undefined) updates.enabled = enabled;
    if (priority !== undefined) updates.priority = priority;
    if (conditions !== undefined) {
      updates.cond_from = conditions.from || null;
      updates.cond_to = conditions.to || null;
      updates.cond_keyword = conditions.keyword || null;
      updates.cond_is_read = conditions.isRead !== undefined ? conditions.isRead : null;
    }
    if (schedule !== undefined) {
      updates.schedule_mode = schedule.mode;
      updates.schedule_times = schedule.times || null;
      updates.quiet_start = schedule.quietStart || null;
      updates.quiet_end = schedule.quietEnd || null;
      updates.timezone = schedule.timezone || 'Asia/Taipei';
    }

    const { data, error } = await supabase
      .from('notification_rules')
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
 * DELETE /api/notifications/rules/:id
 * 刪除通知規則
 */
router.delete('/rules/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('notification_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/schedule
 * 計算下次推送時間（給前端預覽用）
 * Body: { schedule: { mode, times?, quietStart?, quietEnd?, timezone? } }
 */
router.post('/schedule', (req, res) => {
  try {
    const { schedule = {} } = req.body;
    const result = scheduleNotification({
      mode: schedule.mode || 'immediate',
      times: schedule.times,
      quietStart: schedule.quietStart,
      quietEnd: schedule.quietEnd,
      timezone: schedule.timezone || 'Asia/Taipei'
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
