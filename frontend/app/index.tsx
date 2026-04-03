import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const route = user.role === 'admin' ? '/(tabs)/questions' : '/(tabs)/report';
      router.replace(route as any);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingInner}>
          <View style={styles.loadingLogo}>
            <Text style={styles.loadingLogoText}>RP</Text>
          </View>
          <ActivityIndicator size="large" color="#FFC300" style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  if (user) return null;

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Wypelnij wszystkie pola');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Blad logowania');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>RP</Text>
              </View>
              <Text style={styles.title}>RAPORT{'\n'}PRACY</Text>
              <Text style={styles.subtitle}>System raportowania dziennego</Text>
            </View>
          </SafeAreaView>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.formWrapper}
        >
          <View style={styles.form}>
            <Text style={styles.formTitle}>ZALOGUJ SIE</Text>

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              testID="login-email-input"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Wpisz email"
              placeholderTextColor="rgba(71,85,105,0.5)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>HASLO</Text>
            <View style={styles.passwordRow}>
              <TextInput
                testID="login-password-input"
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Wpisz haslo"
                placeholderTextColor="rgba(71,85,105,0.5)"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                testID="toggle-password-btn"
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              testID="login-submit-button"
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#0A192F" />
              ) : (
                <Text style={styles.buttonText}>ZALOGUJ</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, backgroundColor: '#0A192F', justifyContent: 'center', alignItems: 'center' },
  loadingInner: { alignItems: 'center' },
  loadingLogo: { width: 72, height: 72, backgroundColor: '#FFC300', justifyContent: 'center', alignItems: 'center' },
  loadingLogoText: { fontSize: 28, fontWeight: '900', color: '#0A192F', letterSpacing: 2 },
  header: { backgroundColor: '#0A192F', paddingBottom: 48 },
  headerContent: { paddingHorizontal: 28, paddingTop: 24 },
  logoBox: { width: 52, height: 52, backgroundColor: '#FFC300', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  logoText: { fontSize: 18, fontWeight: '900', color: '#0A192F', letterSpacing: 1 },
  title: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: 3, lineHeight: 42 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  formWrapper: { flex: 1 },
  form: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  formTitle: { fontSize: 13, fontWeight: '700', color: '#475569', letterSpacing: 3, marginBottom: 28 },
  label: { fontSize: 11, fontWeight: '700', color: '#0A192F', letterSpacing: 2, marginBottom: 8, marginTop: 20 },
  input: { height: 56, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.15)', paddingHorizontal: 16, fontSize: 16, color: '#0A192F' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(10,25,47,0.15)', height: 56 },
  passwordInput: { flex: 1, paddingHorizontal: 16, fontSize: 16, color: '#0A192F', height: '100%' },
  eyeBtn: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
  errorText: { color: '#EF4444', fontSize: 14, flex: 1 },
  button: { height: 56, backgroundColor: '#FFC300', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 15, fontWeight: '800', color: '#0A192F', letterSpacing: 3 },
});
