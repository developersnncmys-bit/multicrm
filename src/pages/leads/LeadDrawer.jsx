import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone, MessageCircle, Mail, FileText, CalendarPlus, Pencil, Sparkles, PhoneCall, StickyNote, Video, History, Trash2,
  Building2, MapPin, IndianRupee, Briefcase, User, Clock, Receipt, Check, ArrowUpRight, Megaphone,
} from "lucide-react";
import { useStore, invoicePaid } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Avatar, Button, Drawer, EmptyState, Field, Input, Select, Tabs, Textarea, Badge, useConfirm, cx } from "../../components/ui";
import { LEAD_STAGES, STAGE_HEX, DOC_STATUS_STYLE } from "../../config/constants";
import { uid, inr, fmtDate, fmtDateTime, timeAgo, todayISO, addDays } from "../../utils/format";
import LeadForm from "./LeadForm";
import { useStageChange, StageBadge, PriorityChip, FollowUp, waLink, telLink } from "./leadHelpers";

const ACT = {
  created: { icon: Sparkles, tone: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300", label: "Lead created" },
  call: { icon: PhoneCall, tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", label: "Call" },
  email: { icon: Mail, tone: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300", label: "Email" },
  meeting: { icon: Video, tone: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300", label: "Meeting" },
  note: { icon: StickyNote, tone: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300", label: "Note" },
  stage: { icon: History, tone: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300", label: "Stage change" },
  whatsapp: { icon: MessageCircle, tone: "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-300", label: "WhatsApp" },
};
const TASK_TYPES = ["Follow-up", "Call", "Meeting", "Demo", "Task"];

export default function LeadDrawer({ leadId, onClose }) {
  const { db, update, remove, add, user, userById } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const { requestStage, modals } = useStageChange();
  const [tab, setTab] = useState("activity");
  const [edit, setEdit] = useState(false);
  const [logType, setLogType] = useState("note");
  const [logText, setLogText] = useState("");
  const [showTask, setShowTask] = useState(false);
  const [task, setTask] = useState({ title: "", type: "Follow-up", date: addDays(todayISO(), 1), time: "11:00" });

  const lead = db.leads.find((l) => l.id === leadId);
  if (!leadId) return modals;
  if (!lead) return null;

  const owner = userById(lead.ownerId);
  const tasks = db.tasks.filter((t) => t.leadId === lead.id).sort((a, b) => (a.date > b.date ? 1 : -1));
  const quotes = db.quotations.filter((q) => q.leadId === lead.id);
  const invoices = db.invoices.filter((i) => i.leadId === lead.id);
  const stageIdx = LEAD_STAGES.indexOf(lead.stage);

  const logActivity = (type, text) => {
    update("leads", lead.id, (l) => ({ activities: [{ id: uid("a"), type, text, at: new Date().toISOString(), by: user.id }, ...(l.activities || [])] }));
  };
  const submitLog = () => {
    if (!logText.trim()) return;
    logActivity(logType, logText.trim());
    if (lead.stage === "New" && ["call", "email", "meeting", "whatsapp"].includes(logType)) requestStage(lead, "Contacted");
    setLogText("");
    toast(`${ACT[logType].label} logged`);
  };
  const saveTask = () => {
    if (!task.date) return;
    add("tasks", { title: task.title.trim() || `${task.type} — ${lead.company || lead.name}`, type: task.type, date: task.date, time: task.time, leadId: lead.id, assigneeId: lead.ownerId || user.id, done: false, notes: "" }, "T");
    update("leads", lead.id, (l) => ({
      nextFollowUp: !l.nextFollowUp || task.date < l.nextFollowUp || l.nextFollowUp < todayISO() ? task.date : l.nextFollowUp,
      activities: [{ id: uid("a"), type: "note", text: `Scheduled ${task.type.toLowerCase()} on ${fmtDate(task.date)} at ${task.time}`, at: new Date().toISOString(), by: user.id }, ...(l.activities || [])],
    }));
    setShowTask(false);
    setTask({ title: "", type: "Follow-up", date: addDays(todayISO(), 1), time: "11:00" });
    toast("Follow-up scheduled");
  };
  const del = async () => {
    if (await confirm({ title: "Delete lead?", message: `${lead.name} and its activity history will be permanently removed.` })) {
      remove("leads", lead.id); onClose(); toast("Lead deleted");
    }
  };

  const quick = [
    { icon: Phone, label: "Call", href: telLink(lead.phone), onClick: () => logActivity("call", "Outgoing call") },
    { icon: MessageCircle, label: "WhatsApp", href: waLink(lead.phone), onClick: () => logActivity("whatsapp", "Messaged on WhatsApp") },
    { icon: Mail, label: "Email", href: lead.email ? `mailto:${lead.email}` : undefined },
    { icon: FileText, label: "Quote", onClick: () => nav(`/quotations?new=1&lead=${lead.id}`) },
    { icon: CalendarPlus, label: "Follow-up", onClick: () => setShowTask((v) => !v) },
  ];

  return (
    <>
      <Drawer open onClose={onClose} width="max-w-2xl"
        title={<span className="flex items-center gap-3"><Avatar name={lead.name} size="lg" /><span className="min-w-0"><span className="block truncate">{lead.name}</span><span className="block truncate text-sm font-medium text-slate-500">{lead.company || "Individual"} · {lead.id}</span></span></span>}
        headerExtra={
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StageBadge stage={lead.stage} /><PriorityChip priority={lead.priority} />
            <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{lead.source}</Badge>
            <span className="ml-auto text-lg font-extrabold text-slate-900 dark:text-white">{inr(lead.value)}</span>
          </div>
        }
        footer={<>
          <Button variant="ghost" icon={Trash2} className="mr-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={del}>Delete</Button>
          <Button variant="secondary" icon={Pencil} onClick={() => setEdit(true)}>Edit lead</Button>
        </>}>

        {/* Stage stepper */}
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Pipeline stage</p>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {LEAD_STAGES.map((s, i) => {
              const active = s === lead.stage;
              const passed = lead.stage !== "Lost" && i < stageIdx && s !== "Lost";
              return (
                <button key={s} onClick={() => requestStage(lead, s)} title={`Move to ${s}`}
                  className={cx("relative flex-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition",
                    active ? "text-white shadow-sm" : passed ? "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700")}
                  style={active ? { background: STAGE_HEX[s] } : undefined}>
                  {passed && <Check className="-mt-0.5 mr-1 inline h-3 w-3" />}{s}
                </button>
              );
            })}
          </div>
          {lead.stage === "Lost" && lead.lostReason && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Lost reason: {lead.lostReason}</p>}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-5 gap-2 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          {quick.map((q) => {
            const cls = cx("flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300", !q.href && !q.onClick && "pointer-events-none opacity-40");
            const inner = <><q.icon className="h-4 w-4" />{q.label}</>;
            return q.href
              ? <a key={q.label} href={q.href} target={q.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" onClick={q.onClick} className={cls}>{inner}</a>
              : <button key={q.label} onClick={q.onClick} className={cls}>{inner}</button>;
          })}
        </div>

        {showTask && (
          <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 animate-fadeIn dark:border-slate-800 dark:bg-slate-800/30">
            <p className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Schedule a follow-up</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Type"><Select value={task.type} onChange={(e) => setTask({ ...task, type: e.target.value })} options={TASK_TYPES} /></Field>
              <Field label="Date"><Input type="date" value={task.date} onChange={(e) => setTask({ ...task, date: e.target.value })} /></Field>
              <Field label="Time"><Input type="time" value={task.time} onChange={(e) => setTask({ ...task, time: e.target.value })} /></Field>
              <Field label="Title (optional)"><Input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} placeholder={`${task.type} — ${lead.company || lead.name}`} /></Field>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowTask(false)}>Cancel</Button>
              <Button size="sm" onClick={saveTask}>Save follow-up</Button>
            </div>
          </div>
        )}

        <div className="px-6 pt-4">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: "activity", label: "Activity", count: (lead.activities || []).length },
            { value: "details", label: "Details" },
            { value: "tasks", label: "Tasks", count: tasks.length },
            { value: "docs", label: "Quotes & Invoices", count: quotes.length + invoices.length },
          ]} />
        </div>

        <div className="px-6 py-5">
          {tab === "activity" && (
            <>
              <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex flex-wrap gap-1">
                  {["note", "call", "meeting", "email", "whatsapp"].map((t) => {
                    const A = ACT[t];
                    return (
                      <button key={t} onClick={() => setLogType(t)} className={cx("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition", logType === t ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                        <A.icon className="h-3.5 w-3.5" />{A.label}
                      </button>
                    );
                  })}
                </div>
                <textarea value={logText} onChange={(e) => setLogText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitLog(); }}
                  rows={2} placeholder={logType === "note" ? "Add a note…" : `What happened on this ${ACT[logType].label.toLowerCase()}?`}
                  className="w-full resize-none bg-transparent px-1 text-sm outline-none placeholder:text-slate-400 dark:text-slate-100" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Ctrl + Enter to save</span>
                  <Button size="sm" onClick={submitLog} disabled={!logText.trim()}>Log {ACT[logType].label.toLowerCase()}</Button>
                </div>
              </div>
              <ol className="relative mt-6 space-y-5 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                {(lead.activities || []).map((a) => {
                  const A = ACT[a.type] || ACT.note;
                  return (
                    <li key={a.id} className="relative flex gap-3">
                      <span className={cx("relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900", A.tone)}><A.icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{A.label}</span>
                          <span className="text-xs text-slate-400" title={fmtDateTime(a.at)}>{timeAgo(a.at)} · {userById(a.by)?.name || "System"}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{a.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {tab === "details" && (
            <div className="space-y-5">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {[
                  [User, "Contact", lead.name], [Building2, "Company", lead.company || "—"], [Phone, "Phone", lead.phone], [Mail, "Email", lead.email || "—"],
                  [Briefcase, "Service", lead.service], [Megaphone, "Source", lead.source], [MapPin, "City / Branch", `${lead.city || "—"} · ${lead.branch}`],
                  [IndianRupee, "Estimated value", inr(lead.value)], [User, "Owner", owner?.name || "Unassigned"], [Clock, "Created", fmtDateTime(lead.createdAt)],
                ].map(([I, k, v]) => (
                  <div key={k} className="flex gap-3">
                    <I className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0"><p className="text-xs text-slate-500">{k}</p><p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{v}</p></div>
                  </div>
                ))}
                <div className="flex gap-3">
                  <CalendarPlus className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div><p className="text-xs text-slate-500">Next follow-up</p><FollowUp date={lead.nextFollowUp} /></div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs font-semibold text-slate-500">Requirement</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{lead.requirement || "No requirement captured yet."}</p>
              </div>
              <Button variant="soft" icon={Pencil} onClick={() => setEdit(true)}>Edit details</Button>
            </div>
          )}

          {tab === "tasks" && (
            tasks.length === 0 ? <EmptyState icon={CalendarPlus} title="No tasks yet" text="Schedule a follow-up so this lead never goes cold." action={<Button icon={CalendarPlus} onClick={() => setShowTask(true)}>Schedule follow-up</Button>} /> : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {tasks.map((t) => {
                  const overdue = !t.done && t.date < todayISO();
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <button onClick={() => { update("tasks", t.id, { done: !t.done }); toast(t.done ? "Task reopened" : "Task completed"); }}
                        className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition", t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-brand-500 dark:border-slate-600")}>
                        {t.done && <Check className="h-3 w-3" strokeWidth={3} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cx("truncate text-sm font-medium", t.done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100")}>{t.title}</p>
                        <p className={cx("text-xs", overdue ? "font-semibold text-rose-600" : "text-slate-500")}>{t.type} · {fmtDate(t.date)} {t.time}{overdue && " · Overdue"}</p>
                      </div>
                      <Avatar name={userById(t.assigneeId)?.name || "?"} size="xs" />
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {tab === "docs" && (
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Quotations</p>
                  <Button size="sm" variant="soft" icon={FileText} onClick={() => nav(`/quotations?new=1&lead=${lead.id}`)}>New quotation</Button>
                </div>
                {quotes.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-700">No quotations yet</p> : (
                  <ul className="space-y-2">{quotes.map((q) => (
                    <li key={q.id}><button onClick={() => nav(`/quotations?open=${q.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:hover:bg-brand-500/5">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="flex-1"><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{q.number}</span><span className="text-xs text-slate-500">{fmtDate(q.date)}</span></span>
                      <Badge className={DOC_STATUS_STYLE[q.status]}>{q.status}</Badge>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </button></li>
                  ))}</ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">Invoices</p>
                {invoices.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-700">No invoices yet</p> : (
                  <ul className="space-y-2">{invoices.map((i) => (
                    <li key={i.id}><button onClick={() => nav(`/invoices?open=${i.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:hover:bg-brand-500/5">
                      <Receipt className="h-4 w-4 text-slate-400" />
                      <span className="flex-1"><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{i.number}</span><span className="text-xs text-slate-500">Paid {inr(invoicePaid(i))}</span></span>
                      <Badge className={DOC_STATUS_STYLE[i.status]}>{i.status}</Badge>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </button></li>
                  ))}</ul>
                )}
              </div>
            </div>
          )}
        </div>
      </Drawer>
      <LeadForm open={edit} onClose={() => setEdit(false)} lead={lead} />
      {modals}
    </>
  );
}
