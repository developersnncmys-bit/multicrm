import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, IndianRupee, Wallet, AlertCircle, Users, Trophy, Lightbulb, XCircle, Inbox, Download } from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, SearchInput, Select, StatCard, Tabs, cx } from "../../components/ui";
import { PROJECT_STAGE_STYLE } from "../../config/constants";
import { addDays, compactInr, downloadCSV, fmtDate, inr, lastMonths, monthKey, monthLabel, todayISO } from "../../utils/format";
import { OPEN, QUOTED_STAGES, replyLabel, wonDateOf } from "./leadIntel";

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/* ═════════ Clients (won leads) ═════════ */
export function ClientsTab({ leads, intel, onOpen }) {
  const { userById } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("business");
  const clients = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads.filter((l) => l.stage === "Won")
      .map((l) => ({ l, total: intel.total[l.id] || 0, received: intel.received[l.id] || 0, balance: intel.balance[l.id] || 0, won: wonDateOf(l), project: intel.projectByLead[l.id] }))
      .filter((c) => (!s || [c.l.name, c.l.company, c.l.phone].some((v) => String(v || "").toLowerCase().includes(s)))
        && (filter === "all" || (filter === "due" ? c.balance > 0 : c.balance <= 0)))
      .sort((a, b) => (sort === "business" ? b.total - a.total : sort === "balance" ? b.balance - a.balance : (b.won || "").localeCompare(a.won || "")));
  }, [leads, intel, q, filter, sort]);
  const sum = (k) => clients.reduce((s, c) => s + c[k], 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clients" value={clients.length} icon={Building2} tone="brand" sub="won deals in view" />
        <StatCard label="Total business" value={compactInr(sum("total"))} icon={IndianRupee} tone="violet" sub="incl. GST" />
        <StatCard label="Received" value={compactInr(sum("received"))} icon={Wallet} tone="emerald" sub={`${pct(sum("received"), sum("total"))}% collected`} />
        <StatCard label="Balance due" value={compactInr(sum("balance"))} icon={AlertCircle} tone="rose" sub={`${clients.filter((c) => c.balance > 0).length} clients owe money`} />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search clients…" className="sm:w-72" />
          <Tabs value={filter} onChange={setFilter} tabs={[{ value: "all", label: "All" }, { value: "due", label: "Balance due" }, { value: "paid", label: "Fully paid" }]} />
          <Select value={sort} onChange={(e) => setSort(e.target.value)} options={[{ value: "business", label: "Biggest business" }, { value: "balance", label: "Highest balance" }, { value: "newest", label: "Newest client" }]} className="sm:ml-auto sm:!w-48" />
        </div>
        {clients.length === 0 ? <EmptyState icon={Building2} title="No clients match" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Client</th><th className="th">Service</th><th className="th">Won on</th><th className="th">Project stage</th><th className="th text-right">Total</th><th className="th text-right">Received</th><th className="th text-right">Balance</th><th className="th text-center">Meetings</th><th className="th text-center">Quotes</th><th className="th">Owner</th></tr></thead>
              <tbody>
                {clients.map(({ l, total, received, balance, won, project }) => (
                  <tr key={l.id} className="tr cursor-pointer" onClick={() => onOpen(l.id)}>
                    <td className="td"><div className="flex items-center gap-2.5"><Avatar name={l.company || l.name} size="sm" /><div><p className="font-semibold text-slate-800 dark:text-slate-100">{l.company || l.name}</p><p className="text-xs text-slate-500">{l.name} · {l.phone}</p></div></div></td>
                    <td className="td text-slate-600 dark:text-slate-300">{l.service}</td>
                    <td className="td text-slate-500">{fmtDate(won)}</td>
                    <td className="td">{project ? <Badge className={PROJECT_STAGE_STYLE[project.stage]}>{project.stage}</Badge> : <span className="text-xs text-slate-400">No project</span>}</td>
                    <td className="td text-right font-semibold tabular-nums">{inr(total)}</td>
                    <td className="td text-right tabular-nums text-emerald-600">{inr(received)}</td>
                    <td className={cx("td text-right font-semibold tabular-nums", balance > 0 ? "text-rose-600" : "text-slate-400")}>{inr(balance)}</td>
                    <td className="td text-center">{intel.meetings[l.id] || 0}</td>
                    <td className="td text-center">{intel.quoteCount[l.id] || 0}</td>
                    <td className="td"><Avatar name={userById(l.ownerId)?.name || "?"} size="xs" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ═════════ Sources ═════════ */
const PERIODS = [["month", "This month"], ["last", "Last month"], ["90", "Last 90 days"], ["365", "Last 12 months"], ["all", "All time"]];
function inPeriod(iso, p, today) {
  const d = (iso || "").slice(0, 10);
  if (p === "all") return true;
  if (p === "month") return d.slice(0, 7) === today.slice(0, 7);
  if (p === "last") return d.slice(0, 7) === lastMonths(2)[0];
  return d >= addDays(today, -Number(p) + 1);
}
const REPLY_BUCKETS = [["≤ 15 min", 0, 15], ["16–60 min", 16, 60], ["1–24 hours", 61, 1440], ["> 1 day", 1441, 1e9]];

export function SourcesTab({ leads, intel }) {
  const today = todayISO();
  const [period, setPeriod] = useState("90");
  const data = useMemo(() => {
    const list = leads.filter((l) => inPeriod(l.createdAt, period, today));
    const group = (keyFn) => {
      const m = {};
      list.forEach((l) => {
        const k = keyFn(l); const g = (m[k] ||= { key: k, leads: 0, contacted: 0, quoted: 0, won: 0, lost: 0, value: 0, replies: [] });
        g.leads++; if (l.stage !== "New") g.contacted++;
        if ([...QUOTED_STAGES, "Won"].includes(l.stage) || (intel.quoteCount[l.id] || 0) > 0) g.quoted++;
        if (l.stage === "Won") { g.won++; g.value += l.value || 0; }
        if (l.stage === "Lost") g.lost++;
        if (l.firstReplyMins != null) g.replies.push(l.firstReplyMins);
      });
      return Object.values(m).map((g) => ({ ...g, conv: pct(g.won, g.won + g.lost), avgReply: g.replies.length ? Math.round(g.replies.reduce((a, b) => a + b, 0) / g.replies.length) : null })).sort((a, b) => b.leads - a.leads);
    };
    const bySource = group((l) => l.source);
    const byService = group((l) => l.service);
    const reply = [...REPLY_BUCKETS.map(([label, a, b]) => { const ls = list.filter((l) => l.firstReplyMins != null && l.firstReplyMins >= a && l.firstReplyMins <= b); const w = ls.filter((l) => l.stage === "Won").length, lo = ls.filter((l) => l.stage === "Lost").length; return { label, n: ls.length, conv: pct(w, w + lo) }; }),
      (() => { const ls = list.filter((l) => l.firstReplyMins == null); const w = ls.filter((l) => l.stage === "Won").length, lo = ls.filter((l) => l.stage === "Lost").length; return { label: "Not logged", n: ls.length, conv: pct(w, w + lo) }; })()];
    const trend = lastMonths(12).map((m) => ({ m: monthLabel(m), Leads: leads.filter((l) => monthKey(l.createdAt) === m).length, Won: leads.filter((l) => l.stage === "Won" && monthKey(l.createdAt) === m).length }));
    const won = list.filter((l) => l.stage === "Won");
    const insights = [];
    const best = [...bySource].filter((g) => g.won + g.lost >= 2).sort((a, b) => b.conv - a.conv)[0];
    const most = [...bySource].sort((a, b) => b.value - a.value)[0];
    const lowQ = [...bySource].filter((g) => g.leads >= 4).sort((a, b) => a.conv - b.conv)[0];
    if (best) insights.push(`${best.key} converts best at ${best.conv}% — put more budget or effort there.`);
    if (most && most.value) insights.push(`${most.key} brought the most business: ${compactInr(most.value)} won.`);
    if (lowQ && lowQ !== best) insights.push(`${lowQ.key} sends volume (${lowQ.leads} leads) but converts only ${lowQ.conv}%. Qualify these faster.`);
    if (reply[0].n && reply[3].n) insights.push(`Leads answered within 15 minutes convert at ${reply[0].conv}% vs ${reply[3].conv}% when the first reply took over a day.`);
    return { list, bySource, byService, reply, trend, won, insights };
  }, [leads, intel, period, today]);
  const maxLeads = Math.max(1, ...data.bySource.map((g) => g.leads));

  const SourceTable = ({ rows, title }) => (
    <Card className="overflow-hidden">
      <CardHeader title={title} action={<Button size="sm" variant="ghost" icon={Download} onClick={() => downloadCSV(`${title.toLowerCase().replace(/\s+/g, "-")}.csv`, rows, [{ label: "Name", key: "key" }, { label: "Leads", key: "leads" }, { label: "Contacted %", value: (g) => pct(g.contacted, g.leads) }, { label: "Avg first reply (min)", key: "avgReply" }, { label: "Quoted", key: "quoted" }, { label: "Won", key: "won" }, { label: "Lost", key: "lost" }, { label: "Conversion %", key: "conv" }, { label: "Value won", key: "value" }])}>CSV</Button>} />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Name</th><th className="th">Leads</th><th className="th text-right">Contacted</th><th className="th text-right">Avg first reply</th><th className="th text-right">Quoted</th><th className="th text-right">Won</th><th className="th text-right">Lost</th><th className="th text-right">Conversion</th><th className="th text-right">Value won</th></tr></thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.key} className="tr">
                <td className="td font-medium text-slate-800 dark:text-slate-100">{g.key}</td>
                <td className="td"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(g.leads / maxLeads) * 100}%` }} /></div><span className="tabular-nums">{g.leads}</span></div></td>
                <td className="td text-right tabular-nums">{pct(g.contacted, g.leads)}%</td>
                <td className="td text-right tabular-nums">{replyLabel(g.avgReply)}</td>
                <td className="td text-right tabular-nums">{g.quoted}</td>
                <td className="td text-right tabular-nums text-emerald-600">{g.won}</td>
                <td className="td text-right tabular-nums text-rose-500">{g.lost}</td>
                <td className="td text-right"><span className={cx("chip", g.conv >= 40 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : g.conv >= 20 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300")}>{g.conv}%</span></td>
                <td className="td text-right font-semibold tabular-nums">{inr(g.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      <Tabs className="w-fit" value={period} onChange={setPeriod} tabs={PERIODS.map(([value, label]) => ({ value, label }))} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Leads" value={data.list.length} icon={Inbox} tone="brand" />
        <StatCard label="Won" value={data.won.length} icon={Trophy} tone="emerald" sub={`${pct(data.won.length, data.list.filter((l) => !OPEN(l)).length)}% of closed`} />
        <StatCard label="Value won" value={compactInr(data.won.reduce((s, l) => s + (l.value || 0), 0))} icon={IndianRupee} tone="violet" />
        <StatCard label="Still open" value={data.list.filter(OPEN).length} icon={Users} tone="amber" />
        <StatCard label="Lost" value={data.list.filter((l) => l.stage === "Lost").length} icon={XCircle} tone="rose" />
      </div>
      <SourceTable rows={data.bySource} title="By source" />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Leads vs won — last 12 months" subtitle="All sources" />
          <div className="h-64 px-2 pb-3 pt-4">
            <ResponsiveContainer>
              <BarChart data={data.trend} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "rgba(148,163,184,.1)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Leads" fill="rgb(var(--brand-500))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Won" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-white"><Lightbulb className="h-4 w-4 text-amber-500" />What the numbers say</h3>
            <ul className="mt-3 space-y-2.5">
              {data.insights.length === 0 && <li className="text-sm text-slate-500">Not enough data in this period yet.</li>}
              {data.insights.map((t) => <li key={t} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{t}</li>)}
            </ul>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="First reply time vs conversion" />
            <table className="mt-3 w-full">
              <thead><tr><th className="th">First reply</th><th className="th text-right">Leads</th><th className="th text-right">Conversion</th></tr></thead>
              <tbody>{data.reply.map((r) => <tr key={r.label} className="tr"><td className="td">{r.label}</td><td className="td text-right tabular-nums">{r.n}</td><td className="td text-right font-semibold tabular-nums">{r.conv}%</td></tr>)}</tbody>
            </table>
          </Card>
        </div>
      </div>
      <SourceTable rows={data.byService} title="By service" />
    </div>
  );
}

/* ═════════ Team matrix ═════════ */
export function TeamTab({ leads, intel, users }) {
  const today = todayISO();
  const [period, setPeriod] = useState("month");
  const rows = users.map((u) => {
    const mine = leads.filter((l) => l.ownerId === u.id);
    const inP = mine.filter((l) => inPeriod(l.createdAt, period, today));
    const replies = inP.map((l) => l.firstReplyMins).filter((m) => m != null);
    const won = inP.filter((l) => l.stage === "Won"); const lost = inP.filter((l) => l.stage === "Lost");
    const waiting = mine.filter((l) => intel.quoteWaiting[l.id]);
    return {
      u, open: mine.filter(OPEN).length, newIn: inP.length, avgReply: replies.length ? Math.round(replies.reduce((a, b) => a + b, 0) / replies.length) : null,
      notContacted: mine.filter((l) => l.stage === "New").length, overdue: mine.filter((l) => OPEN(l) && l.nextFollowUp && l.nextFollowUp < today).length,
      noDate: mine.filter((l) => OPEN(l) && l.stage !== "New" && !l.nextFollowUp).length,
      qCount: waiting.length, qValue: waiting.reduce((s, l) => s + intel.quoteWaiting[l.id], 0),
      won: won.length, value: won.reduce((s, l) => s + (l.value || 0), 0), conv: pct(won.length, won.length + lost.length),
    };
  });
  const warn = (n) => (n > 0 ? "font-semibold text-rose-600" : "text-slate-400");
  return (
    <div className="space-y-5">
      <Tabs className="w-fit" value={period} onChange={setPeriod} tabs={PERIODS.map(([value, label]) => ({ value, label }))} />
      <Card className="overflow-hidden">
        <CardHeader title="Team performance" subtitle="Open work right now + results for the selected period" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Owner</th><th className="th text-right">Open now</th><th className="th text-right">New in period</th><th className="th text-right">Avg first reply</th><th className="th text-right">Not contacted</th><th className="th text-right">Follow-ups overdue</th><th className="th text-right">No follow-up date</th><th className="th text-right">Quotes waiting</th><th className="th text-right">Won</th><th className="th text-right">Value won</th><th className="th text-right">Conversion</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.u.id} className="tr">
                  <td className="td"><div className="flex items-center gap-2.5"><Avatar name={r.u.name} size="sm" /><div><p className="font-semibold text-slate-800 dark:text-slate-100">{r.u.name}</p><p className="text-xs text-slate-500">{r.u.role} · {r.u.branch}</p></div></div></td>
                  <td className="td text-right tabular-nums">{r.open}</td>
                  <td className="td text-right tabular-nums">{r.newIn}</td>
                  <td className="td text-right tabular-nums">{replyLabel(r.avgReply)}</td>
                  <td className={cx("td text-right tabular-nums", warn(r.notContacted))}>{r.notContacted}</td>
                  <td className={cx("td text-right tabular-nums", warn(r.overdue))}>{r.overdue}</td>
                  <td className={cx("td text-right tabular-nums", warn(r.noDate))}>{r.noDate}</td>
                  <td className="td text-right tabular-nums">{r.qCount} <span className="text-xs text-slate-400">· {compactInr(r.qValue)}</span></td>
                  <td className="td text-right tabular-nums text-emerald-600">{r.won}</td>
                  <td className="td text-right font-semibold tabular-nums">{inr(r.value)}</td>
                  <td className="td text-right font-semibold tabular-nums">{r.conv}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-slate-400">Overdue follow-ups and uncontacted leads are highlighted in red. Figures update live as your team works.</p>
    </div>
  );
}
