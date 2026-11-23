import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame, Phone, ArrowUpRight, Check, Wallet, CalendarClock, UserPlus, FileClock, Truck, RefreshCcw, Pin, PinOff, Trash2, Plus, StickyNote,
  HandCoins, Eye, EyeOff, Search, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Progress, cx, useConfirm } from "../../components/ui";
import { compactInr, fmtDate, inr, timeAgo, uid } from "../../utils/format";
import {
  addDays, allPayments, daysBetween, invBalance, isOpenLead, leadLastActivity, monthKey, projectMoney, revenueTarget, sumBy, telLink, thisMonth, todayISO,
} from "./ownerData";

const PRI = ["Critical", "High", "Medium", "Low"];
const PRI_STYLE = {
  Critical: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
  High: { dot: "bg-orange-500", chip: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300" },
  Medium: { dot: "bg-amber-400", chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  Low: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};
const TYPE_ICON = { "Collect Payment": Wallet, "Follow-up Due": CalendarClock, "Convert Enquiry": UserPlus, "Chase Approval": FileClock, "Overdue Delivery": Truck, "Re-engage Lead": RefreshCcw };

const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } } };

function HealthRing({ score }) {
  const r = 52, c = 2 * Math.PI * r;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-slate-800" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} style={{ transition: "stroke-dashoffset .6s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{score}</span>
        <span className="text-[11px] text-slate-500">of 100</span>
      </div>
    </div>
  );
}

