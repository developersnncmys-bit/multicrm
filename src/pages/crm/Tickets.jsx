// Support tickets — complaints & service requests with SLA, assignment, conversation and CSAT.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LifeBuoy, Plus, AlertTriangle, Clock, CheckCircle2, Star, Send, MessageCircle, Phone, Mail, Globe, Lock, Download } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, Tabs, SearchInput, Select, Badge, Avatar, Drawer, Modal, Field, Input, Textarea, EmptyState, Pagination, usePaged, cx } from "../../components/ui";
import { timeAgo, fmtDateTime, uid, downloadCSV } from "../../utils/format";

export const TICKET_STATUSES = ["Open", "In Progress", "Waiting on Customer", "Resolved", "Closed"];
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const SLA_H = { Urgent: 4, High: 8, Medium: 24, Low: 48 };
const CHANNELS = ["WhatsApp", "Phone", "Email", "Customer Portal", "Walk-In"];
const CHANNEL_ICON = { WhatsApp: MessageCircle, Phone, Email: Mail, "Customer Portal": Globe, "Walk-In": LifeBuoy };
const STATUS_STYLE = {
  Open: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", "In Progress": "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  "Waiting on Customer": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", Resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Closed: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
const PRI_STYLE = { Urgent: "bg-rose-600 text-white", High: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", Medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", Low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" };
const isOpen = (t) => !["Resolved", "Closed"].includes(t.status);
const breached = (t) => isOpen(t) && t.dueAt && t.dueAt < new Date().toISOString();

function SlaChip({ t }) {
  if (!isOpen(t)) return <span className="text-xs text-slate-400">{t.resolvedAt ? `Solved ${timeAgo(t.resolvedAt)}` : "—"}</span>;
  const mins = Math.round((new Date(t.dueAt) - Date.now()) / 60000);
  if (mins < 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />Overdue {Math.abs(mins) > 1440 ? `${Math.round(-mins / 1440)}d` : `${Math.round(-mins / 60)}h`}</span>;
  return <span className={cx("inline-flex items-center gap-1 text-xs font-semibold", mins < 120 ? "text-amber-600" : "text-slate-500")}><Clock className="h-3.5 w-3.5" />{mins > 1440 ? `${Math.round(mins / 1440)}d` : mins > 60 ? `${Math.round(mins / 60)}h` : `${mins}m`} left</span>;
}

export default function Tickets() {
  const { db, add, update, user, userById, log } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("open");
  const [q, setQ] = useState("");
  const [pri, setPri] = useState("");
  const [assignee, setAssignee] = useState("");
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState({});
  const tickets = db.tickets || [];
  const agents = db.users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }));

  useEffect(() => {
    if (params.get("open")) setOpenId(params.get("open"));
    if (params.get("new")) setForm({ subject: "", contactId: "", channel: "WhatsApp", category: "General", priority: "Medium", assigneeId: user.id, message: "" });
    if (params.get("open") || params.get("new")) { params.delete("open"); params.delete("new"); setParams(params, { replace: true }); }
  }, [params, setParams, user.id]);

  const counts = {
    open: tickets.filter(isOpen).length, mine: tickets.filter((t) => isOpen(t) && t.assigneeId === user.id).length,
    unassigned: tickets.filter((t) => isOpen(t) && !t.assigneeId).length, overdue: tickets.filter(breached).length,
    solved: tickets.filter((t) => !isOpen(t)).length, all: tickets.length,
  };
  const rated = tickets.filter((t) => t.rating);
  const csat = rated.length ? Math.round((rated.filter((t) => t.rating >= 4).length / rated.length) * 100) : 0;
  const solvedOnTime = tickets.filter((t) => t.resolvedAt && t.resolvedAt <= t.dueAt).length;
  const slaPct = counts.solved ? Math.round((solvedOnTime / counts.solved) * 100) : 0;

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tickets.filter((t) => ({ open: isOpen(t), mine: isOpen(t) && t.assigneeId === user.id, unassigned: isOpen(t) && !t.assigneeId, overdue: breached(t), solved: !isOpen(t), all: true }[tab]))
      .filter((t) => (!pri || t.priority === pri) && (!assignee || t.assigneeId === assignee))
      .filter((t) => !s || [t.number, t.subject, t.contactName, t.company, t.phone].some((v) => String(v || "").toLowerCase().includes(s)))
      .sort((a, b) => (breached(b) - breached(a)) || PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || b.createdAt.localeCompare(a.createdAt));
  }, [tickets, tab, q, pri, assignee, user.id]);
  const pg = usePaged(rows, 15);

  const create = () => {
    const e = {};
    if (!form.subject.trim()) e.subject = "Add a short subject";
    if (!form.contactId) e.contactId = "Pick the customer";
    setErr(e);
    if (Object.keys(e).length) return;
    const c = db.contacts.find((x) => x.id === form.contactId);
    const now = new Date().toISOString();
    const rec = add("tickets", {
      number: `TKT-${1201 + tickets.length}`, subject: form.subject, contactId: c.id, contactName: c.name, company: db.companies.find((x) => x.id === c.companyId)?.name || "", phone: c.phone,
      channel: form.channel, category: form.category, priority: form.priority, status: "Open", assigneeId: form.assigneeId, createdAt: now,
      dueAt: new Date(Date.now() + SLA_H[form.priority] * 3600000).toISOString(), resolvedAt: "", rating: null,
      thread: form.message ? [{ id: uid("tm"), from: "customer", text: form.message, at: now }] : [],
    }, "TK");
    log("created", "Ticket", `${rec.number} · ${rec.subject}`);
    toast(`${rec.number} created · SLA ${SLA_H[form.priority]}h`);
    setForm(null); setOpenId(rec.id);
  };
  const exportCSV = () => downloadCSV("tickets.csv", rows, [{ label: "Ticket", key: "number" }, { label: "Subject", key: "subject" }, { label: "Customer", key: "contactName" }, { label: "Company", key: "company" }, { label: "Channel", key: "channel" }, { label: "Priority", key: "priority" }, { label: "Status", key: "status" }, { label: "Assignee", value: (t) => userById(t.assigneeId)?.name || "" }, { label: "Created", key: "createdAt" }, { label: "SLA due", key: "dueAt" }]);

  return (
    <div>
      <PageHeader title="Support Tickets" subtitle="Every complaint and service request — tracked against SLA until the customer is happy."
        actions={<><Button variant="secondary" icon={Download} onClick={exportCSV}>Export</Button><Button icon={Plus} onClick={() => { setErr({}); setForm({ subject: "", contactId: "", channel: "WhatsApp", category: "General", priority: "Medium", assigneeId: user.id, message: "" }); }}>New ticket</Button></>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Open tickets" value={counts.open} icon={LifeBuoy} sub={`${counts.unassigned} unassigned`} onClick={() => setTab("open")} />
        <StatCard label="SLA breached" value={counts.overdue} icon={AlertTriangle} tone={counts.overdue ? "rose" : "slate"} sub="past due time" onClick={() => setTab("overdue")} />
        <StatCard label="Solved within SLA" value={`${slaPct}%`} icon={CheckCircle2} tone="emerald" sub={`${counts.solved} solved`} />
        <StatCard label="Customer satisfaction" value={`${csat}%`} icon={Star} tone="amber" sub={`${rated.length} ratings · 4★ and above`} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 xl:flex-row xl:items-center">
          <Tabs value={tab} onChange={setTab} tabs={[["open", "Open"], ["mine", "Mine"], ["unassigned", "Unassigned"], ["overdue", "Overdue"], ["solved", "Solved"], ["all", "All"]].map(([v, l]) => ({ value: v, label: l, count: counts[v] }))} />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row xl:justify-end">
            <SearchInput value={q} onChange={setQ} placeholder="Ticket no, subject, customer…" className="sm:w-64" />
            <Select value={pri} onChange={(e) => setPri(e.target.value)} options={PRIORITIES} placeholder="Any priority" className="sm:w-36" />
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} options={agents} placeholder="Any assignee" className="sm:w-40" />
          </div>
        </div>
        {rows.length === 0 ? <EmptyState icon={CheckCircle2} title="Inbox zero 🎉" text="No tickets in this view." /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="th">Ticket</th><th className="th">Customer</th><th className="th">Priority</th><th className="th">Status</th><th className="th">Assignee</th><th className="th">SLA</th><th className="th">Updated</th></tr></thead>
                <tbody>
                  {pg.slice.map((t) => {
                    const CI = CHANNEL_ICON[t.channel] || LifeBuoy;
                    return (
                      <tr key={t.id} className={cx("tr cursor-pointer", breached(t) && "bg-rose-50/40 dark:bg-rose-500/5")} onClick={() => setOpenId(t.id)}>
                        <td className="td max-w-[320px]"><p className="truncate font-semibold text-slate-900 dark:text-white">{t.subject}</p><p className="flex items-center gap-1.5 text-xs text-slate-500"><CI className="h-3 w-3" />{t.number} · {t.category}</p></td>
                        <td className="td"><p className="font-medium">{t.contactName}</p><p className="text-xs text-slate-500">{t.company || t.phone}</p></td>
                        <td className="td"><Badge className={PRI_STYLE[t.priority]}>{t.priority}</Badge></td>
                        <td className="td"><Badge className={STATUS_STYLE[t.status]}>{t.status}</Badge></td>
                        <td className="td">{t.assigneeId ? <span className="flex items-center gap-2"><Avatar name={userById(t.assigneeId)?.name || "?"} size="xs" /><span className="text-xs">{userById(t.assigneeId)?.name.split(" ")[0]}</span></span> : <span className="text-xs font-semibold text-amber-600">Unassigned</span>}</td>
                        <td className="td"><SlaChip t={t} /></td>
                        <td className="td text-xs text-slate-500">{timeAgo(t.thread?.[0]?.at || t.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination {...pg} onPage={pg.setPage} />
          </>
        )}
      </Card>

      {openId && <TicketDrawer id={openId} onClose={() => setOpenId(null)} agents={agents} />}

      <Modal open={!!form} onClose={() => setForm(null)} title="New support ticket" size="lg"
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={create}>Create ticket</Button></>}>
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer" required error={err.contactId} className="sm:col-span-2"><Select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} placeholder="Select contact…" options={(db.contacts || []).map((c) => ({ value: c.id, label: `${c.name} · ${c.phone}` }))} /></Field>
            <Field label="Subject" required error={err.subject} className="sm:col-span-2"><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What's the issue?" /></Field>
            <Field label="Channel"><Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} options={CHANNELS} /></Field>
            <Field label="Category"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={["Billing", "Service", "Technical", "Delivery", "General"]} /></Field>
            <Field label="Priority" hint={`Must be solved within ${SLA_H[form.priority]} hours`}><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={PRIORITIES} /></Field>
            <Field label="Assign to"><Select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} placeholder="Unassigned" options={agents} /></Field>
            <Field label="Customer's message" className="sm:col-span-2"><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TicketDrawer({ id, onClose, agents }) {
  const { db, update, user, userById, log } = useStore();
  const toast = useToast();
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const t = (db.tickets || []).find((x) => x.id === id);
  if (!t) return null;
  const patch = (p, msg) => { update("tickets", t.id, p); if (msg) toast(msg); };
  const setStatus = (status) => {
    const p = { status };
    if (["Resolved", "Closed"].includes(status) && !t.resolvedAt) p.resolvedAt = new Date().toISOString();
    if (!["Resolved", "Closed"].includes(status)) p.resolvedAt = "";
    patch(p, `Marked ${status}`); log("updated", "Ticket", `${t.number} → ${status}`);
  };
  const send = () => {
    if (!text.trim()) return;
    const msg = { id: uid("tm"), from: internal ? "note" : "agent", by: user.id, text: text.trim(), at: new Date().toISOString() };
    patch({ thread: [msg, ...(t.thread || [])], ...(t.status === "Open" && !internal ? { status: "In Progress" } : {}), ...(!t.assigneeId ? { assigneeId: user.id } : {}) }, internal ? "Internal note added" : `Reply sent on ${t.channel} (demo)`);
    setText("");
  };
  const thread = [...(t.thread || [])].reverse();

  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={t.subject}
      subtitle={<span className="flex flex-wrap items-center gap-2">{t.number}<Badge className={PRI_STYLE[t.priority]}>{t.priority}</Badge><Badge className={STATUS_STYLE[t.status]}>{t.status}</Badge><SlaChip t={t} /></span>}>
      <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800 sm:grid-cols-3">
        <Field label="Status"><Select value={t.status} onChange={(e) => setStatus(e.target.value)} options={TICKET_STATUSES} /></Field>
        <Field label="Priority"><Select value={t.priority} onChange={(e) => patch({ priority: e.target.value, dueAt: new Date(new Date(t.createdAt).getTime() + SLA_H[e.target.value] * 3600000).toISOString() }, "Priority updated · SLA recalculated")} options={PRIORITIES} /></Field>
        <Field label="Assignee"><Select value={t.assigneeId || ""} onChange={(e) => patch({ assigneeId: e.target.value }, "Reassigned")} placeholder="Unassigned" options={agents} /></Field>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-slate-100 px-6 py-3 text-sm dark:border-slate-800">
        <span><span className="text-slate-400">Customer</span> <b className="font-semibold">{t.contactName}</b>{t.company && ` · ${t.company}`}</span>
        <span><span className="text-slate-400">Phone</span> {t.phone}</span>
        <span><span className="text-slate-400">Via</span> {t.channel}</span>
        <span><span className="text-slate-400">Opened</span> {fmtDateTime(t.createdAt)}</span>
        {t.rating && <span className="flex items-center gap-1"><span className="text-slate-400">Rating</span>{"★".repeat(t.rating)}<span className="text-slate-300">{"★".repeat(5 - t.rating)}</span></span>}
      </div>
      <div className="space-y-4 px-6 py-5">
        {thread.length === 0 && <p className="text-center text-sm text-slate-400">No messages yet</p>}
        {thread.map((m) => (
          <div key={m.id} className={cx("flex gap-3", m.from !== "customer" && "flex-row-reverse")}>
            <Avatar name={m.from === "customer" ? t.contactName : userById(m.by)?.name || "Agent"} size="sm" />
            <div className={cx("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", m.from === "customer" ? "rounded-tl-sm bg-slate-100 dark:bg-slate-800" : m.from === "note" ? "rounded-tr-sm border border-dashed border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10" : "rounded-tr-sm bg-brand-600 text-white")}>
              {m.from === "note" && <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300"><Lock className="h-3 w-3" />Internal note</p>}
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className={cx("mt-1 text-[11px]", m.from === "agent" ? "text-white/70" : "text-slate-400")}>{m.from === "customer" ? t.contactName : userById(m.by)?.name} · {timeAgo(m.at)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex gap-1">
          <button onClick={() => setInternal(false)} className={cx("rounded-md px-2.5 py-1 text-xs font-semibold", !internal ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "text-slate-500")}>Reply to customer</button>
          <button onClick={() => setInternal(true)} className={cx("rounded-md px-2.5 py-1 text-xs font-semibold", internal ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "text-slate-500")}>Internal note</button>
        </div>
        <div className="flex gap-2">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={internal ? "Only your team sees this…" : `Reply via ${t.channel}…`} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }} />
          <div className="flex flex-col gap-2">
            <Button icon={Send} onClick={send} disabled={!text.trim()}>Send</Button>
            {isOpen(t) && <Button variant="success" size="sm" onClick={() => setStatus("Resolved")}>Resolve</Button>}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
