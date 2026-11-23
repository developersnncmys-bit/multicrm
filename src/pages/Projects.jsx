import { useEffect, useMemo, useState } from "react";
import { STAGE_BAR_PALETTE, firstStage, milestoneTitles, term } from "../config/workspace";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderKanban, CheckCircle2, AlertTriangle, IndianRupee, Plus, LayoutGrid, List, Pencil, Trash2, Phone, CalendarDays, User, Receipt, X, Check, Clock, Eye, Download } from "lucide-react";
import { useStore, invoicePaid } from "../store/store";
import { useToast } from "../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, SearchInput, Select, Badge, Menu, EmptyState, Drawer, Modal, Field, Input, Textarea, Avatar, Progress, useConfirm, cx } from "../components/ui";
import { PROJECT_STAGES, PROJECT_STAGE_STYLE, BRANCHES, SERVICES, DOC_STATUS_STYLE } from "../config/constants";
import { inr, compactInr, fmtDate, todayISO, addDays, daysBetween, downloadCSV, uid } from "../utils/format";
import { docTotal, invoiceStatus } from "./docs/docUtils";

const progressOf = (p) => (p.milestones?.length ? Math.round((p.milestones.filter((m) => m.done).length / p.milestones.length) * 100) : 0);
const isOverdue = (p, today) => !["Completed", "On Hold"].includes(p.stage) && p.deadline && p.deadline < today;
// Stage colours follow position, so they work for every industry preset
const STAGE_BAR = new Proxy({}, { get: (_, k) => STAGE_BAR_PALETTE[PROJECT_STAGES.indexOf(k)] || "bg-slate-400" });

