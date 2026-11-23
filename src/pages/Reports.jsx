import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Cell } from "recharts";
import { Download, Printer, TrendingUp, TrendingDown, Wallet, Receipt, Percent, Trophy, Target, Clock, Users, IndianRupee, Building2, Award } from "lucide-react";
import { useStore } from "../store/store";
import { Button, Card, CardHeader, PageHeader, StatCard, Select, Tabs, Avatar, Progress, Badge, EmptyState, cx } from "../components/ui";
import { BRANCHES, LEAD_STAGES, STAGE_HEX } from "../config/constants";
import { inr, compactInr, toISO, monthKey, monthLabel, calcTotals, downloadCSV, daysBetween } from "../utils/format";
import { CAT_COLORS } from "./Expenses";

const PERIODS = [
  { value: "this", label: "This month" }, { value: "last", label: "Last month" }, { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" }, { value: "fy", label: "This FY (Apr–Mar)" },
];

function periodRange(p) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = (yy, mm) => toISO(new Date(yy, mm, 1));
  const last = (yy, mm) => toISO(new Date(yy, mm + 1, 0));
  switch (p) {
    case "last": return { from: first(y, m - 1), to: last(y, m - 1) };
    case "3m": return { from: first(y, m - 2), to: last(y, m) };
    case "6m": return { from: first(y, m - 5), to: last(y, m) };
    case "fy": { const fy = m >= 3 ? y : y - 1; return { from: first(fy, 3), to: last(fy + 1, 2) }; }
    default: return { from: first(y, m), to: last(y, m) };
  }
}
function monthsIn(from, to) {
  const out = []; const d = new Date(`${from}T00:00:00`); d.setDate(1);
  const end = to.slice(0, 7);
  while (toISO(d).slice(0, 7) <= end) { out.push(toISO(d).slice(0, 7)); d.setMonth(d.getMonth() + 1); }
  return out;
}

const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px -8px rgb(0 0 0 / .15)" };
const axis = { tickLine: false, axisLine: false, fontSize: 11, stroke: "#94a3b8" };
const MEDAL = ["text-amber-500", "text-slate-400", "text-orange-600"];

