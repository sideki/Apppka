import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

interface Question {
  id: string;
  text: string;
  category: string;
  order: number;
  active: boolean;
}

const CATEGORIES = [
  { key: 'daily', label: 'Codzienne' },
  { key: 'saturday', label: 'Sobotnie' },
  { key: 'first_saturday', label: 'I Sobota' },
];

export default function QuestionsScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState('daily');
  const [formOrder, setFormOrder] = useState('0');
  const [saving, setSaving] = useState(false);

  const loadQuestions = useCallback(async () => {
    try {
      const data = await apiFetch('/questions/all');
      setQuestions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const openAdd = () => {
    setEditQuestion(null);
    setFormText('');
    setFormCategory('daily');
    setFormOrder(String((questions.length || 0) + 1));
    setModalVisible(true);
  };

  const openEdit = (q: Question) => {
    setEditQuestion(q);
    setFormText(q.text);
    setFormCategory(q.category);
    setFormOrder(String(q.order));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formText.trim()) {
      Alert.alert('Blad', 'Wpisz tresc pytania');
      return;
    }
    setSaving(true);
    try {
      if (editQuestion) {
        await apiFetch(`/questions/${editQuestion.id}`, {
          method: 'PUT',
          body: JSON.stringify({ text: formText, category: formCategory, order: parseInt(formOrder) || 0 }),
        });
      } else {
        await apiFetch('/questions', {
          method: 'POST',
          body: JSON.stringify({ text: formText, category: formCategory, order: parseInt(formOrder) || 0 }),
        });
      }
      setModalVisible(false);
      await loadQuestions();
    } catch (e: any) {
      Alert.alert('Blad', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (q: Question) => {
    Alert.alert('Usun pytanie', `"${q.text}"`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usun', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/questions/${q.id}`, { method: 'DELETE' });
          await loadQuestions();
        } catch (e: any) {
          Alert.alert('Blad', e.message);
        }
      }},
    ]);
  };

  const toggleActive = async (q: Question) => {
    try {
      await apiFetch(`/questions/${q.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !q.active }),
      });
      await loadQuestions();
    } catch (e: any) {
      Alert.alert('Blad', e.message);
    }
  };

  const getCatLabel = (c: string) => CATEGORIES.find(x => x.key === c)?.label || c;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color="#FFC300" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>PYTANIA</Text>
          <Text style={styles.subtitle}>{questions.length} pytan</Text>
        </View>
        <TouchableOpacity testID="add-question-btn" style={styles.addButton} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color="#0A192F" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={questions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.active && styles.cardInactive]} testID={`question-item-${item.id}`}>
            <View style={styles.cardTop}>
              <View style={styles.catBadge}>
                <Text style={styles.catText}>{getCatLabel(item.category).toUpperCase()}</Text>
              </View>
              <Text style={styles.orderText}>#{item.order}</Text>
            </View>
            <Text style={[styles.questionText, !item.active && styles.textInactive]}>{item.text}</Text>
            <View style={styles.actions}>
              <TouchableOpacity testID={`toggle-q-${item.id}`} onPress={() => toggleActive(item)} style={styles.actionBtn}>
                <Ionicons name={item.active ? 'eye' : 'eye-off'} size={18} color={item.active ? '#10B981' : '#EF4444'} />
              </TouchableOpacity>
              <TouchableOpacity testID={`edit-q-${item.id}`} onPress={() => openEdit(item)} style={styles.actionBtn}>
                <Ionicons name="pencil" size={18} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity testID={`delete-q-${item.id}`} onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Ionicons name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Brak pytan</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKAV}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editQuestion ? 'EDYTUJ PYTANIE' : 'NOWE PYTANIE'}</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>TRESC PYTANIA</Text>
                <TextInput
                  testID="question-text-input"
                  style={styles.textArea}
                  multiline
                  value={formText}
                  onChangeText={setFormText}
                  placeholder="Wpisz tresc pytania..."
                  placeholderTextColor="rgba(71,85,105,0.4)"
                  textAlignVertical="top"
                />

                <Text style={styles.label}>KATEGORIA</Text>
                <View style={styles.categoryRow}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.key}
                      testID={`cat-btn-${cat.key}`}
                      style={[styles.categoryBtn, formCategory === cat.key && styles.categoryBtnActive]}
                      onPress={() => setFormCategory(cat.key)}
                    >
                      <Text style={[styles.categoryBtnText, formCategory === cat.key && styles.categoryBtnTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>KOLEJNOSC</Text>
                <TextInput
                  testID="question-order-input"
                  style={styles.input}
                  value={formOrder}
                  onChangeText={setFormOrder}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="rgba(71,85,105,0.4)"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity testID="cancel-question-btn" style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>ANULUJ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="save-question-btn" style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#0A192F" /> : <Text style={styles.saveBtnText}>ZAPISZ</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#0A192F', letterSpacing: 2 },
  subtitle: { fontSize: 13, color: '#475569', marginTop: 4 },
  addButton: { width: 48, height: 48, backgroundColor: '#FFC300', justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  card: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.08)', padding: 16, marginBottom: 10 },
  cardInactive: { opacity: 0.45 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { backgroundColor: '#0A192F', paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 9, fontWeight: '700', color: '#FFC300', letterSpacing: 1.5 },
  orderText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  questionText: { fontSize: 15, fontWeight: '500', color: '#0A192F', marginBottom: 12, lineHeight: 22 },
  textInactive: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10,25,47,0.04)' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#475569' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,25,47,0.6)', justifyContent: 'flex-end' },
  modalKAV: { justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(10,25,47,0.15)', alignSelf: 'center', marginBottom: 20, borderRadius: 2 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0A192F', letterSpacing: 2, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', color: '#0A192F', letterSpacing: 2, marginBottom: 8, marginTop: 20 },
  textArea: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.15)', minHeight: 80, padding: 16, fontSize: 15, color: '#0A192F' },
  input: { height: 48, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.15)', paddingHorizontal: 16, fontSize: 15, color: '#0A192F' },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryBtn: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(10,25,47,0.15)' },
  categoryBtnActive: { backgroundColor: '#0A192F', borderColor: '#0A192F' },
  categoryBtnText: { fontSize: 10, fontWeight: '700', color: '#475569', letterSpacing: 0.5 },
  categoryBtnTextActive: { color: '#FFC300' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelBtn: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(10,25,47,0.15)' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#475569', letterSpacing: 1 },
  saveBtn: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFC300' },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: '#0A192F', letterSpacing: 1 },
});
