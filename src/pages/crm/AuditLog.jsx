// Audit log — who did what, when. Read-only; exportable for compliance.
import { useMemo, useState } from "react";
import { History, Download, ShieldAlert, Users, Activity } from "lucide-react";
import { useStore } from "../../store/store";
import { Card, PageHeader, StatCard, SearchInput, Select, Badge, Avatar, EmptyState, Pagination, usePaged, Button, cx } from "../../components/ui";
import { fmtDateTime, timeAgo, downloadCSV } from "../../utils/format";

const ACTION_TONE = {
  created: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", updated: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  deleted: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", exported: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  revealed: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", login: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const SENSITIVE = ["deleted", "exported", "revealed"];

export default function AuditLog() {
  const { db, userById } = useStore();
  const [q, setQ] = useState("");
  const [who, setWho] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const log = db.auditLog || [];
  const entities = [...new Set(log.map((l) => l.entity))].sort();
  const actions = [...new Set(log.map((l) => l.action))].sort();
  const rows = useMemo(() => log.filter((l) => (!who || l.by === who) && (!action || l.action === action) && (!entity || l.entity === entity) && (!q || `${l.detail} ${l.entity}`.toLowerCase().includes(q.toLowerCase()))), [log, who, action, entity, q]);
  const pg = usePaged(rows, 20);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="A tamper-proof trail of changes across the workspace — useful for disputes, compliance and training."
        actions={<Button variant="secondary" icon={Download} onClick={() => downloadCSV("audit-log.csv", rows, [{ label: "When", key: "at" }, { label: "User", value: (l) => userById(l.by)?.name || "System" }, { label: "Action", key: "action" }, { label: "Record", key: "entity" }, { label: "Detail", key: "detail" }, { label: "IP", key: "ip" }])}>Export</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Events today" value={log.filter((l) => l.at.slice(0, 10) === today).length} icon={Activity} />
        <StatCard label="Events (30 days)" value={log.length} icon={History} tone="sky" />
        <StatCard label="Active users" value={new Set(log.map((l) => l.by)).size} icon={Users} tone="violet" />
        <StatCard label="Sensitive actions" value={log.filter((l) => SENSITIVE.includes(l.action)).length} icon={ShieldAlert} tone="rose" sub="deletes, exports, password views" onClick={() => setAction("deleted")} />
      </div>
      <Card>
        <div className="flex flex-col gap-2 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Search details…" className="sm:flex-1" />
          <Select value={who} onChange={(e) => setWho(e.target.value)} placeholder="All users" options={db.users.map((u) => ({ value: u.id, label: u.name }))} className="sm:w-44" />
          <Select value={action} onChange={(e) => setAction(e.target.value)} placeholder="All actions" options={actions} className="sm:w-40" />
          <Select value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="All records" options={entities} className="sm:w-40" />
        </div>
        {rows.length === 0 ? <EmptyState icon={History} title="No events" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="th">When</th><th className="th">User</th><th className="th">Action</th><th className="th">Record</th><th className="th">Detail</th><th className="th">IP</th></tr></thead>
                <tbody>
                  {pg.slice.map((l) => (
                    <tr key={l.id} className={cx("tr", SENSITIVE.includes(l.action) && "bg-rose-50/30 dark:bg-rose-500/5")}>
                      <td className="td"><p className="text-sm">{timeAgo(l.at)}</p><p className="text-xs text-slate-400">{fmtDateTime(l.at)}</p></td>
                      <td className="td"><span className="flex items-center gap-2"><Avatar name={userById(l.by)?.name || "System"} size="xs" />{userById(l.by)?.name || "System"}</span></td>
                      <td className="td"><Badge className={ACTION_TONE[l.action] || ACTION_TONE.updated}>{l.action}</Badge></td>
                      <td className="td font-medium">{l.entity}</td>
                      <td className="td max-w-[380px] truncate text-slate-600 dark:text-slate-300">{l.detail}</td>
                      <td className="td font-mono text-xs text-slate-400">{l.ip || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pg} onPage={pg.setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
