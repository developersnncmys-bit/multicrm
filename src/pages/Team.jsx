import { useMemo, useState } from "react";
import { CheckCircle2, Home, Clock4, Plane, XCircle, AlarmClock, PartyPopper, HelpCircle, Search, UserPlus, Pencil, Power, TrendingUp, Download, Printer, Wallet, Banknote, Landmark, Users, CalendarDays, Sparkles, Timer } from "lucide-react";
import { useStore } from "../store/store";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Menu, Modal, PageHeader, Select, StatCard, Tabs, Toggle, cx, useConfirm } from "../components/ui";
import { useToast } from "../components/ui/Toast";
import { BRANCHES } from "../config/constants";
import { amountInWords, downloadCSV, fmtDate, inr, todayISO, toISO } from "../utils/format";

/* ── Attendance statuses ───────────────────────────── */
const STATUSES = [
  { key: "Present", short: "P", icon: CheckCircle2, cls: "bg-emerald-500 text-white", soft: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  { key: "Late", short: "LT", icon: AlarmClock, cls: "bg-orange-500 text-white", soft: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300" },
  { key: "WFH", short: "W", icon: Home, cls: "bg-sky-500 text-white", soft: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" },
  { key: "Half Day", short: "HD", icon: Clock4, cls: "bg-amber-500 text-white", soft: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  { key: "Leave", short: "L", icon: Plane, cls: "bg-violet-500 text-white", soft: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" },
  { key: "Absent", short: "A", icon: XCircle, cls: "bg-rose-500 text-white", soft: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
  { key: "Holiday", short: "H", icon: PartyPopper, cls: "bg-slate-500 text-white", soft: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300" },
];
const S = Object.fromEntries(STATUSES.map((s) => [s.key, s]));
const DEPTS = ["Development", "Design", "Sales", "SEO & Ads", "Accounts", "Operations", "Management", "Maintenance", "HR", "Owner", "Other"];

const toMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const nowHHMM = () => new Date().toTimeString().slice(0, 5);
const hoursBetween = (a, b) => { const x = toMin(a), y = toMin(b); return x != null && y != null && y > x ? Math.round(((y - x) / 60) * 10) / 10 : null; };
const isLate = (emp, inTime) => inTime && toMin(inTime) > toMin(emp.shiftStart || "09:30") + Number(emp.grace ?? 15);

const monthDays = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => toISO(new Date(y, m - 1, i + 1)));
};
const isSunday = (iso) => new Date(`${iso}T00:00:00`).getDay() === 0;

/* ── Payroll calculation ───────────────────────────── */
export function payrollFor(emp, ym, attendance) {
  const today = todayISO();
  const days = monthDays(ym).filter((d) => !isSunday(d));
  const workingDays = days.length;
  const c = { Present: 0, Late: 0, WFH: 0, "Half Day": 0, Leave: 0, Absent: 0, Holiday: 0, Unmarked: 0, Future: 0 };
  days.forEach((d) => {
    if (d > today) { c.Future += 1; return; }
    const r = attendance[`${d}|${emp.id}`];
    if (!r) c.Unmarked += 1; else c[r.status] = (c[r.status] || 0) + 1;
  });
  const paidLeaveAllowed = emp.employmentType === "Probationary" ? 0 : 1.5;
  const paidLeave = Math.min(c.Leave, paidLeaveAllowed);
  // Future days of the current month are assumed worked (salary is projected)
  const paidDays = c.Present + c.Late + c.WFH + c["Half Day"] * 0.5 + c.Holiday + paidLeave + c.Future;
  const lop = Math.max(0, workingDays - paidDays);
  const ratio = workingDays ? paidDays / workingDays : 0;
  const parts = emp.salaryParts || { basic: emp.salary * 0.4, hra: emp.salary * 0.2, da: emp.salary * 0.1, special: emp.salary * 0.3 };
  const earn = { basic: Math.round(parts.basic * ratio), hra: Math.round(parts.hra * ratio), da: Math.round(parts.da * ratio), special: Math.round(parts.special * ratio) };
  const gross = earn.basic + earn.hra + earn.da + earn.special;
  const pf = emp.pf ? Math.round(earn.basic * 0.12) : 0;
  const esi = emp.esi && gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  const pt = emp.pt ? 200 : 0;
  const deductions = pf + esi + pt;
  return { workingDays, counts: c, paidDays, paidLeave, lop, earn, gross, pf, esi, pt, employerPf: pf, deductions, net: gross - deductions };
}

export default function Team() {
  const { db } = useStore();
  const [tab, setTab] = useState("Daily Attendance");
  const [branch, setBranch] = useState("");
  const employees = (db.employees || []).filter((e) => !branch || e.branch === branch);
  const active = employees.filter((e) => e.status === "Active");
  return (
    <div>
      <PageHeader title="Attendance & Salary" subtitle={`${active.length} active employees${branch ? ` in ${branch}` : ` across ${BRANCHES.length} branches`}`}
        actions={<Select value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="All branches" options={BRANCHES} className="w-44" />} />
      <Tabs className="mb-6 w-fit" value={tab} onChange={setTab}
        tabs={["Daily Attendance", "Monthly Register", { value: "Employees", label: "Employees", count: employees.length }, "Salary"]} />
      {tab === "Daily Attendance" && <Daily employees={active} />}
      {tab === "Monthly Register" && <Register employees={active} />}
      {tab === "Employees" && <Employees employees={employees} />}
      {tab === "Salary" && <Salary employees={active} />}
    </div>
  );
}

/* ── Daily ─────────────────────────────────────────── */
function Daily({ employees }) {
  const { db, setAttendance } = useStore();
  const toast = useToast();
  const [date, setDate] = useState(todayISO());
  const [q, setQ] = useState("");
  const isToday = date === todayISO();
  const rec = (e) => db.attendance?.[`${date}|${e.id}`];
  const list = employees.filter((e) => !q || `${e.name} ${e.designation} ${e.empId}`.toLowerCase().includes(q.toLowerCase()));
  const counts = STATUSES.map((s) => ({ ...s, n: employees.filter((e) => rec(e)?.status === s.key).length }));
  const unmarked = employees.filter((e) => !rec(e)).length;

  const setStatus = (e, status) => {
    const r = rec(e) || {};
    const off = ["Absent", "Leave", "Holiday"].includes(status);
    setAttendance(date, e.id, { status, in: off ? "" : r.in || (isToday ? "" : e.shiftStart || "09:30"), out: off ? "" : r.out || "" });
  };
  const setTime = (e, field, val) => {
    const r = rec(e) || { status: "Present", in: "", out: "" };
    const next = { ...r, [field]: val };
    if (field === "in" && ["Present", "Late"].includes(next.status)) next.status = isLate(e, val) ? "Late" : "Present";
    if (field === "in" && !rec(e)) next.status = isLate(e, val) ? "Late" : "Present";
    setAttendance(date, e.id, next);
  };
  const bulk = (status) => {
    let n = 0;
    employees.forEach((e) => {
      if (status === "Holiday" || !rec(e)) { setAttendance(date, e.id, status === "Holiday" ? { status, in: "", out: "" } : { status: "Present", in: e.shiftStart || "09:30", out: "" }); n += 1; }
    });
    toast(status === "Holiday" ? `Marked ${fmtDate(date)} as a holiday for everyone` : `${n} employees marked present`);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {counts.map((s) => (
          <div key={s.key} className={cx("rounded-xl px-4 py-3", s.soft)}>
            <p className="flex items-center gap-1.5 text-xs font-semibold"><s.icon className="h-3.5 w-3.5" />{s.key}</p>
            <p className="mt-1 text-2xl font-bold">{s.n}</p>
          </div>
        ))}
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><HelpCircle className="h-3.5 w-3.5" />Not marked</p>
          <p className="mt-1 text-2xl font-bold">{unmarked}</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee…" className="input pl-9" />
          </div>
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button variant="secondary" icon={PartyPopper} onClick={() => bulk("Holiday")}>All Holiday</Button>
          <Button icon={CheckCircle2} onClick={() => bulk("Present")} disabled={!unmarked}>All Present</Button>
        </div>
        {isSunday(date) && <p className="border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">{fmtDate(date)} is a Sunday — weekly off.</p>}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {list.map((e) => {
            const r = rec(e);
            const hrs = hoursBetween(r?.in, r?.out);
            const off = ["Absent", "Leave", "Holiday"].includes(r?.status);
            return (
              <div key={e.id} className="flex flex-col gap-3 px-5 py-3.5 xl:flex-row xl:items-center">
                <div className="flex min-w-0 items-center gap-3 xl:w-64">
                  <Avatar name={e.name} size="sm" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold text-slate-800 dark:text-slate-100">{e.name}
                      {r?.status === "Late" && <Badge className={S.Late.soft}>Late</Badge>}
                      {isToday && r?.in && !r?.out && !off && <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" dot="bg-emerald-500 animate-pulse">Still in</Badge>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{e.designation} · Shift {e.shiftStart || "09:30"}–{e.shiftEnd || "18:30"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 xl:flex-1">
                  {STATUSES.map((s) => (
                    <button key={s.key} onClick={() => setStatus(e, s.key)}
                      className={cx("inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition", r?.status === s.key ? s.cls + " shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")}>
                      <s.icon className="h-3.5 w-3.5" />{s.key}
                    </button>
                  ))}
                </div>
                <div className={cx("flex items-center gap-2", off && "pointer-events-none opacity-40")}>
                  <span className="text-[11px] font-semibold uppercase text-slate-400">In</span>
                  <input type="time" value={r?.in || ""} onChange={(ev) => setTime(e, "in", ev.target.value)} className="input h-9 w-[110px] px-2" />
                  {isToday && !r?.in && <Button size="sm" variant="soft" onClick={() => setTime(e, "in", nowHHMM())}>Now</Button>}
                  <span className="ml-1 text-[11px] font-semibold uppercase text-slate-400">Out</span>
                  <input type="time" value={r?.out || ""} onChange={(ev) => setTime(e, "out", ev.target.value)} className="input h-9 w-[110px] px-2" />
                  {isToday && r?.in && !r?.out && <Button size="sm" variant="soft" onClick={() => setTime(e, "out", nowHHMM())}>Now</Button>}
                  <span className="w-14 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{hrs != null ? `${hrs}h` : "—"}</span>
                  {r && <button onClick={() => setAttendance(date, e.id, null)} className="pointer-events-auto text-xs text-slate-400 hover:text-rose-600">Clear</button>}
                </div>
              </div>
            );
          })}
          {list.length === 0 && <EmptyState title="No employees" />}
        </div>
      </Card>
    </div>
  );
}

/* ── Monthly register ──────────────────────────────── */
function Register({ employees }) {
  const { db } = useStore();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const days = monthDays(month);
  const today = todayISO();
  const rows = employees.map((e) => {
    const c = {};
    days.forEach((d) => { const r = db.attendance?.[`${d}|${e.id}`]; if (r) c[r.status] = (c[r.status] || 0) + 1; });
    const present = (c.Present || 0) + (c.Late || 0) + (c.WFH || 0) + (c["Half Day"] || 0) * 0.5;
    return { e, c, present };
  });
  const exportCsv = () => downloadCSV(`attendance_${month}.csv`, rows, [
    { label: "Employee", value: (r) => r.e.name }, { label: "Emp ID", value: (r) => r.e.empId },
    ...days.map((d) => ({ label: d.slice(8), value: (r) => S[db.attendance?.[`${d}|${r.e.id}`]?.status]?.short || (isSunday(d) ? "S" : "") })),
    ...STATUSES.map((s) => ({ label: s.key, value: (r) => r.c[s.key] || 0 })), { label: "Days present", value: (r) => r.present },
  ]);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
        <div className="flex flex-wrap gap-2 text-[11px]">
          {STATUSES.map((s) => <span key={s.key} className="flex items-center gap-1.5 text-slate-500"><span className={cx("flex h-5 w-6 items-center justify-center rounded text-[10px] font-bold", s.cls)}>{s.short}</span>{s.key}</span>)}
          <span className="flex items-center gap-1.5 text-slate-500"><span className="h-5 w-6 rounded bg-slate-200 dark:bg-slate-700" />Sunday</span>
        </div>
        <Button variant="secondary" icon={Download} className="ml-auto" onClick={exportCsv}>Export CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="th sticky left-0 z-10 min-w-[180px] bg-slate-50 dark:bg-slate-800">Employee</th>
              {days.map((d) => <th key={d} className={cx("border-l border-slate-100 px-0 py-2 text-center font-semibold text-slate-500 dark:border-slate-800", isSunday(d) && "bg-slate-100 dark:bg-slate-800")}>{Number(d.slice(8))}<span className="block text-[9px] font-normal">{new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "narrow" })}</span></th>)}
              <th className="th text-right">Present</th><th className="th text-right">Leave</th><th className="th text-right">Absent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, c, present }) => (
              <tr key={e.id}>
                <td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900"><p className="font-semibold text-slate-800 dark:text-slate-100">{e.name}</p><p className="text-[10px] text-slate-400">{e.empId}</p></td>
                {days.map((d) => {
                  const st = db.attendance?.[`${d}|${e.id}`]?.status;
                  return (
                    <td key={d} className={cx("border-l border-t border-slate-100 p-0.5 text-center dark:border-slate-800", isSunday(d) && "bg-slate-100 dark:bg-slate-800")}>
                      {st ? <span title={`${fmtDate(d)} — ${st}`} className={cx("mx-auto flex h-6 w-6 items-center justify-center rounded text-[9.5px] font-bold", S[st]?.cls)}>{S[st]?.short}</span> : d <= today && !isSunday(d) ? <span className="text-slate-300">·</span> : null}
                    </td>
                  );
                })}
                <td className="border-t border-slate-100 px-4 text-right font-bold text-slate-800 dark:border-slate-800 dark:text-slate-100">{present}</td>
                <td className="border-t border-slate-100 px-4 text-right text-violet-600 dark:border-slate-800">{c.Leave || 0}</td>
                <td className="border-t border-slate-100 px-4 text-right text-rose-600 dark:border-slate-800">{c.Absent || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ── Employees ─────────────────────────────────────── */
const blankEmp = (n) => ({
  empId: `EMP${101 + n}`, name: "", phone: "", email: "", dob: "", joinDate: todayISO(), department: "Development", designation: "", branch: BRANCHES[0],
  employmentType: "Probationary", shiftStart: "09:30", shiftEnd: "18:30", grace: 15, salary: 25000,
  salaryParts: { basic: 10000, hra: 5000, da: 2500, special: 7500 }, pf: true, esi: true, pt: true, status: "Active", hikes: [], portalStatus: "Active", portalRoles: ["Team member"], projects: [],
});

function Employees({ employees }) {
  const { db, add, update } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [show, setShow] = useState("Active");
  const [edit, setEdit] = useState(null);
  const [hike, setHike] = useState(null);
  const list = employees.filter((e) => (show === "All" || e.status === show) && (!q || `${e.name} ${e.empId} ${e.designation} ${e.department}`.toLowerCase().includes(q.toLowerCase())));

  const toggle = async (e) => {
    const off = e.status === "Active";
    if (off && !(await confirm({ title: `Deactivate ${e.name}?`, message: "They will be hidden from attendance and payroll. You can reactivate them later.", confirmText: "Deactivate" }))) return;
    update("employees", e.id, { status: off ? "Inactive" : "Active" });
    toast(off ? `${e.name} deactivated` : `${e.name} reactivated`);
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, designation…" className="input pl-9" />
        </div>
        <Tabs tabs={["Active", "Inactive", "All"]} value={show} onChange={setShow} />
        <Button icon={UserPlus} onClick={() => setEdit(blankEmp((db.employees || []).length))}>Add employee</Button>
      </Card>
      {list.length === 0 ? <Card><EmptyState icon={Users} title="No employees" /></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <Card key={e.id} className={cx("p-5", e.status !== "Active" && "opacity-60")}>
              <div className="flex items-start gap-3">
                <Avatar name={e.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">{e.name}</p>
                  <p className="truncate text-sm text-slate-500">{e.designation}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{e.empId}</Badge>
                    <Badge className={e.employmentType === "Probationary" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}>{e.employmentType || "Permanent"}</Badge>
                    {e.status !== "Active" && <Badge className="bg-rose-50 text-rose-700">Inactive</Badge>}
                  </div>
                </div>
                <Menu items={[
                  { label: "Edit", icon: Pencil, onClick: () => setEdit(e) },
                  { label: "Record salary hike", icon: TrendingUp, onClick: () => setHike({ e, to: e.salary, date: todayISO(), remarks: "" }) },
                  { label: e.status === "Active" ? "Deactivate" : "Reactivate", icon: Power, danger: e.status === "Active", onClick: () => toggle(e) },
                ]} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                <div><dt className="text-[11px] text-slate-400">Department</dt><dd className="text-slate-700 dark:text-slate-300">{e.department}</dd></div>
                <div><dt className="text-[11px] text-slate-400">Branch</dt><dd className="text-slate-700 dark:text-slate-300">{e.branch}</dd></div>
                <div><dt className="text-[11px] text-slate-400">Joined</dt><dd className="text-slate-700 dark:text-slate-300">{fmtDate(e.joinDate)}</dd></div>
                <div><dt className="text-[11px] text-slate-400">Shift</dt><dd className="text-slate-700 dark:text-slate-300">{e.shiftStart || "09:30"}–{e.shiftEnd || "18:30"}</dd></div>
                <div><dt className="text-[11px] text-slate-400">Monthly salary</dt><dd className="font-semibold text-slate-900 dark:text-white">{inr(e.salary)}</dd></div>
                <div><dt className="text-[11px] text-slate-400">Statutory</dt><dd className="text-xs text-slate-600 dark:text-slate-400">{[e.pf && "PF", e.esi && "ESI", e.pt && "PT"].filter(Boolean).join(" · ") || "None"}</dd></div>
              </dl>
              {(e.hikes || []).length > 0 && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><TrendingUp className="h-3.5 w-3.5" />Last hike {e.hikes[e.hikes.length - 1].pct}% on {fmtDate(e.hikes[e.hikes.length - 1].date)}</p>}
            </Card>
          ))}
        </div>
      )}

      <EmpForm value={edit} onClose={() => setEdit(null)} onSave={(v) => {
        if (v.id) { update("employees", v.id, v); toast("Employee updated"); } else { add("employees", v, "e"); toast(`${v.name} added`); }
        setEdit(null);
      }} />

      <Modal open={!!hike} onClose={() => setHike(null)} title="Record salary hike" subtitle={hike?.e.name} size="md"
        footer={<><Button variant="secondary" onClick={() => setHike(null)}>Cancel</Button><Button icon={TrendingUp} onClick={() => {
          const to = Number(hike.to);
          if (!to || to <= 0) return toast("Enter the new salary", "error");
          if (!hike.date) return toast("Pick the effective date", "error");
          const from = hike.e.salary;
          const pct = Math.round(((to - from) / from) * 1000) / 10;
          const parts = { basic: Math.round(to * 0.4), hra: Math.round(to * 0.2), da: Math.round(to * 0.1) };
          parts.special = to - parts.basic - parts.hra - parts.da;
          update("employees", hike.e.id, { salary: to, salaryParts: parts, hikes: [...(hike.e.hikes || []), { id: `h${Date.now()}`, from, to, date: hike.date, pct, remarks: hike.remarks }] });
          toast(`Salary updated to ${inr(to)} (${pct >= 0 ? "+" : ""}${pct}%)`); setHike(null);
        }}>Save hike</Button></>}>
        {hike && <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Current salary"><Input value={inr(hike.e.salary)} disabled /></Field>
            <Field label="New salary" required><Input type="number" value={hike.to} onChange={(ev) => setHike({ ...hike, to: ev.target.value })} /></Field>
            <Field label="Hike %"><Input value={hike.e.salary ? `${(Math.round(((Number(hike.to) - hike.e.salary) / hike.e.salary) * 1000) / 10) || 0}%` : "—"} disabled /></Field>
            <Field label="Effective date" required><Input type="date" value={hike.date} onChange={(ev) => setHike({ ...hike, date: ev.target.value })} /></Field>
            <Field label="Remarks" className="sm:col-span-2"><Input value={hike.remarks} onChange={(ev) => setHike({ ...hike, remarks: ev.target.value })} placeholder="e.g. Annual appraisal" /></Field>
          </div>
          <p className="label mt-6">Hike history</p>
          {(hike.e.hikes || []).length === 0 ? <p className="text-sm text-slate-400">No hikes recorded yet.</p> : (
            <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full"><thead><tr><th className="th">Date</th><th className="th text-right">From</th><th className="th text-right">To</th><th className="th text-right">Hike</th><th className="th">Remarks</th></tr></thead>
                <tbody>{[...hike.e.hikes].reverse().map((h) => <tr key={h.id} className="tr"><td className="td">{fmtDate(h.date)}</td><td className="td text-right">{inr(h.from)}</td><td className="td text-right font-semibold">{inr(h.to)}</td><td className="td text-right text-emerald-600">{h.pct}%</td><td className="td text-slate-500">{h.remarks || "—"}</td></tr>)}</tbody></table>
            </div>
          )}
        </>}
      </Modal>
    </div>
  );
}

function EmpForm({ value, onClose, onSave }) {
  const [f, setF] = useState(null);
  const [err, setErr] = useState({});
  if (value && (!f || f.__src !== value)) { setF({ ...value, salaryParts: { ...(value.salaryParts || {}) }, __src: value }); setErr({}); }
  if (!value || !f) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setPart = (k, v) => setF((x) => ({ ...x, salaryParts: { ...x.salaryParts, [k]: Number(v) || 0 } }));
  const partsSum = ["basic", "hra", "da", "special"].reduce((s, k) => s + Number(f.salaryParts[k] || 0), 0);
  const autoSplit = () => {
    const sal = Number(f.salary) || 0;
    const p = { basic: Math.round(sal * 0.4), hra: Math.round(sal * 0.2), da: Math.round(sal * 0.1) };
    p.special = sal - p.basic - p.hra - p.da;
    set("salaryParts", p);
  };
  const save = () => {
    const e = {};
    if (!f.empId.trim()) e.empId = "Required";
    if (!f.name.trim()) e.name = "Required";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Invalid email";
    if (f.phone && !/^\d{10}$/.test(String(f.phone).replace(/\D/g, ""))) e.phone = "10-digit mobile";
    if (!(Number(f.salary) > 0)) e.salary = "Enter monthly salary";
    else if (partsSum !== Number(f.salary)) e.parts = `Components add up to ${inr(partsSum)} — should equal ${inr(f.salary)}`;
    setErr(e);
    if (Object.keys(e).length) return;
    const { __src, ...out } = f; // eslint-disable-line no-unused-vars
    onSave({ ...out, salary: Number(out.salary), grace: Number(out.grace) || 0 });
  };
  const H = ({ icon: I, children }) => <p className="mb-3 mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 first:mt-0"><I className="h-3.5 w-3.5" />{children}</p>;
  return (
    <Modal open onClose={onClose} title={f.id ? "Edit employee" : "Add employee"} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{f.id ? "Save changes" : "Add employee"}</Button></>}>
      <H icon={Users}>Basic details</H>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Employee ID" required error={err.empId}><Input value={f.empId} onChange={(e) => set("empId", e.target.value)} /></Field>
        <Field label="Full name" required error={err.name} className="sm:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Phone" error={err.phone}><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email" error={err.email}><Input value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Date of birth"><Input type="date" value={f.dob || ""} onChange={(e) => set("dob", e.target.value)} /></Field>
        <Field label="Joined on"><Input type="date" value={f.joinDate} onChange={(e) => set("joinDate", e.target.value)} /></Field>
        <Field label="Department"><Select value={f.department} onChange={(e) => set("department", e.target.value)} options={DEPTS.includes(f.department) ? DEPTS : [f.department, ...DEPTS]} /></Field>
        <Field label="Designation"><Input value={f.designation} onChange={(e) => set("designation", e.target.value)} /></Field>
        <Field label="Branch"><Select value={f.branch} onChange={(e) => set("branch", e.target.value)} options={BRANCHES} /></Field>
        <Field label="Employment type" className="sm:col-span-2" hint={f.employmentType === "Permanent" ? "1.5 paid leave days per month" : "All leave is deducted from salary"}>
          <Tabs tabs={["Permanent", "Probationary"]} value={f.employmentType || "Permanent"} onChange={(v) => set("employmentType", v)} className="w-fit" />
        </Field>
      </div>
      <H icon={Timer}>Shift & attendance</H>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Shift start"><Input type="time" value={f.shiftStart} onChange={(e) => set("shiftStart", e.target.value)} /></Field>
        <Field label="Shift end"><Input type="time" value={f.shiftEnd} onChange={(e) => set("shiftEnd", e.target.value)} /></Field>
        <Field label="Grace period (min)" hint="After this, check-in is marked Late"><Input type="number" value={f.grace} onChange={(e) => set("grace", e.target.value)} /></Field>
      </div>
      <H icon={Wallet}>Salary structure</H>
      <div className="grid gap-4 sm:grid-cols-5">
        <Field label="Monthly salary" required error={err.salary}><Input type="number" value={f.salary} onChange={(e) => set("salary", e.target.value)} onBlur={() => !partsSum && autoSplit()} /></Field>
        {[["basic", "Basic"], ["hra", "HRA"], ["da", "DA"], ["special", "Special allow."]].map(([k, l]) => <Field key={k} label={l}><Input type="number" value={f.salaryParts[k] ?? ""} onChange={(e) => setPart(k, e.target.value)} /></Field>)}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className={err.parts ? "font-medium text-rose-600" : "text-slate-400"}>{err.parts || `Components total ${inr(partsSum)}`}</span>
        <button type="button" onClick={autoSplit} className="font-semibold text-brand-600 hover:underline">Auto split (40 / 20 / 10 / rest)</button>
      </div>
      <H icon={Landmark}>Statutory</H>
      <div className="flex flex-wrap gap-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <Toggle checked={!!f.pf} onChange={(v) => set("pf", v)} label="PF (12% of basic)" />
        <Toggle checked={!!f.esi} onChange={(v) => set("esi", v)} label="ESI (0.75%, gross ≤ ₹21,000)" />
        <Toggle checked={!!f.pt} onChange={(v) => set("pt", v)} label="Professional tax (₹200)" />
      </div>
    </Modal>
  );
}

/* ── Salary ────────────────────────────────────────── */
function Salary({ employees }) {
  const { db, add, update, empById } = useStore();
  const toast = useToast();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [slip, setSlip] = useState(null);
  const records = (db.salaryRecords || []).filter((r) => r.month === month);
  const rows = useMemo(() => employees.map((e) => ({ e, p: payrollFor(e, month, db.attendance || {}), rec: records.find((r) => r.empId === e.id) })), [employees, month, db.attendance, records]);

  const generate = (list) => {
    let n = 0;
    list.forEach(({ e, p, rec }) => {
      if (rec?.status === "Paid") return;
      const data = { empId: e.id, month, gross: p.gross, deductions: p.deductions, net: p.net, status: "Pending", paidOn: "" };
      if (rec) update("salaryRecords", rec.id, data); else add("salaryRecords", data, "sr");
      n += 1;
    });
    toast(n ? `Generated ${n} salar${n === 1 ? "y" : "ies"} for ${new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}` : "All salaries for this month are already paid", n ? "success" : "info");
  };
  const markPaid = (rec) => { update("salaryRecords", rec.id, { status: "Paid", paidOn: todayISO() }); toast(`Salary marked paid for ${empById(rec.empId)?.name}`); };

  const val = (r, k) => (r.rec ? r.rec[k] : r.p[k]);
  const totGross = rows.reduce((s, r) => s + val(r, "gross"), 0);
  const totNet = rows.reduce((s, r) => s + val(r, "net"), 0);
  const pfRemit = rows.reduce((s, r) => s + r.p.pf * 2, 0);
  const pending = rows.filter((r) => r.rec && r.rec.status !== "Paid");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross payroll" value={inr(totGross)} icon={Wallet} tone="brand" sub={`${rows.length} employees`} />
        <StatCard label="Net payable" value={inr(totNet)} icon={Banknote} tone="emerald" sub={`${inr(totGross - totNet)} deductions`} />
        <StatCard label="PF remittance" value={inr(pfRemit)} icon={Landmark} tone="violet" sub="employee + employer share" />
        <StatCard label="Pending payment" value={pending.length} icon={Clock4} tone="amber" sub={inr(pending.reduce((s, r) => s + r.rec.net, 0))} />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
          <p className="text-xs text-slate-500">Permanent staff get 1.5 paid leave days/month · Probationary leave is deducted · Late counts as present · Holidays are paid</p>
          <div className="ml-auto flex gap-2">
            {pending.length > 0 && <Button variant="secondary" icon={CheckCircle2} onClick={() => { pending.forEach((r) => markPaid(r.rec)); }}>Mark all paid</Button>}
            <Button icon={Sparkles} onClick={() => generate(rows)}>Generate all salaries</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Employee</th><th className="th text-center">Attended</th><th className="th text-center">P</th><th className="th text-center">HD</th><th className="th text-center">Late</th><th className="th text-center">Leave</th><th className="th text-center">Absent</th><th className="th text-right">Gross</th><th className="th text-right">Deductions</th><th className="th text-right">Net</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.e.id} className="tr">
                  <td className="td"><div className="flex items-center gap-3"><Avatar name={r.e.name} size="sm" /><div><p className="font-semibold text-slate-800 dark:text-slate-100">{r.e.name}</p><p className="text-xs text-slate-500">{r.e.employmentType || "Permanent"} · {inr(r.e.salary)}/mo</p></div></div></td>
                  <td className="td text-center"><span className="font-semibold">{r.p.paidDays}</span><span className="text-slate-400">/{r.p.workingDays}</span>{r.p.lop > 0 && <p className="text-[10.5px] text-rose-600">{r.p.lop} LOP</p>}</td>
                  <td className="td text-center">{r.p.counts.Present + r.p.counts.WFH}</td>
                  <td className="td text-center">{r.p.counts["Half Day"]}</td>
                  <td className="td text-center">{r.p.counts.Late}</td>
                  <td className="td text-center">{r.p.counts.Leave}</td>
                  <td className="td text-center text-rose-600">{r.p.counts.Absent + r.p.counts.Unmarked}</td>
                  <td className="td text-right">{inr(val(r, "gross"))}</td>
                  <td className="td text-right text-rose-600">−{inr(val(r, "deductions"))}</td>
                  <td className="td text-right font-bold text-slate-900 dark:text-white">{inr(val(r, "net"))}</td>
                  <td className="td">{!r.rec ? <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800">Not generated</Badge> : r.rec.status === "Paid" ? <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">PAID</Badge> : <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">PENDING</Badge>}</td>
                  <td className="td text-right">
                    <div className="flex justify-end gap-1.5">
                      {!r.rec && <Button size="sm" variant="ghost" onClick={() => generate([r])}>Generate</Button>}
                      {r.rec && r.rec.status !== "Paid" && <Button size="sm" variant="success" onClick={() => markPaid(r.rec)}>Mark paid</Button>}
                      <Button size="sm" variant="soft" icon={Printer} onClick={() => setSlip(r)}>Slip</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState title="No active employees" />}
        </div>
      </Card>

      <Modal open={!!slip} onClose={() => setSlip(null)} title="Salary slip" subtitle={slip?.e.name} size="lg"
        footer={<><Button variant="secondary" onClick={() => setSlip(null)}>Close</Button><Button icon={Download} onClick={() => window.print()}>Download PDF</Button></>}>
        {slip && <Payslip e={slip.e} p={slip.p} rec={slip.rec} month={month} company={db.settings.company} />}
      </Modal>
    </div>
  );
}

