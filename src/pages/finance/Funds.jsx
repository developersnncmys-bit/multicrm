// Reserve Funds — money set aside so the business never runs dry.
// Four buckets with targets calculated from your own numbers (Settings → Fund rules):
//   Operating Buffer = N months of average expenses
//   Emergency Fund   = X% of last 12 months' collections
//   Tax Reserve      = Y% of last 12 months' profit (collections − expenses)
//   Growth Fund      = Z% of last 12 months' profit
import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PiggyBank, ShieldCheck, Landmark, Rocket, Wallet, Plus, Minus, Settings2, Trash2, Download } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, CardHeader, PageHeader, Badge, Modal, Field, Input, Select, Progress, EmptyState, useConfirm, cx } from "../../components/ui";
import { inr, compactInr, fmtDate, todayISO, monthKey, monthLabel, lastMonths, downloadCSV } from "../../utils/format";
import { allPayments, sumBy } from "../owner/ownerData";
import FinanceGuide from "./FinanceGuide";

const FUNDS = [
  { key: "Operating Buffer", icon: Wallet, color: "#6366f1", why: "Pays salaries & rent if collections stop" },
  { key: "Emergency Fund", icon: ShieldCheck, color: "#f43f5e", why: "Sudden repairs, legal, equipment" },
  { key: "Tax Reserve", icon: Landmark, color: "#f59e0b", why: "Advance tax & GST without stress" },
  { key: "Growth Fund", icon: Rocket, color: "#10b981", why: "Hiring, marketing, new branch" },
];
const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 };

