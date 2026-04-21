import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getEmails, syncEmails } from '../services/api';
import EmailCard from '../components/EmailCard';

export default function EmailListScreen({ navigation }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchEmails = useCallback(async (kw = '', pg = 1, append = false) => {
    setLoading(true);
    try {
      const result = await getEmails({ keyword: kw, page: pg, pageSize: 25 });
      setEmails((prev) => append ? [...prev, ...result.emails] : result.emails);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setPage(pg);
    } catch (err) {
      Alert.alert('載入失敗', err.response?.data?.error || '請稍後再試');
    } finally {
      setLoading(false);
    }
  }, []);

  // 每次進入畫面刷新
  useFocusEffect(
    useCallback(() => {
      fetchEmails(keyword, 1, false);
    }, [fetchEmails])
  );

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await syncEmails(4);
      Alert.alert('同步完成', `已同步 ${result.synced} 封郵件`);
      fetchEmails(keyword, 1, false);
    } catch (err) {
      Alert.alert('同步失敗', err.response?.data?.error || '請稍後再試');
    } finally {
      setSyncing(false);
    }
  }

  function handleSearch(text) {
    setKeyword(text);
    fetchEmails(text, 1, false);
  }

  function handleLoadMore() {
    if (!hasMore || loading) return;
    fetchEmails(keyword, page + 1, true);
  }

  return (
    <View style={styles.container}>
      {/* 搜尋列 */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜尋關鍵字…"
          value={keyword}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.syncBtnText}>同步</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rulesBtn}
          onPress={() => navigation.navigate('Rules')}
        >
          <Text style={styles.rulesBtnText}>規則</Text>
        </TouchableOpacity>
      </View>

      {/* 郵件總數 */}
      <Text style={styles.countText}>共 {total} 封</Text>

      {/* 列表 */}
      <FlatList
        data={emails}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EmailCard
            email={item}
            onPress={() => navigation.navigate('EmailDetail', { emailId: item.id })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={loading && page === 1}
            onRefresh={() => fetchEmails(keyword, 1, false)}
            tintColor="#1a73e8"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading && page > 1
            ? <ActivityIndicator style={{ margin: 16 }} color="#1a73e8" />
            : null
        }
        ListEmptyComponent={
          !loading
            ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>
                  {keyword ? '找不到符合的郵件' : '尚無郵件，請點「同步」載入'}
                </Text>
              </View>
            )
            : null
        }
      />

      {/* 設定按鈕 */}
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.settingsBtnText}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0'
  },
  searchInput: {
    flex: 1, height: 38, backgroundColor: '#f0f0f0',
    borderRadius: 8, paddingHorizontal: 12, fontSize: 14, marginRight: 8
  },
  syncBtn: {
    backgroundColor: '#1a73e8', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 6
  },
  syncBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rulesBtn: {
    backgroundColor: '#0f9d58', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8
  },
  rulesBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  countText: { fontSize: 12, color: '#999', paddingHorizontal: 16, paddingVertical: 6 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12, textAlign: 'center' },
  settingsBtn: {
    position: 'absolute', bottom: 24, right: 24,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 6
  },
  settingsBtnText: { fontSize: 22 }
});
