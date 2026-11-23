// Business Intelligence — answers "where does money come from, what converts, what's coming next?"
// Everything is calculated live from leads, invoices/payments and expenses.
import { useMemo, useState } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BrainCircuit, IndianRupee, Target, Timer, TrendingUp, Lightbulb, Trophy, Download } from "lucide-react";
import { useStore } from "../../store/store";
import { Button, Card, CardHeader, PageHeader, StatCard, Tabs, Avatar, Progress, cx } from "../../components/ui";
import { inr, compactInr, monthKey, monthLabel, lastMonths, daysBetween, downloadCSV } from "../../utils/format";
import { LEAD_STAGES } from "../../config/constants";
import { STAGE_PROB } from "../leads/leadHelpers";
import { wonDateOf, replyLabel } from "../leads/leadIntel";
import { allPayments, sumBy } from "../owner/ownerData";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#8b5cf6", "#14b8a6", "#f97316", "#84cc16"];
const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default function Analytics() {
  const { db, userById } = useStore();
  const [range, setRange] = useState("6");
  const n = Number(range);
  const months = lastMonths(n);
  const prevMonths = lastMonths(n * 2).slice(0, n);
  const pays = useMemo(() => allPayments(db), [db]);
  const inRange = (iso, ms = months) => ms.includes(monthKey(iso));

  const leads = db.leads.filter((l) => inRange(l.createdAt));
  const won = leads.filter((l) => l.stage === "Won");
  const closed = leads.filter((l) => ["Won", "Lost"].includes(l.stage));
  const revenue = sumBy(pays.filter((p) => inRange(p.date)), "amount");
  const prevRevenue = sumBy(pays.filter((p) => inRange(p.date, prevMonths)), "amount");
  const cycle = won.length ? Math.round(won.reduce((a, l) => a + Math.max(0, daysBetween(l.createdAt.slice(0, 10), wonDateOf(l).slice(0, 10))), 0) / won.length) : 0;
  const open = db.leads.filter((l) => !["Won", "Lost"].includes(l.stage));
  const forecast = Math.round(open.reduce((a, l) => a + (Number(l.value) || 0) * (STAGE_PROB[l.stage] || 0) / 100, 0));

  const trend = months.map((m) => ({
    month: monthLabel(m),
    Collected: sumBy(pays.filter((p) => monthKey(p.date) === m), "amount"),
    Expenses: sumBy((db.expenses || []).filter((e) => monthKey(e.date) === m), "amount"),
    Leads: db.leads.filter((l) => monthKey(l.createdAt) === m).length,
  }));

  const bySource = Object.values(leads.reduce((m, l) => {
    const s = (m[l.source] ||= { source: l.source, leads: 0, won: 0, lost: 0, value: 0 });
    s.leads++; if (l.stage === "Won") { s.won++; s.value += Number(l.value) || 0; } if (l.stage === "Lost") s.lost++;
    return m;
  }, {})).map((s) => ({ ...s, rate: pct(s.won, s.won + s.lost), avg: s.won ? Math.round(s.value / s.won) : 0 })).sort((a, b) => b.value - a.value);

  const byService = Object.entries(won.reduce((m, l) => { m[l.service] = (m[l.service] || 0) + (Number(l.value) || 0); return m; }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Funnel: how many leads reached at least each stage
  const order = LEAD_STAGES.filter((s) => s !== "Lost");
  const reached = (l, s) => {
    if (l.stage === "Lost") { const prob = (l.activities || []).length; return order.indexOf(s) <= Math.min(prob, 3); }
    return order.indexOf(l.stage) >= order.indexOf(s);
  };
  const funnel = order.map((s) => ({ stage: s, count: leads.filter((l) => reached(l, s)).length }));

  const team = Object.values(leads.reduce((m, l) => {
    const r = (m[l.ownerId] ||= { id: l.ownerId, leads: 0, won: 0, lost: 0, value: 0, replies: [] });
    r.leads++; if (l.stage === "Won") { r.won++; r.value += Number(l.value) || 0; } if (l.stage === "Lost") r.lost++;
    if (l.firstReplyMins != null) r.replies.push(l.firstReplyMins);
    return m;
  }, {})).map((r) => ({ ...r, rate: pct(r.won, r.won + r.lost), reply: r.replies.length ? Math.round(r.replies.reduce((a, b) => a + b, 0) / r.replies.length) : null })).sort((a, b) => b.value - a.value);

  const lostReasons = Object.entries(leads.filter((l) => l.stage === "Lost").reduce((m, l) => { const k = l.lostReason || "Not given"; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);

  // Plain-language insights
  const insights = [];
  const ranked = bySource.filter((s) => s.won + s.lost >= 3).sort((a, b) => b.rate - a.rate);
  if (ranked.length >= 2) insights.push(`${ranked[0].source} converts ${ranked[0].rate}% of leads — ${ranked.at(-1).rate ? `${(ranked[0].rate / ranked.at(-1).rate).toFixed(1)}× better than` : "far ahead of"} ${ranked.at(-1).source}. Put more effort there.`);
  if (lostReasons[0]) insights.push(`Top reason for losing deals: “${lostReasons[0][0]}” (${lostReasons[0][1]} deals). Address it in your pitch or pricing.`);
  if (byService[0]) insights.push(`${byService[0].name} brings ${pct(byService[0].value, sumBy(byService, "value"))}% of won value — your strongest offering.`);
  const fastRep = [...team].filter((t) => t.reply != null).sort((a, b) => a.reply - b.reply)[0];
  if (fastRep) insights.push(`${userById(fastRep.id)?.name || "Top rep"} replies fastest (avg ${replyLabel(fastRep.reply)}) with a ${fastRep.rate}% win rate.`);
  if (prevRevenue) insights.push(`Collections are ${revenue >= prevRevenue ? "up" : "down"} ${Math.abs(pct(revenue - prevRevenue, prevRevenue))}% versus the previous ${n} months.`);

  return (
    <div>
      <PageHeader title="Business Intelligence" subtitle="What's working, what isn't, and what money is coming next — calculated live from your data."
        actions={<><Tabs value={range} onChange={setRange} tabs={[{ value: "3", label: "3 months" }, { value: "6", label: "6 months" }, { value: "12", label: "12 months" }]} />
          <Button variant="secondary" icon={Download} onClick={() => downloadCSV("source-performance.csv", bySource, [{ label: "Source", key: "source" }, { label: "Leads", key: "leads" }, { label: "Won", key: "won" }, { label: "Win rate %", key: "rate" }, { label: "Won value", key: "value" }, { label: "Avg deal", key: "avg" }])}>Export</Button></>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Collected" value={compactInr(revenue)} icon={IndianRupee} delta={prevRevenue ? pct(revenue - prevRevenue, prevRevenue) : null} deltaLabel={`vs previous ${n} months`} />
        <StatCard label="Win rate" value={`${pct(won.length, closed.length)}%`} icon={Target} tone="emerald" sub={`${won.length} won of ${closed.length} closed`} />
        <StatCard label="Average sales cycle" value={`${cycle} days`} icon={Timer} tone="amber" sub={`avg deal ${compactInr(won.length ? sumBy(won, "value") / won.length : 0)}`} />
        <StatCard label="Weighted pipeline" value={compactInr(forecast)} icon={TrendingUp} tone="violet" sub={`${open.length} open deals × stage probability`} />
      </div>

      <Card className="mb-6 p-5">
        <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Lightbulb className="h-4 w-4 text-amber-500" />Insights</p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {insights.map((t, i) => <li key={i} className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:bg-slate-800/50 dark:text-slate-200"><BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{t}</li>)}
        </ul>
      </Card>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Collections vs expenses" subtitle="Bars = money · line = new leads" />
          <div className="h-80 p-4">
            <ResponsiveContainer>
              <ComposedChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="l" tickFormatter={compactInr} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip formatter={(v, k) => (k === "Leads" ? v : inr(v))} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="Collected" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="l" dataKey="Expenses" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Line yAxisId="r" dataKey="Leads" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Where won revenue comes from" subtitle="By service" />
          <div className="h-80 p-4">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byService} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>{byService.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
                <Tooltip formatter={(v) => inr(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Lead source performance" subtitle="Which channels bring paying customers, not just enquiries" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Source</th><th className="th text-right">Leads</th><th className="th text-right">Won</th><th className="th">Win rate</th><th className="th text-right">Won value</th><th className="th text-right">Avg deal</th></tr></thead>
              <tbody>
                {bySource.map((s, i) => (
                  <tr key={s.source} className="tr">
                    <td className="td font-semibold">{i === 0 && <Trophy className="mr-1 inline h-3.5 w-3.5 text-amber-500" />}{s.source}</td>
                    <td className="td text-right">{s.leads}</td><td className="td text-right">{s.won}</td>
                    <td className="td"><div className="flex items-center gap-2"><Progress value={s.rate} className="w-20" tone={s.rate >= 50 ? "bg-emerald-500" : s.rate >= 30 ? "bg-amber-500" : "bg-rose-500"} /><span className="text-xs font-semibold">{s.rate}%</span></div></td>
                    <td className="td text-right font-semibold">{inr(s.value)}</td><td className="td text-right">{compactInr(s.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Sales funnel" subtitle="Leads that reached each stage" />
          <div className="space-y-3 p-5">
            {funnel.map((f, i) => (
              <div key={f.stage}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{f.stage}</span><span className="text-slate-500">{f.count}{i > 0 && <span className="ml-2 text-xs text-slate-400">{pct(f.count, funnel[i - 1].count)}% kept</span>}</span></div>
                <div className="h-6 rounded-md bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-md" style={{ width: `${pct(f.count, funnel[0].count)}%`, background: COLORS[i] }} /></div>
              </div>
            ))}
            {lostReasons.length > 0 && <div className="border-t border-slate-100 pt-3 dark:border-slate-800"><p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">Why deals are lost</p>{lostReasons.slice(0, 4).map(([r, c]) => <p key={r} className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-300">{r}</span><b>{c}</b></p>)}</div>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Team performance" subtitle={`Last ${n} months`} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Salesperson</th><th className="th text-right">Leads</th><th className="th text-right">Won</th><th className="th text-right">Win rate</th><th className="th text-right">First reply (avg)</th><th className="th text-right">Won value</th></tr></thead>
            <tbody>
              {team.map((t, i) => (
                <tr key={t.id} className="tr">
                  <td className="td"><span className="flex items-center gap-2"><span className={cx("w-5 text-xs font-bold", i === 0 ? "text-amber-500" : "text-slate-300")}>#{i + 1}</span><Avatar name={userById(t.id)?.name || "?"} size="sm" />{userById(t.id)?.name || "Unassigned"}</span></td>
                  <td className="td text-right">{t.leads}</td><td className="td text-right">{t.won}</td><td className="td text-right font-semibold">{t.rate}%</td>
                  <td className={cx("td text-right", t.reply != null && t.reply <= 15 ? "text-emerald-600" : t.reply > 120 ? "text-rose-600" : "")}>{replyLabel(t.reply)}</td>
                  <td className="td text-right font-semibold">{inr(t.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
