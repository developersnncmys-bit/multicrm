import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, CheckCircle2, Circle, ExternalLink, AlertOctagon, Bug, ClipboardCheck, Users, FolderKanban, Search, Crown } from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, Badge, Button, Card, CardHeader, Drawer, EmptyState, Input, Progress, Select, Tabs, cx } from "../../components/ui";
import { useToast } from "../../components/ui/Toast";
import { addDays, downloadCSV, fmtDate, fmtDateTime, lastMonths, timeAgo, todayISO } from "../../utils/format";

const BUG_STYLE = {
  Open: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Reopened: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  "Fixed to verify": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Verified: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "Not a bug": "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-300",
  "Needs info": "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
};
const BUG_OPEN = ["Open", "Reopened", "Needs info"];
const BUG_FIXED = ["Fixed to verify", "Verified"];
const hhmm = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/* ── Plans for today ───────────────────────────────── */
export function PortalPlans() {
  const { db } = useStore();
  const [date, setDate] = useState(todayISO());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState({});
  const plans = (db.dayPlans || []).filter((p) => p.date === date);
  const employees = (db.employees || []).filter((e) => e.portalStatus === "Active");
  const lead = employees.find((e) => e.isPlansLead);
  const withPlan = plans.map((p) => ({ p, e: employees.find((x) => x.id === p.empId) })).filter((x) => x.e && (!q || x.e.name.toLowerCase().includes(q.toLowerCase())));
  const missing = employees.filter((e) => !plans.some((p) => p.empId === e.id));
  const items = plans.flatMap((p) => p.items);
  const done = items.filter((i) => i.done).length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee…" className="input pl-9" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(Object.fromEntries(plans.map((p) => [p.id, !Object.values(open).some(Boolean)])))}>{Object.values(open).some(Boolean) ? "Hide all" : "See all"}</Button>
        </div>
        {withPlan.length === 0 ? <EmptyState icon={ClipboardCheck} title="No plans for this day" text="Plans appear here when people add them on the portal." /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {withPlan.map(({ p, e }) => {
              const d = p.items.filter((i) => i.done).length;
              return (
                <div key={p.id}>
                  <button onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {open[p.id] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <Avatar name={e.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{e.name}</p>
                      <p className="text-xs text-slate-500">{(e.portalRoles || [])[0]} · added {hhmm(p.items[0]?.addedAt || p.date)}</p>
                    </div>
                    <div className="w-28 text-right">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{d}/{p.items.length} done</p>
                      <Progress value={(d / Math.max(p.items.length, 1)) * 100} tone="bg-emerald-500" className="mt-1" />
                    </div>
                  </button>
                  {open[p.id] && (
                    <ul className="space-y-1.5 bg-slate-50/60 px-14 py-3 dark:bg-slate-800/20">
                      {p.items.map((it, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm">
                          {it.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                          <span className={cx("flex-1", it.done ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200")}>{it.text}</span>
                          <span className="text-[11px] text-slate-400">added {hhmm(it.addedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <div className="space-y-5">
        <Card className="p-5">
          <p className="text-[13px] font-medium text-slate-500">Plan completion</p>
          <p className="mt-1 text-[26px] font-bold text-slate-900 dark:text-white">{items.length ? Math.round((done / items.length) * 100) : 0}%</p>
          <p className="text-xs text-slate-500">{done} of {items.length} items · {plans.length} people planned</p>
          <Progress value={items.length ? (done / items.length) * 100 : 0} className="mt-3 h-2" />
        </Card>
        <Card>
          <CardHeader title="Report from the team plans lead" subtitle={lead ? lead.name : "No plans lead set"} action={<Crown className="h-4 w-4 text-amber-500" />} />
          <div className="p-5 pt-3 text-sm text-slate-600 dark:text-slate-300">
            {lead && date <= todayISO() ? (
              <p>"{plans.length} of {employees.length} people shared plans for {fmtDate(date)}. {done} items done so far. {missing.length ? `Still waiting on ${missing.slice(0, 3).map((m) => m.name.split(" ")[0]).join(", ")}${missing.length > 3 ? ` and ${missing.length - 3} more` : ""}.` : "Everyone has planned their day."}"</p>
            ) : <p className="text-slate-400">No report for this day yet.</p>}
          </div>
        </Card>
        {missing.length > 0 && (
          <Card>
            <CardHeader title="No plan yet" subtitle={`${missing.length} people`} />
            <div className="flex flex-wrap gap-2 p-5 pt-3">{missing.map((m) => <span key={m.id} className="flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Avatar name={m.name} size="xs" />{m.name.split(" ")[0]}</span>)}</div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── Work log ──────────────────────────────────────── */
function periodRange(period, from, to) {
  const t = todayISO();
  if (period === "Today") return [t, t];
  if (period === "Last 7 days") return [addDays(t, -6), t];
  if (period === "This month") return [`${t.slice(0, 7)}-01`, t];
  if (period === "Last month") { const m = lastMonths(2)[0]; const end = addDays(`${t.slice(0, 7)}-01`, -1); return [`${m}-01`, end]; }
  return [from || addDays(t, -30), to || t];
}

export function PortalWorkLog() {
  const { db, update } = useStore();
  const toast = useToast();
  const [period, setPeriod] = useState("Last 7 days");
  const [from, setFrom] = useState(addDays(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [view, setView] = useState("People");
  const [person, setPerson] = useState(null);
  const [bugFilter, setBugFilter] = useState("");
  const [a, b] = periodRange(period, from, to);
  const employees = db.employees || [];
  const projects = db.projects || [];
  const pName = (id) => projects.find((p) => p.id === id)?.client || "General";
  const eName = (id) => employees.find((e) => e.id === id)?.name || "—";
  const logs = (db.workLogs || []).filter((w) => w.date >= a && w.date <= b);
  const bugs = db.bugs || [];
  const tasks = db.portalTasks || [];
  const blockers = db.blockers || [];

  const people = useMemo(() => employees.filter((e) => e.portalStatus === "Active").map((e) => {
    const mine = logs.filter((w) => w.empId === e.id);
    const days = new Set(mine.map((w) => w.date));
    const last = mine.reduce((x, w) => (!x || w.date > x ? w.date : x), "");
    const att = db.attendance?.[`${todayISO()}|${e.id}`];
    return {
      e, items: mine.length, hours: mine.reduce((s, w) => s + Number(w.hours || 0), 0), days: days.size, last, att,
      tasksOpen: tasks.filter((t) => t.empId === e.id && t.status !== "Done").length,
      bugsOpen: bugs.filter((x) => x.assignedTo === e.id && BUG_OPEN.includes(x.status)).length,
      bugsFixed: bugs.filter((x) => x.assignedTo === e.id && BUG_FIXED.includes(x.status)).length,
      extra: Math.max(0, mine.reduce((s, w) => s + Number(w.hours || 0), 0) - days.size * 8),
    };
  }).sort((x, y) => y.hours - x.hours), [employees, logs, tasks, bugs, db.attendance]);

  const byProject = useMemo(() => {
    const ids = [...new Set([...logs.map((w) => w.projectId), ...bugs.map((x) => x.projectId)])].filter(Boolean);
    return ids.map((id) => ({ id, logs: logs.filter((w) => w.projectId === id), bugs: bugs.filter((x) => x.projectId === id), tasks: tasks.filter((t) => t.project === pName(id)) }))
      .sort((x, y) => y.logs.length - x.logs.length);
  }, [logs, bugs, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    downloadCSV(`work-log_${a}_${b}.csv`, logs, [
      { label: "Date", key: "date" }, { label: "Employee", value: (w) => eName(w.empId) }, { label: "Project", value: (w) => pName(w.projectId) },
      { label: "Work type", key: "type" }, { label: "Summary", key: "summary" }, { label: "Hours", key: "hours" }, { label: "Link", key: "link" },
    ]);
    toast(`Exported ${logs.length} entries`);
  };

  const personLogs = person ? logs.filter((w) => w.empId === person.id) : [];
  const personByProject = person ? [...new Set(personLogs.map((w) => w.projectId))].map((pid) => ({ pid, list: personLogs.filter((w) => w.projectId === pid).sort((x, y) => y.date.localeCompare(x.date)) })) : [];
  const openBlockers = blockers.filter((x) => !x.resolved);

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <Tabs tabs={["Today", "Last 7 days", "This month", "Last month", "Custom"]} value={period} onChange={setPeriod} />
        {period === "Custom" && <div className="flex items-center gap-2"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" /><span className="text-slate-400">to</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" /></div>}
        <div className="flex items-center gap-2 lg:ml-auto">
          <Tabs tabs={[{ value: "People", label: <><Users className="h-3.5 w-3.5" />People</> }, { value: "Projects", label: <><FolderKanban className="h-3.5 w-3.5" />Projects</> }, { value: "Blockers", label: <><AlertOctagon className="h-3.5 w-3.5" />Blockers</>, count: openBlockers.length }]} value={view} onChange={setView} />
          <Button variant="secondary" icon={Download} onClick={exportCsv}>CSV</Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        {[["Items logged", logs.length], ["Hours logged", logs.reduce((s, w) => s + Number(w.hours || 0), 0)], ["Open bugs", bugs.filter((x) => BUG_OPEN.includes(x.status)).length], ["Open blockers", openBlockers.length]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-[13px] text-slate-500">{l}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{v}</p></Card>
        ))}
      </div>

      {view === "People" && (
        <Card className="overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Employee</th><th className="th">Check in / out</th><th className="th text-right">Hours</th><th className="th text-right">Items</th><th className="th text-right">Days submitted</th><th className="th text-right">Extra hrs</th><th className="th text-right">Tasks open</th><th className="th text-right">Bugs open / fixed</th><th className="th">Last worked</th></tr></thead>
            <tbody>
              {people.map((r) => (
                <tr key={r.e.id} className="tr cursor-pointer" onClick={() => setPerson(r.e)}>
                  <td className="td"><div className="flex items-center gap-3"><Avatar name={r.e.name} size="sm" /><div><p className="font-semibold text-slate-800 dark:text-slate-100">{r.e.name}</p><p className="text-xs text-slate-500">{(r.e.portalRoles || [])[0]}</p></div></div></td>
                  <td className="td text-xs text-slate-600 dark:text-slate-400">{r.att?.in ? `${r.att.in} – ${r.att.out || "still in"}` : "—"}</td>
                  <td className="td text-right font-semibold text-slate-800 dark:text-slate-100">{r.hours}</td>
                  <td className="td text-right">{r.items}</td>
                  <td className="td text-right">{r.days}</td>
                  <td className="td text-right">{r.extra ? <span className="font-semibold text-violet-600">+{r.extra}</span> : "—"}</td>
                  <td className="td text-right">{r.tasksOpen}</td>
                  <td className="td text-right"><span className={r.bugsOpen ? "font-semibold text-rose-600" : ""}>{r.bugsOpen}</span> / <span className="text-emerald-600">{r.bugsFixed}</span></td>
                  <td className="td text-xs text-slate-500">{r.last ? fmtDate(r.last) : "No work logged"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Card>
      )}

      {view === "Projects" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2"><span className="text-sm text-slate-500">Bug status</span><Select value={bugFilter} onChange={(e) => setBugFilter(e.target.value)} placeholder="All" options={Object.keys(BUG_STYLE)} className="w-auto" /></div>
          {byProject.length === 0 && <Card><EmptyState title="No project activity in this period" /></Card>}
          {byProject.map((p) => {
            const bl = p.bugs.filter((x) => !bugFilter || x.status === bugFilter);
            return (
              <Card key={p.id}>
                <CardHeader title={pName(p.id)} subtitle={`${p.logs.length} work items · ${p.logs.reduce((s, w) => s + Number(w.hours || 0), 0)} hrs · ${p.bugs.filter((x) => BUG_OPEN.includes(x.status)).length} open bugs · ${p.tasks.filter((t) => t.status !== "Done").length} open tasks`} />
                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  <div>
                    <p className="label">Recent work</p>
                    <ul className="space-y-2">
                      {p.logs.slice(0, 5).map((w) => <li key={w.id} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" /><span className="flex-1 text-slate-700 dark:text-slate-300"><b className="font-semibold">{w.type}</b> — {w.summary}<span className="block text-xs text-slate-400">{eName(w.empId)} · {fmtDate(w.date)} · {w.hours}h</span></span></li>)}
                      {!p.logs.length && <li className="text-sm text-slate-400">No work logged</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="label flex items-center gap-1.5"><Bug className="h-3.5 w-3.5" />Bugs</p>
                    {bl.length === 0 ? <p className="text-sm text-slate-400">No bugs</p> : (
                      <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                        <table className="w-full"><thead><tr><th className="th">Bug</th><th className="th">Severity</th><th className="th">Status</th><th className="th">Given to</th></tr></thead>
                          <tbody>{bl.map((x) => (
                            <tr key={x.id} className="tr">
                              <td className="td"><p className="text-slate-700 dark:text-slate-200">{x.title}</p><p className="text-[11px] text-slate-400">by {eName(x.raisedBy)} · {fmtDate(x.at.slice(0, 10))}</p></td>
                              <td className="td text-xs"><span className={cx("font-semibold", x.severity === "Critical" || x.severity === "High" ? "text-rose-600" : "text-slate-500")}>{x.severity}</span></td>
                              <td className="td"><select value={x.status} onChange={(e) => { update("bugs", x.id, { status: e.target.value }); toast(`Bug marked ${e.target.value}`); }} className={cx("chip cursor-pointer border-0 py-1 outline-none", BUG_STYLE[x.status])}>{Object.keys(BUG_STYLE).map((s) => <option key={s}>{s}</option>)}</select></td>
                              <td className="td text-xs text-slate-600 dark:text-slate-400">{eName(x.assignedTo)}</td>
                            </tr>
                          ))}</tbody></table>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {view === "Blockers" && (
        <Card className="divide-y divide-slate-100 dark:divide-slate-800">
          {blockers.length === 0 && <EmptyState title="No blockers" />}
          {[...blockers].sort((x, y) => Number(x.resolved) - Number(y.resolved)).map((x) => (
            <div key={x.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", x.resolved ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10")}>{x.resolved ? <CheckCircle2 className="h-4 w-4" /> : <AlertOctagon className="h-4 w-4" />}</span>
              <div className="min-w-0 flex-1">
                <p className={cx("font-medium", x.resolved ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100")}>{x.text}</p>
                <p className="text-xs text-slate-500">{eName(x.empId)} · {pName(x.projectId)} · {timeAgo(x.at)}</p>
              </div>
              {!x.resolved ? <Button size="sm" variant="soft" onClick={() => { update("blockers", x.id, { resolved: true }); toast("Blocker marked as sorted"); }}>Mark as sorted</Button> : <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Sorted</Badge>}
            </div>
          ))}
        </Card>
      )}

      <Drawer open={!!person} onClose={() => setPerson(null)} title={person?.name} subtitle={`${(person?.portalRoles || [])[0] || ""} · ${personLogs.length} items · ${personLogs.reduce((s, w) => s + Number(w.hours || 0), 0)} hrs (${fmtDate(a)} – ${fmtDate(b)})`}>
        <div className="space-y-5 p-6">
          {personByProject.length === 0 && <EmptyState title="No work logged in this period" />}
          {personByProject.map(({ pid, list }) => (
            <div key={pid}>
              <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{pName(pid)} <span className="font-normal text-slate-400">· {list.length} items</span></p>
              <ul className="space-y-2">
                {list.map((w) => (
                  <li key={w.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2"><Badge className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{w.type}</Badge><span className="text-[11px] text-slate-400">{fmtDateTime(`${w.date}T18:00:00`)} · {w.hours}h</span></div>
                    <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">{w.summary}</p>
                    {w.link && <a href={w.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"><ExternalLink className="h-3 w-3" />Open link / screenshot</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
