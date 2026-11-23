// Central data store. Everything lives in localStorage for this UI demo —
// later each `add/update/remove` call maps 1:1 to a REST endpoint.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildSeed } from "../data/seed";
import { applyWorkspace, defaultWorkspace } from "../config/workspace";
import { uid } from "../utils/format";

const DB_KEY = "nexora_db_v3";
const SESSION_KEY = "nexora_session";
const THEME_KEY = "nexora_theme";

const StoreCtx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      // Fill any collection added in a newer version from fresh demo data
      const saved = JSON.parse(raw);
      const industry = saved.settings?.workspace?.industry || "general";
      const fresh = buildSeed(industry);
      const db = { ...fresh, ...saved, settings: { ...fresh.settings, ...saved.settings } };
      // Product renamed Nexora → NNC: move old demo logins to the new email domain
      db.users = (db.users || []).map((u) => (u.email?.endsWith("@nexora.in") ? { ...u, email: u.email.replace("@nexora.in", "@nnc.in") } : u));
      applyWorkspace(db.settings.workspace);
      return db;
    }
  } catch { /* corrupted or blocked storage → fresh demo */ }
  return buildSeed();
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(load);
  // Industry vocabulary, services, sources, stages and enabled modules — applied before children render
  applyWorkspace(db.settings.workspace || defaultWorkspace());
  const [sessionId, setSessionId] = useState(() => { try { return localStorage.getItem(SESSION_KEY); } catch { return null; } });
  const [dark, setDark] = useState(() => { try { return localStorage.getItem(THEME_KEY) === "dark"; } catch { return false; } });

  useEffect(() => { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore */ } }, [db]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  useEffect(() => { document.documentElement.dataset.accent = db.settings?.accent || "indigo"; }, [db.settings?.accent]);

  const add = useCallback((col, item, prefix) => {
    const rec = { id: uid(prefix || col.slice(0, 1).toUpperCase()), ...item };
    setDb((d) => ({ ...d, [col]: [rec, ...(d[col] || [])] }));
    return rec;
  }, []);
  const update = useCallback((col, id, patch) => {
    setDb((d) => ({ ...d, [col]: (d[col] || []).map((r) => (r.id === id ? { ...r, ...(typeof patch === "function" ? patch(r) : patch) } : r)) }));
  }, []);
  const remove = useCallback((col, id) => setDb((d) => ({ ...d, [col]: (d[col] || []).filter((r) => r.id !== id) })), []);
  const setSettings = useCallback((section, patch) => setDb((d) => ({ ...d, settings: { ...d.settings, [section]: typeof patch === "object" && !Array.isArray(patch) && d.settings[section] && typeof d.settings[section] === "object" ? { ...d.settings[section], ...patch } : patch } })), []);
  const setAttendance = useCallback((date, empId, rec) => setDb((d) => {
    const next = { ...d.attendance };
    if (rec == null) delete next[`${date}|${empId}`]; else next[`${date}|${empId}`] = rec;
    return { ...d, attendance: next };
  }), []);
  const notify = useCallback((title, text, link = "/") => {
    setDb((d) => ({ ...d, notifications: [{ id: uid("n"), title, text, link, at: new Date().toISOString(), read: false }, ...d.notifications].slice(0, 40) }));
  }, []);
  const setAppConnection = useCallback((key, val) => setDb((d) => ({ ...d, appConnections: { ...(d.appConnections || {}), [key]: val } })), []);
  const markAllRead = useCallback(() => setDb((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) })), []);
  // Regenerate sample data for an industry; keeps the chosen workspace setup (modules, plan) if given
  const resetDemo = useCallback((industry, keepWorkspace) => setDb((d) => {
    const ind = industry || d.settings.workspace?.industry || "general";
    const next = buildSeed(ind);
    if (keepWorkspace) next.settings = { ...next.settings, workspace: { ...next.settings.workspace, ...keepWorkspace, industry: ind }, company: d.settings.company, accent: d.settings.accent };
    applyWorkspace(next.settings.workspace);
    return next;
  }), []);
  const log = useCallback((action, entity, detail = "") => setDb((d) => ({ ...d, auditLog: [{ id: uid("au"), action, entity, detail, by: sessionId, at: new Date().toISOString() }, ...(d.auditLog || [])].slice(0, 500) })), [sessionId]);

  const user = db.users.find((u) => u.id === sessionId && u.active) || null;
  const login = (email, password) => {
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!u) return "Invalid email or password";
    if (!u.active) return "This account is deactivated. Contact your admin.";
    try { localStorage.setItem(SESSION_KEY, u.id); } catch { /* ignore */ }
    setSessionId(u.id);
    return null;
  };
  const logout = () => { try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } setSessionId(null); };

  const userById = useCallback((id) => db.users.find((u) => u.id === id), [db.users]);
  const empById = useCallback((id) => db.employees.find((e) => e.id === id), [db.employees]);

  const value = useMemo(() => ({
    db, add, update, remove, setSettings, setAttendance, notify, markAllRead, resetDemo, log, setAppConnection,
    user, login, logout, dark, setDark, userById, empById,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [db, user, dark]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);

// Helpers shared by invoice/payment screens
export const invoicePaid = (inv) => (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
