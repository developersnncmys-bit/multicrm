import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IndianRupee, Users, Trophy, AlertCircle, ArrowUpRight, CalendarClock, Phone, Check, Target, Receipt } from "lucide-react";
import { useStore, invoicePaid } from "../store/store";
import { LEAD_STAGES, STAGE_HEX, STAGE_STYLE, PROJECT_STAGES } from "../config/constants";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Progress, StatCard, cx } from "../components/ui";
import { addDays, calcTotals, compactInr, fmtDate, inr, lastMonths, monthKey, monthLabel, timeAgo, todayISO } from "../utils/format";
import { canAccess } from "../layout/AppLayout";

const PIE = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#8b5cf6", "#14b8a6", "#f97316", "#64748b", "#ec4899"];
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}: <b>{inr(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { db, user, update, userById } = useStore();
  const nav = useNavigate();
  const today = todayISO();
  const thisM = monthKey(today);
  const lastM = lastMonths(2)[0];

  const s = useMemo(() => {
    const payments = db.invoices.flatMap((i) => (i.status === "Cancelled" ? [] : i.payments || []));
    const collected = (m) => payments.filter((p) => monthKey(p.date) === m).reduce((a, p) => a + Number(p.amount), 0);
    const invoiced = (m) => db.invoices.filter((i) => i.status !== "Cancelled" && monthKey(i.date) === m).reduce((a, i) => a + calcTotals(i.items, i.discountPct, i.gstPct, i.interState).total, 0);
    const leadsIn = (m) => db.leads.filter((l) => monthKey(l.createdAt) === m).length;
    const wonIn = (m) => db.leads.filter((l) => l.stage === "Won" && monthKey((l.activities.find((a) => a.type === "stage") || { at: l.createdAt }).at) === m);
    const outstandingList = db.invoices
      .filter((i) => !["Paid", "Cancelled", "Draft"].includes(i.status))
      .map((i) => { const total = calcTotals(i.items, i.discountPct, i.gstPct, i.interState).total; return { ...i, total, balance: total - invoicePaid(i) }; })
      .filter((i) => i.balance > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const months = lastMonths(6);
    const trend = months.map((m) => ({ m: monthLabel(m), Collected: collected(m), Invoiced: invoiced(m) }));
    const open = db.leads.filter((l) => !["Won", "Lost"].includes(l.stage));
    const sources = Object.entries(db.leads.reduce((acc, l) => ({ ...acc, [l.source]: (acc[l.source] || 0) + 1 }), {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const closed = db.leads.filter((l) => ["Won", "Lost"].includes(l.stage));
    const winRate = closed.length ? Math.round((db.leads.filter((l) => l.stage === "Won").length / closed.length) * 100) : 0;
    const performers = db.users.filter((u) => ["Admin", "Sales Manager", "Sales Executive"].includes(u.role)).map((u) => {
      const won = db.leads.filter((l) => l.ownerId === u.id && l.stage === "Won");
      return { u, count: won.length, value: won.reduce((a, l) => a + l.value, 0) };
    }).sort((a, b) => b.value - a.value);
    return {
      cNow: collected(thisM), cPrev: collected(lastM), lNow: leadsIn(thisM), lPrev: leadsIn(lastM),
      wNow: wonIn(thisM), wPrev: wonIn(lastM), outstandingList, outstanding: outstandingList.reduce((a, i) => a + i.balance, 0),
      overdue: outstandingList.filter((i) => i.dueDate < today), trend, open, sources, winRate, performers,
      pipeline: LEAD_STAGES.filter((st) => !["Lost"].includes(st)).map((st) => { const ls = db.leads.filter((l) => l.stage === st); return { st, count: ls.length, value: ls.reduce((a, l) => a + l.value, 0) }; }),
    };
  }, [db, thisM, lastM, today]);

  const agenda = useMemo(() => {
    const tasks = db.tasks.filter((t) => !t.done && t.date <= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const follow = db.leads.filter((l) => l.nextFollowUp && l.nextFollowUp <= today && !["Won", "Lost"].includes(l.stage));
    return { tasks, follow };
  }, [db.tasks, db.leads, today]);

  const target = db.settings.targets.monthlyRevenue;
  const targetPct = Math.round((s.cNow / target) * 100);
  const maxPipe = Math.max(...s.pipeline.map((p) => p.value), 1);
  const recent = [...db.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const projActive = db.projects.filter((p) => !["Completed", "On Hold"].includes(p.stage));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Business overview for {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })} · {agenda.tasks.length + agenda.follow.length} items need attention today</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => nav("/calendar")}><CalendarClock className="h-4 w-4" />Today's agenda</Button>
          <Button onClick={() => nav("/leads?new=1")}><Users className="h-4 w-4" />Add lead</Button>
        </div>
      </div>

      {/* Target strip */}
      <Card className="grid divide-y divide-slate-100 dark:divide-slate-800 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:divide-x md:divide-y-0">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-slate-500">Monthly revenue target</p>
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">{targetPct}%</span>
          </div>
          <p className="mt-1.5 text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">{inr(s.cNow)} <span className="text-sm font-medium text-slate-400">/ {compactInr(target)}</span></p>
          <Progress value={targetPct} className="mt-3 h-2" />
        </div>
        {[["Open deals", s.open.length, `${compactInr(s.open.reduce((a, l) => a + l.value, 0))} pipeline`], ["Win rate", `${s.winRate}%`, "won ÷ closed deals"], ["Active projects", projActive.length, `${db.projects.filter((p) => p.stage === "Completed").length} completed`]].map(([l, v, sub]) => (
          <div key={l} className="p-5">
            <p className="text-[13px] font-medium text-slate-500">{l}</p>
            <p className="mt-1.5 text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">{v}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue collected" value={compactInr(s.cNow)} icon={IndianRupee} tone="emerald" delta={pct(s.cNow, s.cPrev)} deltaLabel="vs last month" onClick={() => canAccess(user, "payments") && nav("/payments")} />
        <StatCard label="New leads" value={s.lNow} icon={Users} tone="brand" delta={pct(s.lNow, s.lPrev)} deltaLabel="vs last month" onClick={() => nav("/leads")} />
        <StatCard label="Deals won" value={s.wNow.length} icon={Trophy} tone="amber" sub={`${compactInr(s.wNow.reduce((a, l) => a + l.value, 0))} closed this month`} onClick={() => nav("/pipeline")} />
        <StatCard label="Outstanding" value={compactInr(s.outstanding)} icon={AlertCircle} tone="rose" sub={`${s.overdue.length} invoices overdue`} onClick={() => canAccess(user, "invoices") && nav("/invoices")} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Revenue trend */}
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue overview" subtitle="Invoiced vs collected — last 6 months"
            action={<div className="flex gap-3 text-xs font-medium text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" />Invoiced</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Collected</span></div>} />
          <div className="h-72 px-2 pb-4 pt-4">
            <ResponsiveContainer>
              <AreaChart data={s.trend} margin={{ left: 0, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgb(var(--brand-500))" stopOpacity={0.25} /><stop offset="1" stopColor="rgb(var(--brand-500))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity={0.25} /><stop offset="1" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={compactInr} width={60} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="Invoiced" stroke="rgb(var(--brand-500))" strokeWidth={2.5} fill="url(#gI)" />
                <Area type="monotone" dataKey="Collected" stroke="#10b981" strokeWidth={2.5} fill="url(#gC)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Today */}
        <Card className="flex flex-col">
          <CardHeader title="Today's focus" subtitle={`${agenda.tasks.length} tasks · ${agenda.follow.length} follow-ups due`} action={<Link to="/calendar" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Calendar</Link>} />
          <div className="mt-3 max-h-[300px] flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {agenda.tasks.length + agenda.follow.length === 0 && <EmptyState icon={Check} title="All clear!" text="No pending tasks for today." />}
            {agenda.tasks.slice(0, 6).map((t) => (
              <div key={t.id} className="group flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <button onClick={() => update("tasks", t.id, { done: true })} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 text-transparent transition hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-600"><Check className="h-3 w-3" strokeWidth={3} /></button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{t.title}</p>
                  <p className={cx("text-xs", t.date < today ? "font-semibold text-rose-600" : "text-slate-500")}>{t.date < today ? `Overdue · ${fmtDate(t.date)}` : `Today · ${t.time}`} · {t.type}</p>
                </div>
              </div>
            ))}
            {agenda.follow.slice(0, 6).map((l) => (
              <button key={l.id} onClick={() => nav(`/leads?open=${l.id}`)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-500/10"><Phone className="h-3 w-3" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">Follow up: {l.name}</p>
                  <p className={cx("text-xs", l.nextFollowUp < today ? "font-semibold text-rose-600" : "text-slate-500")}>{l.company} · {l.nextFollowUp < today ? `due ${fmtDate(l.nextFollowUp)}` : "today"}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Pipeline */}
        <Card>
          <CardHeader title="Sales pipeline" subtitle={`${compactInr(s.open.reduce((a, l) => a + l.value, 0))} in open deals`} action={<Link to="/pipeline" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Open board</Link>} />
          <div className="space-y-3.5 p-5">
            {s.pipeline.map((p) => (
              <div key={p.st}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_HEX[p.st] }} />{p.st}<span className="text-xs text-slate-400">({p.count})</span></span>
                  <span className="font-semibold text-slate-900 dark:text-white">{compactInr(p.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full" style={{ width: `${(p.value / maxPipe) * 100}%`, background: STAGE_HEX[p.st] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Lead sources */}
        <Card>
          <CardHeader title="Lead sources" subtitle="Where your enquiries come from" />
          <div className="flex items-center gap-4 p-5">
            <div className="relative h-44 w-44 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={s.sources} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                    {s.sources.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} leads`, n]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{db.leads.length}</span>
                <span className="text-[11px] text-slate-500">total leads</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {s.sources.slice(0, 7).map((x, i) => (
                <li key={x.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PIE[i % PIE.length] }} />
                  <span className="flex-1 truncate text-slate-600 dark:text-slate-400">{x.name}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{x.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Top performers */}
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Top performers" subtitle="By won deal value" action={canAccess(user, "reports") && <Link to="/reports" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Leaderboard</Link>} />
          <div className="space-y-1 p-3">
            {s.performers.slice(0, 5).map((p, i) => (
              <div key={p.u.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <span className={cx("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "text-slate-400")}>{i + 1}</span>
                <Avatar name={p.u.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{p.u.name}</p>
                  <Progress value={(p.value / (s.performers[0].value || 1)) * 100} className="mt-1" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{compactInr(p.value)}</p>
                  <p className="text-[11px] text-slate-500">{p.count} deals</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Recent leads */}
        <Card className="overflow-hidden xl:col-span-3">
          <CardHeader title="Recent leads" subtitle="Latest enquiries across all sources" action={<Button size="sm" variant="soft" onClick={() => nav("/leads")}>View all <ArrowUpRight className="h-3.5 w-3.5" /></Button>} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50/80 dark:bg-slate-800/40"><th className="th">Lead</th><th className="th">Service</th><th className="th">Stage</th><th className="th text-right">Value</th><th className="th">Owner</th></tr></thead>
              <tbody>
                {recent.map((l) => (
                  <tr key={l.id} className="tr cursor-pointer" onClick={() => nav(`/leads?open=${l.id}`)}>
                    <td className="td"><div className="flex items-center gap-3"><Avatar name={l.name} size="sm" /><div><p className="font-semibold text-slate-800 dark:text-slate-100">{l.name}</p><p className="text-xs text-slate-500">{l.company} · {timeAgo(l.createdAt)}</p></div></div></td>
                    <td className="td text-slate-600 dark:text-slate-400">{l.service}</td>
                    <td className="td"><Badge className={cx("ring-1", STAGE_STYLE[l.stage])}>{l.stage}</Badge></td>
                    <td className="td text-right font-semibold text-slate-800 dark:text-slate-200">{inr(l.value)}</td>
                    <td className="td"><Avatar name={userById(l.ownerId)?.name || "?"} size="xs" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          {/* Overdue invoices */}
          <Card>
            <CardHeader title="Payments due" subtitle={`${inr(s.outstanding)} outstanding`} action={canAccess(user, "invoices") && <Link to="/invoices" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Invoices</Link>} />
            <div className="space-y-1 p-3">
              {s.outstandingList.slice(0, 4).map((i) => {
                const late = i.dueDate < today;
                return (
                  <button key={i.id} onClick={() => canAccess(user, "invoices") && nav(`/invoices?open=${i.id}`)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", late ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10")}><Receipt className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{i.client.company}</p>
                      <p className={cx("text-xs", late ? "font-medium text-rose-600" : "text-slate-500")}>{i.number} · {late ? `overdue since ${fmtDate(i.dueDate)}` : `due ${fmtDate(i.dueDate)}`}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{inr(i.balance)}</p>
                  </button>
                );
              })}
              {s.outstandingList.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No pending payments 🎉</p>}
            </div>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader title="Project delivery" subtitle={`${projActive.length} active · ${db.projects.filter((p) => p.deadline < today && p.stage !== "Completed").length} past deadline`} action={canAccess(user, "projects") && <Link to="/projects" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Projects</Link>} />
            <div className="grid grid-cols-4 gap-2 p-5">
              {PROJECT_STAGES.map((st) => (
                <div key={st} className="rounded-xl bg-slate-50 px-2 py-2.5 text-center dark:bg-slate-800/60">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{db.projects.filter((p) => p.stage === st).length}</p>
                  <p className="truncate text-[10.5px] font-medium text-slate-500" title={st}>{st}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-slate-400"><Target className="h-3.5 w-3.5" />Next 7 days: {db.tasks.filter((t) => !t.done && t.date > today && t.date <= addDays(today, 7)).length} scheduled tasks · <CalendarClock className="h-3.5 w-3.5" />{db.recurring.filter((r) => r.status === "Active" && r.nextDue <= addDays(today, 7)).length} recurring bills due</p>
    </div>
  );
}