export default function Reports() {
  const { db } = useStore();
  const [period, setPeriod] = useState("6m");
  const [branch, setBranch] = useState("");
  // Tab lives in the URL so the sidebar links (Leaderboard, Branch Reports) open the right tab
  const [params, setParams] = useSearchParams();
  const URL_TO_TAB = { leaderboard: "team", branches: "branch", sales: "sales", gst: "gst" };
  const TAB_TO_URL = { team: "leaderboard", branch: "branches", sales: "sales", gst: "gst" };
  const tab = URL_TO_TAB[params.get("tab")] || "pnl";
  const setTab = (t) => setParams(TAB_TO_URL[t] ? { tab: TAB_TO_URL[t] } : {}, { replace: true });
  const { from, to } = periodRange(period);
  const months = monthsIn(from, to);
  const inRange = (d) => d && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const byBranch = (x) => !branch || x.branch === branch;
  const periodLabel = PERIODS.find((p) => p.value === period).label;

  /* ── Core numbers ── */
  const data = useMemo(() => {
    const invoices = db.invoices.filter(byBranch);
    const payments = invoices.flatMap((inv) => (inv.payments || []).map((p) => ({ ...p, branch: inv.branch, client: inv.client.company })));
    const paidIn = payments.filter((p) => inRange(p.date));
    const revenue = paidIn.reduce((s, p) => s + Number(p.amount || 0), 0);
    const invIn = invoices.filter((i) => inRange(i.date) && i.status !== "Cancelled");
    const invoiced = invIn.reduce((s, i) => s + calcTotals(i.items, i.discountPct, i.gstPct, i.interState).total, 0);
    const expIn = db.expenses.filter((e) => byBranch(e) && inRange(e.date));
    const expenses = expIn.reduce((s, e) => s + Number(e.amount || 0), 0);
    const expByCat = {};
    expIn.forEach((e) => { expByCat[e.category] = (expByCat[e.category] || 0) + Number(e.amount || 0); });
    const monthly = months.map((m) => {
      const rev = payments.filter((p) => monthKey(p.date) === m).reduce((s, p) => s + Number(p.amount || 0), 0);
      const exp = db.expenses.filter((e) => byBranch(e) && monthKey(e.date) === m).reduce((s, e) => s + Number(e.amount || 0), 0);
      return { key: m, month: monthLabel(m), Revenue: rev, Expenses: exp, Profit: rev - exp };
    });
    const leads = db.leads.filter((l) => byBranch(l) && inRange(l.createdAt));
    return { invoices, invIn, revenue, invoiced, expenses, expByCat, monthly, leads, paidIn };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, period, branch]);

  const profit = data.revenue - data.expenses;
  const margin = data.revenue ? Math.round((profit / data.revenue) * 100) : 0;
  const expCats = Object.entries(data.expByCat).sort((a, b) => b[1] - a[1]);

  /* ── Sales ── */
  const sales = useMemo(() => {
    const L = data.leads;
    const src = {};
    L.forEach((l) => { src[l.source] = (src[l.source] || 0) + 1; });
    const sources = Object.entries(src).map(([name, count]) => ({ name, count, won: L.filter((l) => l.source === name && l.stage === "Won").length })).sort((a, b) => b.count - a.count);
    const flow = LEAD_STAGES.filter((s) => s !== "Lost");
    const idx = (l) => (l.stage === "Lost" ? 0 : flow.indexOf(l.stage));
    const funnel = flow.map((s, i) => ({ stage: s, count: L.filter((l) => idx(l) >= i).length }));
    const won = L.filter((l) => l.stage === "Won");
    const lost = L.filter((l) => l.stage === "Lost");
    const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    const avgDeal = won.length ? won.reduce((s, l) => s + l.value, 0) / won.length : 0;
    const closeDays = won.map((l) => {
      const w = (l.activities || []).find((a) => a.type === "stage");
      return w ? Math.max(0, daysBetween(l.createdAt.slice(0, 10), w.at.slice(0, 10))) : null;
    }).filter((d) => d !== null);
    const avgClose = closeDays.length ? Math.round(closeDays.reduce((a, b) => a + b, 0) / closeDays.length) : 0;
    const reasons = {};
    lost.forEach((l) => { const r = l.lostReason || "Not specified"; reasons[r] = (reasons[r] || 0) + 1; });
    return { sources, funnel, won, lost, winRate, avgDeal, avgClose, reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]), pipeline: L.filter((l) => !["Won", "Lost"].includes(l.stage)).reduce((s, l) => s + l.value, 0) };
  }, [data.leads]);

  /* ── Team ── */
  const team = useMemo(() => {
    const people = db.users.filter((u) => u.active && (u.role.includes("Sales") || u.role === "Admin") && (!branch || u.branch === branch));
    const target = ((db.settings.targets?.monthlyRevenue || 0) * months.length) / Math.max(1, people.length);
    return people.map((u) => {
      const mine = data.leads.filter((l) => l.ownerId === u.id);
      const won = mine.filter((l) => l.stage === "Won");
      const closed = mine.filter((l) => ["Won", "Lost"].includes(l.stage)).length;
      const wonValue = won.reduce((s, l) => s + l.value, 0);
      const tasksDone = db.tasks.filter((t) => t.assigneeId === u.id && t.done && inRange(t.date)).length;
      return { u, leads: mine.length, won: won.length, wonValue, conv: closed ? Math.round((won.length / closed) * 100) : 0, tasksDone, target, pct: target ? Math.round((wonValue / target) * 100) : 0 };
    }).sort((a, b) => b.wonValue - a.wonValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, data.leads, branch, period]);

  /* ── Branch ── */
  const branches = useMemo(() => BRANCHES.map((b) => {
    const leads = db.leads.filter((l) => l.branch === b && inRange(l.createdAt));
    const won = leads.filter((l) => l.stage === "Won").length;
    const revenue = db.invoices.filter((i) => i.branch === b).flatMap((i) => i.payments || []).filter((p) => inRange(p.date)).reduce((s, p) => s + Number(p.amount || 0), 0);
    const expenses = db.expenses.filter((e) => e.branch === b && inRange(e.date)).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { branch: b, leads: leads.length, won, revenue, expenses, profit: revenue - expenses };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [db, period]);

  /* ── GST ── */
  const gst = useMemo(() => {
    const rows = months.map((m) => {
      const invs = data.invIn.filter((i) => monthKey(i.date) === m);
      const t = invs.reduce((acc, i) => {
        const c = calcTotals(i.items, i.discountPct, i.gstPct, i.interState);
        acc.taxable += c.taxable; acc.cgst += c.cgst; acc.sgst += c.sgst; acc.igst += c.igst; acc.tax += c.tax; acc.total += c.total; return acc;
      }, { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, total: 0 });
      return { month: monthLabel(m), count: invs.length, ...t };
    });
    const total = rows.reduce((a, r) => { Object.keys(a).forEach((k) => { a[k] += r[k]; }); return a; }, { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, total: 0 });
    return { rows, total };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.invIn, period]);

  const exportCSV = () => {
    const f = `${tab}-report-${period}${branch ? "-" + branch : ""}.csv`;
    if (tab === "pnl") downloadCSV(f, data.monthly, [{ label: "Month", key: "month" }, { label: "Revenue", key: "Revenue" }, { label: "Expenses", key: "Expenses" }, { label: "Profit", key: "Profit" }]);
    if (tab === "sales") downloadCSV(f, sales.sources, [{ label: "Source", key: "name" }, { label: "Leads", key: "count" }, { label: "Won", key: "won" }]);
    if (tab === "team") downloadCSV(f, team, [{ label: "Name", value: (r) => r.u.name }, { label: "Role", value: (r) => r.u.role }, { label: "Leads", key: "leads" }, { label: "Won", key: "won" }, { label: "Won value", key: "wonValue" }, { label: "Conversion %", key: "conv" }, { label: "Follow-ups done", key: "tasksDone" }, { label: "Target achieved %", key: "pct" }]);
    if (tab === "branch") downloadCSV(f, branches, [{ label: "Branch", key: "branch" }, { label: "Leads", key: "leads" }, { label: "Won", key: "won" }, { label: "Revenue", key: "revenue" }, { label: "Expenses", key: "expenses" }, { label: "Profit", key: "profit" }]);
    if (tab === "gst") downloadCSV(f, gst.rows, [{ label: "Month", key: "month" }, { label: "Invoices", key: "count" }, { label: "Taxable", value: (r) => Math.round(r.taxable) }, { label: "CGST", value: (r) => Math.round(r.cgst) }, { label: "SGST", value: (r) => Math.round(r.sgst) }, { label: "IGST", value: (r) => Math.round(r.igst) }, { label: "Total tax", value: (r) => Math.round(r.tax) }, { label: "Invoice value", value: (r) => Math.round(r.total) }]);
  };

  return (
    <div>
      <PageHeader title={{ pnl: "Profit & Loss", sales: "Sales Reports", team: "Sales Leaderboard", branch: "Branch Reports", gst: "GST Summary" }[tab]} subtitle={`${periodLabel} · ${branch || "All branches"}`}
        actions={<>
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} options={PERIODS} className="w-44" />
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={BRANCHES} placeholder="All branches" className="w-40" />
          <Button variant="secondary" icon={Download} onClick={exportCSV}>CSV</Button>
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>
        </>} />

      <Tabs className="mb-6 w-fit max-w-full" value={tab} onChange={setTab} tabs={[
        { value: "pnl", label: "Profit & Loss" }, { value: "sales", label: "Sales" }, { value: "team", label: "Leaderboard" },
        { value: "branch", label: "Branch Reports" }, { value: "gst", label: "GST Summary" },
      ]} />

      <div className="print-area space-y-6">
        <div className="hidden print:block">
          <h1 className="text-xl font-bold">{db.settings.company.name} — {PERIODS.find((p) => p.value === period).label} report</h1>
          <p className="text-sm">{from} to {to} · {branch || "All branches"}</p>
        </div>

        {tab === "pnl" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Revenue collected" value={inr(data.revenue)} icon={IndianRupee} tone="emerald" sub="Cash received (payments)" />
              <StatCard label="Invoiced (accrual)" value={inr(data.invoiced)} icon={Receipt} tone="sky" sub={`${data.invIn.length} invoices raised`} />
              <StatCard label="Total expenses" value={inr(data.expenses)} icon={Wallet} tone="amber" sub={`${expCats.length} categories`} />
              <StatCard label="Net profit" value={inr(profit)} icon={profit >= 0 ? TrendingUp : TrendingDown} tone={profit >= 0 ? "brand" : "rose"} sub={`${margin}% margin`} />
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <Card className="xl:col-span-3">
                <CardHeader title="Revenue vs expenses" subtitle="Monthly, with net profit line" />
                <div className="h-80 p-3 pr-5">
                  <ResponsiveContainer>
                    <ComposedChart data={data.monthly} margin={{ top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                      <XAxis dataKey="month" {...axis} fontSize={12} />
                      <YAxis tickFormatter={compactInr} {...axis} width={60} />
                      <Tooltip formatter={(v) => inr(v)} contentStyle={tooltipStyle} cursor={{ fill: "#94a3b81a" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={34} />
                      <Bar dataKey="Expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={34} />
                      <Line type="monotone" dataKey="Profit" stroke="rgb(var(--brand-600))" strokeWidth={2.5} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="xl:col-span-2">
                <CardHeader title="Profit & Loss statement" subtitle={`${from} → ${to}`} />
                <div className="p-5 text-sm">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Income</p>
                  <Row label="Payments received" value={data.revenue} />
                  <Row label="Total income" value={data.revenue} bold />
                  <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Expenses</p>
                  {expCats.length === 0 && <p className="py-2 text-slate-400">No expenses recorded</p>}
                  {expCats.map(([c, v]) => <Row key={c} label={c} value={v} dot={CAT_COLORS[c]} />)}
                  <Row label="Total expenses" value={data.expenses} bold />
                  <div className={cx("mt-4 flex items-center justify-between rounded-xl px-4 py-3", profit >= 0 ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300")}>
                    <span className="font-bold">Net {profit >= 0 ? "profit" : "loss"}</span>
                    <span className="text-lg font-extrabold">{inr(profit)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {tab === "sales" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="New leads" value={data.leads.length} icon={Users} tone="brand" sub={`${inr(sales.pipeline)} open pipeline`} />
              <StatCard label="Win rate" value={`${sales.winRate}%`} icon={Percent} tone="emerald" sub={`${sales.won.length} won · ${sales.lost.length} lost`} />
              <StatCard label="Avg deal size" value={inr(sales.avgDeal)} icon={Target} tone="violet" sub="Won deals" />
              <StatCard label="Avg days to close" value={`${sales.avgClose} days`} icon={Clock} tone="amber" sub="Lead → won" />
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader title="Conversion funnel" subtitle="Leads that reached each stage" />
                <div className="space-y-2.5 p-5">
                  {sales.funnel.map((f, i) => {
                    const max = sales.funnel[0].count || 1;
                    const pct = Math.round((f.count / max) * 100);
                    const prev = i ? sales.funnel[i - 1].count : null;
                    return (
                      <div key={f.stage} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">{f.stage}</span>
                        <div className="relative h-9 flex-1">
                          <div className="mx-auto flex h-full items-center justify-center rounded-lg text-xs font-bold text-white transition-all" style={{ width: `${Math.max(pct, 8)}%`, background: STAGE_HEX[f.stage] }}>{f.count}</div>
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs text-slate-500">{prev ? `${Math.round((f.count / (prev || 1)) * 100)}%` : "100%"}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card>
                <CardHeader title="Leads by source" subtitle="Total vs won" />
                {sales.sources.length === 0 ? <EmptyState title="No leads in this period" /> : (
                  <div className="h-80 p-3 pr-5">
                    <ResponsiveContainer>
                      <BarChart data={sales.sources} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b833" />
                        <XAxis type="number" {...axis} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" {...axis} fontSize={12} width={90} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#94a3b81a" }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="count" name="Leads" fill="rgb(var(--brand-500))" radius={[0, 6, 6, 0]} maxBarSize={16} />
                        <Bar dataKey="won" name="Won" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
            <Card>
              <CardHeader title="Why we lose deals" subtitle={`${sales.lost.length} lost leads`} />
              <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                {sales.reasons.length === 0 && <p className="text-sm text-slate-400">No lost deals in this period 🎉</p>}
                {sales.reasons.map(([r, n]) => (
                  <div key={r} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{r}</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{n}</p>
                    <Progress className="mt-2" value={(n / sales.lost.length) * 100} tone="bg-rose-400" />
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {tab === "team" && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {team.slice(0, 3).map((r, i) => (
                <Card key={r.u.id} className={cx("relative overflow-hidden p-5", i === 0 && "ring-2 ring-amber-300 dark:ring-amber-500/40")}>
                  <Trophy className={cx("absolute right-4 top-4 h-7 w-7", MEDAL[i])} />
                  <div className="flex items-center gap-3">
                    <Avatar name={r.u.name} size="lg" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{r.u.name}</p>
                      <p className="text-xs text-slate-500">{r.u.role} · {r.u.branch}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">{inr(r.wonValue)}</p>
                  <p className="text-xs text-slate-500">{r.won} deals won · {r.conv}% conversion</p>
                  <Progress className="mt-3" value={r.pct} tone={r.pct >= 100 ? "bg-emerald-500" : "bg-brand-500"} />
                  <p className="mt-1 text-[11px] text-slate-500">{r.pct}% of {compactInr(r.target)} target</p>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader title="Sales leaderboard" subtitle="Ranked by won value" />
              <div className="mt-3 overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="th">#</th><th className="th">Member</th><th className="th text-right">Leads</th><th className="th text-right">Won</th><th className="th text-right">Won value</th><th className="th text-right">Conversion</th><th className="th text-right">Follow-ups done</th><th className="th w-48">Target</th></tr></thead>
                  <tbody>
                    {team.map((r, i) => (
                      <tr key={r.u.id} className="tr">
                        <td className="td">{i < 3 ? <Award className={cx("h-5 w-5", MEDAL[i])} /> : <span className="pl-1 font-semibold text-slate-400">{i + 1}</span>}</td>
                        <td className="td"><div className="flex items-center gap-2.5"><Avatar name={r.u.name} size="sm" /><div><p className="font-semibold text-slate-800 dark:text-slate-100">{r.u.name}</p><p className="text-xs text-slate-500">{r.u.role}</p></div></div></td>
                        <td className="td text-right">{r.leads}</td>
                        <td className="td text-right">{r.won}</td>
                        <td className="td text-right font-bold text-slate-900 dark:text-white">{inr(r.wonValue)}</td>
                        <td className="td text-right"><Badge className={r.conv >= 50 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}>{r.conv}%</Badge></td>
                        <td className="td text-right">{r.tasksDone}</td>
                        <td className="td"><div className="flex items-center gap-2"><Progress value={r.pct} tone={r.pct >= 100 ? "bg-emerald-500" : "bg-brand-500"} /><span className="w-10 text-right text-xs font-semibold text-slate-500">{r.pct}%</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {team.length === 0 && <EmptyState title="No sales members for this branch" />}
              </div>
            </Card>
          </>
        )}

        {tab === "branch" && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {branches.map((b) => (
                <Card key={b.branch} className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Building2 className="h-4 w-4 text-brand-500" />{b.branch}</p>
                    <Badge className={b.profit >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"}>{b.revenue ? Math.round((b.profit / b.revenue) * 100) : 0}% margin</Badge>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{inr(b.profit)}</p>
                  <p className="text-xs text-slate-500">Net profit</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Mini label="Leads" value={b.leads} /><Mini label="Won" value={b.won} />
                    <Mini label="Collected" value={compactInr(b.revenue)} /><Mini label="Expenses" value={compactInr(b.expenses)} />
                  </div>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader title="Branch comparison" subtitle={periodLabel} />
              <div className="h-80 p-3 pr-5">
                <ResponsiveContainer>
                  <BarChart data={branches} margin={{ top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                    <XAxis dataKey="branch" {...axis} fontSize={12} />
                    <YAxis tickFormatter={compactInr} {...axis} width={60} />
                    <Tooltip formatter={(v) => inr(v)} contentStyle={tooltipStyle} cursor={{ fill: "#94a3b81a" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Collected" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="profit" name="Profit" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {branches.map((b) => <Cell key={b.branch} fill={b.profit >= 0 ? "rgb(var(--brand-500))" : "#f43f5e"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}

        {tab === "gst" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Taxable value" value={inr(gst.total.taxable)} icon={Receipt} tone="brand" sub={`${gst.total.count} invoices`} />
              <StatCard label="CGST + SGST" value={inr(gst.total.cgst + gst.total.sgst)} icon={Percent} tone="sky" sub="Intra-state" />
              <StatCard label="IGST" value={inr(gst.total.igst)} icon={Percent} tone="violet" sub="Inter-state" />
              <StatCard label="Total GST liability" value={inr(gst.total.tax)} icon={IndianRupee} tone="amber" sub="Output tax" />
            </div>
            <Card>
              <CardHeader title="Monthly GST summary" subtitle="Based on invoice date (GSTR-1 view)" />
              <div className="mt-3 overflow-x-auto">
                <table className="w-full">
                  <thead><tr>{["Month", "Invoices", "Taxable", "CGST", "SGST", "IGST", "Total tax", "Invoice value"].map((h, i) => <th key={h} className={cx("th", i > 0 && "text-right")}>{h}</th>)}</tr></thead>
                  <tbody>
                    {gst.rows.map((r) => (
                      <tr key={r.month} className="tr">
                        <td className="td font-semibold">{r.month}</td>
                        <td className="td text-right">{r.count}</td>
                        <td className="td text-right">{inr(r.taxable)}</td>
                        <td className="td text-right">{inr(r.cgst)}</td>
                        <td className="td text-right">{inr(r.sgst)}</td>
                        <td className="td text-right">{inr(r.igst)}</td>
                        <td className="td text-right font-semibold">{inr(r.tax)}</td>
                        <td className="td text-right font-bold text-slate-900 dark:text-white">{inr(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold dark:border-slate-700 dark:bg-slate-800/50">
                      <td className="td">Total</td><td className="td text-right">{gst.total.count}</td><td className="td text-right">{inr(gst.total.taxable)}</td>
                      <td className="td text-right">{inr(gst.total.cgst)}</td><td className="td text-right">{inr(gst.total.sgst)}</td><td className="td text-right">{inr(gst.total.igst)}</td>
                      <td className="td text-right">{inr(gst.total.tax)}</td><td className="td text-right">{inr(gst.total.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, dot }) {
  return (
    <div className={cx("flex items-center justify-between py-1.5", bold && "mt-1 border-t border-slate-100 pt-2.5 font-bold text-slate-900 dark:border-slate-800 dark:text-white")}>
      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">{dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}<span className={bold ? "text-slate-900 dark:text-white" : ""}>{label}</span></span>
      <span>{inr(value)}</span>
    </div>
  );
}
const Mini = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
    <p className="text-[11px] text-slate-500">{label}</p>
    <p className="font-bold text-slate-800 dark:text-slate-100">{value}</p>
  </div>
);

