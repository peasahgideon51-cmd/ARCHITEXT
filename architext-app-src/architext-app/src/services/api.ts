import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Room {
  label: string;
  room_type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Plan {
  title: string;
  template: string;
  rooms: Room[];
  svg: string;
  explanation: string[];
  canvas: { w: number; h: number };
}

export interface GenerateResponse {
  ok: boolean;
  plan: Plan;
  error?: string;
}

const DEFAULT_BASE = 'http://127.0.0.1:8080';

async function getApiBase(): Promise<string> {
  const stored = await AsyncStorage.getItem('architext_api');
  return stored || DEFAULT_BASE;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await AsyncStorage.getItem('architext_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function generateLayout(text: string, units = 'imperial'): Promise<GenerateResponse> {
  const base = await getApiBase();
  const headers = await authHeaders();
  const res = await fetch(`${base}/api/layout/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, units }),
  });
  return res.json();
}
