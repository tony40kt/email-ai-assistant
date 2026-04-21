import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const LABEL_COLORS = ['#1a73e8', '#0f9d58', '#db4437', '#f4b400', '#ab47bc', '#00838f'];

function labelColor(label, index) {
  return LABEL_COLORS[index % LABEL_COLORS.length];
}

export default function EmailCard({ email, onPress }) {
  const sender = email.sender || '（未知寄件人）';
  const senderName = sender.includes('<')
    ? sender.slice(0, sender.indexOf('<')).trim()
    : sender;
  const subject = email.subject || '（無主旨）';
  const snippet = email.snippet || '';
  const isRead = email.isRead;

  const dateStr = email.receivedAt
    ? new Date(email.receivedAt).toLocaleDateString('zh-TW', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : '';

  const autoLabels = email.classification?.appliedLabels || [];
  const extraLabels = (email.labels || []).filter((l) => !autoLabels.includes(l)).slice(0, 3);
  const displayLabels = [...autoLabels, ...extraLabels].slice(0, 4);

  return (
    <TouchableOpacity
      style={[styles.card, !isRead && styles.unread]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>
            {senderName.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.sender, !isRead && styles.boldText]} numberOfLines={1}>
              {senderName}
            </Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
          <Text style={[styles.subject, !isRead && styles.boldText]} numberOfLines={1}>
            {subject}
          </Text>
          <Text style={styles.snippet} numberOfLines={2}>{snippet}</Text>
          {displayLabels.length > 0 && (
            <View style={styles.labels}>
              {displayLabels.map((label, i) => (
                <View key={label} style={[styles.label, { backgroundColor: labelColor(label, i) + '22' }]}>
                  <Text style={[styles.labelText, { color: labelColor(label, i) }]}>{label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  unread: { backgroundColor: '#f0f6ff' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1a73e8', alignItems: 'center',
    justifyContent: 'center', marginRight: 12, marginTop: 2
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sender: { fontSize: 15, color: '#1a1a1a', flex: 1, marginRight: 8 },
  boldText: { fontWeight: 'bold' },
  date: { fontSize: 12, color: '#999' },
  subject: { fontSize: 14, color: '#333', marginTop: 2 },
  snippet: { fontSize: 13, color: '#888', marginTop: 3, lineHeight: 18 },
  labels: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  label: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  labelText: { fontSize: 11, fontWeight: '600' }
});
