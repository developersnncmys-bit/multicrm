import { createContext, forwardRef, useContext, useEffect, useRef, useState } from "react";
import { X, Search, ChevronLeft, ChevronRight, Inbox, TrendingUp, TrendingDown, AlertTriangle, MoreHorizontal } from "lucide-react";
import { initials } from "../../utils/format";

export const cx = (...c) => c.filter(Boolean).join(" ");

/* ─── Button ─────────────────────────────────────────── */
const BTN = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500/30",
  secondary: "border border-slate-300/80 bg-white text-slate-700 shadow-sm shadow-slate-900/[0.03] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/30",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};
const SIZE = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-9 px-3.5 text-sm gap-2", lg: "h-11 px-5 text-sm gap-2", icon: "h-9 w-9 justify-center" };
export const Button = forwardRef(function Button({ variant = "primary", size = "md", icon: Icon, className, children, ...p }, ref) {
  return (
    <button ref={ref} {...p} className={cx("inline-flex shrink-0 items-center justify-center rounded-lg font-semibold outline-none transition focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50", BTN[variant], SIZE[size], className)}>
      {Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {children}
    </button>
  );
});

/* ─── Layout bits ────────────────────────────────────── */
export const Card = ({ className, children, ...p }) => <div {...p} className={cx("card", className)}>{children}</div>;

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cx("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ─── Badges / avatars ───────────────────────────────── */
export const Badge = ({ className, children, dot }) => (
  <span className={cx("chip", className)}>{dot && <span className={cx("h-1.5 w-1.5 rounded-full", dot)} />}{children}</span>
);

const AV_COLORS = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700"];
export function Avatar({ name = "", size = "md", className }) {
  const s = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm", xl: "h-16 w-16 text-lg" }[size];
  const c = AV_COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV_COLORS.length];
  return <span className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-bold", s, c, className)} title={name}>{initials(name)}</span>;
}

/* ─── Forms ──────────────────────────────────────────── */
export function Field({ label, error, hint, className, children, required }) {
  return (
    <label className={cx("block", className)}>
      {label && <span className="label">{label}{required && <span className="text-rose-500"> *</span>}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}
export const Input = forwardRef((p, ref) => <input ref={ref} {...p} className={cx("input", p.className)} />);
export const Textarea = (p) => <textarea rows={3} {...p} className={cx("input resize-none", p.className)} />;
export function Select({ options = [], placeholder, className, ...p }) {
  return (
    <select {...p} className={cx("input cursor-pointer pr-8", className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}
export function SearchInput({ value, onChange, placeholder = "Search…", className }) {
  return (
    <div className={cx("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9" />
      {value && <button onClick={() => onChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>}
    </div>
  );
}
export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5">
      <span className={cx("relative h-5 w-9 rounded-full transition", checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600")}>
        <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
      {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
    </button>
  );
}

/* ─── Overlays ───────────────────────────────────────── */
// Counts open overlays so stacked modals don't unlock page scroll early
let openOverlays = 0;
function useEsc(open, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && closeRef.current?.();
    window.addEventListener("keydown", h);
    openOverlays += 1;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      openOverlays = Math.max(0, openOverlays - 1);
      if (!openOverlays) document.body.style.overflow = "";
    };
  }, [open]);
}

export function Modal({ open, onClose, title, subtitle, size = "md", children, footer }) {
  useEsc(open, onClose);
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fadeIn" onClick={onClose} />
      <div className={cx("relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-pop animate-slideUp dark:bg-slate-900 sm:rounded-2xl", w)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-xl", headerExtra }) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fadeIn" onClick={onClose} />
      <aside className={cx("absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-pop animate-slideLeft dark:bg-slate-900", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
            {headerExtra}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">{footer}</div>}
      </aside>
    </div>
  );
}

/* Confirm dialog via hook: const confirm = useConfirm(); if (await confirm({...})) … */
const ConfirmCtx = createContext(null);
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = (opts) => new Promise((resolve) => setState({ ...opts, resolve }));
  const close = (v) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title || "Are you sure?"} size="sm"
        footer={<><Button variant="secondary" onClick={() => close(false)}>Cancel</Button><Button variant={state?.danger === false ? "primary" : "danger"} onClick={() => close(true)}>{state?.confirmText || "Delete"}</Button></>}>
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10"><AlertTriangle className="h-5 w-5" /></span>
          <p className="pt-2 text-sm text-slate-600 dark:text-slate-300">{state?.message || "This action cannot be undone."}</p>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmCtx);

/* ─── Menu (3-dot) ───────────────────────────────────── */
export function Menu({ items, align = "right", trigger }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      {trigger ? <span onClick={() => setOpen((v) => !v)}>{trigger}</span> : (
        <button onClick={() => setOpen((v) => !v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><MoreHorizontal className="h-4 w-4" /></button>
      )}
      {open && (
        <div className={cx("absolute z-30 mt-1 min-w-[170px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop animate-fadeIn dark:border-slate-700 dark:bg-slate-800", align === "right" ? "right-0" : "left-0")}>
          {items.filter(Boolean).map((it, i) => (
            <button key={i} onClick={() => { setOpen(false); it.onClick(); }}
              className={cx("flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700/60", it.danger ? "text-rose-600" : "text-slate-700 dark:text-slate-200")}>
              {it.icon && <it.icon className="h-4 w-4 opacity-70" />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Data display ───────────────────────────────────── */
const TONES = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
export function StatCard({ label, value, icon: Icon, tone = "brand", delta, deltaLabel, sub, onClick }) {
  const up = delta >= 0;
  return (
    <Card onClick={onClick} className={cx("p-5", onClick && "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-pop")}>
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", TONES[tone])}><Icon className="h-[18px] w-[18px]" /></span>}
      </div>
      <p className="mt-2 text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
        {delta !== undefined && delta !== null && (
          <span className={cx("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold", up ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300")}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{Math.abs(delta)}%
          </span>
        )}
        {(deltaLabel || sub) && <span className="text-slate-500 dark:text-slate-400">{deltaLabel || sub}</span>}
      </div>
    </Card>
  );
}
export const IconBox = ({ icon: Icon, tone = "brand", className }) => (
  <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONES[tone], className)}><Icon className="h-[18px] w-[18px]" /></span>
);

export function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Icon className="h-6 w-6" /></span>
      <p className="font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx("flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800/70", className)}>
      {tabs.map((t) => {
        const v = typeof t === "string" ? t : t.value;
        const active = v === value;
        return (
          <button key={v} onClick={() => onChange(v)}
            className={cx("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-semibold transition",
              active ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200")}>
            {typeof t === "string" ? t : t.label}
            {t.count !== undefined && <span className={cx("rounded-md px-1.5 text-[11px]", active ? "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200" : "bg-slate-200/70 dark:bg-slate-700")}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Progress({ value = 0, className, tone = "bg-brand-500" }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div className={cx("h-full rounded-full transition-all", tone)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Pagination({ page, pages, onPage, total, perPage }) {
  if (pages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
      <span className="text-slate-500">Showing <b className="text-slate-700 dark:text-slate-200">{from}–{Math.min(total, page * perPage)}</b> of <b className="text-slate-700 dark:text-slate-200">{total}</b></span>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="px-2 font-medium text-slate-600 dark:text-slate-300">{page} / {pages}</span>
        <Button size="icon" variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

/* Simple client-side pagination hook */
export function usePaged(rows, perPage = 12) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  useEffect(() => { if (page > pages) setPage(1); }, [pages, page]);
  return { page, setPage, pages, perPage, total: rows.length, slice: rows.slice((page - 1) * perPage, page * perPage) };
}
