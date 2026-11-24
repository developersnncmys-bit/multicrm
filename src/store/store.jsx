// Central data store used by every screen (db, add, update, remove, setSettings…).
// Two modes, same API for the screens:
//  • Demo mode (no VITE_API_URL): data lives in this browser's localStorage.
//  • API mode  (VITE_API_URL set): data lives in MongoDB via the Node server. Changes are applied
//    on screen immediately and saved in the background; if a save fails we reload from the server.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildSeed } from "../data/seed";
import { applyWorkspace, defaultWorkspace } from "../config/workspace";
import { uid } from "../utils/format";
import { api, apiMode, getToken, setToken } from "../api/client";
import { autoToast } from "../components/ui/Toast";

const DB_KEY = "nexora_db_v3";
const SESSION_KEY = "nexora_session";
const THEME_KEY = "nexora_theme";

const StoreCtx = createContext(null);

// Names used in the automatic confirmation popups
const LABELS = {
  leads: "Lead", contacts: "Contact", companies: "Company", quotations: "Quotation", invoices: "Invoice", projects: "Project",
  tasks: "Schedule", expenses: "Expense", employees: "Employee", tickets: "Ticket", products: "Service", campaigns: "Campaign",
  users: "User", commitments: "Commitment", ownerNotes: "Note", recurring: "Recurring item", salaryRecords: "Salary record",
  documents: "Document", templates: "Template", credentials: "Password", messages: "Message", dayPlans: "Day plan",
  planTasks: "Task", workLogs: "Work log", bugs: "Bug", blockers: "Blocker", paymentFollowups: "Payment follow-up",
  monthlyServices: "Monthly service", fundTxns: "Transaction", bankAccounts: "Bank account", automations: "Automation",
  keywords: "Keyword", seoWork: "SEO work", seoClients: "SEO client", adsReports: "Ads report", integrations: "Integration",
  portalDocs: "Document", portalTasks: "Task", portalMeetings: "Meeting", extras: "Item",
};
const SILENT = new Set(["notifications", "auditLog"]);
const announce = (col, verb) => { if (!SILENT.has(col)) autoToast(`${LABELS[col] || "Item"} ${verb}`, verb === "deleted" ? "info" : "success"); };

// Same shape as the demo data but with no records — used before/after sign-in in API mode
function emptyDb() {
  const seed = buildSeed();
  const out = {};
  for (const [k, v] of Object.entries(seed)) out[k] = Array.isArray(v) ? [] : k === "settings" ? v : {};
  return out;
}
const mergeServer = (server) => {
  const base = emptyDb();
  const db = { ...base, ...server, settings: { ...base.settings, ...(server.settings || {}) } };
  // Mongo keys can't contain "." — the server stores attendance keys with "_" in that case; nothing to undo for "YYYY-MM-DD|id"
  return db;
};

