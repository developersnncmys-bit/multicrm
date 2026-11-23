import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, MessagesSquare, ClipboardList, Activity, CalendarClock, FolderOpen, ListTodo, Settings, UserCheck, Clock, Bug } from "lucide-react";
import { useStore } from "../../store/store";
import { PageHeader, StatCard, cx } from "../../components/ui";
import { todayISO } from "../../utils/format";
import PortalPeople from "./PortalPeople";
import PortalMessages from "./PortalMessages";
import { PortalPlans, PortalWorkLog } from "./PortalWork";
import { PortalMeetings, PortalDocuments, PortalTasks, PortalSettings } from "./PortalOther";

const SEEN_KEY = "nexora_portal_seen";
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch { return {}; } };
const THREE_DAYS = () => new Date(Date.now() - 3 * 86400e3).toISOString();

const TABS = [
  { key: "employees", label: "Employees", icon: Users, C: PortalPeople },
  { key: "messages", label: "Messages", icon: MessagesSquare, C: PortalMessages },
  { key: "plans", label: "Plans for today", icon: ClipboardList, C: PortalPlans },
  { key: "work", label: "Work log", icon: Activity, C: PortalWorkLog },
  { key: "meetings", label: "Meetings & MOM", icon: CalendarClock, C: PortalMeetings },
  { key: "documents", label: "Documents", icon: FolderOpen, C: PortalDocuments },
  { key: "tasks", label: "Tasks", icon: ListTodo, C: PortalTasks },
  { key: "settings", label: "Settings", icon: Settings, C: PortalSettings },
];

export default function EmployeePortal() {
  const { db } = useStore();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "employees";
  const [seen, setSeen] = useState(readSeen);

  // New items per tab since it was last opened
  const counts = useMemo(() => {
    const since = (k) => seen[k] || THREE_DAYS();
    const today = todayISO();
    return {
      employees: (db.employees || []).filter((e) => e.portalStatus === "Pending").length,
      messages: (db.messages || []).filter((m) => !m.thread?.startsWith("group:") && m.from !== "admin" && !m.read).length,
      plans: (db.dayPlans || []).filter((p) => p.date === today && p.items.some((i) => i.addedAt > since("plans"))).length,
      work: (db.workLogs || []).filter((w) => `${w.date}T23:59:59` > since("work") && w.date >= since("work").slice(0, 10)).length,
      meetings: (db.portalMeetings || []).filter((m) => m.date >= since("meetings").slice(0, 10)).length,
      documents: (db.portalDocs || []).filter((d) => d.at > since("documents")).length,
      tasks: (db.portalTasks || []).filter((t) => t.status === "Done" && t.due >= since("tasks").slice(0, 10)).length,
    };
  }, [db, seen]);

  // Mark tab as seen when opened (messages/employees clear by action instead)
  useEffect(() => {
    if (["employees", "messages", "settings"].includes(tab)) return;
    const next = { ...readSeen(), [tab]: new Date().toISOString() };
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    const id = setTimeout(() => setSeen(next), 1500); // keep the badge visible briefly
    return () => clearTimeout(id);
  }, [tab]);

  const emps = db.employees || [];
  const active = emps.filter((e) => e.portalStatus === "Active");
  const signedToday = active.filter((e) => e.lastSignIn?.slice(0, 10) === todayISO()).length;
  const openBugs = (db.bugs || []).filter((b) => ["Open", "Reopened", "Needs info"].includes(b.status)).length;
  const Active = TABS.find((t) => t.key === tab).C;

  return (
    <div>
      <PageHeader title="Employee Portal" subtitle="Your team's portal: people, messages, daily plans, work logs, meetings and tasks." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active on portal" value={active.length} icon={UserCheck} tone="emerald" sub={`${signedToday} signed in today`} />
        <StatCard label="Waiting for approval" value={counts.employees} icon={Clock} tone="amber" sub="new sign-ups" onClick={() => setParams({ tab: "employees" })} />
        <StatCard label="Unread messages" value={counts.messages} icon={MessagesSquare} tone="brand" sub="one-to-one chats" onClick={() => setParams({ tab: "messages" })} />
        <StatCard label="Open bugs" value={openBugs} icon={Bug} tone="rose" sub={`${(db.blockers || []).filter((b) => !b.resolved).length} open blockers`} onClick={() => setParams({ tab: "work" })} />
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => {
          const n = counts[t.key];
          const on = t.key === tab;
          return (
            <button key={t.key} onClick={() => setParams({ tab: t.key })}
              className={cx("relative -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition",
                on ? "border-brand-600 text-brand-700 dark:text-brand-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>
              <t.icon className="h-4 w-4" />{t.label}
              {n > 0 && <span className={cx("rounded-full px-1.5 py-px text-[10.5px] font-bold", t.key === "employees" || t.key === "messages" ? "bg-rose-500 text-white" : "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200")}>{n}</span>}
            </button>
          );
        })}
      </div>
      <Active />
    </div>
  );
}
