import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user]);

  useEffect(() => {
    if (Platform.OS !== 'web' && user) {
      setupNotifications();
    }
  }, [user]);

  async function setupNotifications() {
    try {
      const Notifications = require('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      const { apiFetch } = require('../../src/utils/api');
      const settings = await apiFetch('/settings');
      const [hours, minutes] = (settings.notification_time || '08:00').split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Raport Pracy', body: settings.notification_text || 'Czas na raport!' },
        trigger: { hour: hours, minute: minutes, repeats: true },
      });
    } catch (e) {
      console.log('Notification setup skipped:', e);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FFC300" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#FFC300',
      tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
      tabBarStyle: {
        backgroundColor: '#0A192F',
        borderTopWidth: 0,
        height: 72,
        paddingBottom: 12,
        paddingTop: 8,
        elevation: 0,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
      },
    }}>
      <Tabs.Screen name="report" options={{
        title: 'Raport',
        href: isAdmin ? null : undefined,
        tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
      }} />
      <Tabs.Screen name="history" options={{
        title: isAdmin ? 'Raporty' : 'Historia',
        tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
      }} />
      <Tabs.Screen name="questions" options={{
        title: 'Pytania',
        href: isAdmin ? undefined : null,
        tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
      }} />
      <Tabs.Screen name="settings" options={{
        title: 'Ustawienia',
        href: isAdmin ? undefined : null,
        tabBarIcon: ({ color, size }) => <Ionicons name="settings-sharp" size={size} color={color} />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
});
