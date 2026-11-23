// Monthly services + additional work: forms, cards and the record-payment modal.
import { useState } from "react";
import { ChevronDown, ChevronRight, Pause, Play, Pencil, Trash2, HandCoins, CalendarDays, X, Wrench, Repeat } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Badge, Button, Field, Input, Modal, Select, Textarea, Toggle, cx, useConfirm, Progress } from "../../components/ui";
import { fmtDate, inr, todayISO, uid } from "../../utils/format";
import { GstPicker, ProjectPicker } from "./Common";
import { EXTRA_STATUSES, EXTRA_STYLE, MONTH_STATUS_LABEL, MONTH_STATUS_STYLE, PAY_MODES, SERVICE_TYPES, monthName, serviceSchedule, serviceSummary, sumPay, withGst } from "./deliveryUtils";

/* ── Record payment (monthly month or extra) ── */
export function PaymentModal({ open, onClose, title, subtitle, defaultAmount = 0, allowSkip = false, onSave }) {
  const [f, setF] = useState(null);
  const [err, setErr] = useState("");
  const [was, setWas] = useState(false);
  if (open !== was) { setWas(open); setF(open ? { amount: defaultAmount || "", date: todayISO(), mode: "UPI", ref: "", note: "", skipped: false } : null); setErr(""); }
  const save = () => {
    if (!f.skipped && !(Number(f.amount) > 0)) return setErr("Enter the amount received");
    onSave({ id: uid("pay"), amount: f.skipped ? 0 : Number(f.amount), date: f.date, mode: f.skipped ? "" : f.mode, ref: f.ref.trim(), note: f.note.trim(), ...(f.skipped ? { skipped: true } : {}) });
  };
  return (
    <Modal open={open && !!f} onClose={onClose} title={title} subtitle={subtitle} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{f?.skipped ? "Skip month" : "Record payment"}</Button></>}>
      {f && (
        <div className="space-y-4">
          {allowSkip && <Toggle checked={f.skipped} onChange={(v) => setF({ ...f, skipped: v })} label="Skip this month (not billed — e.g. service paused)" />}
          {!f.skipped && (
            <>
              <Field label="Amount received (₹)" required error={err}><Input type="number" autoFocus value={f.amount} onChange={(e) => { setF({ ...f, amount: e.target.value }); setErr(""); }} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
                <Field label="Mode"><Select options={PAY_MODES} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} /></Field>
              </div>
              <Field label="UTR / Reference"><Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="e.g. UTR 4821…" /></Field>
            </>
          )}
          <Field label="Note"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Optional" /></Field>
        </div>
      )}
    </Modal>
  );
}

