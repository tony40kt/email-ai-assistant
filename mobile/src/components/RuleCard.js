import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';

export default function RuleCard({ rule, onToggle, onEdit, onDelete }) {
  const conditions = rule.conditions || {};
  const parts = [];
  if ((conditions.from || []).length) parts.push(`寄件人：${conditions.from.join('、')}`);
  if ((conditions.to || []).length) parts.push(`收件人：${conditions.to.join('、')}`);
  if ((conditions.keyword || []).length) parts.push(`關鍵字：${conditions.keyword.join('、')}`);
  if ((conditions.subject || []).length) parts.push(`主旨：${conditions.subject.join('、')}`);
  if (conditions.isRead === true) parts.push('已讀');
  if (conditions.isRead === false) parts.push('未讀');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{rule.name}</Text>
          <Text style={styles.priority}>P{rule.priority}</Text>
        </View>
        <Switch
          value={rule.enabled}
          onValueChange={() => onToggle(rule.id)}
          trackColor={{ false: '#ccc', true: '#1a73e880' }}
          thumbColor={rule.enabled ? '#1a73e8' : '#999'}
        />
      </View>

      {parts.length > 0 && (
        <Text style={styles.conditions} numberOfLines={2}>
          {parts.join('  |  ')}
        </Text>
      )}

      {(rule.labels || []).length > 0 && (
        <View style={styles.labelsRow}>
          <Text style={styles.labelPrefix}>標籤：</Text>
          {rule.labels.map((l) => (
            <View key={l} style={styles.label}>
              <Text style={styles.labelText}>{l}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(rule)}>
          <Text style={styles.editBtnText}>✏️ 編輯</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(rule.id)}>
          <Text style={styles.deleteBtnText}>🗑 刪除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', flex: 1 },
  priority: {
    fontSize: 12, fontWeight: '600', color: '#1a73e8',
    backgroundColor: '#e8f0fe', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginLeft: 8
  },
  conditions: { fontSize: 13, color: '#666', marginTop: 8, lineHeight: 20 },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
  labelPrefix: { fontSize: 12, color: '#999' },
  label: {
    backgroundColor: '#e8f0fe', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, marginBottom: 4
  },
  labelText: { fontSize: 12, color: '#1a73e8', fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 12 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { fontSize: 14, color: '#1a73e8' },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { fontSize: 14, color: '#db4437' }
});
