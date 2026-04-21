import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { getEmail, translateText } from '../services/api';

export default function EmailDetailScreen({ route }) {
  const { emailId } = route.params;
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [translatedBody, setTranslatedBody] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    fetchEmail();
  }, [emailId]);

  async function fetchEmail() {
    setLoading(true);
    try {
      const data = await getEmail(emailId);
      setEmail(data);
    } catch (err) {
      Alert.alert('載入失敗', err.response?.data?.error || '請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  async function handleTranslate() {
    if (translatedBody && !showOriginal) {
      // 已有翻譯，切回原文
      setShowOriginal(true);
      return;
    }
    if (showOriginal && translatedBody) {
      // 還原翻譯
      setShowOriginal(false);
      return;
    }

    // 首次翻譯：提示使用者資料外送
    Alert.alert(
      '翻譯提示',
      '翻譯功能需將郵件內文傳送至翻譯服務（LibreTranslate）。是否繼續？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認翻譯',
          onPress: async () => {
            setTranslating(true);
            try {
              const body = email?.bodyText || email?.snippet || '';
              if (!body.trim()) {
                Alert.alert('提示', '此郵件沒有可翻譯的內文');
                return;
              }
              const result = await translateText(body);
              setTranslatedBody(result);
              setShowOriginal(false);
            } catch (err) {
              Alert.alert('翻譯失敗', err.response?.data?.error || '請稍後再試');
            } finally {
              setTranslating(false);
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!email) return null;

  const bodyToShow = (!showOriginal && translatedBody) ? translatedBody : (email.bodyText || email.snippet || '（無內文）');
  const isTranslated = !showOriginal && Boolean(translatedBody);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 主旨 */}
      <Text style={styles.subject}>{email.subject || '（無主旨）'}</Text>

      {/* 寄件人 & 時間 */}
      <View style={styles.meta}>
        <Text style={styles.sender}>{email.sender || '（未知）'}</Text>
        <Text style={styles.date}>
          {email.receivedAt
            ? new Date(email.receivedAt).toLocaleString('zh-TW')
            : ''}
        </Text>
      </View>

      {/* 分類標籤 */}
      {(email.classification?.appliedLabels || []).length > 0 && (
        <View style={styles.labelsRow}>
          <Text style={styles.labelPrefix}>自動標籤：</Text>
          {email.classification.appliedLabels.map((l) => (
            <View key={l} style={styles.label}>
              <Text style={styles.labelText}>{l}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.divider} />

      {/* 翻譯按鈕 */}
      <View style={styles.translateRow}>
        <TouchableOpacity
          style={styles.translateBtn}
          onPress={handleTranslate}
          disabled={translating}
        >
          {translating
            ? <ActivityIndicator color="#fff" size="small" />
            : (
              <Text style={styles.translateBtnText}>
                {isTranslated ? '🔄 顯示原文' : '🌐 翻譯為繁中'}
              </Text>
            )}
        </TouchableOpacity>
        {isTranslated && (
          <Text style={styles.translatedBadge}>已翻譯</Text>
        )}
      </View>

      {/* 郵件內文 */}
      <Text style={styles.body}>{bodyToShow}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subject: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', lineHeight: 28, marginBottom: 12 },
  meta: { marginBottom: 8 },
  sender: { fontSize: 14, color: '#444', marginBottom: 4 },
  date: { fontSize: 13, color: '#999' },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
  labelPrefix: { fontSize: 12, color: '#999' },
  label: {
    backgroundColor: '#e8f0fe', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, marginRight: 4
  },
  labelText: { fontSize: 12, color: '#1a73e8', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },
  translateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  translateBtn: {
    backgroundColor: '#1a73e8', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 10
  },
  translateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  translatedBadge: {
    marginLeft: 10, fontSize: 12, color: '#0f9d58', fontWeight: '600'
  },
  body: { fontSize: 15, color: '#333', lineHeight: 24 }
});