/* ── Monthly service form ── */
export function ServiceForm({ svc, defaultProjectId, onClose }) {
  const { db, add, update } = useStore();
  const toast = useToast();
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const open = svc !== null && svc !== undefined;
  const [last, setLast] = useState(null);
  if (svc !== last) { setLast(svc); setErrors({}); setF(open ? { projectId: defaultProjectId || "", types: [], name: "", amount: "", gstRate: 18, billDay: 5, startDate: todayISO(), endDate: "", notes: "", ...(svc || {}), nameTouched: !!svc?.id } : null); }
  const toggleType = (t) => {
    const types = f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t];
    setF({ ...f, types, name: f.nameTouched ? f.name : types.join(" + ") });
  };
  const save = () => {
    const e = {};
    if (!f.projectId) e.projectId = "Pick a project";
    if (!f.name.trim()) e.name = "Service name is required";
    if (!(Number(f.amount) > 0)) e.amount = "Enter the monthly amount";
    if (!f.startDate) e.startDate = "Start date is required";
    setErrors(e);
    if (Object.keys(e).length) return;
    const p = (db.projects || []).find((x) => x.id === f.projectId);
    const rec = { projectId: f.projectId, client: p?.client || "", types: f.types, name: f.name.trim(), amount: Number(f.amount), gstRate: Number(f.gstRate) || 0, billDay: Math.min(28, Math.max(1, Number(f.billDay) || 1)), startDate: f.startDate, endDate: f.endDate, notes: f.notes };
    if (svc?.id) { update("monthlyServices", svc.id, rec); toast("Monthly service updated"); }
    else { add("monthlyServices", { ...rec, active: true, payments: [] }, "MS"); toast("Monthly service added"); }
    onClose();
  };
  return (
    <Modal open={open && !!f} onClose={onClose} title={svc?.id ? "Edit monthly service" : "Add monthly service"} subtitle="Recurring retainers like SEO, Ads, AMC and hosting" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{svc?.id ? "Save changes" : "Add service"}</Button></>}>
      {f && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project" required error={errors.projectId} className="sm:col-span-2"><ProjectPicker value={f.projectId} onChange={(v) => setF({ ...f, projectId: v })} /></Field>
          <Field label="Service types" className="sm:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_TYPES.map((t) => (
                <button type="button" key={t} onClick={() => toggleType(t)} className={cx("rounded-full px-3 py-1 text-xs font-semibold ring-1 transition", f.types.includes(t) ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700")}>{t}</button>
              ))}
            </div>
          </Field>
          <Field label="Service name" required error={errors.name} hint="Follows the selected types until you type your own" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, nameTouched: true })} /></Field>
          <Field label="Monthly amount (before GST)" required error={errors.amount}><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Bill on day (1–28)"><Input type="number" min={1} max={28} value={f.billDay} onChange={(e) => setF({ ...f, billDay: e.target.value })} /></Field>
          <div className="sm:col-span-2"><GstPicker amount={f.amount} rate={f.gstRate} showGstin={false} onChange={(patch) => setF({ ...f, ...patch })} /></div>
          <Field label="Start date" required error={errors.startDate}><Input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label="End date" hint="Leave blank for ongoing"><Input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
      )}
    </Modal>
  );
}

/* ── Additional work form ── */
export function ExtraForm({ extra, defaultProjectId, onClose }) {
  const { db, add, update } = useStore();
  const toast = useToast();
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const open = extra !== null && extra !== undefined;
  const [last, setLast] = useState(null);
  if (extra !== last) { setLast(extra); setErrors({}); setF(open ? { projectId: defaultProjectId || "", title: "", description: "", amount: "", gstRate: 18, requestedOn: todayISO(), status: "Quoted", ...(extra || {}) } : null); }
  const save = () => {
    const e = {};
    if (!f.projectId) e.projectId = "Pick a project";
    if (!f.title.trim()) e.title = "Describe the work";
    if (!(Number(f.amount) > 0)) e.amount = "Enter the amount";
    setErrors(e);
    if (Object.keys(e).length) return;
    const p = (db.projects || []).find((x) => x.id === f.projectId);
    const rec = { projectId: f.projectId, client: p?.client || "", title: f.title.trim(), description: f.description, amount: Number(f.amount), gstRate: Number(f.gstRate) || 0, requestedOn: f.requestedOn, status: f.status };
    if (extra?.id) { update("extras", extra.id, rec); toast("Additional work updated"); }
    else { add("extras", { ...rec, payments: [] }, "EX"); toast("Additional work added"); }
    onClose();
  };
  return (
    <Modal open={open && !!f} onClose={onClose} title={extra?.id ? "Edit additional work" : "Add additional work"} subtitle="Change requests billed on top of the original deal" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{extra?.id ? "Save changes" : "Add work"}</Button></>}>
      {f && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project" required error={errors.projectId} className="sm:col-span-2"><ProjectPicker value={f.projectId} onChange={(v) => setF({ ...f, projectId: v })} /></Field>
          <Field label="Work" required error={errors.title} className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. 3 extra landing pages" /></Field>
          <Field label="Details" className="sm:col-span-2"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Amount (before GST)" required error={errors.amount}><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Requested on"><Input type="date" value={f.requestedOn} onChange={(e) => setF({ ...f, requestedOn: e.target.value })} /></Field>
          <div className="sm:col-span-2"><GstPicker amount={f.amount} rate={f.gstRate} showGstin={false} onChange={(patch) => setF({ ...f, ...patch })} /></div>
          <Field label="Status"><Select options={EXTRA_STATUSES} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} /></Field>
        </div>
      )}
    </Modal>
  );
}

