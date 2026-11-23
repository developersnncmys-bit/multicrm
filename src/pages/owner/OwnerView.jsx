import { useMemo, useState } from "react";
import { firstStage, liveStage } from "../../config/workspace";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet, Target, RefreshCw, MessageCircle, ArrowUpRight, Phone, Hammer, Repeat, AlertTriangle, PauseCircle, CalendarX, FileText, Inbox,
  Clock, ShieldCheck, Building2, CheckCircle2, XCircle, Droplets, FolderKanban, Receipt, BadgePercent, Settings2, Users,
} from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Pagination, Progress, Select, Tabs, usePaged, cx } from "../../components/ui";
import { BRANCHES, PROJECT_STAGES, PROJECT_STAGE_STYLE } from "../../config/constants";
import { compactInr, fmtDate, inr } from "../../utils/format";
import { branchConfig } from "../Expenses";
import {
  allPayments, daysBetween, addDays, invBalance, invTotal, isInvOpen, isOpenLead, leadLastActivity, monthKey, monthsPaid, nextPayday, prevMonthKey,
  projectMoney, revenueTarget, salaryBillOf, serviceMonthStatus, servicesOf, sumBy, thisMonth, todayISO, waLink,
} from "./ownerData";

const SVC_STYLE = {
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "Partly paid": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Due: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Skipped: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  "Not started": "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  Stopped: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

function Section({ title, subtitle, icon: Icon, action, children, className }) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icon className="h-4 w-4" /></span>}
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