export default function Funds() {
  const { db, add, remove, setSettings } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(null);
  const [rules, setRules] = useState(null);
  const [filter, setFilter] = useState("");
  const txns = db.fundTxns || [];
  const fin = { cogsPct: 35, taxPct: 25, opBufferMonths: 3, emergencyPct: 5, growthPct: 20, ...(db.settings.financial || {}) };

  // Last-12-month money picture
  const months = lastMonths(12);
  const pays = useMemo(() => allPayments(db), [db]);
  const collected = sumBy(pays.filter((p) => months.includes(monthKey(p.date))), "amount");
  const spent = sumBy((db.expenses || []).filter((e) => e.status !== "Pending" && months.includes(monthKey(e.date))), "amount");
  const avgMonthlyExp = Math.round(sumBy((db.expenses || []).filter((e) => lastMonths(3).includes(monthKey(e.date))), "amount") / 3);
  const profit = Math.max(0, collected - spent);
  const target = {
    "Operating Buffer": avgMonthlyExp * fin.opBufferMonths,
    "Emergency Fund": Math.round((collected * fin.emergencyPct) / 100),
    "Tax Reserve": Math.round((profit * fin.taxPct) / 100),
    "Growth Fund": Math.round((profit * fin.growthPct) / 100),
  };
  const bal = (f, upto) => sumBy(txns.filter((t) => t.fund === f && (!upto || t.date <= upto)), (t) => (t.type === "Deposit" ? 1 : -1) * Number(t.amount));
  const total = FUNDS.reduce((a, f) => a + bal(f.key), 0);
  const totalTarget = Object.values(target).reduce((a, b) => a + b, 0);
  const runway = avgMonthlyExp ? (total / avgMonthlyExp).toFixed(1) : "—";

  const trend = months.map((m) => {
    const end = `${m}-31`;
    const row = { month: monthLabel(m) };
    FUNDS.forEach((f) => { row[f.key] = bal(f.key, end); });
    return row;
  });
  const rows = txns.filter((t) => !filter || t.fund === filter).sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    const amt = Number(form.amount);
    if (!(amt > 0)) { toast("Enter an amount", "error"); return; }
    if (form.type === "Withdrawal" && amt > bal(form.fund)) { toast(`Only ${inr(bal(form.fund))} available in ${form.fund}`, "error"); return; }
    add("fundTxns", { ...form, amount: amt }, "ft");
    toast(`${form.type === "Deposit" ? "Added to" : "Withdrawn from"} ${form.fund}`); setForm(null);
  };

  return (
    <div>
      <PageHeader title="Reserve Funds" subtitle="Step 4 · Money you set aside so salaries, taxes and surprises never become a crisis."
        actions={<>
          <Button variant="secondary" icon={Settings2} onClick={() => setRules({ ...fin })}>Fund rules</Button>
          <Button variant="secondary" icon={Minus} onClick={() => setForm({ fund: FUNDS[0].key, type: "Withdrawal", amount: "", date: todayISO(), note: "" })}>Withdraw</Button>
          <Button icon={Plus} onClick={() => setForm({ fund: FUNDS[0].key, type: "Deposit", amount: "", date: todayISO(), note: "" })}>Add money</Button>
        </>} />

      <FinanceGuide />
      <Card className="mb-6 grid gap-6 p-6 md:grid-cols-3">
        <div><p className="text-sm text-slate-500">Total in reserves</p><p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{inr(total)}</p><p className="mt-1 text-xs text-slate-500">{Math.round((total / (totalTarget || 1)) * 100)}% of the {compactInr(totalTarget)} goal</p><Progress value={(total / (totalTarget || 1)) * 100} className="mt-2" /></div>
        <div><p className="text-sm text-slate-500">How long savings would last</p><p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{runway} <span className="text-base font-medium text-slate-400">months</span></p><p className="mt-1 text-xs text-slate-500">If no money came in, reserves cover expenses of {inr(avgMonthlyExp)}/month for this long.</p></div>
        <div><p className="text-sm text-slate-500">Last 12 months</p><p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Collected <b>{compactInr(collected)}</b> · Spent <b>{compactInr(spent)}</b></p><p className="text-sm text-slate-700 dark:text-slate-200">Profit <b className="text-emerald-600">{compactInr(profit)}</b></p><p className="mt-1 text-xs text-slate-400">Targets below are calculated from these numbers.</p></div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {FUNDS.map((f) => {
          const b = bal(f.key); const t = target[f.key]; const p = t ? Math.round((b / t) * 100) : 100;
          return (
            <Card key={f.key} className="p-5">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: f.color }}><f.icon className="h-[18px] w-[18px]" /></span><div><p className="font-semibold text-slate-900 dark:text-white">{f.key}</p><p className="text-xs text-slate-500">{f.why}</p></div></div>
              <p className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{inr(b)}</p>
              <p className="text-xs text-slate-500">Target {inr(t)}</p>
              <Progress value={p} className="mt-2" tone={p >= 100 ? "bg-emerald-500" : p >= 60 ? "bg-amber-500" : "bg-rose-500"} />
              <p className={cx("mt-1.5 text-xs font-semibold", p >= 100 ? "text-emerald-600" : "text-slate-500")}>{p >= 100 ? "✓ Fully funded" : `${inr(Math.max(0, t - b))} more needed · ${p}%`}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Reserves over 12 months" subtitle="Month-end balance per fund" />
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={compactInr} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={tooltipStyle} />
                {FUNDS.map((f) => <Area key={f.key} type="monotone" dataKey={f.key} stackId="1" stroke={f.color} fill={f.color} fillOpacity={0.25} />)}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHeader title="Transactions" action={<div className="flex gap-2"><Select value={filter} onChange={(e) => setFilter(e.target.value)} options={FUNDS.map((f) => f.key)} placeholder="All funds" className="!h-8 !w-36 !py-0 text-xs" /><Button size="sm" variant="ghost" icon={Download} onClick={() => downloadCSV("reserve-funds.csv", rows, [{ label: "Date", key: "date" }, { label: "Fund", key: "fund" }, { label: "Type", key: "type" }, { label: "Amount", key: "amount" }, { label: "Note", key: "note" }])} /></div>} />
          <div className="mt-3 max-h-80 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {rows.length === 0 && <EmptyState icon={PiggyBank} title="No transactions" />}
            {rows.map((t) => (
              <div key={t.id} className="group flex items-center gap-3 px-5 py-2.5">
                <span className="h-2 w-2 rounded-full" style={{ background: FUNDS.find((f) => f.key === t.fund)?.color }} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.note || t.type}</p><p className="text-xs text-slate-500">{t.fund} · {fmtDate(t.date)}</p></div>
                <span className={cx("text-sm font-bold", t.type === "Deposit" ? "text-emerald-600" : "text-rose-600")}>{t.type === "Deposit" ? "+" : "−"}{inr(t.amount)}</span>
                <button onClick={async () => { if (await confirm({ title: "Delete this entry?" })) remove("fundTxns", t.id); }} className="rounded p-1 text-slate-300 opacity-0 hover:text-rose-500 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.type === "Deposit" ? "Add money to a fund" : "Withdraw from a fund"} size="sm"
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button variant={form?.type === "Deposit" ? "primary" : "danger"} onClick={save}>{form?.type === "Deposit" ? "Add" : "Withdraw"}</Button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="Fund" hint={`Balance ${inr(bal(form.fund))}`}><Select value={form.fund} onChange={(e) => setForm({ ...form, fund: e.target.value })} options={FUNDS.map((f) => f.key)} /></Field>
            <Field label="Amount (₹)"><Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus /></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label={form.type === "Deposit" ? "Note" : "Reason (required for audit)"}><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={form.type === "Deposit" ? "Monthly allocation" : "e.g. Advance tax Q3"} /></Field>
          </div>
        )}
      </Modal>
      <Modal open={!!rules} onClose={() => setRules(null)} title="Fund rules" subtitle="How targets are calculated" size="sm"
        footer={<><Button variant="secondary" onClick={() => setRules(null)}>Cancel</Button><Button onClick={() => { setSettings("financial", Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, Number(v) || 0]))); toast("Rules saved"); setRules(null); }}>Save</Button></>}>
        {rules && (
          <div className="space-y-4">
            <Field label="Operating buffer — months of expenses"><Input type="number" value={rules.opBufferMonths} onChange={(e) => setRules({ ...rules, opBufferMonths: e.target.value })} /></Field>
            <Field label="Emergency fund — % of yearly collections"><Input type="number" value={rules.emergencyPct} onChange={(e) => setRules({ ...rules, emergencyPct: e.target.value })} /></Field>
            <Field label="Tax reserve — % of profit"><Input type="number" value={rules.taxPct} onChange={(e) => setRules({ ...rules, taxPct: e.target.value })} /></Field>
            <Field label="Growth fund — % of profit"><Input type="number" value={rules.growthPct} onChange={(e) => setRules({ ...rules, growthPct: e.target.value })} /></Field>
            <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800">Tip: most small businesses keep 3–6 months of expenses as buffer.</Badge>
          </div>
        )}
      </Modal>
    </div>
  );
}