function Deadline({ p, today }) {
  if (p.stage === "Completed") return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Delivered</span>;
  if (!p.deadline) return <span className="text-xs text-slate-400">No deadline</span>;
  const d = daysBetween(today, p.deadline);
  if (d < 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />{-d}d overdue</span>;
  return <span className={cx("inline-flex items-center gap-1 text-xs font-medium", d <= 7 ? "text-amber-600" : "text-slate-500")}><Clock className="h-3.5 w-3.5" />{d === 0 ? "Due today" : `${d}d left`}</span>;
}

function TeamStack({ ids = [], max = 3 }) {
  const { empById } = useStore();
  const people = ids.map(empById).filter(Boolean);
  return (
    <div className="flex -space-x-2">
      {people.slice(0, max).map((e) => <Avatar key={e.id} name={e.name} size="xs" className="ring-2 ring-white dark:ring-slate-900" />)}
      {people.length > max && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 ring-2 ring-white dark:bg-slate-800 dark:ring-slate-900">+{people.length - max}</span>}
    </div>
  );
}

export default function Projects() {
  const { db, update, remove, add } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(() => { try { return localStorage.getItem("nexora_proj_view") || "board"; } catch { return "board"; } });
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [branch, setBranch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [edit, setEdit] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const today = todayISO();

  useEffect(() => { try { localStorage.setItem("nexora_proj_view", view); } catch { /* ignore */ } }, [view]);
  useEffect(() => {
    if (params.get("open")) { setOpenId(params.get("open")); setParams({}, { replace: true }); }
    else if (params.get("new")) { setEdit({}); setParams({}, { replace: true }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.projects
      .filter((p) => view === "board" || !stage || p.stage === stage)
      .filter((p) => !branch || p.branch === branch)
      .filter((p) => !s || [p.name, p.client, p.contact, p.service].some((v) => String(v || "").toLowerCase().includes(s)));
  }, [db.projects, q, stage, branch, view]);

  const kpi = useMemo(() => {
    const m = today.slice(0, 7);
    const done = db.projects.filter((p) => p.stage === "Completed");
    return {
      active: db.projects.filter((p) => !["Completed", "On Hold"].includes(p.stage)).length,
      completed: done.length, completedMonth: done.filter((p) => (p.completedAt || "").startsWith(m)).length,
      overdue: db.projects.filter((p) => isOverdue(p, today)).length,
      value: db.projects.reduce((s, p) => s + Number(p.value || 0), 0),
    };
  }, [db.projects, today]);

  const moveStage = (p, s) => {
    if (p.stage === s) return;
    const patch = { stage: s };
    if (s === "Completed") { patch.completedAt = today; patch.milestones = (p.milestones || []).map((m) => ({ ...m, done: true })); }
    update("projects", p.id, patch);
    toast(`${p.client} moved to ${s}`);
  };
  const del = async (p) => {
    if (await confirm({ title: "Delete project?", message: `"${p.name}" will be permanently removed.` })) { remove("projects", p.id); setOpenId(null); toast("Project deleted"); }
  };
  const exportCSV = () => downloadCSV(`projects-${today}.csv`, rows, [
    { label: "Project", key: "name" }, { label: "Client", key: "client" }, { label: "Service", key: "service" }, { label: "Stage", key: "stage" },
    { label: "Progress %", value: progressOf }, { label: "Start", key: "startDate" }, { label: "Deadline", key: "deadline" }, { label: "Value", key: "value" }, { label: "Branch", key: "branch" },
  ]);

  const project = db.projects.find((p) => p.id === openId);

  return (
    <div>
      <PageHeader title={term("projects")} subtitle={`Track every ${term("project").toLowerCase()} from ${PROJECT_STAGES[0]} to ${PROJECT_STAGES[6]} — stages, milestones, team and billing.`}
        actions={<>
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {[["board", LayoutGrid, "Board"], ["table", List, "Table"]].map(([v, I, l]) => (
              <button key={v} onClick={() => setView(v)} className={cx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition", view === v ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500")}><I className="h-4 w-4" />{l}</button>
            ))}
          </div>
          <Button variant="secondary" icon={Download} onClick={exportCSV}>Export</Button>
          <Button icon={Plus} onClick={() => setEdit({})}>New project</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Active projects" value={kpi.active} icon={FolderKanban} tone="brand" sub="in progress" />
        <StatCard label="Completed" value={kpi.completed} icon={CheckCircle2} tone="emerald" sub={`${kpi.completedMonth} this month`} />
        <StatCard label="Overdue" value={kpi.overdue} icon={AlertTriangle} tone="rose" sub="past deadline" />
        <StatCard label="Total project value" value={compactInr(kpi.value)} icon={IndianRupee} tone="violet" sub={`${db.projects.length} projects`} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Search projects, clients…" className="sm:w-72" />
        {view === "table" && <Select value={stage} onChange={(e) => setStage(e.target.value)} options={PROJECT_STAGES} placeholder="All stages" className="sm:w-48" />}
        <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={BRANCHES} placeholder="All branches" className="sm:w-44" />
      </div>

      {rows.length === 0 && view === "table" ? (
        <Card><EmptyState icon={FolderKanban} title="No projects found" action={<Button icon={Plus} onClick={() => setEdit({})}>New project</Button>} /></Card>
      ) : view === "board" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex min-w-max gap-4">
            {PROJECT_STAGES.map((s) => {
              const items = rows.filter((p) => p.stage === s);
              return (
                <div key={s}
                  onDragOver={(e) => { e.preventDefault(); setOverCol(s); }}
                  onDragLeave={() => setOverCol((c) => (c === s ? null : c))}
                  onDrop={(e) => { e.preventDefault(); const p = db.projects.find((x) => x.id === dragId); if (p) moveStage(p, s); setDragId(null); setOverCol(null); }}
                  className={cx("flex w-72 shrink-0 flex-col rounded-2xl bg-slate-100/70 p-2 transition dark:bg-slate-900/60", overCol === s && "bg-brand-50 ring-2 ring-brand-300 dark:bg-brand-500/10")}>
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><span className={cx("h-2.5 w-2.5 rounded-full", STAGE_BAR[s])} />{s}</span>
                    <span className="rounded-md bg-white px-1.5 text-xs font-bold text-slate-500 dark:bg-slate-800">{items.length}</span>
                  </div>
                  <div className="flex min-h-[120px] flex-1 flex-col gap-2">
                    {items.map((p) => {
                      const pr = progressOf(p);
                      return (
                        <div key={p.id} draggable onDragStart={() => setDragId(p.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }} onClick={() => setOpenId(p.id)}
                          className={cx("cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900", dragId === p.id && "opacity-40")}>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{p.service}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{p.client}</p>
                          <div className="mt-3 flex items-center justify-between text-xs"><span className="text-slate-500">Progress</span><span className="font-semibold text-slate-700 dark:text-slate-300">{pr}%</span></div>
                          <Progress value={pr} className="mt-1" tone={STAGE_BAR[p.stage]} />
                          <div className="mt-3 flex items-center justify-between">
                            <TeamStack ids={p.team} />
                            <Deadline p={p} today={today} />
                          </div>
                          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
                            <span className="text-slate-400">{p.branch}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{compactInr(p.value)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-4 text-xs text-slate-400 dark:border-slate-800">Drop here</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Project</th><th className="th">Stage</th><th className="th w-40">Progress</th><th className="th">Team</th><th className="th">Start</th><th className="th">Deadline</th><th className="th text-right">Value</th><th className="th" /></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const pr = progressOf(p);
                  return (
                    <tr key={p.id} className="tr cursor-pointer" onClick={() => setOpenId(p.id)}>
                      <td className="td"><p className="font-semibold text-slate-900 dark:text-white">{p.client}</p><p className="text-xs text-slate-400">{p.service} · {p.branch}</p></td>
                      <td className="td"><Badge className={PROJECT_STAGE_STYLE[p.stage]}>{p.stage}</Badge></td>
                      <td className="td"><div className="flex items-center gap-2"><Progress value={pr} tone={STAGE_BAR[p.stage]} /><span className="w-9 text-xs font-semibold">{pr}%</span></div></td>
                      <td className="td"><TeamStack ids={p.team} /></td>
                      <td className="td text-slate-500">{fmtDate(p.startDate)}</td>
                      <td className="td"><p className="text-sm text-slate-600 dark:text-slate-300">{fmtDate(p.deadline)}</p><Deadline p={p} today={today} /></td>
                      <td className="td text-right font-bold tabular-nums">{inr(p.value)}</td>
                      <td className="td text-right" onClick={(e) => e.stopPropagation()}>
                        <Menu items={[{ label: "Open", icon: Eye, onClick: () => setOpenId(p.id) }, { label: "Edit", icon: Pencil, onClick: () => setEdit(p) }, { label: "Delete", icon: Trash2, danger: true, onClick: () => del(p) }]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {project && <ProjectDrawer p={project} onClose={() => setOpenId(null)} onEdit={() => setEdit(project)} onDelete={() => del(project)} onStage={(s) => moveStage(project, s)} />}
      <ProjectModal p={edit} onClose={() => setEdit(null)} onSave={(data) => {
        if (edit?.id) { update("projects", edit.id, data); toast("Project updated"); }
        else {
          const rec = add("projects", { ...data, milestones: milestoneTitles().map((t) => ({ id: uid("m"), title: t, done: false })), notes: "" }, "P");
          toast("Project created"); setOpenId(rec.id);
        }
        setEdit(null);
      }} />
    </div>
  );
}

function ProjectDrawer({ p, onClose, onEdit, onDelete, onStage }) {
  const { db, update, userById } = useStore();
  const nav = useNavigate();
  const [newMs, setNewMs] = useState("");
  const [notes, setNotes] = useState(p.notes || "");
  const [saved, setSaved] = useState(true);
  const today = todayISO();
  const pr = progressOf(p);
  const manager = userById(p.managerId);

  useEffect(() => { setNotes(p.notes || ""); setSaved(true); }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (notes === (p.notes || "")) return;
    setSaved(false);
    const t = setTimeout(() => { update("projects", p.id, { notes }); setSaved(true); }, 600);
    return () => clearTimeout(t);
  }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMs = (milestones) => update("projects", p.id, { milestones });
  const addMs = () => { if (!newMs.trim()) return; setMs([...(p.milestones || []), { id: uid("m"), title: newMs.trim(), done: false }]); setNewMs(""); };
  const toggleTeam = (id) => update("projects", p.id, { team: p.team?.includes(id) ? p.team.filter((x) => x !== id) : [...(p.team || []), id] });

  const invoices = p.leadId ? db.invoices.filter((i) => i.leadId === p.leadId && i.status !== "Cancelled") : [];
  const billed = invoices.reduce((s, i) => s + docTotal(i), 0);
  const received = invoices.reduce((s, i) => s + invoicePaid(i), 0);

  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={p.client}
      subtitle={<span className="flex flex-wrap items-center gap-2">{p.service}<Badge className={PROJECT_STAGE_STYLE[p.stage]}>{p.stage}</Badge><Deadline p={p} today={today} /></span>}
      footer={<>
        <Button variant="ghost" className="mr-auto text-rose-600" icon={Trash2} onClick={onDelete}>Delete</Button>
        <Button variant="secondary" icon={Pencil} onClick={onEdit}>Edit details</Button>
        <Button icon={Receipt} onClick={() => nav(p.leadId ? `/invoices?new=1&lead=${p.leadId}` : "/invoices?new=1")}>Create invoice</Button>
      </>}>
      <div className="space-y-6 p-6">
        {/* Stage stepper */}
        <section>
          <p className="label">Stage</p>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_STAGES.map((s) => (
              <button key={s} onClick={() => onStage(s)}
                className={cx("rounded-lg px-2.5 py-1.5 text-xs font-semibold transition", p.stage === s ? cx(PROJECT_STAGE_STYLE[s], "shadow-sm ring-1 ring-black/5") : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700")}>
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Milestones */}
        <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Milestones</p>
            <span className="text-xs font-semibold text-slate-500">{pr}% complete</span>
          </div>
          <Progress value={pr} className="mb-3" tone={STAGE_BAR[p.stage]} />
          <div className="space-y-1">
            {(p.milestones || []).map((m) => (
              <div key={m.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <button onClick={() => setMs(p.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)))}
                  className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition", m.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-slate-600")}>
                  {m.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <span className={cx("flex-1 text-sm", m.done ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200")}>{m.title}</span>
                <button onClick={() => setMs(p.milestones.filter((x) => x.id !== m.id))} className="rounded p-1 text-slate-300 opacity-0 hover:text-rose-500 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={newMs} onChange={(e) => setNewMs(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMs()} placeholder="Add a milestone…" className="h-9 py-1.5" />
            <Button size="sm" variant="soft" icon={Plus} onClick={addMs} className="h-9">Add</Button>
          </div>
        </section>

        {/* Details */}
        <section className="grid gap-3 sm:grid-cols-2">
          {[
            [User, "Client contact", p.contact || "—"],
            [Phone, "Phone", p.phone ? <a href={`tel:${p.phone}`} className="text-brand-600 hover:underline dark:text-brand-300">{p.phone}</a> : "—"],
            [CalendarDays, "Start date", fmtDate(p.startDate)],
            [CalendarDays, "Deadline", fmtDate(p.deadline)],
            [IndianRupee, "Project value", inr(p.value)],
            [User, "Project manager", manager?.name || "—"],
          ].map(([I, k, v]) => (
            <div key={k} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <I className="mt-0.5 h-4 w-4 text-slate-400" />
              <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{v}</p></div>
            </div>
          ))}
        </section>

        {/* Team */}
        <section>
          <p className="label">Team <span className="font-normal text-slate-400">— click to add / remove</span></p>
          <div className="flex flex-wrap gap-2">
            {db.employees.filter((e) => e.status === "Active").map((e) => {
              const on = p.team?.includes(e.id);
              return (
                <button key={e.id} onClick={() => toggleTeam(e.id)}
                  className={cx("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition", on ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}>
                  <Avatar name={e.name} size="xs" />{e.name.split(" ")[0]}<span className="text-[10px] opacity-60">{e.designation.split(" ")[0]}</span>
                  {on && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Billing */}
        <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Billing</p>
            <span className="text-xs text-slate-500">Billed {inr(billed)} · Received <b className="text-emerald-600">{inr(received)}</b></span>
          </div>
          <Progress value={p.value ? (received / p.value) * 100 : 0} tone="bg-emerald-500" className="mb-3" />
          {invoices.length === 0 ? <p className="text-sm text-slate-500">No invoices raised for this project yet.</p> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((i) => {
                const st = invoiceStatus(i); const tot = docTotal(i); const pd = invoicePaid(i);
                return (
                  <button key={i.id} onClick={() => nav(`/invoices?open=${i.id}`)} className="flex w-full items-center justify-between py-2.5 text-left text-sm hover:opacity-80">
                    <div><p className="font-semibold text-slate-800 dark:text-slate-200">{i.number}</p><p className="text-xs text-slate-500">{fmtDate(i.date)} · Paid {inr(pd)} · Balance {inr(Math.max(0, tot - pd))}</p></div>
                    <div className="text-right"><p className="font-bold tabular-nums">{inr(tot)}</p><Badge className={DOC_STATUS_STYLE[st]}>{st}</Badge></div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Notes */}
        <section>
          <div className="flex items-center justify-between"><p className="label">Notes</p><span className="mb-1.5 text-[11px] text-slate-400">{saved ? "Saved" : "Saving…"}</span></div>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes, client preferences, links…" />
        </section>
      </div>
    </Drawer>
  );
}

function ProjectModal({ p, onClose, onSave }) {
  const { db } = useStore();
  const [f, setF] = useState({});
  const [errors, setErrors] = useState({});
  const [last, setLast] = useState(null);
  if (p !== last) {
    setLast(p);
    const start = todayISO();
    setF({ name: "", client: "", contact: "", phone: "", service: SERVICES[0], stage: firstStage(), branch: BRANCHES[0], startDate: start, deadline: addDays(start, 45), value: "", managerId: db.users.find((u) => u.role === "Project Manager")?.id || "", team: [], leadId: "", ...(p || {}) });
    setErrors({});
  }
  const pickLead = (id) => {
    const l = db.leads.find((x) => x.id === id);
    if (!l) return setF({ ...f, leadId: "" });
    setF({ ...f, leadId: l.id, client: l.company, contact: l.name, phone: l.phone, service: l.service, branch: l.branch, value: l.value, name: `${l.company} — ${l.service}` });
  };
  const save = () => {
    const e = {};
    if (!f.client?.trim()) e.client = "Client is required";
    if (f.deadline && f.startDate && f.deadline < f.startDate) e.deadline = "Deadline must be after the start date";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ ...f, name: f.name?.trim() || `${f.client.trim()} — ${f.service}`, client: f.client.trim(), value: Number(f.value) || 0 });
  };
  const won = db.leads.filter((l) => ["Won", "Negotiation"].includes(l.stage));
  return (
    <Modal open={!!p} onClose={onClose} title={p?.id ? `Edit ${term("project").toLowerCase()}` : `New ${term("project").toLowerCase()}`} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{p?.id ? "Save changes" : "Create project"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!p?.id && (
          <Field label="Create from a won deal (optional)" className="sm:col-span-2">
            <Select value={f.leadId || ""} onChange={(e) => pickLead(e.target.value)} options={won.map((l) => ({ value: l.id, label: `${l.company} · ${l.service} · ${inr(l.value)}` }))} placeholder="— Select a deal to autofill —" />
          </Field>
        )}
        <Field label="Client / company" required error={errors.client}><Input value={f.client || ""} onChange={(e) => setF({ ...f, client: e.target.value })} /></Field>
        <Field label="Project name" hint="Leave blank to auto-generate"><Input value={f.name || ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Contact person"><Input value={f.contact || ""} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field>
        <Field label="Phone"><Input value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Service"><Select options={SERVICES} value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} /></Field>
        <Field label="Stage"><Select options={PROJECT_STAGES} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })} /></Field>
        <Field label="Start date"><Input type="date" value={f.startDate || ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="Deadline" error={errors.deadline}><Input type="date" value={f.deadline || ""} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
        <Field label="Project value (₹)"><Input type="number" value={f.value ?? ""} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
        <Field label="Branch"><Select options={BRANCHES} value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })} /></Field>
        <Field label="Project manager" className="sm:col-span-2"><Select options={db.users.map((u) => ({ value: u.id, label: `${u.name} — ${u.role}` }))} value={f.managerId || ""} onChange={(e) => setF({ ...f, managerId: e.target.value })} placeholder="Unassigned" /></Field>
      </div>
    </Modal>
  );
}
