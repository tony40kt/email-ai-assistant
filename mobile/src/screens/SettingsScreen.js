import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch
} from 'react-native';
import { revokeGmailAuth, clearJwt } from '../services/api';

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  async function handleLogout() {
    Alert.alert('登出', '確定要登出並移除所有本地資料嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出',
        style: 'destructive',
        onPress: async () => {
          try {
            await revokeGmailAuth();
          } catch {
            // 忽略撤銷錯誤，繼續清除本地
          }
          await clearJwt();
          navigation.replace('Login');
        }
      }
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>帳號</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Text style={styles.rowText}>🔓  登出並撤銷 Gmail 授權</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>通知</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowText}>📲  啟用推送通知</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#ccc', true: '#1a73e880' }}
            thumbColor={notificationsEnabled ? '#1a73e8' : '#999'}
          />
        </View>
      </View>

      <Text style={styles.section}>隱私與安全</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            您的 OAuth Token 以加密方式儲存在裝置安全區，不會上傳至任何第三方。
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🌐</Text>
          <Text style={styles.infoText}>
            翻譯功能需您主動點擊「翻譯」按鈕才會傳送內容至 LibreTranslate，每次均會提示確認。
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📧</Text>
          <Text style={styles.infoText}>
            應用僅讀取郵件，不會傳送、刪除或修改任何郵件。
          </Text>
        </View>
      </View>

      <Text style={styles.section}>關於</Text>
      <View style={styles.card}>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>版本</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>郵件來源</Text>
          <Text style={styles.aboutValue}>Gmail API</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>翻譯服務</Text>
          <Text style={styles.aboutValue}>LibreTranslate</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>資料庫</Text>
          <Text style={styles.aboutValue}>Supabase</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 48 },
  section: {
    fontSize: 13, fontWeight: '600', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 24, marginBottom: 8, marginLeft: 4
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    overflow: 'hidden', shadowColor: '#000',
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    justifyContent: 'space-between'
  },
  rowText: { fontSize: 15, color: '#1a1a1a' },
  rowArrow: { fontSize: 18, color: '#ccc' },
  infoRow: { flexDirection: 'row', padding: 16, alignItems: 'flex-start' },
  infoIcon: { fontSize: 20, marginRight: 12, marginTop: 1 },
  infoText: { flex: 1, fontSize: 14, color: '#555', lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 16 },
  aboutRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12
  },
  aboutLabel: { fontSize: 14, color: '#555' },
  aboutValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' }
});
