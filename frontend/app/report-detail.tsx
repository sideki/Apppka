import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

interface Answer {
  question_id: string;
  question_text: string;
  answer: string;
}

interface Report {
  id: string;
  date: string;
  user_name: string;
  answers: Answer[];
  status: string;
  created_at: string;
  closed_at: string | null;
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (id) loadReport();
  }, [id]);

  async function loadReport() {
    try {
      const data = await apiFetch(`/reports/${id}`);
      setReport(data);
    } catch (e: any) {
      Alert.alert('Blad', e.message);
    } finally {
      setLoading(false);
    }
  }

  function generateHTML(r: Report): string {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #0A192F; max-width: 600px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 800; letter-spacing: 3px; border-bottom: 3px solid #FFC300; padding-bottom: 12px; margin-bottom: 6px; }
  .date { font-size: 14px; color: #475569; margin-bottom: 28px; }
  .qa { margin-bottom: 18px; padding: 14px; background: #F8F9FA; }
  .q { font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; color: #0A192F; }
  .a { font-size: 14px; color: #475569; line-height: 1.5; margin-top: 6px; }
  .alabel { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #475569; margin-top: 8px; }
</style></head><body>
  <h1>RAPORT PRACY</h1>
  <p class="date">Data: ${r.date}</p>
  ${r.answers.map((a, i) => `
    <div class="qa">
      <p class="q">PYTANIE ${i + 1}: ${a.question_text}</p>
      <p class="alabel">ODPOWIEDZ ${i + 1}:</p>
      <p class="a">${a.answer}</p>
    </div>
  `).join('')}
</body></html>`;
  }

  async function handleShare() {
    if (!report) return;
    setSharing(true);
    try {
      const html = generateHTML(report);
      if (Platform.OS === 'web') {
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(html);
          w.document.close();
          setTimeout(() => w.print(), 300);
        }
      } else {
        const Print = require('expo-print');
        const Sharing = require('expo-sharing');
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Raport ${report.date}` });
      }
    } catch (e: any) {
      Alert.alert('Blad', 'Nie udalo sie wygenerowac PDF');
    } finally {
      setSharing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color="#FFC300" /></View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#475569" />
          <Text style={styles.errorText}>Nie znaleziono raportu</Text>
          <TouchableOpacity testID="go-back-btn" style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Wroc</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0A192F" />
          <Text style={styles.backBtnText}>POWROT</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="share-report-btn" onPress={handleShare} style={styles.shareBtn} activeOpacity={0.7} disabled={sharing}>
          {sharing ? (
            <ActivityIndicator size="small" color="#0A192F" />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color="#0A192F" />
              <Text style={styles.shareBtnText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <View style={[styles.badge, report.status === 'open' ? styles.badgeOpen : styles.badgeClosed]}>
            <Text style={[styles.badgeText, report.status === 'open' ? styles.badgeTextOpen : styles.badgeTextClosed]}>
              {report.status === 'open' ? 'OTWARTY' : 'ZAMKNIETY'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>RAPORT PRACY</Text>
        <Text style={styles.date}>Data: {report.date}</Text>
        {report.user_name ? <Text style={styles.userName}>{report.user_name}</Text> : null}

        {report.answers.map((a, i) => (
          <View key={i} style={styles.qaCard} testID={`detail-answer-${i}`}>
            <Text style={styles.qLabel}>PYTANIE {i + 1}</Text>
            <Text style={styles.qText}>{a.question_text}</Text>
            <View style={styles.qaDivider} />
            <Text style={styles.aLabel}>ODPOWIEDZ {i + 1}</Text>
            <Text style={styles.aText}>{a.answer}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#475569', marginTop: 12 },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 14, fontWeight: '700', color: '#FFC300', letterSpacing: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(10,25,47,0.08)' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { fontSize: 12, fontWeight: '700', color: '#0A192F', letterSpacing: 1 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFC300', paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  shareBtnText: { fontSize: 12, fontWeight: '800', color: '#0A192F', letterSpacing: 1 },
  content: { padding: 24, paddingBottom: 40 },
  statusRow: { marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeOpen: { backgroundColor: 'rgba(245,158,11,0.12)' },
  badgeClosed: { backgroundColor: 'rgba(16,185,129,0.12)' },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  badgeTextOpen: { color: '#F59E0B' },
  badgeTextClosed: { color: '#10B981' },
  title: { fontSize: 26, fontWeight: '800', color: '#0A192F', letterSpacing: 2 },
  date: { fontSize: 14, color: '#475569', marginTop: 4, letterSpacing: 1 },
  userName: { fontSize: 14, color: '#475569', marginTop: 4 },
  qaCard: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.08)', padding: 20, marginTop: 16 },
  qLabel: { fontSize: 10, fontWeight: '700', color: '#FFC300', letterSpacing: 2, marginBottom: 4 },
  qText: { fontSize: 15, fontWeight: '600', color: '#0A192F', lineHeight: 22 },
  qaDivider: { height: 1, backgroundColor: 'rgba(10,25,47,0.08)', marginVertical: 12 },
  aLabel: { fontSize: 10, fontWeight: '700', color: '#475569', letterSpacing: 2, marginBottom: 4 },
  aText: { fontSize: 15, color: '#0A192F', lineHeight: 22 },
});