/* ── Monthly service card with expandable month schedule ── */
export function ServiceCard({ s, onEdit, canWrite = true, compact = false }) {
  const { update, remove } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [payFor, setPayFor] = useState(null);
  const today = todayISO();
  const sum = serviceSummary(s, today);
  const sched = serviceSchedule(s, today);
  const amount = withGst(s.amount, s.gstRate);
  const cur = sum.cur;
  const target = sum.oldestDue;

  const record = (pay) => {
    update("monthlyServices", s.id, (r) => ({ payments: [...(r.payments || []), { ...pay, month: payFor.ym }] }));
    toast(pay.skipped ? `${monthName(payFor.ym)} skipped` : `₹${pay.amount.toLocaleString("en-IN")} recorded for ${monthName(payFor.ym)}`);
    setPayFor(null);
  };
  const delPay = (pid) => update("monthlyServices", s.id, (r) => ({ payments: (r.payments || []).filter((p) => p.id !== pid) }));
  const stopResume = () => {
    if (s.active === false) { update("monthlyServices", s.id, { active: true, endDate: "" }); toast("Service resumed"); }
    else { update("monthlyServices", s.id, { active: false, endDate: today }); toast("Service stopped from today"); }
  };
  const del = async () => { if (await confirm({ title: "Delete monthly service?", message: `"${s.name}" and its payment history will be removed.` })) { remove("monthlyServices", s.id); toast("Service deleted"); } };

  return (
    <div className="card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Repeat className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-slate-900 dark:text-white">{s.name}</p>
              <Badge className={s.active === false ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}>{s.active === false ? "Stopped" : "Active"}</Badge>
              {cur && <Badge className={MONTH_STATUS_STYLE[cur.status]}>{monthName(cur.ym).split(" ")[0]}: {MONTH_STATUS_LABEL[cur.status]}</Badge>}
            </div>
            {!compact && <p className="mt-0.5 truncate text-sm text-slate-500">{s.client}</p>}
            <p className="mt-1 text-xs text-slate-500">{inr(amount)}/month {Number(s.gstRate) > 0 && `(incl. ${s.gstRate}% GST)`} · bills on day {s.billDay} · {fmtDate(s.startDate)} → {s.endDate ? fmtDate(s.endDate) : "ongoing"}</p>
            {s.types?.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{s.types.map((t) => <span key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t}</span>)}</div>}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[["Billed so far", inr(sum.billed), ""], ["Collected", inr(sum.collected), "text-emerald-600"], ["Overdue", sum.overdue ? `${inr(sum.overdue)}` : "—", sum.overdue ? "text-rose-600" : ""]].map(([l, v, t]) => (
            <div key={l} className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-800/50"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className={cx("text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100", t)}>{v}</p>{l === "Overdue" && sum.overdueMonths > 0 && <p className="text-[10px] text-rose-500">{sum.overdueMonths} month{sum.overdueMonths > 1 ? "s" : ""}</p>}</div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}Months ({sched.length})</Button>
          {canWrite && <>
            <Button size="sm" variant="ghost" icon={s.active === false ? Play : Pause} onClick={stopResume}>{s.active === false ? "Resume" : "Stop"}</Button>
            {onEdit && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(s)}>Edit</Button>}
            <Button size="sm" variant="ghost" icon={Trash2} onClick={del} className="text-rose-600">Delete</Button>
            {target && <Button size="sm" className="ml-auto" icon={HandCoins} onClick={() => setPayFor(target)}>Record {monthName(target.ym).split(" ")[0]}</Button>}
          </>}
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
          {[...sched].reverse().map((r) => (
            <div key={r.ym} className="border-b border-slate-100 px-4 py-2.5 last:border-0 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-20 font-semibold text-slate-700 dark:text-slate-200">{monthName(r.ym)}</span>
                <span className="text-xs text-slate-400">due {fmtDate(r.due)}</span>
                <Badge className={MONTH_STATUS_STYLE[r.status]}>{MONTH_STATUS_LABEL[r.status]}</Badge>
                <span className="ml-auto text-xs tabular-nums text-slate-600 dark:text-slate-300">{inr(r.paid)} / {inr(r.amount)}</span>
                {canWrite && r.status !== "upcoming" && r.status !== "paid" && r.status !== "skipped" && <Button size="sm" variant="soft" onClick={() => setPayFor(r)}>Record</Button>}
              </div>
              {r.payments.map((p) => (
                <div key={p.id} className="group mt-1 flex items-center gap-2 pl-[5.5rem] text-xs text-slate-500">
                  <span>{p.skipped ? "Skipped" : `${inr(p.amount)} · ${fmtDate(p.date)} · ${p.mode}${p.ref ? ` · ${p.ref}` : ""}`}{p.note ? ` · ${p.note}` : ""}</span>
                  {canWrite && <button onClick={() => delPay(p.id)} className="rounded p-0.5 text-slate-300 opacity-0 hover:text-rose-500 group-hover:opacity-100"><X className="h-3 w-3" /></button>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <PaymentModal open={!!payFor} onClose={() => setPayFor(null)} allowSkip title={`Record ${payFor ? monthName(payFor.ym) : ""}`} subtitle={`${s.name} · ${s.client}`} defaultAmount={payFor?.balance || amount} onSave={record} />
    </div>
  );
}

/* ── Additional work card ── */
export function ExtraCard({ x, onEdit, canWrite = true, compact = false }) {
  const { update, remove } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [pay, setPay] = useState(false);
  const total = withGst(x.amount, x.gstRate);
  const received = sumPay(x.payments);
  const balance = x.status === "Cancelled" ? 0 : Math.max(0, total - received);
  const del = async () => { if (await confirm({ title: "Delete additional work?", message: `"${x.title}" will be removed.` })) { remove("extras", x.id); toast("Removed"); } };
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Wrench className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900 dark:text-white">{x.title}</p><Badge className={EXTRA_STYLE[x.status]}>{x.status}</Badge></div>
          {!compact && <p className="text-sm text-slate-500">{x.client}</p>}
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><CalendarDays className="h-3 w-3" />Requested {fmtDate(x.requestedOn)}</p>
          {x.description && <p className="mt-1 text-xs text-slate-500">{x.description}</p>}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5 text-center">
        {[["Amount", inr(x.amount)], ["GST", inr(total - x.amount)], ["Total", inr(total)], ["Received", inr(received), "text-emerald-600"], ["Balance", inr(balance), balance ? "text-rose-600" : ""]].map(([l, v, t]) => (
          <div key={l} className="rounded-lg bg-slate-50 px-1 py-1.5 dark:bg-slate-800/50"><p className="text-[10px] font-semibold uppercase text-slate-400">{l}</p><p className={cx("text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100", t)}>{v}</p></div>
        ))}
      </div>
      <Progress value={total ? (received / total) * 100 : 0} tone="bg-emerald-500" className="mt-2.5" />
      {x.payments?.length > 0 && <div className="mt-2 space-y-0.5">{x.payments.map((p) => <p key={p.id} className="text-xs text-slate-500">{inr(p.amount)} · {fmtDate(p.date)} · {p.mode}{p.ref ? ` · ${p.ref}` : ""}</p>)}</div>}
      {canWrite && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={x.status} onChange={(e) => { update("extras", x.id, { status: e.target.value }); toast(`Marked ${e.target.value}`); }} className="input h-8 w-auto py-0 text-xs">
            {EXTRA_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {onEdit && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(x)}>Edit</Button>}
          <Button size="sm" variant="ghost" icon={Trash2} className="text-rose-600" onClick={del}>Delete</Button>
          {balance > 0 && <Button size="sm" className="ml-auto" icon={HandCoins} onClick={() => setPay(true)}>Record payment</Button>}
        </div>
      )}
      <PaymentModal open={pay} onClose={() => setPay(false)} title="Record payment" subtitle={`${x.title} · ${x.client}`} defaultAmount={balance}
        onSave={(p) => { update("extras", x.id, (r) => ({ payments: [...(r.payments || []), p] })); toast(`₹${p.amount.toLocaleString("en-IN")} recorded`); setPay(false); }} />
    </div>
  );
}
