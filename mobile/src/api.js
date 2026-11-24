// Talks to the NNC CRM Node.js backend (same API the web admin panel uses).
import AsyncStorage from "@react-native-async-storage/async-storage";

const K_SERVER = "nnc_server_v2"; // v2: default moved to the live Vercel backend
const K_TOKEN = "nnc_token";

// Default: the live backend on Vercel. Change it on the login screen (Server settings),
// e.g. http://<your-PC-IP>:5000/api to use a backend running on your computer.
export const DEFAULT_SERVER = process.env.EXPO_PUBLIC_API_URL || "https://backendnnccrm.vercel.app/api";

let server = DEFAULT_SERVER;
let token = null;

export async function loadSaved() {
  const [[, s], [, t]] = await AsyncStorage.multiGet([K_SERVER, K_TOKEN]);
  server = s || DEFAULT_SERVER;
  token = t || null;
  return { server, token };
}
export const getServer = () => server;
export async function setServer(url) {
  server = url.trim().replace(/\/+$/, "");
  if (!/\/api$/.test(server)) server += "/api";
  await AsyncStorage.setItem(K_SERVER, server);
  return server;
}
export async function setToken(t) {
  token = t;
  if (t) await AsyncStorage.setItem(K_TOKEN, t);
  else await AsyncStorage.removeItem(K_TOKEN);
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function api(path, { method = "GET", body } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res;
  try {
    res = await fetch(server + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your internet and the server address.", 0);
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}
