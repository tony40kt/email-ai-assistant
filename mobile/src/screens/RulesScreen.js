import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Modal, TextInput, ScrollView, Switch
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getRules, createRule, updateRule, deleteRule, toggleRule } from '../services/api';
import RuleCard from '../components/RuleCard';

const EMPTY_RULE = {
  name: '',
  priority: 100,
  enabled: true,
  conditions: { from: [], to: [], keyword: [], subject: [], body: [], isRead: null },
  labels: []
};

export default function RulesScreen() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null); // null = 新增, rule = 編輯
  const [form, setForm] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);

  // 暫存字串（逗號分隔輸入）
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [keywordText, setKeywordText] = useState('');
  const [labelsText, setLabelsText] = useState('');

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRules();
      setRules(data);
    } catch (err) {
      Alert.alert('載入失敗', err.response?.data?.error || '請稍後再試');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchRules(); }, [fetchRules]));

  function openNew() {
    setEditing(null);
    setForm(EMPTY_RULE);
    setFromText('');
    setToText('');
    setKeywordText('');
    setLabelsText('');
    setModalVisible(true);
  }

  function openEdit(rule) {
    setEditing(rule);
    setForm({
      name: rule.name,
      priority: rule.priority,
      enabled: rule.enabled,
      conditions: { ...rule.conditions },
      labels: rule.labels || []
    });
    setFromText((rule.conditions.from || []).join('、'));
    setToText((rule.conditions.to || []).join('、'));
    setKeywordText((rule.conditions.keyword || []).join('、'));
    setLabelsText((rule.labels || []).join('、'));
    setModalVisible(true);
  }

  function splitInput(text) {
    return text.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('提示', '請輸入規則名稱');
      return;
    }
    const payload = {
      ...form,
      name: form.name.trim(),
      priority: Number(form.priority) || 100,
      conditions: {
        from: splitInput(fromText),
        to: splitInput(toText),
        keyword: splitInput(keywordText),
        isRead: form.conditions.isRead
      },
      labels: splitInput(labelsText)
    };

    const hasAnyCondition = payload.conditions.from.length
      || payload.conditions.to.length
      || payload.conditions.keyword.length
      || payload.conditions.isRead !== null;
    if (!hasAnyCondition) {
      Alert.alert('提示', '至少需要一個條件（寄件人、收件人、關鍵字或已讀狀態）');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateRule(editing.id, payload);
        setRules((prev) => prev.map((r) => r.id === editing.id ? updated : r));
      } else {
        const created = await createRule(payload);
        setRules((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (err) {
      Alert.alert('儲存失敗', err.response?.data?.error || '請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id) {
    try {
      const updated = await toggleRule(id);
      setRules((prev) => prev.map((r) => r.id === id ? updated : r));
    } catch (err) {
      Alert.alert('操作失敗', err.response?.data?.error || '請稍後再試');
    }
  }

  async function handleDelete(id) {
    Alert.alert('刪除規則', '確定要刪除此規則嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除', style: 'destructive',
        onPress: async () => {
          try {
            await deleteRule(id);
            setRules((prev) => prev.filter((r) => r.id !== id));
          } catch (err) {
            Alert.alert('刪除失敗', err.response?.data?.error || '請稍後再試');
          }
        }
      }
    ]);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={openNew}>
        <Text style={styles.addBtnText}>＋ 新增規則</Text>
      </TouchableOpacity>

      {loading
        ? <ActivityIndicator style={{ margin: 40 }} size="large" color="#1a73e8" />
        : (
          <FlatList
            data={rules}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <RuleCard
                rule={item}
                onToggle={handleToggle}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🗂</Text>
                <Text style={styles.emptyText}>尚無分類規則，點「新增規則」開始設定</Text>
              </View>
            }
          />
        )}

      {/* 新增/編輯 Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>{editing ? '編輯規則' : '新增規則'}</Text>

          <Text style={styles.label}>規則名稱 *</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="例：重要客戶"
          />

          <Text style={styles.label}>優先順序（數字越小越優先）</Text>
          <TextInput
            style={styles.input}
            value={String(form.priority)}
            onChangeText={(v) => setForm((f) => ({ ...f, priority: v }))}
            keyboardType="numeric"
            placeholder="100"
          />

          <Text style={styles.label}>寄件人（逗號分隔，模糊比對）</Text>
          <TextInput
            style={styles.input}
            value={fromText}
            onChangeText={setFromText}
            placeholder="例：boss@company.com, @important.org"
          />

          <Text style={styles.label}>收件人（逗號分隔）</Text>
          <TextInput
            style={styles.input}
            value={toText}
            onChangeText={setToText}
            placeholder="例：me@gmail.com"
          />

          <Text style={styles.label}>關鍵字（逗號分隔，比對主旨+內文）</Text>
          <TextInput
            style={styles.input}
            value={keywordText}
            onChangeText={setKeywordText}
            placeholder="例：合約, 緊急, invoice"
          />

          <Text style={styles.label}>自動標籤（逗號分隔）</Text>
          <TextInput
            style={styles.input}
            value={labelsText}
            onChangeText={setLabelsText}
            placeholder="例：重要, 工作"
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>啟用規則</Text>
            <Switch
              value={form.enabled}
              onValueChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>儲存</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  addBtn: {
    backgroundColor: '#1a73e8', margin: 16,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center'
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalContent: { padding: 24, paddingBottom: 48 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 14, color: '#1a1a1a', backgroundColor: '#fafafa'
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32, gap: 12 },
  cancelBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#ddd'
  },
  cancelBtnText: { fontSize: 15, color: '#666' },
  saveBtn: {
    backgroundColor: '#1a73e8', paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 8
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' }
});
