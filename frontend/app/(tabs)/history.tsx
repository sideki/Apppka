import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiFetch } from '../../src/utils/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface Report {
  id: string;
  date: string;
  user_name: string;
  status: string;
  answers: any[];
  created_at: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await apiFetch('/reports');
      setReports(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleLogout = () => {
    Alert.alert('Wyloguj', 'Czy na pewno?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj', onPress: logout },
    ]);
  };

  const renderReport = ({ item }: { item: Report }) => (
    <TouchableOpacity
      testID={`report-item-${item.id}`}
      style={styles.card}
      onPress={() => router.push({ pathname: '/report-detail', params: { id: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{item.date}</Text>
        <View style={[styles.badge, item.status === 'open' ? styles.badgeOpen : styles.badgeClosed]}>
          <Text style={[styles.badgeText, item.status === 'open' ? styles.badgeTextOpen : styles.badgeTextClosed]}>
            {item.status === 'open' ? 'OTWARTY' : 'ZAMKNIETY'}
          </Text>
        </View>
      </View>
      {user?.role === 'admin' && item.user_name ? <Text style={styles.userName}>{item.user_name}</Text> : null}
      <View style={styles.cardFooter}>
        <Text style={styles.answerCount}>{item.answers?.length || 0} odpowiedzi</Text>
        <Ionicons name="chevron-forward" size={18} color="#475569" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color="#FFC300" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.title}>{user?.role === 'admin' ? 'WSZYSTKIE RAPORTY' : 'HISTORIA'}</Text>
          <Text style={styles.subtitle}>{reports.length} {reports.length === 1 ? 'raport' : 'raportow'}</Text>
        </View>
        {user?.role !== 'admin' && (
          <TouchableOpacity testID="logout-btn-history" onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#475569" />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} tintColor="#FFC300" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="rgba(10,25,47,0.2)" />
            <Text style={styles.emptyText}>Brak raportow</Text>
            <Text style={styles.emptySubtext}>Raporty pojawia sie tutaj</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#0A192F', letterSpacing: 2 },
  subtitle: { fontSize: 13, color: '#475569', marginTop: 4, letterSpacing: 0.5 },
  logoutBtn: { paddingTop: 4 },
  list: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  card: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.08)', padding: 20, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { fontSize: 18, fontWeight: '700', color: '#0A192F', letterSpacing: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3 },
  badgeOpen: { backgroundColor: 'rgba(245,158,11,0.12)' },
  badgeClosed: { backgroundColor: 'rgba(16,185,129,0.12)' },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  badgeTextOpen: { color: '#F59E0B' },
  badgeTextClosed: { color: '#10B981' },
  userName: { fontSize: 13, color: '#475569', marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  answerCount: { fontSize: 13, color: '#475569' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#0A192F', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#475569', marginTop: 4 },
});