const Kpi = ({ label, value, sub, tone }) => (
  <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className={cx("mt-1 text-lg font-bold text-slate-900 dark:text-white", tone)}>{value}</p>
    {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
  </div>
);

export default function OwnerView() {
  const { db, user, setSettings, userById } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const [show, setShow] = useState("all");
  const [owner, setOwner] = useState("");
  const [branch, setBranch] = useState("");
  const [chip, setChip] = useState("done");
  const [perPage, setPerPage] = useState(10);
  const [targets, setTargets] = useState(null);
  const [tick, setTick] = useState(0);

  const today = todayISO();
  const month = thisMonth();
  const lastM = prevMonthKey();
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const salesUsers = (db.users || []).filter((u) => ["Admin", "Sales Manager", "Sales Executive"].includes(u.role));
  const money = show !== "delivery";
  const delivery = show !== "money";

  const m = useMemo(() => {
    const leadOk = (l) => (!branch || l.branch === branch) && (!owner || l.ownerId === owner);
    const projects = (db.projects || []).map((p) => ({ ...p, ...projectMoney(p, db) })).filter((p) => (!branch || p.branch === branch) && (!owner || p.ownerId === owner));
    const payments = allPayments(db).filter((p) => !branch || p.branch === branch);
    const collectedIn = (mm) => sumBy(payments.filter((p) => monthKey(p.date) === mm), "amount");
    const openInv = (db.invoices || []).filter((i) => isInvOpen(i) && (!branch || i.branch === branch));
    const services = servicesOf(db);

    // Salary cover
    const payday = nextPayday(db.settings?.payroll?.payday);
    const salaryBill = salaryBillOf(db);
    const collected = collectedIn(month);
    const dueBefore = sumBy(openInv.filter((i) => i.dueDate && i.dueDate <= payday), invBalance)
      + sumBy(services.filter((s) => ["Due", "Overdue", "Partly paid"].includes(serviceMonthStatus(s, month))), "monthly")
      + sumBy((db.commitments || []).filter((c) => !c.collected && c.expectedDate <= payday), "amount");
    const gap = Math.max(0, salaryBill - collected - dueBefore);
    const servicesHold = services.filter((s) => serviceMonthStatus(s, month) === "Stopped").length;
    const servicesToCollect = services.filter((s) => ["Due", "Overdue", "Partly paid"].includes(serviceMonthStatus(s, month)));

    // Balances
    const withBal = projects.filter((p) => p.balance > 0);
    const followups = (db.paymentFollowups || []).filter((f) => f.status !== "Paid").map((f) => ({ ...f, pending: Math.max(0, (Number(f.totalValue) || 0) - (Number(f.received) || 0)) })).filter((f) => f.pending > 0);
    const ageingBase = withBal.map((p) => ({ ...p, age: daysBetween(p.advanceDate || p.startDate || today) }));
    const buckets = [[0, 30], [31, 60], [61, 90], [91, 180], [181, 99999]].map(([a, b]) => {
      const rows = ageingBase.filter((p) => p.age >= a && p.age <= b);
      return { label: b > 9999 ? "180+ days" : `${a}–${b} days`, count: rows.length, amount: sumBy(rows, "balance") };
    });
    const halfPaid = withBal.filter((p) => p.pctPaid < 50);

    // Today list
    const big = withBal.filter((p) => p.balance >= 100000);
    const doneUnpaid = withBal.filter((p) => p.stage === "Completed");
    const onHold = projects.filter((p) => p.stage === "On Hold");
    const pastEnd = projects.filter((p) => p.pastEnd);
    const quotesWaiting = (db.quotations || []).filter((q) => ["Sent", "Negotiation"].includes(q.status) && daysBetween(q.date) >= 3 && (!branch || q.branch === branch));
    const newEnq = (db.leads || []).filter((l) => leadOk(l) && l.stage === "New" && daysBetween(l.createdAt.slice(0, 10)) <= 14);

    // Invoices & quotes health
    const drafts = (db.invoices || []).filter((i) => i.status === "Draft" && daysBetween(i.date) > 7 && (!branch || i.branch === branch));
    const sentUnpaid = openInv.filter((i) => i.status !== "Draft");

    // TDS
    const tdsPays = payments.filter((p) => Number(p.tds) > 0);

    // Leaks
    const wonNoProject = (db.leads || []).filter((l) => leadOk(l) && l.stage === "Won" && !(db.projects || []).some((p) => p.leadId === l.id));
    const startedNoAdvance = projects.filter((p) => ![firstStage(), "On Hold"].includes(p.stage) && p.received === 0);
    const doneOrPastOpen = withBal.filter((p) => p.done || p.pastEnd);

    // Delivery
    const byStage = PROJECT_STAGES.map((st) => { const rows = projects.filter((p) => p.stage === st); return { st, count: rows.length, owed: sumBy(rows, "balance") }; });
    const running = projects.filter((p) => p.stage !== "Completed").map((p) => ({ ...p, days: daysBetween(p.startDate || today) })).sort((a, b) => b.days - a.days).slice(0, 6);

    // Branches
    const cfg = branchConfig(db.settings);
    const branches = BRANCHES.map((b) => {
      const ps = (db.projects || []).map((p) => ({ ...p, ...projectMoney(p, db) })).filter((p) => p.branch === b);
      const pay = allPayments(db).filter((p) => p.branch === b);
      const expLast = sumBy((db.expenses || []).filter((e) => e.branch === b && monthKey(e.date) === lastM), "amount");
      const cLast = sumBy(pay.filter((p) => monthKey(p.date) === lastM), "amount");
      return {
        b, projects: ps.length, deal: sumBy(ps, "total"), received: sumBy(ps, "received"), owed: sumBy(ps, "balance"),
        cThis: sumBy(pay.filter((p) => monthKey(p.date) === month), "amount"), cLast, expLast, rent: Number(cfg.find((c) => c.name === b)?.rent) || 0,
      };
    });

    // Hygiene
    const idleEnq = (db.leads || []).filter((l) => leadOk(l) && isOpenLead(l) && daysBetween(leadLastActivity(l)) >= 30);
    const unlinked = payments.filter((p) => p.source === "Invoice" && !p.ref);
    const paidNoAdvDate = projects.filter((p) => p.received > 0 && !p.advanceDate);
    const salaryPending = (db.salaryRecords || []).filter((r) => r.status !== "Paid" && r.month < month);

    return {
      projects, payments, collected, payday, salaryBill, dueBefore, gap, servicesHold, servicesToCollect, withBal, followups, buckets, halfPaid,
      big, doneUnpaid, onHold, pastEnd, quotesWaiting, newEnq, drafts, sentUnpaid, tdsPays, wonNoProject, startedNoAdvance, doneOrPastOpen,
      byStage, running, branches, idleEnq, unlinked, paidNoAdvDate, salaryPending, services, cLast: collectedIn(lastM),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, branch, owner, tick]);

  const target = revenueTarget(db, month);
  const targetPct = target ? Math.round((m.collected / target) * 100) : 0;
  const covered = m.collected >= m.salaryBill;
  const daysLeft = daysBetween(today, m.payday);
  const barMax = Math.max(m.salaryBill, m.collected + m.dueBefore, 1);

  // Balances table rows by chip
  const balanceRows = useMemo(() => {
    if (chip === "tracker") return m.followups.map((f) => ({ id: f.id, kind: "tracker", client: f.client, sub: f.project, status: f.status, pending: f.pending, pctPaid: f.totalValue ? Math.round(((Number(f.received) || 0) / f.totalValue) * 100) : 0, since: f.proposalDate, due: f.deadline, last: f.lastFollowUp, phone: f.phone }));
    let rows = m.withBal;
    if (chip === "done") rows = rows.filter((p) => p.done || p.pastEnd);
    if (chip === "week") rows = rows.filter((p) => p.deadline && p.deadline >= today && p.deadline <= addDays(today, 7));
    return [...rows].sort((a, b) => b.balance - a.balance).map((p) => ({ id: p.id, kind: "project", client: p.client, sub: p.service, status: p.stage, pending: p.balance, pctPaid: p.pctPaid, since: p.advanceDate, due: p.deadline, last: p.lastFollowUp || p.lastPayment, ownerId: p.ownerId, phone: p.phone, contact: p.contact }));
  }, [chip, m, today]);
  const pg = usePaged(balanceRows, perPage);

  const remind = (r) => {
    const name = r.contact || r.client;
    const text = `Hi ${name}, hope you're doing well! This is a gentle reminder about the pending balance of ${inr(r.pending)} for ${r.sub || "your project"} with ${db.settings.company.name}. Kindly arrange the payment at the earliest. Thank you!`;
    window.open(waLink(r.phone, text), "_blank");
  };

  const openTargets = () => setTargets({ salaryBill: m.salaryBill, payday: db.settings?.payroll?.payday || 7, revenue: target || "" });
  const saveTargets = () => {
    setSettings("payroll", { salaryBill: Number(targets.salaryBill) || 0, payday: Math.min(28, Math.max(1, Number(targets.payday) || 7)) });
    if (targets.revenue !== "") {
      setSettings("targets", { monthlyRevenue: Number(targets.revenue) || 0 });
      setSettings("monthlyTargets", { ...(db.settings.monthlyTargets || {}), [month]: { ...(db.settings.monthlyTargets?.[month] || {}), revenue: Number(targets.revenue) || 0 } });
    }
    toast("Targets and salary saved");
    setTargets(null);
  };

  const todayItems = [
    { icon: Wallet, title: "Balances of ₹1 lakh or more", rows: m.big, amount: sumBy(m.big, "balance"), action: () => { setChip("all"); document.getElementById("ov-balances")?.scrollIntoView({ behavior: "smooth" }); }, cta: "See list" },
    { icon: CheckCircle2, title: "Completed but not fully paid", rows: m.doneUnpaid, amount: sumBy(m.doneUnpaid, "balance"), action: () => nav("/projects"), cta: "Projects" },
    { icon: PauseCircle, title: "Projects on hold", rows: m.onHold, amount: sumBy(m.onHold, "balance"), action: () => nav("/projects"), cta: "Review" },
    { icon: CalendarX, title: "Past their end date", rows: m.pastEnd, amount: sumBy(m.pastEnd, "balance"), action: () => nav("/projects"), cta: "Review" },
    { icon: FileText, title: "Quotations with no reply for 3+ days", rows: m.quotesWaiting, amount: null, action: () => nav("/quotations"), cta: "Chase" },
    { icon: Inbox, title: "New enquiries to call (last 14 days)", rows: m.newEnq, amount: null, action: () => nav("/leads"), cta: "Call" },
  ];

  const leaks = [
    { title: "Done or past date, balance still open", count: m.doneOrPastOpen.length, amount: sumBy(m.doneOrPastOpen, "balance"), to: "/projects" },
    { title: "Work started with no advance", count: m.startedNoAdvance.length, amount: sumBy(m.startedNoAdvance, "total"), to: "/projects" },
    { title: "Closed deals with no project created", count: m.wonNoProject.length, amount: sumBy(m.wonNoProject, "value"), to: "/leads" },
    { title: "Draft invoices never sent", count: (db.invoices || []).filter((i) => i.status === "Draft").length, amount: sumBy((db.invoices || []).filter((i) => i.status === "Draft"), invTotal), to: "/invoices" },
  ];

  const hygiene = [
    { label: "Enquiries idle 30+ days", n: m.idleEnq.length, to: "/leads" },
    { label: "Projects past end date", n: m.pastEnd.length, to: "/projects" },
    { label: "Closed deals with no project stage", n: m.wonNoProject.length, to: "/leads" },
    { label: "Payments with no reference / UTR", n: m.unlinked.length, to: "/payments" },
    { label: "Projects paid but no advance date", n: m.paidNoAdvDate.length, to: "/projects" },
    { label: "Salary records not marked paid", n: m.salaryPending.length, to: "/team" },
  ];

  const mrr = sumBy(m.services.filter((s) => s.active !== false), "monthly");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <p className="text-sm text-slate-500">How the business is doing in {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })} — cash, collections, delivery, branches and data quality.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={show} onChange={setShow} tabs={[{ value: "all", label: "Everything" }, { value: "money", label: "Money" }, { value: "delivery", label: "Delivery" }]} />
          <Select value={owner} onChange={(e) => setOwner(e.target.value)} options={salesUsers.map((u) => ({ value: u.id, label: u.name }))} placeholder="All owners" className="w-40" />
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={BRANCHES} placeholder="All branches" className="w-36" />
          <Button variant="secondary" icon={Settings2} onClick={openTargets}>Targets & salary</Button>
          <Button variant="ghost" size="icon" title="Refresh" onClick={() => { setTick((t) => t + 1); toast("Numbers refreshed", "info"); }}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {money && (
        <>
          {/* Salaries vs collections */}
          <Section icon={Wallet} title="Salaries vs collections" subtitle={`Next payday ${fmtDate(m.payday)} · ${daysLeft <= 0 ? "today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}`}
            action={covered ? <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"><CheckCircle2 className="h-3.5 w-3.5" />Covered</Badge>
              : <Badge className="bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30"><AlertTriangle className="h-3.5 w-3.5" />Short by {inr(m.salaryBill - m.collected)}</Badge>}>
            <div className="grid gap-6 p-5 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Kpi label="Salary needed" value={inr(m.salaryBill)} sub="monthly salary bill" />
                  <Kpi label="Collected this month" value={inr(m.collected)} tone="text-emerald-600 dark:text-emerald-400" />
                  <Kpi label="Due before payday" value={inr(m.dueBefore)} tone="text-amber-600 dark:text-amber-400" />
                  <Kpi label="Gap to close" value={inr(m.gap)} tone={m.gap ? "text-rose-600 dark:text-rose-400" : ""} />
                </div>
                <div className="mt-5">
                  <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="bg-emerald-500" style={{ width: `${(Math.min(m.collected, barMax) / barMax) * 100}%` }} title="Collected" />
                    <div className="bg-amber-400" style={{ width: `${(Math.min(m.dueBefore, barMax - Math.min(m.collected, barMax)) / barMax) * 100}%` }} title="Due before payday" />
                    <div className="bg-rose-400" style={{ width: `${(m.gap / barMax) * 100}%` }} title="Gap" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Collected</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Due before payday</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" />Gap</span>
                    <span className="ml-auto">Revenue target {target ? `${inr(target)} · ${targetPct}% collected` : "not set"}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">How to close the gap</p>
                <div className="mt-3 space-y-2">
                  <button onClick={() => { setChip("all"); document.getElementById("ov-balances")?.scrollIntoView({ behavior: "smooth" }); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <Phone className="h-4 w-4 text-brand-600" /><span className="flex-1">Call the 10 biggest balances</span><span className="font-semibold">{compactInr(sumBy([...m.withBal].sort((a, b) => b.balance - a.balance).slice(0, 10), "balance"))}</span>
                  </button>
                  <Link to="/projects" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <Hammer className="h-4 w-4 text-brand-600" /><span className="flex-1">Finish & bill completed projects</span><span className="font-semibold">{m.doneUnpaid.length}</span>
                  </Link>
                  <Link to="/monthly-billing" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <Repeat className="h-4 w-4 text-brand-600" /><span className="flex-1">Collect this month's monthly services {m.servicesHold ? <span className="text-xs text-slate-400">({m.servicesHold} on hold)</span> : null}</span><span className="font-semibold">{compactInr(sumBy(m.servicesToCollect, "monthly"))}</span>
                  </Link>
                </div>
              </div>
            </div>
          </Section>

          {/* Balances to collect */}
          <div id="ov-balances" className="scroll-mt-20">
            <Section icon={Receipt} title="Balances to collect" subtitle={`${m.withBal.length} projects · ${inr(sumBy(m.withBal, "balance"))} owed${m.followups.length ? ` · ${m.followups.length} in Payment Tracker` : ""}`}
              action={<Select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); pg.setPage(1); }} options={[{ value: 10, label: "10 / page" }, { value: 25, label: "25 / page" }, { value: 50, label: "50 / page" }]} className="w-28" />}>
              <div className="flex flex-wrap gap-2 px-5 pt-4">
                {[["done", "Done or past date", m.withBal.filter((p) => p.done || p.pastEnd).length], ["week", "Due in 7 days", m.withBal.filter((p) => p.deadline && p.deadline >= today && p.deadline <= addDays(today, 7)).length], ["all", "All project balances", m.withBal.length], ["tracker", "Payment Tracker", m.followups.length]].map(([k, l, n]) => (
                  <button key={k} onClick={() => { setChip(k); pg.setPage(1); }} className={cx("rounded-full border px-3 py-1 text-xs font-semibold transition", chip === k ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800")}>{l} <span className="opacity-60">{n}</span></button>
                ))}
              </div>
              {balanceRows.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing to collect here" text="No balances match this filter." /> : (
                <>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full">
                      <thead><tr><th className="th">Client</th><th className="th">{chip === "tracker" ? "Status" : "Project stage"}</th><th className="th text-right">Pending</th><th className="th">Since / Due / Last follow-up</th><th className="th">Owner</th><th className="th" /></tr></thead>
                      <tbody>
                        {pg.slice.map((r) => (
                          <tr key={r.id} className="tr">
                            <td className="td"><p className="font-semibold text-slate-800 dark:text-slate-100">{r.client}</p><p className="text-xs text-slate-500">{r.sub}</p></td>
                            <td className="td">{r.kind === "project" ? <Badge className={PROJECT_STAGE_STYLE[r.status] || "bg-slate-100 text-slate-600"}>{r.status || "Not started"}</Badge> : <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{r.status}</Badge>}</td>
                            <td className="td text-right"><p className="font-bold text-slate-900 dark:text-white">{inr(r.pending)}</p><div className="ml-auto mt-1 flex w-28 items-center gap-1.5"><Progress value={r.pctPaid} tone={r.pctPaid < 50 ? "bg-rose-400" : "bg-emerald-500"} /><span className="text-[10px] text-slate-400">{r.pctPaid}%</span></div></td>
                            <td className="td text-xs text-slate-500">
                              <p>Since {r.since ? fmtDate(r.since) : "—"}</p>
                              <p className={cx(r.due && r.due < today && "font-semibold text-rose-600")}>Due {r.due ? fmtDate(r.due) : "—"}</p>
                              <p>Last follow-up {r.last ? fmtDate(r.last) : "never"}</p>
                            </td>
                            <td className="td">{r.ownerId ? <Avatar name={userById(r.ownerId)?.name || "?"} size="xs" /> : <span className="text-xs text-slate-400">—</span>}</td>
                            <td className="td text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button size="sm" variant="secondary" onClick={() => remind(r)}><MessageCircle className="h-3.5 w-3.5 text-emerald-600" />Remind</Button>
                                <Button size="sm" variant="ghost" onClick={() => nav(r.kind === "project" ? `/projects?open=${r.id}` : "/payments")}>Open<ArrowUpRight className="h-3.5 w-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination {...pg} onPage={pg.setPage} />
                </>
              )}
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Ageing */}
            <Section icon={Clock} title="How long balances have been open" subtitle="Days since the advance was received">
              <div className="space-y-3 p-5">
                {m.buckets.map((b, i) => {
                  const max = Math.max(...m.buckets.map((x) => x.amount), 1);
                  return (
                    <div key={b.label} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-sm text-slate-600 dark:text-slate-300">{b.label}</span>
                      <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                        <div className={cx("h-full rounded-md", ["bg-emerald-400", "bg-lime-400", "bg-amber-400", "bg-orange-500", "bg-rose-500"][i])} style={{ width: `${(b.amount / max) * 100}%` }} />
                      </div>
                      <span className="w-28 shrink-0 text-right text-sm"><b className="text-slate-900 dark:text-white">{compactInr(b.amount)}</b> <span className="text-xs text-slate-400">· {b.count}</span></span>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Less than half paid */}
            <Section icon={AlertTriangle} title="Working with less than half paid" subtitle="Projects where under 50% has been received">
              <div className="grid grid-cols-3 gap-3 p-5 pb-3">
                <Kpi label="Still owed" value={compactInr(sumBy(m.halfPaid, "balance"))} tone="text-rose-600 dark:text-rose-400" />
                <Kpi label="Projects" value={m.halfPaid.length} />
                <Kpi label="Avg % paid" value={`${m.halfPaid.length ? Math.round(sumBy(m.halfPaid, "pctPaid") / m.halfPaid.length) : 0}%`} />
              </div>
              <div className="overflow-x-auto pb-2">
                <table className="w-full">
                  <tbody>
                    {[...m.halfPaid].sort((a, b) => b.balance - a.balance).slice(0, 6).map((p) => (
                      <tr key={p.id} className="tr cursor-pointer" onClick={() => nav(`/projects?open=${p.id}`)}>
                        <td className="td"><p className="font-medium text-slate-800 dark:text-slate-100">{p.client}</p><p className="text-xs text-slate-500">{p.stage}</p></td>
                        <td className="td w-40"><div className="flex items-center gap-2"><Progress value={p.pctPaid} tone="bg-rose-400" /><span className="text-xs text-slate-500">{p.pctPaid}%</span></div></td>
                        <td className="td text-right font-semibold text-slate-900 dark:text-white">{inr(p.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {m.halfPaid.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-500">Every active project has at least half paid 👏</p>}
              </div>
            </Section>
          </div>

          {/* Monthly services */}
          <Section icon={Repeat} title="Monthly services" subtitle={`MRR ${inr(mrr)} · ${inr(mrr * 12)} a year`} action={<Button size="sm" variant="soft" onClick={() => nav("/monthly-billing")}>Manage<ArrowUpRight className="h-3.5 w-3.5" /></Button>}>
            {m.services.length === 0 ? <EmptyState icon={Repeat} title="No monthly services yet" /> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="th">Client</th><th className="th">Service</th><th className="th text-right">Fee / month</th><th className="th">Bills on</th><th className="th">This month</th><th className="th text-right">Months paid</th></tr></thead>
                  <tbody>
                    {m.services.slice(0, 12).map((s) => {
                      const st = serviceMonthStatus(s, month);
                      return (
                        <tr key={s.id} className="tr">
                          <td className="td font-medium text-slate-800 dark:text-slate-100">{s.client}</td>
                          <td className="td text-slate-600 dark:text-slate-300">{s.name}{s.cycle && s.cycle !== "Monthly" ? <span className="text-xs text-slate-400"> · {s.cycle}</span> : null}</td>
                          <td className="td text-right font-semibold">{inr(s.monthly)}</td>
                          <td className="td text-slate-500">Day {s.billDay || 1}</td>
                          <td className="td"><Badge className={SVC_STYLE[st]}>{st}</Badge></td>
                          <td className="td text-right text-slate-600 dark:text-slate-300">{monthsPaid(s) ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Invoices & quotations */}
            <Section icon={FileText} title="Invoices and quotations" subtitle="Paperwork that is holding money back">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { label: "Draft invoices older than 7 days", n: m.drafts.length, amt: sumBy(m.drafts, invTotal), to: "/invoices" },
                  { label: "Invoices sent but unpaid", n: m.sentUnpaid.length, amt: sumBy(m.sentUnpaid, invBalance), to: "/invoices" },
                  { label: "Quotations waiting 3+ days", n: m.quotesWaiting.length, amt: null, to: "/quotations" },
                ].map((r) => (
                  <Link key={r.label} to={r.to} className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="flex-1 text-slate-700 dark:text-slate-300">{r.label}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{r.n}</span>
                    {r.amt !== null && <span className="w-24 text-right text-slate-500">{compactInr(r.amt)}</span>}
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            </Section>

            {/* TDS */}
            <Section icon={BadgePercent} title="TDS, kept apart from real dues" subtitle="Tax deducted by clients — collect Form 16A certificates">
              {m.tdsPays.length === 0 ? (
                <div className="flex items-start gap-3 p-5 text-sm text-slate-500">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><BadgePercent className="h-4 w-4" /></span>
                  <p>No TDS recorded yet. When a client deducts TDS, record it with the payment and track pending Form 16A certificates here — it won't be counted as an unpaid balance.</p>
                </div>
              ) : (
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <Kpi label="TDS deducted" value={inr(sumBy(m.tdsPays, "tds"))} />
                    <Kpi label="Certificates pending" value={m.tdsPays.filter((p) => !p.form16a).length} />
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">{m.tdsPays.slice(0, 5).map((p) => <li key={p.id} className="flex justify-between"><span>{p.client}</span><span className="font-semibold">{inr(p.tds)}</span></li>)}</ul>
                </div>
              )}
            </Section>
          </div>
        </>
      )}

      {delivery && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Section icon={FolderKanban} title="Delivery — projects" subtitle={`${m.projects.filter((p) => p.stage === liveStage()).length} live · ${m.projects.filter((p) => p.stage === "Completed").length} completed · ${m.pastEnd.length} past end date`}>
            {m.pastEnd.length > 0 && <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><CalendarX className="h-4 w-4" />{m.pastEnd.length} project{m.pastEnd.length === 1 ? " is" : "s are"} past the agreed end date</div>}
            <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-4">
              {m.byStage.map((s) => (
                <div key={s.st} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <p className="truncate text-[11px] font-medium text-slate-500" title={s.st}>{s.st}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{s.count}</p>
                  <p className="text-[11px] text-slate-400">{s.owed ? `${compactInr(s.owed)} owed` : "—"}</p>
                </div>
              ))}
            </div>
            <p className="px-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Running longest</p>
            <div className="overflow-x-auto pb-2">
              <table className="w-full">
                <tbody>
                  {m.running.map((p) => (
                    <tr key={p.id} className="tr cursor-pointer" onClick={() => nav(`/projects?open=${p.id}`)}>
                      <td className="td"><p className="font-medium text-slate-800 dark:text-slate-100">{p.client}</p><p className="text-xs text-slate-500">{p.service}</p></td>
                      <td className="td"><Badge className={PROJECT_STAGE_STYLE[p.stage]}>{p.stage}</Badge></td>
                      <td className="td text-right text-slate-600 dark:text-slate-300">{p.days} days</td>
                      <td className="td text-right font-semibold">{p.balance ? inr(p.balance) : <span className="text-emerald-600">Paid</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section icon={Droplets} title="Where project money leaks" subtitle="Patterns that quietly cost you money">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaks.map((l) => (
                <Link key={l.title} to={l.to} className="flex items-center gap-3 px-5 py-4 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold", l.count ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10")}>{l.count}</span>
                  <span className="flex-1 text-slate-700 dark:text-slate-300">{l.title}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{l.amount ? compactInr(l.amount) : "—"}</span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </Section>
        </div>
      )}

      {money && (
        <Section icon={Building2} title="Branches" subtitle="Does each office pay for itself?">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{["Branch", "Projects", "Deal value", "Received", "Owed", "Collected this month", "Collected last month", "Expenses last month", "Rent", "Paid for itself last month?"].map((h, i) => <th key={h} className={cx("th", i > 0 && i < 9 && "text-right")}>{h}</th>)}</tr></thead>
              <tbody>
                {m.branches.map((b) => {
                  const ok = b.cLast >= b.expLast;
                  return (
                    <tr key={b.b} className="tr">
                      <td className="td font-semibold text-slate-800 dark:text-slate-100">{b.b}</td>
                      <td className="td text-right">{b.projects}</td>
                      <td className="td text-right">{compactInr(b.deal)}</td>
                      <td className="td text-right"><p>{compactInr(b.received)}</p><Progress className="ml-auto mt-1 w-20" value={b.deal ? (b.received / b.deal) * 100 : 0} tone="bg-emerald-500" /></td>
                      <td className="td text-right text-rose-600">{compactInr(b.owed)}</td>
                      <td className="td text-right">{compactInr(b.cThis)}</td>
                      <td className="td text-right">{compactInr(b.cLast)}</td>
                      <td className="td text-right">{compactInr(b.expLast)}</td>
                      <td className="td text-right">{compactInr(b.rent)}</td>
                      <td className="td">{ok ? <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Yes</Badge> : <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><XCircle className="h-3.5 w-3.5" />No — short {compactInr(b.expLast - b.cLast)}</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Data hygiene */}
      <Section icon={ShieldCheck} title="Can you trust these numbers?" subtitle="Fix these so every report stays accurate">
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {hygiene.map((h) => (
            <Link key={h.label} to={h.to} className={cx("flex items-center gap-3 rounded-xl border p-4 transition hover:shadow-card", h.n ? "border-amber-200 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5" : "border-slate-200 dark:border-slate-800")}>
              <span className={cx("text-2xl font-bold", h.n ? "text-amber-600" : "text-emerald-600")}>{h.n}</span>
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{h.label}</span>
              {h.n ? <ArrowUpRight className="h-4 w-4 text-slate-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            </Link>
          ))}
        </div>
      </Section>

      <Modal open={!!targets} onClose={() => setTargets(null)} title="Targets and salary" subtitle="Used for the salary-cover card and target tracking." size="sm"
        footer={<><Button variant="secondary" onClick={() => setTargets(null)}>Cancel</Button><Button onClick={saveTargets}>Save</Button></>}>
        {targets && (
          <div className="space-y-4">
            <Field label="Monthly salary bill (₹)" hint="Total net salaries paid every month"><Input type="number" min="0" value={targets.salaryBill} onChange={(e) => setTargets((t) => ({ ...t, salaryBill: e.target.value }))} /></Field>
            <Field label="Salary payday (day of month)" hint="1–28"><Input type="number" min="1" max="28" value={targets.payday} onChange={(e) => setTargets((t) => ({ ...t, payday: e.target.value }))} /></Field>
            <Field label={`Revenue target — ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })} (₹)`}><Input type="number" min="0" value={targets.revenue} onChange={(e) => setTargets((t) => ({ ...t, revenue: e.target.value }))} /></Field>
            <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60"><Users className="h-3.5 w-3.5" />Last month collected {inr(m.cLast)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
