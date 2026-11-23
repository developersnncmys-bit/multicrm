import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2, Pencil, Receipt, Repeat, Users, CalendarDays, AlarmClock, Clock, Video, Phone, Building,
  MessageCircle, RotateCcw, UserX, XCircle, ExternalLink, Settings2, Lock, PhoneCall, ClipboardCheck, Bell, Search, X, IndianRupee,
} from "lucide-react";
import { useStore } from "../store/store";
import { useToast } from "../components/ui/Toast";
import { Avatar, Badge, Button, Card, CardHeader, Drawer, EmptyState, Field, Input, Modal, PageHeader, Select, Tabs, Textarea, useConfirm, cx } from "../components/ui";
import { toISO, todayISO, addDays, fmtDate, inr, uid } from "../utils/format";
import LeadDrawer from "./leads/LeadDrawer";

/* ── Types & styles ─────────────────────────────────────────── */
const TIMED = ["Call", "Meeting", "Demo", "Blocked"];
const ALLDAY = ["Follow-up", "Payment follow-up", "Client response", "Task"];
const TYPES = [...TIMED, ...ALLDAY];
const MODES = ["Google Meet", "Office", "Phone"];
const MODE_ICON = { "Google Meet": Video, Office: Building, Phone };
const OUTCOMES = ["Interested, send proposal", "Proposal agreed", "Go-live agreed", "Payment promised", "Follow-up needed", "Not interested"];
const DURATIONS = [15, 30, 45, 60, 90, 120];
const STATUS_STYLE = {
  Upcoming: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Done: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "No-show": "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
const TYPE_STYLE = {
  Call: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200", block: "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100" },
  Meeting: { dot: "bg-violet-500", pill: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200", block: "border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100" },
  Demo: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200", block: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100" },
  Blocked: { dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300", block: "border-slate-400 bg-[repeating-linear-gradient(135deg,rgb(241_245_249),rgb(241_245_249)_6px,rgb(226_232_240)_6px,rgb(226_232_240)_12px)] text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  "Follow-up": { dot: "bg-brand-500", pill: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200", block: "border-brand-500 bg-brand-50 text-brand-900" },
  "Payment follow-up": { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200", block: "border-rose-500 bg-rose-50 text-rose-900" },
  "Client response": { dot: "bg-cyan-500", pill: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200", block: "border-cyan-500 bg-cyan-50 text-cyan-900" },
  Task: { dot: "bg-slate-500", pill: "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200", block: "border-slate-500 bg-slate-50 text-slate-800" },
};
const SYS_STYLE = {
  followup: { icon: Users, pill: "border border-dashed border-sky-300 text-sky-700 dark:border-sky-500/40 dark:text-sky-300", label: "Lead follow-up", dot: "bg-sky-500" },
  invoice: { icon: Receipt, pill: "border border-dashed border-rose-300 text-rose-700 dark:border-rose-500/40 dark:text-rose-300", label: "Invoice due", dot: "bg-rose-500" },
  recurring: { icon: Repeat, pill: "border border-dashed border-teal-300 text-teal-700 dark:border-teal-500/40 dark:text-teal-300", label: "Renewal due", dot: "bg-teal-500" },
};
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const START_H = 8, END_H = 21, HOUR_PX = 52;

/* ── Helpers ────────────────────────────────────────────────── */
const toMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fmtTime = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const isTimed = (t) => TIMED.includes(t.type) && !!t.time;
const startOfWeek = (iso) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toISO(d); };
const digits = (p) => String(p || "").replace(/\D/g, "").slice(-10);
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const dayName = (iso, opts = { weekday: "long", day: "numeric", month: "long" }) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", opts);
const statusOf = (t) => t.status || (t.done ? "Done" : "Upcoming");

// Overlap layout for the time grid: events in a cluster share the width in lanes
function layoutDay(evts) {
  const items = evts.map((e) => { const s = toMin(e.time); return { e, s, en: s + (Number(e.duration) || 30) }; }).sort((a, b) => a.s - b.s);
  const groups = []; let cur = []; let curEnd = -1;
  items.forEach((it) => { if (cur.length && it.s >= curEnd) { groups.push(cur); cur = []; curEnd = -1; } cur.push(it); curEnd = Math.max(curEnd, it.en); });
  if (cur.length) groups.push(cur);
  const out = [];
  groups.forEach((g) => {
    const lanes = [];
    g.forEach((it) => { let l = lanes.findIndex((end) => end <= it.s); if (l < 0) { l = lanes.length; lanes.push(it.en); } else lanes[l] = it.en; it.lane = l; });
    g.forEach((it) => out.push({ ...it, lanes: lanes.length }));
  });
  return out;
}

const blankForm = (user, cal, date, time, type) => ({
  title: "", type: type || "Meeting", date: date || todayISO(), time: time || "11:00", duration: 30, mode: type === "Call" ? "Phone" : "Google Meet", meetLink: "",
  clientMode: "crm", leadId: "", clientName: "", clientPhone: "", clientEmail: "", officeAddress: cal.officeAddress || "", amount: "", assigneeId: user?.id || "", notes: "",
});
const meetCode = () => { const r = (n) => Math.random().toString(36).slice(2, 2 + n); return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`; };

/* ── Lead search box ─────────────────────────────────────────── */
function LeadPicker({ leads, value, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const sel = leads.find((l) => l.id === value);
  const s = q.trim().toLowerCase();
  const matches = s ? leads.filter((l) => [l.name, l.company, l.phone].some((v) => String(v || "").toLowerCase().includes(s))).slice(0, 8) : leads.slice(0, 8);
  if (sel) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-300/80 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
        <Avatar name={sel.name} size="sm" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{sel.name}</p><p className="truncate text-xs text-slate-500">{sel.company} · {sel.phone}</p></div>
        <button type="button" onClick={() => onChange("")} className="rounded p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Search lead by name, company or phone…" className="input pl-9" />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-pop dark:border-slate-700 dark:bg-slate-800">
          {matches.length === 0 && <p className="px-3 py-3 text-sm text-slate-500">No matching leads</p>}
          {matches.map((l) => (
            <button type="button" key={l.id} onMouseDown={() => { onChange(l.id); setQ(""); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60">
              <Avatar name={l.name} size="xs" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{l.name} · {l.company}</span><span className="text-[11px] text-slate-500">{l.phone} · {l.stage}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Week / Day time grid ────────────────────────────────────── */
function TimeGrid({ days, byDate, onSlot, onOpen, onOpenSys, cal, today, nowMin }) {
  const workFrom = toMin(cal.workFrom || "09:30"), workTo = toMin(cal.workTo || "19:00");
  const workDays = cal.workDays || [1, 2, 3, 4, 5, 6];
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const total = (END_H - START_H) * HOUR_PX;
  const yOf = (m) => ((m - START_H * 60) / 60) * HOUR_PX;
  const cols = `56px repeat(${days.length}, minmax(${days.length > 1 ? 110 : 200}px, 1fr))`;
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: days.length > 1 ? 56 + days.length * 110 : undefined }}>
        {/* Day headers */}
        <div className="grid border-b border-slate-100 dark:border-slate-800" style={{ gridTemplateColumns: cols }}>
          <div />
          {days.map((d) => {
            const dt = new Date(`${d}T00:00:00`);
            return (
              <div key={d} className="border-l border-slate-100 px-2 py-2 text-center dark:border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{dt.toLocaleDateString("en-GB", { weekday: "short" })}</p>
                <p className={cx("mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold", d === today ? "bg-brand-600 text-white" : "text-slate-800 dark:text-slate-100")}>{dt.getDate()}</p>
              </div>
            );
          })}
        </div>
        {/* All-day row */}
        <div className="grid border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20" style={{ gridTemplateColumns: cols }}>
          <div className="px-1 py-2 text-right text-[10px] font-semibold uppercase text-slate-400">All day</div>
          {days.map((d) => {
            const items = (byDate[d] || []).filter((e) => e.kind !== "task" || !isTimed(e));
            return (
              <div key={d} className="min-h-[40px] space-y-1 border-l border-slate-100 p-1 dark:border-slate-800">
                {items.slice(0, 3).map((e) => (
                  <button key={e.id} onClick={() => (e.kind === "task" ? onOpen(e) : onOpenSys(e))}
                    className={cx("block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium", e.kind === "task" ? cx(TYPE_STYLE[e.type]?.pill, statusOf(e) !== "Upcoming" && "line-through opacity-60") : SYS_STYLE[e.kind].pill)}>
                    {e.title}
                  </button>
                ))}
                {items.length > 3 && <p className="px-1 text-[10.5px] font-semibold text-slate-500">+{items.length - 3} more</p>}
              </div>
            );
          })}
        </div>
        {/* Hours */}
        <div className="max-h-[620px] overflow-y-auto">
          <div className="relative grid" style={{ gridTemplateColumns: cols, height: total }}>
            <div className="relative">
              {hours.map((h) => <span key={h} className="absolute right-2 -translate-y-1/2 text-[10.5px] font-medium text-slate-400" style={{ top: yOf(h * 60) }}>{h === START_H ? "" : fmtTime(fromMin(h * 60)).replace(":00", "")}</span>)}
            </div>
            {days.map((d) => {
              const dow = new Date(`${d}T00:00:00`).getDay();
              const isWork = workDays.includes(dow);
              const timed = (byDate[d] || []).filter((e) => e.kind === "task" && isTimed(e));
              const laid = layoutDay(timed);
              return (
                <div key={d} className={cx("relative cursor-pointer border-l border-slate-100 dark:border-slate-800", !isWork && "bg-slate-50/80 dark:bg-slate-800/30")}
                  onClick={(ev) => {
                    const rect = ev.currentTarget.getBoundingClientRect();
                    const m = START_H * 60 + Math.floor(((ev.clientY - rect.top) / HOUR_PX) * 2) * 30;
                    onSlot(d, fromMin(Math.min(m, (END_H - 1) * 60 + 30)));
                  }}>
                  {hours.map((h) => <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-slate-100 dark:border-slate-800" style={{ top: yOf(h * 60) }} />)}
                  {isWork && workFrom > START_H * 60 && <div className="pointer-events-none absolute inset-x-0 top-0 bg-slate-50/80 dark:bg-slate-800/30" style={{ height: yOf(workFrom) }} />}
                  {isWork && workTo < END_H * 60 && <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-50/80 dark:bg-slate-800/30" style={{ top: yOf(workTo) }} />}
                  {laid.map(({ e, s, en, lane, lanes }) => {
                    const top = Math.max(0, yOf(s)); const height = Math.max(22, yOf(Math.min(en, END_H * 60)) - top - 2);
                    const st = statusOf(e);
                    const MI = MODE_ICON[e.mode];
                    return (
                      <button key={e.id} onClick={(ev) => { ev.stopPropagation(); onOpen(e); }}
                        className={cx("absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:z-10 hover:shadow-md", TYPE_STYLE[e.type]?.block, st === "Cancelled" && "line-through opacity-50", st === "Done" && "opacity-70", st === "No-show" && "border-dashed")}
                        style={{ top, height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}>
                        <span className="flex items-center gap-1 font-semibold">{st === "Done" && <Check className="h-3 w-3 shrink-0" />}{e.type === "Blocked" && <Lock className="h-3 w-3 shrink-0" />}<span className="truncate">{e.title}</span></span>
                        {height > 34 && <span className="mt-0.5 flex items-center gap-1 opacity-75">{fmtTime(e.time)}{MI && <MI className="h-3 w-3" />}</span>}
                      </button>
                    );
                  })}
                  {d === today && nowMin >= START_H * 60 && nowMin <= END_H * 60 && (
                    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: yOf(nowMin) }}>
                      <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-rose-500" /><span className="h-[2px] flex-1 bg-rose-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function CalendarPage() {
  const { db, add, update, remove, user, userById, setSettings } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const cal = db.settings.calendar || {};
  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState("week");
  const [scope, setScope] = useState("all");
  const [form, setForm] = useState(null);
  const [errs, setErrs] = useState({});
  const [conflict, setConflict] = useState("");
  const [openId, setOpenId] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [calSettings, setCalSettings] = useState(null);
  const [nowMin, setNowMin] = useState(nowMinutes);
  const [quick, setQuick] = useState({ leadId: "", date: addDays(today, 3), note: "" });

  useEffect(() => { const id = setInterval(() => setNowMin(nowMinutes()), 60000); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (params.get("new")) {
      setForm(blankForm(user, cal, today)); setErrs({}); setConflict("");
      const n = new URLSearchParams(params); n.delete("new"); setParams(n, { replace: true });
    }
  }, [params, setParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const leads = db.leads || [];
  const leadOf = (id) => leads.find((l) => l.id === id);
  const tasks = useMemo(() => (db.tasks || []).filter((t) => (scope === "all" || t.assigneeId === user.id) && !(t.type === "Blocked" && t.assigneeId !== user.id)), [db.tasks, scope, user.id]);
  const openTask = (db.tasks || []).find((t) => t.id === openId);

  const byDate = useMemo(() => {
    const map = {};
    const push = (d, item) => { if (!d) return; (map[d] ||= []).push(item); };
    tasks.forEach((t) => push(t.date, { kind: "task", ...t }));
    leads.forEach((l) => {
      if (["Won", "Lost"].includes(l.stage) || !l.nextFollowUp) return;
      if (scope === "mine" && l.ownerId !== user.id) return;
      if (tasks.some((t) => t.leadId === l.id && t.date === l.nextFollowUp)) return;
      push(l.nextFollowUp, { kind: "followup", id: `f_${l.id}`, title: `${l.name} · ${l.company || "Lead"}`, leadId: l.id });
    });
    (db.invoices || []).forEach((i) => { if (!["Paid", "Cancelled"].includes(i.status)) push(i.dueDate, { kind: "invoice", id: `i_${i.id}`, title: `${i.number} · ${i.client?.company}` }); });
    (db.recurring || []).forEach((r) => { if (r.status === "Active") push(r.nextDue, { kind: "recurring", id: `r_${r.id}`, title: `${r.service} · ${r.client} · ${inr(r.amount)}` }); });
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.kind === "task" ? 0 : 1) - (b.kind === "task" ? 0 : 1) || String(a.time || "99").localeCompare(String(b.time || "99"))));
    return map;
  }, [tasks, leads, db.invoices, db.recurring, scope, user.id]);

  // Month grid (Monday first)
  const grid = useMemo(() => {
    const first = new Date(`${anchor.slice(0, 7)}-01T00:00:00`);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return toISO(d); });
  }, [anchor]);
  const weekDays = useMemo(() => { const s = startOfWeek(anchor); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }, [anchor]);

  const agenda = useMemo(() => {
    const open = tasks.filter((t) => statusOf(t) === "Upcoming" && t.type !== "Blocked");
    const sort = (a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""));
    return {
      overdue: open.filter((t) => t.date < today).sort(sort),
      today: tasks.filter((t) => t.date === today && t.type !== "Blocked").sort(sort),
      upcoming: open.filter((t) => t.date > today && t.date <= addDays(today, 7)).sort(sort),
    };
  }, [tasks, today]);

  // "Happening now" / "Next today" alert
  const alert = useMemo(() => {
    const todays = tasks.filter((t) => t.date === today && isTimed(t) && statusOf(t) === "Upcoming" && t.type !== "Blocked").sort((a, b) => toMin(a.time) - toMin(b.time));
    const now = todays.find((t) => toMin(t.time) <= nowMin && nowMin < toMin(t.time) + (Number(t.duration) || 30));
    if (now) return { kind: "now", t: now };
    const next = todays.find((t) => toMin(t.time) > nowMin);
    return next ? { kind: "next", t: next, mins: toMin(next.time) - nowMin } : null;
  }, [tasks, today, nowMin]);

  const move = (n) => {
    if (view === "week") setAnchor((a) => addDays(a, 7 * n));
    else if (view === "day") setAnchor((a) => addDays(a, n));
    else setAnchor((a) => { const d = new Date(`${a.slice(0, 7)}-01T00:00:00`); d.setMonth(d.getMonth() + n); return toISO(d); });
  };
  const title = view === "day" ? dayName(anchor)
    : view === "week" ? (() => { const a = new Date(`${weekDays[0]}T00:00:00`), b = new Date(`${weekDays[6]}T00:00:00`); return `${a.getDate()} ${a.toLocaleDateString("en-GB", { month: "short" })} – ${b.getDate()} ${b.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`; })()
      : new Date(`${anchor.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  /* ── Actions ── */
  const newAt = (date, time, type) => { setForm(blankForm(user, cal, date, time, type)); setErrs({}); setConflict(""); };
  const editTask = (t) => {
    const lead = leadOf(t.leadId);
    setForm({ ...blankForm(user, cal), ...t, clientMode: t.leadId || !t.clientName ? "crm" : "other", duration: t.duration || 30, amount: t.amount ?? "", mode: t.mode || "Phone", officeAddress: t.officeAddress || cal.officeAddress || "", clientEmail: t.clientEmail || lead?.email || "" });
    setErrs({}); setConflict(""); setOpenId(null);
  };
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const save = (force = false) => {
    const f = form; const e = {};
    const timed = TIMED.includes(f.type);
    const lead = leadOf(f.leadId);
    if (f.type === "Blocked" && !f.title.trim()) e.title = "Add a label for this block";
    if (["Call", "Meeting", "Demo", "Payment follow-up"].includes(f.type) && !(f.clientMode === "crm" ? f.leadId : f.clientName.trim())) e.client = "Pick a lead or enter the client's name";
    if (f.clientMode === "other" && f.clientPhone && digits(f.clientPhone).length !== 10) e.clientPhone = "Enter a 10-digit mobile number";
    if (!f.date) e.date = "Pick a date";
    if (timed && !f.time) e.time = "Pick a start time";
    if (f.type === "Payment follow-up" && f.amount !== "" && Number(f.amount) < 0) e.amount = "Amount can't be negative";
    setErrs(e);
    if (Object.keys(e).length) return;

    // Clash check against the assignee's other timed entries (respecting the gap setting)
    if (timed && !force) {
      const gap = Number(cal.gapMins) || 0;
      const s = toMin(f.time), en = s + Number(f.duration || 30);
      const clash = (db.tasks || []).find((t) => t.id !== f.id && t.date === f.date && t.assigneeId === f.assigneeId && isTimed(t) && statusOf(t) !== "Cancelled" && toMin(t.time) < en + gap && toMin(t.time) + (Number(t.duration) || 30) + gap > s);
      if (clash) { setConflict(`Clashes with “${clash.title}” at ${fmtTime(clash.time)}${gap ? ` (keeping a ${gap}-min gap)` : ""}.`); return; }
    }
    const who = f.clientMode === "crm" ? (lead ? lead.company || lead.name : "") : f.clientName.trim();
    const autoTitle = f.type === "Blocked" ? f.title.trim() : f.title.trim() || `${f.type}${who ? ` — ${who}` : ""}`;
    const data = {
      title: autoTitle, type: f.type, date: f.date, time: timed ? f.time : "", duration: timed ? Number(f.duration) : 0,
      mode: ["Call", "Meeting", "Demo"].includes(f.type) ? f.mode : f.type === "Payment follow-up" ? "Phone" : "",
      meetLink: f.mode === "Google Meet" && ["Meeting", "Demo", "Call"].includes(f.type) ? f.meetLink : "",
      leadId: f.clientMode === "crm" ? f.leadId : "", clientName: f.clientMode === "other" ? f.clientName.trim() : "", clientPhone: f.clientMode === "other" ? digits(f.clientPhone) : "",
      clientEmail: f.clientEmail, officeAddress: f.mode === "Office" ? f.officeAddress : "", amount: f.type === "Payment follow-up" && f.amount !== "" ? Number(f.amount) : undefined,
      assigneeId: f.assigneeId, notes: f.notes,
    };
    if (f.id) { update("tasks", f.id, data); toast("Entry updated"); }
    else {
      add("tasks", { ...data, status: "Upcoming", done: false, outcome: "", summary: "" }, "T");
      if (data.leadId && data.type !== "Blocked") update("leads", data.leadId, (l) => ({ nextFollowUp: !l.nextFollowUp || l.nextFollowUp < today || data.date < l.nextFollowUp ? data.date : l.nextFollowUp }));
      toast(f.type === "Blocked" ? "Time blocked" : `${f.type} scheduled for ${fmtDate(f.date)}${timed ? ` at ${fmtTime(f.time)}` : ""}`);
    }
    setForm(null); setConflict("");
  };

  const setStatus = (t, status, msg) => { update("tasks", t.id, { status, done: status === "Done" }); toast(msg); };
  const toggleDone = (t) => setStatus(t, statusOf(t) === "Done" ? "Upcoming" : "Done", statusOf(t) === "Done" ? "Reopened" : "Marked done 🎉");
  const del = async (t) => { if (await confirm({ title: t.type === "Blocked" ? "Remove this block?" : "Delete entry?", message: `“${t.title}” will be removed from the calendar.` })) { remove("tasks", t.id); setOpenId(null); toast("Removed from calendar"); } };

  const addQuickFollowUp = () => {
    if (!quick.leadId) return toast("Pick a lead first", "error");
    const l = leadOf(quick.leadId);
    add("tasks", { title: `Follow-up — ${l.company || l.name}`, type: "Follow-up", date: quick.date, time: "", duration: 0, mode: "Phone", leadId: l.id, assigneeId: user.id, notes: quick.note, status: "Upcoming", done: false, outcome: "", summary: "", meetLink: "" }, "T");
    update("leads", l.id, { nextFollowUp: quick.date });
    toast(`Follow-up added for ${fmtDate(quick.date)}`);
    setQuick({ leadId: "", date: addDays(today, 3), note: "" });
  };

  /* ── Rows ── */
  const TaskRow = ({ t, showDate }) => {
    const st = statusOf(t);
    const overdue = st === "Upcoming" && t.date < today;
    const lead = leadOf(t.leadId);
    return (
      <div className="group flex items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <button onClick={() => toggleDone(t)} className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition", st === "Done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-brand-500 dark:border-slate-600")}>
          {st === "Done" && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>
        <button onClick={() => setOpenId(t.id)} className="min-w-0 flex-1 text-left">
          <p className={cx("text-sm font-medium leading-snug", st === "Done" || st === "Cancelled" ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100")}>{t.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={cx("chip !px-1.5 !py-0 text-[10.5px]", TYPE_STYLE[t.type]?.pill)}>{t.type}</span>
            {st !== "Upcoming" && st !== "Done" && <span className={cx("chip !px-1.5 !py-0 text-[10.5px]", STATUS_STYLE[st])}>{st}</span>}
            <span className={cx(overdue ? "font-semibold text-rose-600" : "text-slate-500")}>{showDate ? `${fmtDate(t.date)}${t.time ? " · " : ""}` : ""}{t.time ? fmtTime(t.time) : showDate ? "" : "All day"}</span>
            {lead && <span className="truncate text-brand-600 dark:text-brand-300">{lead.name}</span>}
          </div>
        </button>
      </div>
    );
  };
  const SysRow = ({ e }) => {
    const S = SYS_STYLE[e.kind];
    return (
      <button onClick={() => e.leadId && setLeadId(e.leadId)} className={cx("flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm", e.leadId ? "hover:bg-slate-50 dark:hover:bg-slate-800/50" : "cursor-default")}>
        <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", S.pill)}><S.icon className="h-3.5 w-3.5" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-slate-700 dark:text-slate-200">{e.title}</span><span className="text-[11px] text-slate-400">{S.label}</span></span>
      </button>
    );
  };

  const listDates = useMemo(() => Object.keys(byDate).filter((d) => d >= addDays(today, -7)).sort().slice(0, 40), [byDate, today]);
  const dayItems = byDate[anchor] || [];
  const openLeads = leads.filter((l) => !["Won", "Lost"].includes(l.stage));

  return (
    <>
      <PageHeader title="Calendar" subtitle="Calls, meetings, demos and follow-ups — with outcomes and minutes."
        actions={<>
          <Tabs value={scope} onChange={setScope} tabs={[{ value: "all", label: "Everyone" }, { value: "mine", label: "My calendar" }]} />
          <Button variant="secondary" icon={Settings2} onClick={() => setCalSettings({ workFrom: "09:30", workTo: "19:00", workDays: [1, 2, 3, 4, 5, 6], gapMins: 15, alertMins: 10, officeAddress: "", ...cal })}>Settings</Button>
          <Button variant="secondary" icon={Lock} onClick={() => newAt(anchor, "14:00", "Blocked")}>Block time</Button>
          <Button icon={Plus} onClick={() => newAt(anchor >= today ? anchor : today)}>Schedule</Button>
        </>} />

      {alert && (
        <div className={cx("mb-5 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center",
          alert.kind === "now" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" : alert.mins <= (Number(cal.alertMins) || 10) ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900")}>
          <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", alert.kind === "now" ? "bg-emerald-500 text-white" : "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300")}>
            {alert.kind === "now" ? <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" /></span> : <Bell className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{alert.kind === "now" ? "Happening now" : `Next today · in ${alert.mins >= 60 ? `${Math.floor(alert.mins / 60)}h ${alert.mins % 60}m` : `${alert.mins} min`}`}: {alert.t.title}</p>
            <p className="text-xs text-slate-500">{fmtTime(alert.t.time)} · {alert.t.duration || 30} min · {alert.t.mode || alert.t.type}</p>
          </div>
          <div className="flex gap-2">
            {alert.t.meetLink && <Button size="sm" variant="success" icon={Video} onClick={() => window.open(alert.t.meetLink, "_blank")}>Join Meet</Button>}
            <Button size="sm" variant="secondary" onClick={() => setOpenId(alert.t.id)}>Open</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_330px]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="secondary" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
                <Button size="sm" variant="secondary" onClick={() => setAnchor(today)}>Today</Button>
                <h2 className="ml-1 text-base font-bold text-slate-900 dark:text-white sm:text-lg">{title}</h2>
              </div>
              <Tabs value={view} onChange={setView} tabs={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }, { value: "day", label: "Day" }, { value: "list", label: "List" }]} />
            </div>

            {(view === "week" || view === "day") && (
              <TimeGrid days={view === "week" ? weekDays : [anchor]} byDate={byDate} cal={cal} today={today} nowMin={nowMin}
                onSlot={(d, t) => newAt(d, t, "Meeting")} onOpen={(e) => setOpenId(e.id)} onOpenSys={(e) => e.leadId && setLeadId(e.leadId)} />
            )}

            {view === "month" && (
              <>
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                  {WEEK.map((d) => <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">{d}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {grid.map((iso, i) => {
                    const inMonth = iso.slice(0, 7) === anchor.slice(0, 7);
                    const items = byDate[iso] || [];
                    const isSel = iso === anchor;
                    return (
                      <div key={iso} role="button" tabIndex={0} onClick={() => setAnchor(iso)} onDoubleClick={() => newAt(iso)}
                        className={cx("group relative flex min-h-[64px] cursor-pointer flex-col border-b border-r border-slate-100 p-1.5 text-left transition sm:min-h-[104px] sm:p-2 dark:border-slate-800",
                          (i + 1) % 7 === 0 && "border-r-0", !inMonth && "bg-slate-50/60 dark:bg-slate-900/40",
                          isSel ? "bg-brand-50/70 ring-2 ring-inset ring-brand-400 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40")}>
                        <span className={cx("mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", iso === today ? "bg-brand-600 text-white" : inMonth ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-600")}>{Number(iso.slice(8))}</span>
                        <div className="hidden flex-1 space-y-1 sm:block">
                          {items.slice(0, 3).map((e) => (
                            <button key={e.id} onClick={(ev) => { ev.stopPropagation(); e.kind === "task" ? setOpenId(e.id) : e.leadId && setLeadId(e.leadId); }}
                              className={cx("block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium", e.kind === "task" ? cx(TYPE_STYLE[e.type]?.pill, ["Done", "Cancelled"].includes(statusOf(e)) && "line-through opacity-50") : SYS_STYLE[e.kind].pill)}>
                              {e.kind === "task" && e.time ? `${fmtTime(e.time).replace(":00", "")} ` : ""}{e.title}
                            </button>
                          ))}
                          {items.length > 3 && <p className="px-1 text-[11px] font-semibold text-slate-500">+{items.length - 3} more</p>}
                        </div>
                        {items.length > 0 && <div className="flex flex-wrap gap-0.5 sm:hidden">{items.slice(0, 4).map((e) => <span key={e.id} className={cx("h-1.5 w-1.5 rounded-full", e.kind === "task" ? TYPE_STYLE[e.type]?.dot : SYS_STYLE[e.kind].dot)} />)}</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {view === "list" && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {listDates.length === 0 && <EmptyState icon={CalendarDays} title="Nothing scheduled" />}
                {listDates.map((d) => (
                  <div key={d} className="grid gap-2 px-4 py-3 sm:grid-cols-[140px_1fr]">
                    <div>
                      <p className={cx("text-sm font-bold", d === today ? "text-brand-600 dark:text-brand-300" : d < today ? "text-slate-400" : "text-slate-800 dark:text-slate-100")}>{d === today ? "Today" : dayName(d, { weekday: "short", day: "numeric", month: "short" })}</p>
                      <p className="text-xs text-slate-400">{byDate[d].length} item{byDate[d].length > 1 ? "s" : ""}</p>
                    </div>
                    <div>{byDate[d].map((e) => (e.kind === "task" ? <TaskRow key={e.id} t={e} /> : <SysRow key={e.id} e={e} />))}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
              {TYPES.map((t) => <span key={t} className="flex items-center gap-1.5"><span className={cx("h-2 w-2 rounded-full", TYPE_STYLE[t].dot)} />{t}</span>)}
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />Lead follow-up</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-500" />Renewal</span>
              <span className="ml-auto hidden lg:inline">{view === "month" ? "Double-click a day to schedule" : view === "list" ? "" : "Click an empty slot to schedule"}</span>
            </div>
          </Card>

          {view === "month" && (
            <Card>
              <CardHeader title={anchor === today ? "Today" : dayName(anchor)} subtitle={`${dayItems.length} item${dayItems.length === 1 ? "" : "s"}`}
                action={<Button size="sm" variant="soft" icon={Plus} onClick={() => newAt(anchor)}>Add</Button>} />
              <div className="p-3">
                {dayItems.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Nothing on this day.</p>
                  : dayItems.map((e) => (e.kind === "task" ? <TaskRow key={e.id} t={e} /> : <SysRow key={e.id} e={e} />))}
              </div>
            </Card>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Add a follow-up" subtitle="Quickly book the next touchpoint" />
            <div className="space-y-3 p-5 pt-4">
              <Select value={quick.leadId} onChange={(e) => setQuick({ ...quick, leadId: e.target.value })} placeholder="Choose lead…" options={openLeads.map((l) => ({ value: l.id, label: `${l.name} · ${l.company}` }))} />
              <div className="flex flex-wrap gap-1.5">
                {[["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]].map(([l, n]) => (
                  <button key={l} onClick={() => setQuick({ ...quick, date: addDays(today, n) })} className={cx("rounded-md border px-2.5 py-1 text-xs font-semibold transition", quick.date === addDays(today, n) ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300")}>{l}</button>
                ))}
                <input type="date" value={quick.date} min={today} onChange={(e) => setQuick({ ...quick, date: e.target.value })} className="input !w-auto !py-1 text-xs" />
              </div>
              <Input value={quick.note} onChange={(e) => setQuick({ ...quick, note: e.target.value })} placeholder="Note (optional)" />
              <Button className="w-full" icon={Plus} onClick={addQuickFollowUp}>Add follow-up</Button>
            </div>
          </Card>
          {[
            ["overdue", "Overdue", AlarmClock, "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300", true],
            ["today", "Today", Clock, "text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300", false],
            ["upcoming", "Next 7 days", CalendarDays, "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300", true],
          ].map(([k, label, I, tone, showDate]) => (
            <Card key={k}>
              <div className="flex items-center justify-between px-5 pt-4">
                <div className="flex items-center gap-2.5">
                  <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg", tone)}><I className="h-4 w-4" /></span>
                  <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                </div>
                <span className={cx("rounded-full px-2 py-0.5 text-xs font-bold", tone)}>{agenda[k].length}</span>
              </div>
              <div className="max-h-72 overflow-y-auto p-3">
                {agenda[k].length === 0 ? <p className="py-5 text-center text-sm text-slate-400">{k === "overdue" ? "No overdue items 🎉" : "Nothing here"}</p>
                  : agenda[k].map((t) => <TaskRow key={t.id} t={t} showDate={showDate} />)}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Schedule / edit form ── */}
      <Modal open={!!form} onClose={() => setForm(null)} size="lg" title={form?.id ? "Edit entry" : form?.type === "Blocked" ? "Block time" : "Schedule"} subtitle={form?.type === "Blocked" ? "Only you see blocked time. Nobody can book you during it." : "Book a call, meeting, demo or follow-up."}
        footer={<>
          {conflict && <Button variant="secondary" onClick={() => save(true)}>Save anyway</Button>}
          <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
          <Button onClick={() => save(false)}>{form?.id ? "Save changes" : form?.type === "Blocked" ? "Block time" : "Schedule"}</Button>
        </>}>
        {form && (
          <div className="space-y-4">
            {conflict && <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"><AlarmClock className="h-4 w-4 shrink-0" />{conflict}</p>}
            <Field label="Type">
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button type="button" key={t} onClick={() => setForm((f) => ({ ...f, type: t, mode: t === "Call" ? "Phone" : f.mode === "Phone" && ["Meeting", "Demo"].includes(t) ? "Google Meet" : f.mode }))}
                    className={cx("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition", form.type === t ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300")}>
                    <span className={cx("h-2 w-2 rounded-full", TYPE_STYLE[t].dot)} />{t}
                  </button>
                ))}
              </div>
            </Field>

            {form.type === "Blocked" ? (
              <Field label="Label" required error={errs.title} hint="e.g. Focus time, Lunch, Site visit"><Input value={form.title} onChange={setF("title")} autoFocus /></Field>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="label !mb-0">Client {["Call", "Meeting", "Demo", "Payment follow-up"].includes(form.type) && <span className="text-rose-500">*</span>}</span>
                  <Tabs value={form.clientMode} onChange={(v) => setForm((f) => ({ ...f, clientMode: v }))} tabs={[{ value: "crm", label: "From CRM" }, { value: "other", label: "Not in the CRM" }]} />
                </div>
                {form.clientMode === "crm" ? (
                  <LeadPicker leads={leads.filter((l) => l.stage !== "Lost")} value={form.leadId} onChange={(id) => { const l = leadOf(id); setForm((f) => ({ ...f, leadId: id, clientEmail: f.clientEmail || l?.email || "" })); }} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={form.clientName} onChange={setF("clientName")} placeholder="Client name" />
                    <div><Input value={form.clientPhone} onChange={setF("clientPhone")} placeholder="Mobile number" />{errs.clientPhone && <p className="mt-1 text-xs font-medium text-rose-600">{errs.clientPhone}</p>}</div>
                  </div>
                )}
                {errs.client && <p className="-mt-2 text-xs font-medium text-rose-600">{errs.client}</p>}
                <Field label="Title" hint="Leave blank to use “Type — Client”"><Input value={form.title} onChange={setF("title")} placeholder={`${form.type} — ${form.clientMode === "crm" ? leadOf(form.leadId)?.company || "client" : form.clientName || "client"}`} /></Field>
              </>
            )}

            <div className={cx("grid gap-4", TIMED.includes(form.type) ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              <Field label="Date" error={errs.date}><Input type="date" value={form.date} onChange={setF("date")} /></Field>
              {TIMED.includes(form.type) && <Field label="Start" error={errs.time}><Input type="time" step="900" value={form.time} onChange={setF("time")} /></Field>}
              {TIMED.includes(form.type) && <Field label="Duration"><Select value={String(form.duration)} onChange={setF("duration")} options={DURATIONS.map((d) => ({ value: String(d), label: d >= 60 ? `${d / 60} hr${d > 60 ? "s" : ""}`.replace("1.5 hrs", "1½ hrs") : `${d} min` }))} /></Field>}
              {!TIMED.includes(form.type) && <Field label="Assign to"><Select value={form.assigneeId} onChange={setF("assigneeId")} options={db.users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))} /></Field>}
            </div>
            {TIMED.includes(form.type) && form.time && <p className="-mt-2 text-xs text-slate-500">Ends at {fmtTime(fromMin(toMin(form.time) + Number(form.duration || 30)))}</p>}

            {["Call", "Meeting", "Demo"].includes(form.type) && (
              <>
                <Field label="Mode">
                  <div className="grid grid-cols-3 gap-2">
                    {MODES.map((m) => { const I = MODE_ICON[m]; return (
                      <button type="button" key={m} onClick={() => setForm((f) => ({ ...f, mode: m, meetLink: m === "Google Meet" && !f.meetLink ? meetCode() : f.meetLink }))}
                        className={cx("flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition", form.mode === m ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300")}><I className="h-4 w-4" />{m === "Office" ? "Office meeting" : m === "Phone" ? "Phone call" : m}</button>
                    ); })}
                  </div>
                </Field>
                {form.mode === "Google Meet" && (
                  <Field label="Google Meet link">
                    <div className="flex gap-2"><Input value={form.meetLink} onChange={setF("meetLink")} placeholder="https://meet.google.com/…" /><Button type="button" variant="secondary" onClick={() => setForm((f) => ({ ...f, meetLink: meetCode() }))}>Generate</Button></div>
                  </Field>
                )}
                {form.mode === "Office" && <Field label="Office address"><Textarea rows={2} value={form.officeAddress} onChange={setF("officeAddress")} /></Field>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Client email" hint="An invite goes here once email is connected"><Input type="email" value={form.clientEmail} onChange={setF("clientEmail")} /></Field>
                  <Field label="Assign to"><Select value={form.assigneeId} onChange={setF("assigneeId")} options={db.users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))} /></Field>
                </div>
              </>
            )}
            {form.type === "Payment follow-up" && <Field label="Amount to collect (₹)" error={errs.amount} hint="Optional"><Input type="number" min="0" value={form.amount} onChange={setF("amount")} /></Field>}
            {form.type !== "Blocked" && <Field label="About / agenda"><Textarea value={form.notes} onChange={setF("notes")} placeholder="Agenda, talking points, links…" /></Field>}
            {form.assigneeId && form.type !== "Blocked" && <p className="flex items-center gap-2 text-xs text-slate-500"><Avatar name={userById(form.assigneeId)?.name || "?"} size="xs" />Shows in {userById(form.assigneeId)?.name}'s calendar</p>}
          </div>
        )}
      </Modal>

      {openTask && <EventDrawer t={openTask} onClose={() => setOpenId(null)} onEdit={editTask} onDelete={del} onOpenLead={(id) => { setOpenId(null); setLeadId(id); }} leadOf={leadOf} />}

      {/* ── Calendar settings ── */}
      <Modal open={!!calSettings} onClose={() => setCalSettings(null)} title="Calendar settings" subtitle="Working hours and reminders for the whole team."
        footer={<><Button variant="secondary" onClick={() => setCalSettings(null)}>Cancel</Button><Button onClick={() => { setSettings("calendar", { ...calSettings, gapMins: Number(calSettings.gapMins) || 0, alertMins: Number(calSettings.alertMins) || 0 }); setCalSettings(null); toast("Calendar settings saved"); }}>Save settings</Button></>}>
        {calSettings && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Working hours from"><Input type="time" value={calSettings.workFrom} onChange={(e) => setCalSettings({ ...calSettings, workFrom: e.target.value })} /></Field>
              <Field label="Working hours to"><Input type="time" value={calSettings.workTo} onChange={(e) => setCalSettings({ ...calSettings, workTo: e.target.value })} /></Field>
            </div>
            <Field label="Working days">
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const on = calSettings.workDays.includes(d);
                  return <button type="button" key={d} onClick={() => setCalSettings({ ...calSettings, workDays: on ? calSettings.workDays.filter((x) => x !== d) : [...calSettings.workDays, d] })}
                    className={cx("w-12 rounded-lg border py-1.5 text-xs font-semibold transition", on ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200" : "border-slate-200 text-slate-500 dark:border-slate-700")}>{WEEK[(d + 6) % 7]}</button>;
                })}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Gap between meetings (min)" hint="Used to warn about back-to-back bookings"><Input type="number" min="0" value={calSettings.gapMins} onChange={(e) => setCalSettings({ ...calSettings, gapMins: e.target.value })} /></Field>
              <Field label="“Next meeting” alert (min before)"><Input type="number" min="0" value={calSettings.alertMins} onChange={(e) => setCalSettings({ ...calSettings, alertMins: e.target.value })} /></Field>
            </div>
            <Field label="Office address" hint="Pre-filled for office meetings"><Textarea rows={2} value={calSettings.officeAddress} onChange={(e) => setCalSettings({ ...calSettings, officeAddress: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      {leadId && <LeadDrawer leadId={leadId} onClose={() => setLeadId(null)} />}
    </>
  );
}

/* ── Entry detail drawer ── */
function EventDrawer({ t, onClose, onEdit, onDelete, onOpenLead, leadOf: lo }) {
  const { add, update, user, userById } = useStore();
  const toast = useToast();
  const today = todayISO();
  const setStatus = (task, status, msg) => { update("tasks", task.id, { status, done: status === "Done" }); toast(msg); };
  const lead = lo(t.leadId);
  const st = statusOf(t);
  const phone = lead?.phone || t.clientPhone;
  const client = lead ? `${lead.name} · ${lead.company}` : t.clientName;
  const [sum, setSum] = useState(null);
  const [resched, setResched] = useState(null);
  const MI = MODE_ICON[t.mode];
  const timed = isTimed(t);
  const saveSummary = () => {
    if (!sum.summary.trim()) return toast("Write a short summary first", "error");
    update("tasks", t.id, { outcome: sum.outcome, summary: sum.summary.trim(), status: "Done", done: true });
    if (t.leadId) {
      update("leads", t.leadId, (l) => ({
        activities: [{ id: uid("a"), type: "meeting", text: `${t.type} summary — ${sum.outcome}. ${sum.summary.trim()}`, at: new Date().toISOString(), by: user.id }, ...(l.activities || [])],
        ...(sum.next ? { nextFollowUp: sum.next } : {}),
      }));
    }
    if (sum.next) add("tasks", { title: `Follow-up — ${lead?.company || t.clientName || t.title}`, type: "Follow-up", date: sum.next, time: "", duration: 0, mode: "Phone", leadId: t.leadId || "", clientName: t.clientName || "", clientPhone: t.clientPhone || "", assigneeId: t.assigneeId, notes: `After ${t.type.toLowerCase()}: ${sum.outcome}`, status: "Upcoming", done: false, outcome: "", summary: "", meetLink: "" }, "T");
    toast(sum.next ? `Summary saved · follow-up on ${fmtDate(sum.next)}` : "Meeting summary saved");
    setSum(null);
  };
  const wa = () => {
    if (!phone) return toast("No phone number for this client", "error");
    const msg = timed ? `Hi ${lead?.name?.split(" ")[0] || t.clientName || ""}, this is a reminder for our ${t.type.toLowerCase()} on ${fmtDate(t.date)} at ${fmtTime(t.time)}.${t.meetLink ? ` Join here: ${t.meetLink}` : ""}` : `Hi ${lead?.name?.split(" ")[0] || t.clientName || ""}, following up as discussed.${t.amount ? ` The pending amount is ${inr(t.amount)}.` : ""}`;
    window.open(`https://wa.me/91${digits(phone)}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  return (
    <Drawer open onClose={onClose} width="max-w-lg" title={t.title}
      subtitle={<span className="flex flex-wrap items-center gap-1.5 pt-1"><Badge className={TYPE_STYLE[t.type]?.pill}>{t.type}</Badge><Badge className={STATUS_STYLE[st]}>{st}</Badge>{t.outcome && <Badge className="bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">{t.outcome}</Badge>}</span>}
      footer={<>
        <Button variant="ghost" icon={Trash2} className="mr-auto !text-rose-600" onClick={() => onDelete(t)}>{t.type === "Blocked" ? "Remove block" : "Delete"}</Button>
        <Button variant="secondary" icon={Pencil} onClick={() => onEdit(t)}>Edit</Button>
      </>}>
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-[11px] font-semibold uppercase text-slate-400">When</p><p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{fmtDate(t.date)}</p><p className="text-xs text-slate-500">{timed ? `${fmtTime(t.time)} – ${fmtTime(fromMin(toMin(t.time) + (Number(t.duration) || 30)))}` : "All day"}</p></div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-[11px] font-semibold uppercase text-slate-400">{t.type === "Payment follow-up" ? "Amount" : "Mode"}</p><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{t.type === "Payment follow-up" ? <><IndianRupee className="h-3.5 w-3.5" />{t.amount ? inr(t.amount).replace("₹", "") : "—"}</> : <>{MI && <MI className="h-4 w-4 text-slate-400" />}{t.mode || "—"}</>}</p><p className="text-xs text-slate-500">{userById(t.assigneeId)?.name || ""}</p></div>
        </div>
        {t.type === "Blocked" ? <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"><Lock className="h-4 w-4" />Only you see this. Nobody can book you during this time.</p> : (
          <>
            {client && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <Avatar name={lead?.name || t.clientName || "?"} />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-800 dark:text-slate-100">{client}</p><p className="text-xs text-slate-500">{phone || "No phone"}{t.clientEmail ? ` · ${t.clientEmail}` : ""}{!lead && " · Not in the CRM"}</p></div>
                {lead && <Button size="sm" variant="soft" onClick={() => onOpenLead(lead.id)}>Open lead</Button>}
              </div>
            )}
            {t.meetLink && <a href={t.meetLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"><Video className="h-4 w-4 shrink-0" />{t.meetLink}</a>}
            {t.mode === "Office" && t.officeAddress && <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><Building className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{t.officeAddress}</p>}
            {t.notes && <div><p className="label">About</p><p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{t.notes}</p></div>}
            {t.summary && <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/5"><p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300"><ClipboardCheck className="h-3.5 w-3.5" />Meeting summary</p><p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{t.summary}</p></div>}

            <div className="flex flex-wrap gap-2">
              {t.meetLink && st === "Upcoming" && <Button size="sm" variant="success" icon={Video} onClick={() => window.open(t.meetLink, "_blank")}>Join Meet</Button>}
              <Button size="sm" variant="secondary" icon={MessageCircle} onClick={wa}>WhatsApp</Button>
              {phone && <Button size="sm" variant="secondary" icon={PhoneCall} onClick={() => window.open(`tel:${digits(phone)}`)}>Call</Button>}
              {st === "Upcoming" && <Button size="sm" variant="secondary" icon={Check} onClick={() => setStatus(t, "Done", "Marked done 🎉")}>Mark done</Button>}
              {st === "Upcoming" && timed && <Button size="sm" variant="secondary" icon={UserX} onClick={() => {
                setStatus(t, "No-show", "Marked as no-show — reschedule reminder added");
                add("tasks", { title: `Reschedule — ${lead?.company || t.clientName || t.title}`, type: "Follow-up", date: addDays(today, 1), time: "", duration: 0, mode: "Phone", leadId: t.leadId || "", assigneeId: t.assigneeId, notes: "Client didn't join. Call to reschedule.", status: "Upcoming", done: false, outcome: "", summary: "", meetLink: "" }, "T");
              }}>No-show</Button>}
              {st === "Upcoming" && <Button size="sm" variant="secondary" icon={XCircle} onClick={() => setStatus(t, "Cancelled", "Cancelled")}>Cancel</Button>}
              {st !== "Upcoming" && <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setStatus(t, "Upcoming", "Reopened")}>Reopen</Button>}
              <Button size="sm" variant="secondary" icon={CalendarDays} onClick={() => setResched({ date: t.date, time: t.time || "11:00" })}>Reschedule</Button>
              {["Meeting", "Demo"].includes(t.type) && <Button size="sm" variant="secondary" icon={Phone} onClick={() => { update("tasks", t.id, { type: "Call", mode: "Phone", meetLink: "" }); toast("Turned into a phone call"); }}>Turn into a call</Button>}
            </div>

            {resched && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reschedule</p>
                <div className="grid grid-cols-2 gap-3"><Input type="date" value={resched.date} onChange={(e) => setResched({ ...resched, date: e.target.value })} />{timed && <Input type="time" value={resched.time} onChange={(e) => setResched({ ...resched, time: e.target.value })} />}</div>
                <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setResched(null)}>Cancel</Button><Button size="sm" onClick={() => { update("tasks", t.id, { date: resched.date, time: timed ? resched.time : t.time, status: "Upcoming", done: false }); setResched(null); toast(`Moved to ${fmtDate(resched.date)}`); }}>Move</Button></div>
              </div>
            )}

            {["Call", "Meeting", "Demo"].includes(t.type) && st !== "Cancelled" && (sum ? (
              <div className="space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Meeting summary (MOM)</p>
                <Field label="Outcome"><Select value={sum.outcome} onChange={(e) => setSum({ ...sum, outcome: e.target.value })} options={OUTCOMES} /></Field>
                <Field label="Summary"><Textarea rows={4} value={sum.summary} onChange={(e) => setSum({ ...sum, summary: e.target.value })} placeholder="What was discussed, decisions, next steps…" /></Field>
                <Field label="Next follow-up (adds to calendar)"><Input type="date" min={today} value={sum.next} onChange={(e) => setSum({ ...sum, next: e.target.value })} /></Field>
                <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setSum(null)}>Cancel</Button><Button size="sm" onClick={saveSummary}>Save summary</Button></div>
              </div>
            ) : (
              <Button variant="soft" className="w-full" icon={ClipboardCheck} onClick={() => setSum({ outcome: t.outcome || OUTCOMES[0], summary: t.summary || "", next: addDays(today, 3) })}>{t.summary ? "Edit meeting summary" : "Add meeting summary"}</Button>
            ))}
            {lead && <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => onOpenLead(lead.id)}>Open lead profile</Button>}
          </>
        )}
      </div>
    </Drawer>
  );
}