function Payslip({ e, p, rec, month, company }) {
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const rows = [
    ["Basic", p.earn.basic, "Provident Fund (12%)", p.pf], ["HRA", p.earn.hra, "ESI (0.75%)", p.esi],
    ["Dearness allowance", p.earn.da, "Professional tax", p.pt], ["Special allowance", p.earn.special, "", null],
  ];
  return (
    <div className="print-area rounded-xl border border-slate-200 bg-white p-8 text-slate-800 dark:border-slate-700">
      <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4">
        <div><p className="text-xl font-bold">{company?.name}</p><p className="max-w-sm text-xs text-slate-500">{company?.address}</p></div>
        <div className="text-right"><p className="text-lg font-bold text-brand-700">SALARY SLIP</p><p className="text-sm text-slate-600">{label}</p>{rec?.status === "Paid" && <p className="mt-1 text-xs font-semibold text-emerald-600">Paid on {fmtDate(rec.paidOn)}</p>}</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-4">
        {[["Employee", e.name], ["Employee ID", e.empId], ["Designation", e.designation], ["Department", e.department], ["Branch", e.branch], ["Joined", fmtDate(e.joinDate)], ["Working days", p.workingDays], ["Paid days", `${p.paidDays}${p.lop ? ` (LOP ${p.lop})` : ""}`]].map(([k, v]) => (
          <div key={k}><p className="text-[11px] text-slate-400">{k}</p><p className="font-medium">{v}</p></div>
        ))}
      </div>
      <table className="mt-6 w-full border border-slate-200 text-sm">
        <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left font-semibold">Earnings</th><th className="px-3 py-2 text-right font-semibold">Amount</th><th className="border-l border-slate-200 px-3 py-2 text-left font-semibold">Deductions</th><th className="px-3 py-2 text-right font-semibold">Amount</th></tr></thead>
        <tbody>
          {rows.map(([a, av, b, bv]) => (
            <tr key={a} className="border-t border-slate-100"><td className="px-3 py-2">{a}</td><td className="px-3 py-2 text-right">{inr(av)}</td><td className="border-l border-slate-200 px-3 py-2">{b}</td><td className="px-3 py-2 text-right">{bv != null ? inr(bv) : ""}</td></tr>
          ))}
          <tr className="border-t-2 border-slate-200 font-semibold"><td className="px-3 py-2">Gross earnings</td><td className="px-3 py-2 text-right">{inr(p.gross)}</td><td className="border-l border-slate-200 px-3 py-2">Total deductions</td><td className="px-3 py-2 text-right">{inr(p.deductions)}</td></tr>
        </tbody>
      </table>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-5 py-4">
        <div><p className="text-xs text-slate-500">Net pay</p><p className="text-sm font-medium italic text-slate-600">{amountInWords(p.net)}</p></div>
        <p className="text-2xl font-bold text-brand-700">{inr(p.net)}</p>
      </div>
      <p className="mt-4 text-xs text-slate-500">Employer PF contribution (not deducted): {inr(p.employerPf)} · This is a computer-generated slip and does not need a signature.</p>
    </div>
  );
}
