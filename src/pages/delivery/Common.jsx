import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { useStore } from "../../store/store";
import { cx } from "../../components/ui";
import { inr } from "../../utils/format";
import { GST_RATES, withGst } from "./deliveryUtils";

/* With / Without GST toggle, rate chips, GSTIN and live breakdown */
export function GstPicker({ amount, rate, gstin, onChange, showGstin = true }) {
  const on = Number(rate) > 0;
  const total = withGst(amount, rate);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-white p-0.5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          {[["With GST", true], ["Without GST", false]].map(([l, v]) => (
            <button type="button" key={l} onClick={() => onChange({ gstRate: v ? (on ? rate : 18) : 0, gstin: v ? gstin : "" })}
              className={cx("rounded-md px-3 py-1 text-xs font-semibold transition", on === v ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>{l}</button>
          ))}
        </div>
        {on && GST_RATES.map((r) => (
          <button type="button" key={r} onClick={() => onChange({ gstRate: r })}
            className={cx("rounded-md px-2.5 py-1 text-xs font-semibold ring-1 transition", Number(rate) === r ? "bg-brand-50 text-brand-700 ring-brand-300 dark:bg-brand-500/10 dark:text-brand-200" : "bg-white text-slate-500 ring-slate-200 hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-700")}>{r}%</button>
        ))}
      </div>
      {on && showGstin && (
        <input value={gstin || ""} maxLength={15} onChange={(e) => onChange({ gstin: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "") })}
          placeholder="Client GSTIN (15 characters, optional)" className={cx("input mt-2.5 font-mono uppercase", gstin && gstin.length !== 15 && "border-amber-400")} />
      )}
      <p className="mt-2.5 text-xs text-slate-500">
        {inr(amount)} {on ? <>+ GST {rate}% ({inr(total - (Number(amount) || 0))}) = </> : "= "}<b className="text-slate-800 dark:text-slate-100">{inr(total)}</b> {on ? "incl. GST" : "(no GST)"}
        {on && gstin && gstin.length !== 15 && <span className="ml-2 font-semibold text-amber-600">GSTIN must be 15 characters</span>}
      </p>
    </div>
  );
}

/* Searchable project picker */
export function ProjectPicker({ value, onChange, placeholder = "Select a project…", allowEmpty = false }) {
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const projects = db.projects || [];
  const sel = projects.find((p) => p.id === value);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return projects.filter((p) => !s || [p.client, p.name, p.contact, p.phone].some((v) => String(v || "").toLowerCase().includes(s))).slice(0, 40);
  }, [projects, q]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="input flex items-center justify-between text-left">
        <span className={cx("truncate", !sel && "text-slate-400")}>{sel ? `${sel.client} — ${sel.service}` : placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop animate-fadeIn dark:border-slate-700 dark:bg-slate-800">
          <div className="relative border-b border-slate-100 dark:border-slate-700">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client, project, phone…" className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none dark:text-white" />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {allowEmpty && <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/60">— None —</button>}
            {list.map((p) => (
              <button type="button" key={p.id} onClick={() => { onChange(p.id); setOpen(false); setQ(""); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/60">
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-800 dark:text-slate-100">{p.client}</span><span className="block truncate text-xs text-slate-500">{p.service} · {p.stage || "Not started"}</span></span>
                {p.id === value && <Check className="h-4 w-4 text-brand-600" />}
              </button>
            ))}
            {list.length === 0 && <p className="px-3 py-4 text-center text-sm text-slate-500">No projects match</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* Small stat tile used inside drawers */
export const MiniStat = ({ label, value, tone = "text-slate-900 dark:text-white", sub }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className={cx("mt-1 text-lg font-bold tabular-nums", tone)}>{value}</p>
    {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
  </div>
);

/* Clickable KPI card that toggles a filter */
export function FilterCard({ label, value, sub, icon: Icon, tone, active, onClick }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300", emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300", rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300", violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300", slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <button type="button" onClick={onClick} className={cx("card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-pop", active && "ring-2 ring-brand-500")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tones[tone] || tones.brand)}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className="mt-1.5 text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </button>
  );
}
