// Today's Plan — one list of everything a person must do today:
//  1. Auto: new enquiries waiting for a first reply, follow-ups due/overdue, meetings today
//  2. Auto: invoices due or overdue (money to collect)
//  3. Manual tasks the person adds for today (db.planTasks)
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Plus, Phone, MessageCircle, CalendarClock, AlertTriangle, IndianRupee, CheckCircle2, Circle, Trash2, Sparkles, Users, Flame } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, CardHeader, PageHeader, StatCard, Tabs, Badge, Modal, Field, Input, Select, Textarea, Progress, EmptyState, cx } from "../../components/ui";
import { inr, todayISO, daysBetween } from "../../utils/format";
import { useLeadIntel, priorityOf, OPEN } from "../leads/leadIntel";
import { ScorePill, NextStep, telLink } from "../leads/leadHelpers";
import { LogCallModal, WhatsAppModal, FollowUpModal } from "../leads/LeadModals";
import LeadDrawer from "../leads/LeadDrawer";
import { invBalance, isInvOpen } from "../owner/ownerData";
import { canAccess } from "../../layout/AppLayout";

const TYPES = ["New Call", "Follow-up", "Payment", "Proposal", "Meeting", "Onboarding", "Other"];
const PRI = ["Urgent", "High", "Medium", "Low"];
const PRI_STYLE = { Urgent: "bg-rose-600 text-white", High: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", Medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", Low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" };

export default function TodaysPlan() {
  const { db, add, update, remove, user } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const intel = useLeadIntel(db);
  const today = todayISO();
  const isLead = ["Admin", "Sales Manager"].includes(user.role);
  const [scope, setScope] = useState(isLead ? "all" : "mine");
  const [form, setForm] = useState(null);
  const [modal, setModal] = useState(null); // { kind, lead }
  const [openLead, setOpenLead] = useState(null);
  const mine = (ownerId) => scope === "all" || ownerId === user.id;

  // 1. Leads needing action today, ranked by priority
  const leadsToday = useMemo(() => db.leads.filter((l) => OPEN(l) && mine(l.ownerId)).filter((l) =>
    (l.stage === "New" && l.firstReplyMins == null) || (l.nextFollowUp && l.nextFollowUp <= today) || intel.meetingToday[l.id],
  ).sort((a, b) => priorityOf(b, intel) - priorityOf(a, intel)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [db.leads, intel, scope, today]);
  const newWaiting = leadsToday.filter((l) => l.stage === "New" && l.firstReplyMins == null);
  const overdue = leadsToday.filter((l) => l.nextFollowUp && l.nextFollowUp < today);

  // 2. Money to collect
  const collect = canAccess(user, "invoices") || canAccess(user, "payments")
    ? db.invoices.filter((i) => i.type !== "Proforma" && isInvOpen(i) && i.dueDate <= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 8) : [];

  // 3. Manual tasks
  const tasks = (db.planTasks || []).filter((t) => t.date === today).sort((a, b) => a.done - b.done || PRI.indexOf(a.priority) - PRI.indexOf(b.priority));
  const done = tasks.filter((t) => t.done).length;
  const totalItems = leadsToday.length + tasks.length + collect.length;

  const saveTask = () => {
    if (!form.title.trim()) { toast("Write what needs to be done", "error"); return; }
    add("planTasks", { ...form, date: today, done: false, createdAt: new Date().toISOString(), ownerId: user.id }, "PT");
    toast("Added to today's plan"); setForm(null);
  };

  return (
    <div>
      <PageHeader title="Today's Plan" subtitle={`${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} — everything to finish before you log off, most important first.`}
        actions={<>
          {isLead && <Tabs value={scope} onChange={setScope} tabs={[{ value: "mine", label: "My plan" }, { value: "all", label: "Whole team" }]} />}
          <Button icon={Plus} onClick={() => setForm({ title: "", type: "Follow-up", priority: "Medium", phone: "", notes: "" })}>Add task</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Things to do today" value={totalItems} icon={ClipboardList} sub={`${done} of ${tasks.length} own tasks done`} />
        <StatCard label="New enquiries waiting" value={newWaiting.length} icon={Flame} tone={newWaiting.length ? "rose" : "slate"} sub="reply within 15 min to win more" />
        <StatCard label="Overdue follow-ups" value={overdue.length} icon={AlertTriangle} tone={overdue.length ? "amber" : "slate"} sub="promised but missed" />
        <StatCard label="Money to collect" value={inr(collect.reduce((a, i) => a + invBalance(i), 0))} icon={IndianRupee} tone="emerald" sub={`${collect.length} invoices due`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Leads to act on" subtitle="Ranked by lead score, waiting time, due date and deal size" action={<Badge className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{leadsToday.length}</Badge>} />
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {leadsToday.length === 0 && <EmptyState icon={CheckCircle2} title="All caught up" text="No leads need action today." />}
            {leadsToday.slice(0, 25).map((l, i) => (
              <div key={l.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                <span className="hidden w-5 text-xs font-bold text-slate-300 sm:block">{i + 1}</span>
                <button onClick={() => setOpenLead(l.id)} className="min-w-0 flex-1 text-left">
                  <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><span className="truncate">{l.name}</span><ScorePill s={intel.score[l.id]} /></p>
                  <p className="truncate text-xs text-slate-500">{l.company} · {l.service} · {inr(l.value)}</p>
                  <NextStep n={intel.next[l.id]} />
                </button>
                <div className="flex gap-1.5">
                  <a href={telLink(l.phone)} onClick={() => setModal({ kind: "call", lead: l })}><Button size="sm" variant="secondary" icon={Phone}>Call</Button></a>
                  <Button size="sm" variant="secondary" icon={MessageCircle} onClick={() => setModal({ kind: "wa", lead: l })}>WhatsApp</Button>
                  <Button size="sm" variant="ghost" icon={CalendarClock} onClick={() => setModal({ kind: "fu", lead: l })} title="Set next follow-up" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="My tasks" subtitle={tasks.length ? `${done}/${tasks.length} done` : "Add anything that isn't a lead"} />
            <div className="px-5 pt-3"><Progress value={tasks.length ? (done / tasks.length) * 100 : 0} tone="bg-emerald-500" /></div>
            <div className="mt-2 divide-y divide-slate-100 pb-2 dark:divide-slate-800">
              {tasks.length === 0 && <EmptyState icon={Sparkles} title="No tasks yet" />}
              {tasks.map((t) => (
                <div key={t.id} className="group flex items-start gap-3 px-5 py-2.5">
                  <button onClick={() => update("planTasks", t.id, { done: !t.done })} className="mt-0.5">{t.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300 hover:text-brand-500" />}</button>
                  <div className="min-w-0 flex-1">
                    <p className={cx("text-sm font-medium", t.done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100")}>{t.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500"><Badge className={cx(PRI_STYLE[t.priority], "!py-0")}>{t.priority}</Badge>{t.type}{t.phone && <a href={telLink(t.phone)} className="text-brand-600 hover:underline">· {t.phone}</a>}</p>
                  </div>
                  <button onClick={() => remove("planTasks", t.id)} className="rounded p-1 text-slate-300 opacity-0 hover:text-rose-500 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </Card>

          {collect.length > 0 && (
            <Card>
              <CardHeader title="Collect payments" subtitle="Invoices due today or overdue" />
              <div className="mt-3 divide-y divide-slate-100 pb-2 dark:divide-slate-800">
                {collect.map((i) => {
                  const late = daysBetween(i.dueDate, today);
                  return (
                    <button key={i.id} onClick={() => nav(`/invoices?open=${i.id}`)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.client.company}</p><p className={cx("text-xs", late > 0 ? "text-rose-600" : "text-amber-600")}>{i.number} · {late > 0 ? `${late} days overdue` : "due today"}</p></div>
                      <span className="text-sm font-bold">{inr(invBalance(i))}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Users className="h-4 w-4 text-brand-500" />How this list is built</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              <li>• New enquiries with no reply yet (top priority).</li>
              <li>• Follow-ups due today or missed earlier, plus meetings booked for today.</li>
              <li>• Invoices whose due date has arrived.</li>
              <li>• Your own tasks. Each day starts fresh — unfinished leads roll over automatically.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title="Add to today's plan" footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={saveTask}>Add task</Button></>}>
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="What needs to be done?" required className="sm:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus placeholder="e.g. Call Ramesh about revised quote" /></Field>
            <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TYPES} /></Field>
            <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={PRI} /></Field>
            <Field label="Phone (optional)" className="sm:col-span-2"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
      <LogCallModal lead={modal?.kind === "call" ? modal.lead : null} open={modal?.kind === "call"} onClose={() => setModal(null)} />
      <WhatsAppModal lead={modal?.kind === "wa" ? modal.lead : null} open={modal?.kind === "wa"} onClose={() => setModal(null)} />
      <FollowUpModal lead={modal?.kind === "fu" ? modal.lead : null} open={modal?.kind === "fu"} onClose={() => setModal(null)} />
      {openLead && <LeadDrawer leadId={openLead} onClose={() => setOpenLead(null)} />}
    </div>
  );
}
