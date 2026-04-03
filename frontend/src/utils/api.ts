import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

let _token: string | null = null;

async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    }
    return await SecureStore.getItemAsync('auth_token');
  } catch {
    return null;
  }
}

async function storeToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('auth_token', token);
    } else {
      await SecureStore.setItemAsync('auth_token', token);
    }
  } catch {}
}

async function removeStoredToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('auth_token');
    } else {
      await SecureStore.deleteItemAsync('auth_token');
    }
  } catch {}
}

export async function loadToken(): Promise<string | null> {
  _token = await getStoredToken();
  return _token;
}

export async function saveToken(token: string): Promise<void> {
  _token = token;
  await storeToken(token);
}

export async function clearToken(): Promise<void> {
  _token = null;
  await removeStoredToken();
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }
  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Blad serwera' }));
    const detail = err.detail;
    let msg: string;
    if (typeof detail === 'string') msg = detail;
    else if (Array.isArray(detail)) msg = detail.map((e: any) => e.msg || JSON.stringify(e)).join(' ');
    else msg = String(detail ?? 'Blad serwera');
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
