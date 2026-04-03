import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../../src/utils/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface Question {
  id: string;
  text: string;
  category: string;
  order: number;
}

interface Answer {
  question_id: string;
  question_text: string;
  answer: string;
}

interface Report {
  id: string;
  date: string;
  answers: Answer[];
  status: string;
}

export default function ReportScreen() {
  const { logout } = useAuth();
  const [openReport, setOpenReport] = useState<Report | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [open, allQuestions] = await Promise.all([
        apiFetch('/reports/open'),
        apiFetch('/questions'),
      ]);
      setOpenReport(open);
      if (!open && allQuestions) {
        const today = new Date();
        const isSaturday = today.getDay() === 6;
        const isFirstSaturday = isSaturday && today.getDate() <= 7;
        const filtered = allQuestions.filter((q: Question) => {
          if (q.category === 'daily') return true;
          if (q.category === 'saturday' && isSaturday) return true;
          if (q.category === 'first_saturday' && isFirstSaturday) return true;
          return false;
        });
        setQuestions(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      Alert.alert('Uwaga', 'Odpowiedz na wszystkie pytania');
      return;
    }
    setSubmitting(true);
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const date = `${dd}/${mm}/${yyyy}`;
      const answerItems = questions.map(q => ({
        question_id: q.id,
        question_text: q.text,
        answer: answers[q.id],
      }));
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({ answers: answerItems, date }),
      });
      setAnswers({});
      await loadData();
    } catch (e: any) {
      Alert.alert('Blad', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!openReport) return;
    Alert.alert('Zamknij raport', 'Czy na pewno chcesz zamknac raport?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Zamknij', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/reports/${openReport.id}/close`, { method: 'POST' });
          await loadData();
        } catch (e: any) {
          Alert.alert('Blad', e.message);
        }
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Wyloguj', 'Czy na pewno?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color="#FFC300" /></View>
      </SafeAreaView>
    );
  }

  if (openReport) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#FFC300" />}
        >
          <View style={styles.topRow}>
            <View />
            <TouchableOpacity testID="logout-btn-report" onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#475569" />
            </TouchableOpacity>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>OTWARTY</Text>
          </View>
          <Text style={styles.title}>RAPORT PRACY</Text>
          <Text style={styles.dateText}>Data: {openReport.date}</Text>

          {openReport.answers.map((a, i) => (
            <View key={i} style={styles.answerCard} testID={`open-report-answer-${i}`}>
              <Text style={styles.qLabel}>PYTANIE {i + 1}</Text>
              <Text style={styles.qText}>{a.question_text}</Text>
              <View style={styles.divider} />
              <Text style={styles.aLabel}>ODPOWIEDZ</Text>
              <Text style={styles.aText}>{a.answer}</Text>
            </View>
          ))}

          <TouchableOpacity testID="close-report-btn" style={styles.closeButton} onPress={handleClose} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color="#0A192F" />
            <Text style={styles.closeButtonText}>ZAMKNIJ RAPORT</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#FFC300" />}
        >
          <View style={styles.topRow}>
            <View />
            <TouchableOpacity testID="logout-btn-report-form" onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#475569" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>NOWY RAPORT</Text>
          <Text style={styles.dateText}>
            {(() => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })()}
          </Text>

          {questions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>Brak pytan na dzis</Text>
              <Text style={styles.emptySubtext}>Skontaktuj sie z administratorem</Text>
            </View>
          ) : (
            <>
              {questions.map((q, i) => (
                <View key={q.id} style={styles.questionCard}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>
                      {q.category === 'daily' ? 'CODZIENNE' : q.category === 'saturday' ? 'SOBOTA' : 'I SOBOTA MIESIACA'}
                    </Text>
                  </View>
                  <Text style={styles.formQuestion}>{q.text}</Text>
                  <TextInput
                    testID={`answer-input-${i}`}
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="Wpisz odpowiedz..."
                    placeholderTextColor="rgba(71,85,105,0.4)"
                    value={answers[q.id] || ''}
                    onChangeText={(text) => setAnswers(prev => ({ ...prev, [q.id]: text }))}
                    textAlignVertical="top"
                  />
                </View>
              ))}
              <TouchableOpacity testID="submit-report-btn" style={styles.submitButton} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
                {submitting ? <ActivityIndicator color="#0A192F" /> : <Text style={styles.submitButtonText}>ZAPISZ RAPORT</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#0A192F', letterSpacing: 2 },
  dateText: { fontSize: 14, color: '#475569', marginTop: 4, letterSpacing: 1, marginBottom: 28 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginRight: 8 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#F59E0B', letterSpacing: 2 },
  answerCard: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.08)', padding: 20, marginBottom: 12 },
  qLabel: { fontSize: 10, fontWeight: '700', color: '#FFC300', letterSpacing: 2, marginBottom: 4 },
  qText: { fontSize: 15, fontWeight: '600', color: '#0A192F', lineHeight: 22 },
  divider: { height: 1, backgroundColor: 'rgba(10,25,47,0.08)', marginVertical: 12 },
  aLabel: { fontSize: 10, fontWeight: '700', color: '#475569', letterSpacing: 2, marginBottom: 4 },
  aText: { fontSize: 15, color: '#0A192F', lineHeight: 22 },
  closeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFC300', height: 56, marginTop: 20, gap: 8 },
  closeButtonText: { fontSize: 14, fontWeight: '800', color: '#0A192F', letterSpacing: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#0A192F', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#475569', marginTop: 4 },
  questionCard: { marginBottom: 24 },
  categoryBadge: { backgroundColor: '#0A192F', paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  categoryText: { fontSize: 9, fontWeight: '700', color: '#FFC300', letterSpacing: 1.5 },
  formQuestion: { fontSize: 16, fontWeight: '600', color: '#0A192F', marginBottom: 12, lineHeight: 24 },
  textArea: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.15)', minHeight: 100, padding: 16, fontSize: 15, color: '#0A192F', lineHeight: 22 },
  submitButton: { backgroundColor: '#FFC300', height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitButtonText: { fontSize: 14, fontWeight: '800', color: '#0A192F', letterSpacing: 2 },
});
