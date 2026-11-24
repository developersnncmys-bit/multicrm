import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const ToastCtx = createContext(() => {});

// Automatic "Saved / Added / Deleted" popups for every change made through the store.
// If the screen shows its own message for the same click, the automatic one is skipped.
let push = null;
let lastExplicit = 0;
let pending = null;
export function autoToast(message, type = "success") {
  if (!push) return;
  if (pending) { if (pending.message !== message) pending.message = "Changes saved"; return; }
  const at = Date.now();
  pending = { message, type, at };
  setTimeout(() => {
    const p = pending; pending = null;
    if (p && lastExplicit < p.at - 300) push(p.message, p.type, true);
  }, 80);
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, type = "success", auto = false) => {
    if (!auto) { lastExplicit = Date.now(); pending = null; }
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3200);
  }, []);
  push = toast;
  const icon = { success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, error: <AlertTriangle className="h-5 w-5 text-rose-500" />, info: <Info className="h-5 w-5 text-sky-500" /> };
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-pop animate-slideUp dark:border-slate-700 dark:bg-slate-800">
            {icon[t.type]}
            <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{t.message}</p>
            <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
