// Shared building blocks for workspace setup: industry cards, plan cards, module picker.
import { Briefcase, MonitorSmartphone, Building, GraduationCap, Stethoscope, Factory, Lock, Check } from "lucide-react";
import { INDUSTRIES, MODULE_CATALOG, PLANS, modulesForPlan } from "../../config/workspace";
import { Badge, Toggle, cx } from "../../components/ui";

export const INDUSTRY_ICONS = { Briefcase, MonitorSmartphone, Building, GraduationCap, Stethoscope, Factory };
const TIER_STYLE = {
  Starter: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Growth: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Enterprise: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  "Add-on": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

export function IndustryGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(INDUSTRIES).map(([key, p]) => {
        const Icon = INDUSTRY_ICONS[p.icon] || Briefcase;
        const on = value === key;
        return (
          <button key={key} type="button" onClick={() => onChange(key)}
            className={cx("relative rounded-xl border p-4 text-left transition", on ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 dark:bg-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600")}>
            {on && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white"><Check className="h-3 w-3" /></span>}
            <span className={cx("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}><Icon className="h-5 w-5" /></span>
            <p className="font-semibold text-slate-900 dark:text-white">{p.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{p.desc}</p>
            <p className="mt-2 text-[11px] text-slate-400">Tracks {p.terms.projects.toLowerCase()} · customers are “{p.terms.client}s”</p>
          </button>
        );
      })}
    </div>
  );
}

export function PlanCards({ value, onPick, industry }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {PLANS.map((p) => (
        <button key={p.key} type="button" onClick={() => onPick(p.key, modulesForPlan(p.key, industry))}
          className={cx("rounded-xl border p-4 text-left transition", value === p.key ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 dark:bg-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-700")}>
          <div className="flex items-center justify-between"><Badge className={TIER_STYLE[p.key]}>{p.key}</Badge>{value === p.key && <Check className="h-4 w-4 text-brand-600" />}</div>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{p.price}<span className="text-xs font-medium text-slate-400">{p.per}</span></p>
          <p className="mt-1 text-xs text-slate-500">{p.desc}</p>
        </button>
      ))}
    </div>
  );
}

// Grouped module toggles. Core modules are always on.
export function ModulePicker({ enabled, onChange, industry, compact }) {
  const set = new Set(enabled);
  const groups = [...new Set(MODULE_CATALOG.map((m) => m.group))];
  const toggle = (key, on) => { const n = new Set(set); if (on) n.add(key); else n.delete(key); onChange([...n]); };
  const groupAll = (g, on) => { const n = new Set(set); MODULE_CATALOG.filter((m) => m.group === g && !m.core).forEach((m) => (on ? n.add(m.key) : n.delete(m.key))); onChange([...n]); };
  return (
    <div className={cx("grid gap-4", compact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 lg:grid-cols-2")}>
      {groups.map((g) => {
        const items = MODULE_CATALOG.filter((m) => m.group === g);
        const switchable = items.filter((m) => !m.core);
        const allOn = switchable.length && switchable.every((m) => set.has(m.key));
        return (
          <div key={g} className="rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{g}</p>
              {switchable.length > 0 && <button type="button" onClick={() => groupAll(g, !allOn)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">{allOn ? "Turn all off" : "Turn all on"}</button>}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((m) => (
                <div key={m.key} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                      {m.label}<Badge className={cx(TIER_STYLE[m.tier], "!px-1.5 !py-0 text-[10px]")}>{m.tier}</Badge>
                      {m.addon && m.addon !== industry && <span className="text-[10px] text-slate-400">best for agencies</span>}
                    </p>
                    {!compact && <p className="text-xs text-slate-500">{m.desc}</p>}
                  </div>
                  {m.core ? <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Lock className="h-3 w-3" />Always on</span>
                    : <Toggle checked={set.has(m.key)} onChange={(v) => toggle(m.key, v)} />}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Chip list editor for services / lead sources
export function ChipEditor({ items, onChange, placeholder }) {
  const addOne = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const v = e.currentTarget.value.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    e.currentTarget.value = "";
  };
  return (
    <div className="rounded-lg border border-slate-300/80 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap gap-1.5">
        {items.map((x) => (
          <span key={x} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {x}<button type="button" onClick={() => onChange(items.filter((y) => y !== x))} className="text-slate-400 hover:text-rose-500" aria-label={`Remove ${x}`}>×</button>
          </span>
        ))}
        <input onKeyDown={addOne} placeholder={placeholder} className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400 dark:text-white" />
      </div>
    </div>
  );
}