function loadLocal() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const fresh = buildSeed(saved.settings?.workspace?.industry || "general");
      const db = { ...fresh, ...saved, settings: { ...fresh.settings, ...saved.settings } };
      db.users = (db.users || []).map((u) => (u.email?.endsWith("@nexora.in") ? { ...u, email: u.email.replace("@nexora.in", "@nnc.in") } : u));
      return db;
    }
  } catch { /* corrupted or blocked storage → fresh demo */ }
  return buildSeed();
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(() => (apiMode ? emptyDb() : loadLocal()));
  applyWorkspace(db.settings.workspace || defaultWorkspace());
  const dbRef = useRef(db);
  dbRef.current = db;
  const [sessionId, setSessionId] = useState(() => { try { return apiMode ? null : localStorage.getItem(SESSION_KEY); } catch { return null; } });
  const [dark, setDark] = useState(() => { try { return localStorage.getItem(THEME_KEY) === "dark"; } catch { return false; } });
  const [ready, setReady] = useState(!apiMode || !getToken());
  const [syncError, setSyncError] = useState(null);

  useEffect(() => { if (!apiMode) { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore */ } } }, [db]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  useEffect(() => { document.documentElement.dataset.accent = db.settings?.accent || "indigo"; }, [db.settings?.accent]);

  // ── API mode: load everything for the signed-in user ──
  const reload = useCallback(async () => {
    const data = await api("/bootstrap");
    setDb(mergeServer(data));
  }, []);
  useEffect(() => {
    if (!apiMode || !getToken()) return;
    (async () => {
      try {
        const { user } = await api("/auth/me");
        await reload();
        setSessionId(user.id);
      } catch { setToken(null); }
      setReady(true);
    })();
  }, [reload]);

  // Run a server call in the background; on failure show the error and resync
  const sync = useCallback((call) => {
    if (!apiMode) return;
    call().catch((e) => {
      setSyncError(e.message);
      autoToast(`Not saved: ${e.message}`, "error");
      if (e.status === 401) { setToken(null); setSessionId(null); return; }
      reload().catch(() => {});
    });
  }, [reload]);

  const add = useCallback((col, item, prefix) => {
    const rec = { id: uid(prefix || col.slice(0, 1).toUpperCase()), ...item };
    setDb((d) => ({ ...d, [col]: [rec, ...(d[col] || [])] }));
    announce(col, "added");
    sync(() => api(`/${col}`, { method: "POST", body: rec }));
    return rec;
  }, [sync]);
  const update = useCallback((col, id, patch) => {
    const cur = (dbRef.current[col] || []).find((r) => r.id === id);
    const p = typeof patch === "function" ? (cur ? patch(cur) : {}) : patch;
    setDb((d) => ({ ...d, [col]: (d[col] || []).map((r) => (r.id === id ? { ...r, ...p } : r)) }));
    announce(col, "updated");
    sync(() => api(`/${col}/${encodeURIComponent(id)}`, { method: "PATCH", body: p }));
  }, [sync]);
  const remove = useCallback((col, id) => {
    setDb((d) => ({ ...d, [col]: (d[col] || []).filter((r) => r.id !== id) }));
    announce(col, "deleted");
    sync(() => api(`/${col}/${encodeURIComponent(id)}`, { method: "DELETE" }));
  }, [sync]);
  const setSettings = useCallback((section, patch) => {
    const prev = dbRef.current.settings[section];
    const value = typeof patch === "object" && patch && !Array.isArray(patch) && prev && typeof prev === "object" ? { ...prev, ...patch } : patch;
    setDb((d) => ({ ...d, settings: { ...d.settings, [section]: value } }));
    autoToast("Settings saved");
    sync(() => api(`/settings/${section}`, { method: "PUT", body: { value } }));
  }, [sync]);
  const setAttendance = useCallback((date, empId, rec) => {
    const key = `${date}|${empId}`;
    autoToast("Attendance saved");
    setDb((d) => { const next = { ...d.attendance }; if (rec == null) delete next[key]; else next[key] = rec; return { ...d, attendance: next }; });
    sync(() => api("/attendance", { method: "PUT", body: { key, value: rec ?? null } }));
  }, [sync]);
  const notify = useCallback((title, text, link = "/") => {
    add("notifications", { title, text, link, at: new Date().toISOString(), read: false }, "n");
  }, [add]);
  const setAppConnection = useCallback((key, val) => {
    setDb((d) => ({ ...d, appConnections: { ...(d.appConnections || {}), [key]: val } }));
    autoToast("App connection saved");
    sync(() => api(`/app-connections/${key}`, { method: "PUT", body: { value: val } }));
  }, [sync]);
  const markAllRead = useCallback(() => {
    setDb((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }));
    autoToast("All notifications marked as read");
    sync(() => api("/notifications/read-all", { method: "POST" }));
  }, [sync]);

  // Replace ALL data (sample data or a backup file). API mode: admin only, saved to MongoDB.
  const importAll = useCallback(async (data) => {
    applyWorkspace(data.settings?.workspace);
    setDb(apiMode ? mergeServer(data) : data);
    if (apiMode) { await api("/admin/import", { method: "POST", body: data }); await reload(); }
  }, [reload]);
  // Regenerate sample data; optionally keep the current workspace + company profile
  const resetDemo = useCallback((industry, keepWorkspace) => {
    const d = dbRef.current;
    const ind = industry || d.settings.workspace?.industry || "general";
    const next = buildSeed(ind);
    if (keepWorkspace) next.settings = { ...next.settings, workspace: { ...next.settings.workspace, ...keepWorkspace, industry: ind }, company: d.settings.company, accent: d.settings.accent };
    return importAll(next).catch((e) => setSyncError(e.message));
  }, [importAll]);
  const log = useCallback((action, entity, detail = "") => {
    add("auditLog", { action, entity, detail, by: sessionId, at: new Date().toISOString() }, "au");
  }, [add, sessionId]);

  const user = db.users.find((u) => u.id === sessionId && u.active) || null;
  // Returns an error message, or null on success (async in API mode)
  const login = async (email, password) => {
    if (apiMode) {
      try {
        const { token, user: u } = await api("/auth/login", { method: "POST", body: { email, password } });
        setToken(token);
        await reload();
        setSessionId(u.id);
        return null;
      } catch (e) { return e.message; }
    }
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!u) return "Invalid email or password";
    if (!u.active) return "This account is deactivated. Contact your admin.";
    try { localStorage.setItem(SESSION_KEY, u.id); } catch { /* ignore */ }
    setSessionId(u.id);
    return null;
  };
  const logout = () => {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    if (apiMode) { setToken(null); setDb(emptyDb()); }
    setSessionId(null);
  };

  const userById = useCallback((id) => db.users.find((u) => u.id === id), [db.users]);
  const empById = useCallback((id) => db.employees.find((e) => e.id === id), [db.employees]);

  const value = useMemo(() => ({
    db, add, update, remove, setSettings, setAttendance, notify, markAllRead, resetDemo, importAll, log, setAppConnection,
    user, login, logout, dark, setDark, userById, empById, apiMode, syncError, clearSyncError: () => setSyncError(null), reload,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [db, user, dark, syncError]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] dark:bg-slate-950">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />Loading your workspace…</div>
      </div>
    );
  }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);

// Helpers shared by invoice/payment screens
export const invoicePaid = (inv) => (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
