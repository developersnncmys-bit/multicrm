// App data: signs in, loads everything once from /bootstrap, then saves each change
// to the backend. Changes show instantly; if a save fails we show an error and reload.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { api, loadSaved, setToken, getServer } from "./api";
import { uid } from "./utils";

const Ctx = createContext(null);
const EMPTY = {
  users: [], leads: [], tasks: [], invoices: [], projects: [], tickets: [], expenses: [], notifications: [], contacts: [], companies: [],
  quotations: [], products: [], campaigns: [], employees: [], salaryRecords: [], commitments: [], ownerNotes: [], planTasks: [], settings: {}, attendance: {},
};

const LABEL = { leads: "Lead", tasks: "Schedule", invoices: "Invoice", projects: "Project", tickets: "Ticket", expenses: "Expense" };

export function StoreProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState({});
  const [db, setDb] = useState(EMPTY);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const dbRef = useRef(db);
  useEffect(() => { dbRef.current = db; }, [db]);

  const toast = useCallback((text, type = "success") => {
    setToastMsg({ text, type, key: Date.now() });
    Haptics.notificationAsync(type === "error" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    const data = await api("/bootstrap");
    setDb({ ...EMPTY, ...data });
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await reload(); } catch (e) { toast(e.message, "error"); }
    setRefreshing(false);
  }, [reload, toast]);

  // Restore the last session on app start
  useEffect(() => {
    (async () => {
      const { token } = await loadSaved();
      if (token) {
        try {
          const me = await api("/auth/me");
          setUser(me.user); setAccess(me.access || {});
          await reload();
        } catch { await setToken(null); }
      }
      setBooting(false);
    })();
  }, [reload]);

  const login = async (email, password) => {
    const res = await api("/auth/login", { method: "POST", body: { email: email.trim(), password } });
    await setToken(res.token);
    await reload();
    setAccess(res.access || {}); setUser(res.user);
  };
  const logout = async () => { await setToken(null); setUser(null); setDb(EMPTY); };

  const fail = useCallback((e) => {
    toast(`Not saved: ${e.message}`, "error");
    if (e.status === 401) { setToken(null); setUser(null); setDb(EMPTY); return; }
    reload().catch(() => {});
  }, [reload, toast]);

  const add = useCallback((col, item, prefix, quiet) => {
    const rec = { id: uid(prefix || col[0].toUpperCase()), ...item };
    setDb((d) => ({ ...d, [col]: [rec, ...(d[col] || [])] }));
    api(`/${col}`, { method: "POST", body: rec }).catch(fail);
    if (!quiet) toast(`${LABEL[col] || "Item"} added`);
    return rec;
  }, [fail, toast]);

  const update = useCallback((col, id, patch, message) => {
    const cur = (dbRef.current[col] || []).find((r) => r.id === id);
    const p = typeof patch === "function" ? (cur ? patch(cur) : {}) : patch;
    setDb((d) => ({ ...d, [col]: (d[col] || []).map((r) => (r.id === id ? { ...r, ...p } : r)) }));
    api(`/${col}/${encodeURIComponent(id)}`, { method: "PATCH", body: p }).catch(fail);
    if (message !== false) toast(message || `${LABEL[col] || "Item"} updated`);
  }, [fail, toast]);

  const remove = useCallback((col, id) => {
    setDb((d) => ({ ...d, [col]: (d[col] || []).filter((r) => r.id !== id) }));
    api(`/${col}/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(fail);
    toast(`${LABEL[col] || "Item"} deleted`, "info");
  }, [fail, toast]);

  const setSettings = useCallback((section, value) => {
    setDb((d) => ({ ...d, settings: { ...d.settings, [section]: value } }));
    api(`/settings/${section}`, { method: "PUT", body: { value } }).catch(fail);
    toast("Settings saved");
  }, [fail, toast]);

  const setAttendance = useCallback((key, value) => {
    setDb((d) => { const next = { ...d.attendance }; if (value == null) delete next[key]; else next[key] = value; return { ...d, attendance: next }; });
    api("/attendance", { method: "PUT", body: { key, value: value ?? null } }).catch(fail);
  }, [fail]);

  const markAllRead = useCallback(() => {
    setDb((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }));
    api("/notifications/read-all", { method: "POST" }).catch(fail);
  }, [fail]);

  const can = useCallback((module, write) => (write ? access[module] === "edit" : !!access[module]), [access]);
  const userName = useCallback((id) => db.users.find((u) => u.id === id)?.name || "", [db.users]);

  const value = useMemo(() => ({
    booting, user, access, can, db, refreshing, refresh, reload, login, logout,
    add, update, remove, markAllRead, setSettings, setAttendance, toast, toastMsg, userName, server: getServer(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [booting, user, access, db, refreshing, toastMsg]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
