import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../../src/utils/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  const [time, setTime] = useState('08:00');
  const [notifText, setNotifText] = useState('');
  const [closeText, setCloseText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const data = await apiFetch('/settings');
      setTime(data.notification_time || '08:00');
      setNotifText(data.notification_text || '');
      setCloseText(data.close_reminder_text || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          notification_time: time,
          notification_text: notifText,
          close_reminder_text: closeText,
        }),
      });
      Alert.alert('Sukces', 'Ustawienia zapisane');
    } catch (e: any) {
      Alert.alert('Blad', e.message);
    } finally {
      setSaving(false);
    }
  }

  const handleLogout = () => {
    Alert.alert('Wyloguj', 'Czy na pewno chcesz sie wylogowac?', [
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>USTAWIENIA</Text>
          <Text style={styles.subtitle}>Konfiguracja powiadomien</Text>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications" size={18} color="#FFC300" />
              <Text style={styles.sectionTitle}>POWIADOMIENIA</Text>
            </View>

            <Text style={styles.label}>GODZINA (HH:MM)</Text>
            <TextInput
              testID="notification-time-input"
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="08:00"
              placeholderTextColor="rgba(71,85,105,0.4)"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.label}>TRESC POWIADOMIENIA</Text>
            <TextInput
              testID="notification-text-input"
              style={styles.textArea}
              value={notifText}
              onChangeText={setNotifText}
              placeholder="Tresc powiadomienia..."
              placeholderTextColor="rgba(71,85,105,0.4)"
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>PRZYPOMNIENIE O ZAMKNIECIU</Text>
            <TextInput
              testID="close-reminder-input"
              style={styles.textArea}
              value={closeText}
              onChangeText={setCloseText}
              placeholder="Tresc przypomnienia..."
              placeholderTextColor="rgba(71,85,105,0.4)"
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity testID="save-settings-btn" style={styles.saveButton} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            {saving ? <ActivityIndicator color="#0A192F" /> : <Text style={styles.saveButtonText}>ZAPISZ USTAWIENIA</Text>}
          </TouchableOpacity>

          <View style={styles.accountSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={18} color="#475569" />
              <Text style={styles.sectionTitle}>KONTO</Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{user?.name}</Text>
              <Text style={styles.accountEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity testID="logout-btn" style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutText}>WYLOGUJ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#0A192F', letterSpacing: 2 },
  subtitle: { fontSize: 13, color: '#475569', marginTop: 4, marginBottom: 32 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#0A192F', letterSpacing: 2 },
  label: { fontSize: 11, fontWeight: '700', color: '#0A192F', letterSpacing: 2, marginBottom: 8, marginTop: 18 },
  input: { height: 48, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.15)', paddingHorizontal: 16, fontSize: 15, color: '#0A192F' },
  textArea: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.15)', minHeight: 72, padding: 16, fontSize: 15, color: '#0A192F' },
  saveButton: { backgroundColor: '#FFC300', height: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  saveButtonText: { fontSize: 14, fontWeight: '800', color: '#0A192F', letterSpacing: 2 },
  accountSection: { borderTopWidth: 1, borderTopColor: 'rgba(10,25,47,0.08)', paddingTop: 24 },
  accountInfo: { backgroundColor: '#F8F9FA', padding: 16, marginBottom: 16 },
  accountName: { fontSize: 16, fontWeight: '600', color: '#0A192F' },
  accountEmail: { fontSize: 14, color: '#475569', marginTop: 4 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', gap: 8 },
  logoutText: { fontSize: 13, fontWeight: '700', color: '#EF4444', letterSpacing: 1 },
});
