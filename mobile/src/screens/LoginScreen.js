import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { createClient } from '@supabase/supabase-js';
import { getGmailAuthUrl, completeGmailOAuth, saveJwt, setGmailLinked, isGmailLinked } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('supabase'); // 'supabase' | 'gmail'

  // 啟動時檢查是否已登入
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await saveJwt(session.access_token);
        const linked = await isGmailLinked();
        if (linked) {
          navigation.replace('EmailList');
        } else {
          setStep('gmail');
        }
      }
    })();
  }, [navigation]);

  // Step 1：Supabase Email/Password 登入（或匿名登入用於 Demo）
  async function handleSupabaseLogin() {
    setLoading(true);
    try {
      // 示範用：匿名登入。正式版請換成 Email OTP 或 Magic Link
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      await saveJwt(data.session.access_token);
      setStep('gmail');
    } catch (err) {
      Alert.alert('登入失敗', err.message || '請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  // Step 2：Gmail OAuth 授權
  async function handleGmailAuth() {
    setLoading(true);
    try {
      const authUrl = await getGmailAuthUrl();
      const redirectUrl = Linking.createURL('/auth/callback');

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type !== 'success') {
        setLoading(false);
        return;
      }

      // 從 URL 取出 code
      const parsed = Linking.parse(result.url);
      const code = parsed.queryParams?.code;
      if (!code) throw new Error('未取得授權碼，請再試一次');

      // 取得目前 session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('登入狀態遺失，請重新登入');

      await completeGmailOAuth(code, session.access_token);
      await setGmailLinked(true);
      navigation.replace('EmailList');
    } catch (err) {
      Alert.alert('Gmail 授權失敗', err.message || '請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Text style={styles.logo}>📧</Text>
        <Text style={styles.title}>郵件 AI 助手</Text>
        <Text style={styles.subtitle}>智慧整理，一目了然</Text>
      </View>

      {step === 'supabase' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>開始使用</Text>
          <Text style={styles.cardDesc}>
            點擊下方按鈕建立個人帳號（免費，無需信用卡）
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSupabaseLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>建立帳號 / 登入</Text>}
          </TouchableOpacity>
        </View>
      )}

      {step === 'gmail' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>連結 Gmail</Text>
          <Text style={styles.cardDesc}>
            授權讀取您的 Gmail，僅讀取郵件內容，不會傳送或刪除任何郵件。
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.gmailBtn]}
            onPress={handleGmailAuth}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>🔑  授權 Gmail</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.privacy}>
        本應用僅在您主動操作時才處理郵件資料，翻譯功能需個別確認才傳送至外部服務。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', padding: 24
  },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 64 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginTop: 12 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 6 },
  card: {
    width: '100%', backgroundColor: '#fff',
    borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 12, elevation: 4, marginBottom: 20
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  cardDesc: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 20 },
  primaryBtn: {
    backgroundColor: '#1a73e8', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center'
  },
  gmailBtn: { backgroundColor: '#db4437' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  privacy: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 }
});
