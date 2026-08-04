import AsyncStorage from "@react-native-async-storage/async-storage";

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
  adjacencies: [string, string][];
  svg: string;
  explanation: string[];
  canvas: { w: number; h: number };
}

export interface GenerateResponse {
  ok: boolean;
  plan: Plan;
  error?: string;
}

const DEFAULT_BASE = "https://architext-backend-3hdd.onrender.com";

async function authHeaders(): Promise<HeadersInit> {
  const token = await AsyncStorage.getItem("architext_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// TEMPORARY DEMO-DAY WORKAROUND — bypasses Spring Boot for this call only,
// due to an unresolved 502/empty-response issue on the hosted backend.
// Revert to the Spring Boot proxy version after the defense once root-caused.
const FLASK_DIRECT_BASE = "https://architext-flask.onrender.com";
const FLASK_INTERNAL_KEY = "OzLDFWTyH6whIwE6F/DLbvnQYfUYozV8w52YEcGhjRQ=";

export async function generateLayout(
  text: string,
  units = "imperial",
): Promise<GenerateResponse> {
  const res = await fetch(`${FLASK_DIRECT_BASE}/api/layout/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": FLASK_INTERNAL_KEY,
    },
    body: JSON.stringify({ text, units }),
  });
  return res.json();
}