export default function OwnerDesk() {
  const { db, user, add, update, remove } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const today = todayISO();
  const doneKey = `nexora_desk_done_${today}`;
  const [done, setDone] = useState(() => ls.get(doneKey, {}));
  const [showDone, setShowDone] = useState(false);
  const [note, setNote] = useState("");
  const [cmForm, setCmForm] = useState(null);
  const [streak, setStreak] = useState(1);

  useEffect(() => { ls.set(doneKey, done); }, [done, doneKey]);
  // Day streak: consecutive days the desk was opened
  useEffect(() => {
    const days = new Set(ls.get("nexora_desk_days", []));
    days.add(today);
    ls.set("nexora_desk_days", [...days].slice(-60));
    let n = 0; let d = today;
    while (days.has(d)) { n += 1; d = addDays(d, -1); }
    setStreak(n);
  }, [today]);

  const data = useMemo(() => {
    const projects = (db.projects || []).map((p) => ({ ...p, ...projectMoney(p, db) }));
    const leads = db.leads || [];
    const open = leads.filter(isOpenLead);
    const items = [];
    const push = (it) => items.push(it);

    projects.filter((p) => p.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 8).forEach((p) => {
      const overdueInv = p.invoices.some((i) => invBalance(i) > 0 && i.dueDate && i.dueDate < today);
      push({ id: `pay-${p.id}`, type: "Collect Payment", priority: p.balance >= 100000 && (p.done || p.pastEnd) ? "Critical" : overdueInv ? "High" : "Medium", title: `Collect ${inr(p.balance)} from ${p.client}`, sub: `${p.stage} · ${p.pctPaid}% paid`, phone: p.phone, to: `/projects?open=${p.id}`, amount: p.balance });
    });
    open.filter((l) => l.nextFollowUp && l.nextFollowUp <= today).forEach((l) => {
      push({ id: `fu-${l.id}`, type: "Follow-up Due", priority: l.nextFollowUp < today ? "High" : "Medium", title: `Follow up with ${l.name}`, sub: `${l.company} · ${l.nextFollowUp < today ? `due ${fmtDate(l.nextFollowUp)}` : "due today"}`, phone: l.phone, to: `/leads?open=${l.id}`, amount: l.value });
    });
    open.filter((l) => l.stage === "New").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).forEach((l) => {
      push({ id: `cv-${l.id}`, type: "Convert Enquiry", priority: daysBetween(l.createdAt.slice(0, 10)) <= 2 ? "High" : "Medium", title: `Call new enquiry: ${l.name}`, sub: `${l.service} · ${l.source} · ${timeAgo(l.createdAt)}`, phone: l.phone, to: `/leads?open=${l.id}`, amount: l.value });
    });
    (db.quotations || []).filter((q) => ["Sent", "Negotiation"].includes(q.status) && daysBetween(q.date) >= 3).forEach((q) => {
      push({ id: `qa-${q.id}`, type: "Chase Approval", priority: daysBetween(q.date) > 7 ? "High" : "Medium", title: `Chase approval for ${q.number}`, sub: `${q.client?.company} · sent ${daysBetween(q.date)} days ago`, phone: q.client?.phone, to: `/quotations?open=${q.id}` });
    });
    projects.filter((p) => p.pastEnd).forEach((p) => {
      const late = daysBetween(p.deadline);
      push({ id: `od-${p.id}`, type: "Overdue Delivery", priority: late > 14 ? "Critical" : "High", title: `${p.client} is ${late} days past deadline`, sub: `${p.stage} · ${p.service}`, phone: p.phone, to: `/projects?open=${p.id}` });
    });
    open.filter((l) => l.stage !== "New" && daysBetween(leadLastActivity(l)) >= 14).slice(0, 6).forEach((l) => {
      push({ id: `re-${l.id}`, type: "Re-engage Lead", priority: "Low", title: `Re-engage ${l.name}`, sub: `${l.company} · quiet for ${daysBetween(leadLastActivity(l))} days`, phone: l.phone, to: `/leads?open=${l.id}`, amount: l.value });
    });

    // Business health score
    const month = thisMonth();
    const collected = sumBy(allPayments(db).filter((p) => monthKey(p.date) === month), "amount");
    const target = revenueTarget(db, month) || 1;
    const won = leads.filter((l) => l.stage === "Won").length, lost = leads.filter((l) => l.stage === "Lost").length;
    const winRate = won + lost ? won / (won + lost) : 0;
    const overdueFu = open.filter((l) => l.nextFollowUp && l.nextFollowUp < today).length;
    const critical = items.filter((i) => i.priority === "Critical").length;
    const parts = {
      collections: Math.round(30 * Math.min(1, collected / target)),
      conversion: Math.round(20 * Math.min(1, winRate / 0.5)),
      followups: Math.round(25 * (1 - Math.min(1, overdueFu / Math.max(open.length, 1)))),
      urgency: Math.round(25 * (1 - Math.min(1, critical / 5))),
    };
    const pipeline = sumBy(open, "value");
    const deal = sumBy(projects, "total");
    const received = sumBy(projects, "received");
    const soon = sumBy((db.commitments || []).filter((c) => !c.collected && c.expectedDate <= addDays(today, 7)), "amount")
      + sumBy((db.invoices || []).filter((i) => i.dueDate >= today && i.dueDate <= addDays(today, 7)), invBalance);
    return { items, parts, score: parts.collections + parts.conversion + parts.followups + parts.urgency, pipeline, deal, received, soon, collected, target };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, today]);

  const visible = data.items.filter((i) => showDone || !done[i.id]);
  const doneCount = data.items.filter((i) => done[i.id]).length;
  const criticalLeft = data.items.filter((i) => i.priority === "Critical" && !done[i.id]).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const notes = [...(db.ownerNotes || [])].sort((a, b) => (b.pinned - a.pinned) || b.at.localeCompare(a.at));
  const addNote = () => {
    if (!note.trim()) return;
    add("ownerNotes", { text: note.trim(), pinned: false, at: new Date().toISOString() }, "on");
    setNote(""); toast("Note added");
  };

  const commitments = [...(db.commitments || [])].sort((a, b) => (a.collected - b.collected) || a.expectedDate.localeCompare(b.expectedDate));
  const collect = (c) => {
    // Apply the money to the oldest unpaid invoice of that lead/project, if one exists
    const leadId = c.leadId || (db.projects || []).find((p) => p.id === c.projectId)?.leadId;
    const inv = (db.invoices || []).filter((i) => i.leadId === leadId && invBalance(i) > 0 && i.status !== "Cancelled").sort((a, b) => a.date.localeCompare(b.date))[0];
    if (inv) {
      const amt = Math.min(Number(c.amount) || 0, invBalance(inv));
      update("invoices", inv.id, (i) => {
        const payments = [...(i.payments || []), { id: uid("p"), date: today, amount: amt, mode: "Bank Transfer", ref: "Owner's Desk commitment" }];
        const paid = sumBy(payments, "amount");
        const total = invBalance(i) + sumBy(i.payments || [], "amount");
        return { payments, status: paid >= total ? "Paid" : "Partially Paid" };
      });
      toast(`${inr(amt)} recorded against ${inv.number}`);
    } else toast("Marked collected (no open invoice found to apply it to)", "info");
    update("commitments", c.id, { collected: true, collectedOn: today });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cx("text-sm", criticalLeft ? "font-medium text-rose-600" : "text-slate-500")}>
            {criticalLeft ? `${criticalLeft} critical task${criticalLeft === 1 ? "" : "s"} need you today` : "No critical tasks — great day to grow the pipeline"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"><Flame className="h-4 w-4" />{streak}-day streak</span>
          <span className="text-sm text-slate-500">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
      </div>

      {/* Health + money strip */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_2fr]">
        <Card className="flex flex-col items-center gap-5 p-5 sm:flex-row">
          <HealthRing score={data.score} />
          <div className="w-full flex-1 space-y-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Business health score</p>
            {[["Collections", data.parts.collections, 30], ["Conversion", data.parts.conversion, 20], ["Follow-ups on time", data.parts.followups, 25], ["Urgent items clear", data.parts.urgency, 25]].map(([l, v, max]) => (
              <div key={l}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-600 dark:text-slate-300">{l}</span><span className="font-semibold text-slate-800 dark:text-slate-200">{v}/{max}</span></div>
                <Progress value={(v / max) * 100} tone={v / max >= 0.7 ? "bg-emerald-500" : v / max >= 0.4 ? "bg-amber-400" : "bg-rose-400"} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="grid grid-cols-2 divide-slate-100 dark:divide-slate-800 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          {[
            ["Total pipeline", compactInr(data.pipeline), "open deals"],
            ["Total deal value", compactInr(data.deal), "all projects"],
            ["Collected", compactInr(data.received), `${data.deal ? Math.round((data.received / data.deal) * 100) : 0}% of deal value`],
            ["Yet to collect", compactInr(Math.max(0, data.deal - data.received)), "project balances"],
            ["Expected soon", compactInr(data.soon), "next 7 days"],
          ].map(([l, v, s]) => (
            <div key={l} className="p-5">
              <p className="text-xs font-medium text-slate-500">{l}</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">{v}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{s}</p>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Assignments */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Today's assignments</h3>
              <p className="text-xs text-slate-500">Auto-generated from payments, follow-ups, quotations and delivery · {doneCount}/{data.items.length} done</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32"><Progress value={data.items.length ? (doneCount / data.items.length) * 100 : 0} tone="bg-emerald-500" /></div>
              <Button size="sm" variant="ghost" onClick={() => setShowDone((v) => !v)}>{showDone ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{showDone ? "Hide done" : "Show done"}</Button>
            </div>
          </div>
          {visible.length === 0 ? <EmptyState icon={CheckCircle2} title="All done for today 🎉" text="Every assignment is ticked off." /> : (
            <div className="p-3">
              {PRI.map((p) => {
                const rows = visible.filter((i) => i.priority === p);
                if (!rows.length) return null;
                return (
                  <div key={p} className="mb-3">
                    <p className="flex items-center gap-2 px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-500"><span className={cx("h-2 w-2 rounded-full", PRI_STYLE[p].dot)} />{p}<span className="font-medium normal-case tracking-normal text-slate-400">· {rows.length}</span></p>
                    {rows.map((it) => {
                      const Icon = TYPE_ICON[it.type];
                      const isDone = !!done[it.id];
                      return (
                        <div key={it.id} className={cx("group flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40", isDone && "opacity-50")}>
                          <button onClick={() => setDone((d) => ({ ...d, [it.id]: !d[it.id] }))} className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition", isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 dark:border-slate-600")}><Check className="h-3 w-3" strokeWidth={3} /></button>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><Icon className="h-4 w-4" /></span>
                          <div className="min-w-0 flex-1">
                            <p className={cx("truncate text-sm font-medium text-slate-800 dark:text-slate-100", isDone && "line-through")}>{it.title}</p>
                            <p className="truncate text-xs text-slate-500"><span className={cx("mr-1.5 rounded px-1.5 py-px text-[10px] font-semibold", PRI_STYLE[p].chip)}>{it.type}</span>{it.sub}</p>
                          </div>
                          {it.phone && <a href={telLink(it.phone)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-emerald-600 dark:hover:bg-slate-800" title="Call"><Phone className="h-4 w-4" /></a>}
                          <button onClick={() => nav(it.to)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-brand-600 dark:hover:bg-slate-800" title="Open"><ArrowUpRight className="h-4 w-4" /></button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {/* Payment commitments */}
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Payment commitments</h3>
                <p className="text-xs text-slate-500">Money clients promised · {inr(sumBy(commitments.filter((c) => !c.collected), "amount"))} pending</p>
              </div>
              <Button size="sm" icon={Plus} onClick={() => setCmForm({ q: "", ref: null, label: "", amount: "", expectedDate: addDays(today, 3) })}>Add</Button>
            </div>
            <div className="max-h-[380px] space-y-1 overflow-y-auto p-3">
              {commitments.length === 0 && <EmptyState icon={HandCoins} title="No commitments yet" text="Log promises like “₹50k on Friday” to track them." />}
              {commitments.map((c) => {
                const late = !c.collected && c.expectedDate < today;
                const isToday = !c.collected && c.expectedDate === today;
                return (
                  <div key={c.id} className={cx("group flex items-center gap-3 rounded-lg px-2 py-2.5", late ? "bg-rose-50/60 dark:bg-rose-500/5" : isToday ? "bg-amber-50/60 dark:bg-amber-500/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/40", c.collected && "opacity-55")}>
                    <div className="min-w-0 flex-1">
                      <p className={cx("truncate text-sm font-medium text-slate-800 dark:text-slate-100", c.collected && "line-through")}>{c.label}</p>
                      <p className={cx("text-xs", late ? "font-semibold text-rose-600" : isToday ? "font-semibold text-amber-600" : "text-slate-500")}>
                        {c.collected ? `Collected ${c.collectedOn ? fmtDate(c.collectedOn) : ""}` : late ? `Overdue · promised ${fmtDate(c.expectedDate)}` : isToday ? "Expected today" : `Expected ${fmtDate(c.expectedDate)}`}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{compactInr(c.amount)}</span>
                    {!c.collected && <Button size="sm" variant="success" onClick={() => collect(c)}>Collected</Button>}
                    <button onClick={async () => { if (await confirm({ title: "Delete commitment?", message: c.label })) { remove("commitments", c.id); toast("Commitment deleted"); } }} className="rounded p-1 text-slate-300 opacity-0 hover:text-rose-600 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-white"><StickyNote className="h-4 w-4 text-amber-500" />Daily notes</h3>
            </div>
            <div className="p-4">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addNote(); } }}
                rows={2} placeholder="Write a note… (Ctrl + Enter to save)" className="input resize-none" />
              <div className="mt-2 flex justify-end"><Button size="sm" onClick={addNote} disabled={!note.trim()}>Add note</Button></div>
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                {notes.map((n) => (
                  <div key={n.id} className={cx("group rounded-lg border px-3 py-2.5", n.pinned ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5" : "border-slate-100 dark:border-slate-800")}>
                    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{n.text}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">{timeAgo(n.at)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => update("ownerNotes", n.id, { pinned: !n.pinned })} className="rounded p-1 text-slate-400 hover:text-amber-600" title={n.pinned ? "Unpin" : "Pin"}>{n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}</button>
                        <button onClick={() => { remove("ownerNotes", n.id); toast("Note deleted"); }} className="rounded p-1 text-slate-400 hover:text-rose-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No notes yet</p>}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <CommitmentModal form={cmForm} setForm={setCmForm} onSave={(rec) => { add("commitments", rec, "cm"); toast("Commitment added"); setCmForm(null); }} />
    </div>
  );
}

function CommitmentModal({ form, setForm, onSave }) {
  const { db } = useStore();
  const [err, setErr] = useState("");
  const options = useMemo(() => {
    const s = (form?.q || "").trim().toLowerCase();
    const all = [
      ...(db.projects || []).map((p) => ({ key: `p-${p.id}`, label: p.client, sub: `Project · ${p.service}`, projectId: p.id, leadId: p.leadId })),
      ...(db.leads || []).filter((l) => !(db.projects || []).some((p) => p.leadId === l.id)).map((l) => ({ key: `l-${l.id}`, label: `${l.name} · ${l.company}`, sub: `Lead · ${l.stage}`, leadId: l.id })),
    ];
    return (s ? all.filter((o) => `${o.label} ${o.sub}`.toLowerCase().includes(s)) : all).slice(0, 6);
  }, [db, form?.q]);
  if (!form) return null;
  const save = () => {
    if (!form.ref) return setErr("Link this to a client");
    if (!(Number(form.amount) > 0)) return setErr("Enter the promised amount");
    if (!form.expectedDate) return setErr("Pick the expected date");
    onSave({ leadId: form.ref.leadId || null, projectId: form.ref.projectId || null, label: form.label.trim() || `Payment — ${form.ref.label}`, amount: Number(form.amount), expectedDate: form.expectedDate, collected: false });
    setErr("");
  };
  return (
    <Modal open onClose={() => setForm(null)} title="Add payment commitment" subtitle="Log money a client has promised to pay." size="sm"
      footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Add</Button></>}>
      <div className="space-y-4">
        <Field label="Client / project" required>
          {form.ref ? (
            <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
              <span><b>{form.ref.label}</b> <span className="text-xs text-slate-500">· {form.ref.sub}</span></span>
              <button className="text-xs font-semibold text-brand-600" onClick={() => setForm((f) => ({ ...f, ref: null }))}>Change</button>
            </div>
          ) : (
            <>
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={form.q} onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))} placeholder="Search projects or leads…" autoFocus /></div>
              <div className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
                {options.map((o) => (
                  <button key={o.key} type="button" onClick={() => setForm((f) => ({ ...f, ref: o }))} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">{o.label}</span><span className="ml-2 shrink-0 text-xs text-slate-400">{o.sub}</span>
                  </button>
                ))}
                {options.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">No match</p>}
              </div>
            </>
          )}
        </Field>
        <Field label="Label"><Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Second instalment" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)" required><Input type="number" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></Field>
          <Field label="Expected on" required><Input type="date" value={form.expectedDate} onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))} /></Field>
        </div>
        {err && <p className="flex items-center gap-2 text-sm font-medium text-rose-600"><AlertTriangle className="h-4 w-4" />{err}</p>}
      </div>
    </Modal>
  );
}
