import { useMemo, useState } from "react";
import { Search, Trash2, FileText, Eye, EyeOff, Plus, CalendarClock, Mail, NotebookPen, ShieldCheck, UserPlus, AtSign } from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, Badge, Button, Card, Drawer, EmptyState, Field, Input, Modal, Select, Textarea, Toggle, useConfirm, cx } from "../../components/ui";
import { useToast } from "../../components/ui/Toast";
import { fmtDate, timeAgo, todayISO } from "../../utils/format";

const MOM_STYLE = {
  "MOM sent": "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "MOM written, not sent": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  "Notes only": "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
};
const PRIO_STYLE = { High: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", Medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", Low: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300" };
const TASK_STYLE = { "To do": "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300", Doing: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", Done: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" };
const NEXT = { "To do": "Doing", Doing: "Done", Done: "To do" };

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9" />
    </div>
  );
}

/* ── Meetings & MOM ────────────────────────────────── */
export function PortalMeetings() {
  const { db, remove, update } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [emp, setEmp] = useState("");
  const [st, setSt] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const employees = db.employees || [];
  const eName = (id) => employees.find((e) => e.id === id)?.name || "—";
  const rows = (db.portalMeetings || [])
    .filter((m) => (!emp || m.empId === emp) && (!st || m.momStatus === st) && (!q || `${m.client} ${m.notes}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date));
  const m = (db.portalMeetings || []).find((x) => x.id === open);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <Select value={emp} onChange={(e) => setEmp(e.target.value)} placeholder="All employees" options={employees.map((e) => ({ value: e.id, label: e.name }))} className="w-auto" />
        <Select value={st} onChange={(e) => setSt(e.target.value)} placeholder="Any MOM status" options={Object.keys(MOM_STYLE)} className="w-auto" />
        <SearchBox value={q} onChange={setQ} placeholder="Search client or notes…" />
      </div>
      {rows.length === 0 ? <EmptyState icon={CalendarClock} title="No meetings found" /> : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((x) => (
            <button key={x.id} onClick={() => setOpen(x.id)} className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <span className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                <span className="text-[10px] font-semibold uppercase">{new Date(`${x.date}T00:00:00`).toLocaleDateString("en-GB", { month: "short" })}</span>
                <span className="text-sm font-bold leading-none">{x.date.slice(8)}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{x.client}</p>
                <p className="truncate text-xs text-slate-500">{eName(x.empId)} · {x.notes}</p>
              </div>
              <Badge className={MOM_STYLE[x.momStatus]}>{x.momStatus}</Badge>
            </button>
          ))}
        </div>
      )}
      <Drawer open={!!m} onClose={() => setOpen(null)} title={m ? `Meeting with ${m.client}` : ""} subtitle={m ? `${fmtDate(m.date)} · ${eName(m.empId)}` : ""}
        footer={m && <>
          <Button variant="ghost" icon={Trash2} className="mr-auto text-rose-600" onClick={async () => { if (await confirm({ title: "Delete this meeting?" })) { remove("portalMeetings", m.id); setOpen(null); toast("Meeting deleted"); } }}>Delete</Button>
          {m.momStatus !== "MOM sent" && <Button icon={Mail} onClick={() => { update("portalMeetings", m.id, { momStatus: "MOM sent" }); toast(`MOM emailed to ${m.client}`); }}>Mark MOM sent</Button>}
        </>}>
        {m && <div className="space-y-5 p-6">
          <Badge className={MOM_STYLE[m.momStatus]}>{m.momStatus}</Badge>
          <div><p className="label flex items-center gap-1.5"><NotebookPen className="h-3.5 w-3.5" />Minutes of meeting</p>
            <Textarea rows={8} value={m.notes} onChange={(e) => update("portalMeetings", m.id, { notes: e.target.value, momStatus: m.momStatus === "Notes only" ? "MOM written, not sent" : m.momStatus })} /></div>
        </div>}
      </Drawer>
    </Card>
  );
}

/* ── Documents ─────────────────────────────────────── */
export function PortalDocuments() {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const employees = db.employees || [];
  const eName = (id) => employees.find((e) => e.id === id)?.name || "—";
  const pName = (id) => (db.projects || []).find((p) => p.id === id)?.client || "—";
  const rows = (db.portalDocs || []).filter((d) => !q || `${d.name} ${eName(d.from)} ${eName(d.to)} ${pName(d.projectId)}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800"><SearchBox value={q} onChange={setQ} placeholder="Search documents, people, projects…" /></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Document</th><th className="th">From</th><th className="th">To</th><th className="th">Project</th><th className="th">Shared</th><th className="th">Seen</th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="tr">
                <td className="td"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><FileText className="h-4 w-4" /></span><span className="font-medium text-slate-800 dark:text-slate-100">{d.name}</span></div></td>
                <td className="td"><span className="flex items-center gap-2"><Avatar name={eName(d.from)} size="xs" />{eName(d.from)}</span></td>
                <td className="td"><span className="flex items-center gap-2"><Avatar name={eName(d.to)} size="xs" />{eName(d.to)}</span></td>
                <td className="td text-slate-600 dark:text-slate-400">{pName(d.projectId)}</td>
                <td className="td text-xs text-slate-500">{timeAgo(d.at)}</td>
                <td className="td">{d.seen ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Eye className="h-3.5 w-3.5" />Seen</span> : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><EyeOff className="h-3.5 w-3.5" />Not opened yet</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState title="No shared documents" />}
      </div>
    </Card>
  );
}

/* ── Tasks ─────────────────────────────────────────── */
export function PortalTasks() {
  const { db, add, update, remove } = useStore();
  const toast = useToast();
  const [prio, setPrio] = useState("");
  const [st, setSt] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const today = todayISO();
  const employees = (db.employees || []).filter((e) => e.portalStatus === "Active");
  const eName = (id) => (db.employees || []).find((e) => e.id === id)?.name || "—";
  const statusOf = (t) => (t.status !== "Done" && t.due && t.due < today ? "Overdue" : t.status);
  const rows = useMemo(() => (db.portalTasks || [])
    .filter((t) => (!prio || t.priority === prio) && (!st || statusOf(t) === st) && (!q || `${t.title} ${t.project} ${eName(t.empId)}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (a.status === "Done") - (b.status === "Done") || (a.due || "").localeCompare(b.due || "")), [db.portalTasks, prio, st, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const empProjects = (id) => {
    const e = (db.employees || []).find((x) => x.id === id);
    return (e?.projects || []).map((p) => (db.projects || []).find((x) => x.id === p)?.client).filter(Boolean);
  };
  const save = () => {
    if (!form.empId || !form.title.trim()) return toast("Pick an employee and write the task", "error");
    add("portalTasks", { ...form, title: form.title.trim(), status: "To do" }, "pt");
    toast(`Task assigned to ${eName(form.empId)}`); setForm(null);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <Select value={prio} onChange={(e) => setPrio(e.target.value)} placeholder="Any priority" options={["High", "Medium", "Low"]} className="w-auto" />
        <Select value={st} onChange={(e) => setSt(e.target.value)} placeholder="Any status" options={["To do", "Doing", "Done", "Overdue"]} className="w-auto" />
        <SearchBox value={q} onChange={setQ} placeholder="Search tasks…" />
        <Button icon={Plus} onClick={() => setForm({ empId: "", title: "", project: "", due: today, priority: "Medium" })}>Assign a task</Button>
      </div>
      {rows.length === 0 ? <EmptyState title="No tasks" text="Assign work to someone on the portal." /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Task</th><th className="th">Employee</th><th className="th">Client / project</th><th className="th">Due</th><th className="th">Priority</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody>
              {rows.map((t) => {
                const s = statusOf(t);
                return (
                  <tr key={t.id} className="tr">
                    <td className="td"><span className={cx("font-medium", t.status === "Done" ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100")}>{t.title}</span></td>
                    <td className="td"><span className="flex items-center gap-2"><Avatar name={eName(t.empId)} size="xs" />{eName(t.empId)}</span></td>
                    <td className="td text-slate-600 dark:text-slate-400">{t.project || "—"}</td>
                    <td className={cx("td text-xs", s === "Overdue" ? "font-semibold text-rose-600" : "text-slate-500")}>{t.due ? fmtDate(t.due) : "—"}</td>
                    <td className="td"><select value={t.priority} onChange={(e) => update("portalTasks", t.id, { priority: e.target.value })} className={cx("chip cursor-pointer border-0 py-1 outline-none", PRIO_STYLE[t.priority])}>{["High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}</select></td>
                    <td className="td"><button title="Click to change status" onClick={() => { update("portalTasks", t.id, { status: NEXT[t.status] }); toast(`Marked ${NEXT[t.status]}`); }} className={cx("chip transition hover:opacity-80", TASK_STYLE[s])}>{s}</button></td>
                    <td className="td text-right"><button onClick={() => { remove("portalTasks", t.id); toast("Task removed"); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title="Assign a task" size="md" footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Assign task</Button></>}>
        {form && <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee" required className="sm:col-span-2"><Select value={form.empId} onChange={(e) => setForm({ ...form, empId: e.target.value, project: "" })} placeholder="Choose…" options={employees.map((e) => ({ value: e.id, label: `${e.name} — ${(e.portalRoles || [])[0] || ""}` }))} /></Field>
          <Field label="Task" required className="sm:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fix the contact form validation" /></Field>
          <Field label="Client or project" hint="Their projects, other clients, or type anything">
            <Input list="task-projects" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
            <datalist id="task-projects">{[...new Set([...empProjects(form.empId), ...(db.projects || []).map((p) => p.client)])].map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
          <Field label="Due"><Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></Field>
          <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={["High", "Medium", "Low"]} /></Field>
        </div>}
      </Modal>
    </Card>
  );
}

/* ── Settings ──────────────────────────────────────── */
export function PortalSettings() {
  const { db, setSettings } = useStore();
  const toast = useToast();
  const p = db.settings.portal || {};
  const rows = [
    { key: "needsApproval", icon: UserPlus, title: "New accounts need approval", text: "People who sign up wait in Employees → Waiting for approval until you approve them." },
    { key: "companyEmailOnly", icon: AtSign, title: "Company email only", text: "Block sign-ups from Gmail and other personal email addresses." },
    { key: "devsSeePasswords", icon: ShieldCheck, title: "Developers can see integration passwords", text: "Developers on a project can reveal its Credential Vault secrets. Every view is logged." },
  ];
  return (
    <Card className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((r) => (
        <div key={r.key} className="flex items-start gap-4 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><r.icon className="h-5 w-5" /></span>
          <div className="flex-1"><p className="font-semibold text-slate-900 dark:text-white">{r.title}</p><p className="mt-0.5 text-sm text-slate-500">{r.text}</p></div>
          <Toggle checked={!!p[r.key]} onChange={(v) => { setSettings("portal", { [r.key]: v }); toast(`${r.title}: ${v ? "on" : "off"}`); }} />
        </div>
      ))}
    </Card>
  );
}
