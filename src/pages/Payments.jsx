import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Wallet, Clock, AlertTriangle, CalendarClock, IndianRupee, MessageCircle, Download, Plus, Pencil, Trash2, Repeat, CheckCircle2, Eye, CreditCard } from "lucide-react";
import { useStore, invoicePaid } from "../store/store";
import { useToast } from "../components/ui/Toast";
import { Button, Card, CardHeader, PageHeader, StatCard, Tabs, SearchInput, Select, Badge, Menu, EmptyState, Pagination, usePaged, useConfirm, Modal, Field, Input, Toggle, cx } from "../components/ui";
import { PAYMENT_MODES, DOC_STATUS_STYLE } from "../config/constants";
import { inr, compactInr, fmtDate, todayISO, toISO, addDays, downloadCSV, daysBetween, lastMonths, monthKey, monthLabel } from "../utils/format";
import { docTotal, invoiceStatus, whatsappLink, reminderText } from "./docs/docUtils";
import RecordPaymentModal from "./docs/RecordPayment";
import FinanceGuide from "./finance/FinanceGuide";

const CYCLE_DAYS = { Monthly: 1, Quarterly: 3, Yearly: 12 };
const advance = (iso, cycle) => { const d = new Date(`${iso}T00:00:00`); d.setMonth(d.getMonth() + (CYCLE_DAYS[cycle] || 1)); return toISO(d); };

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-semibold text-slate-500">{label}</p>
      {payload.map((p) => <p key={p.dataKey} className="font-bold text-slate-900 dark:text-white">{inr(p.value)}</p>)}
    </div>
  );
}

const BUCKETS = [
  { key: "current", label: "Not yet due", tone: "bg-sky-500" },
  { key: "0-30", label: "0–30 days", tone: "bg-amber-400" },
  { key: "31-60", label: "31–60 days", tone: "bg-orange-500" },
  { key: "61-90", label: "61–90 days", tone: "bg-rose-500" },
  { key: "90+", label: "90+ days", tone: "bg-rose-700" },
];
const bucketOf = (due, today) => {
  if (!due || due >= today) return "current";
  const d = daysBetween(due, today);
  return d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : "90+";
};

export default function Payments() {
  const { db, add, update, remove } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const today = todayISO();
  const [tab, setTab] = useState("receivables");
  const [payId, setPayId] = useState(null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");
  const [recEdit, setRecEdit] = useState(null);

  const live = useMemo(() => db.invoices.filter((i) => i.status !== "Cancelled"), [db.invoices]);

  const receivables = useMemo(() => live
    .map((inv) => ({ inv, total: docTotal(inv), paid: invoicePaid(inv), status: invoiceStatus(inv) }))
    .map((r) => ({ ...r, balance: Math.max(0, r.total - r.paid), bucket: bucketOf(r.inv.dueDate, today) }))
    .filter((r) => r.balance > 0 && r.status !== "Draft")
    .sort((a, b) => (a.inv.dueDate || "").localeCompare(b.inv.dueDate || "")), [live, today]);

  const history = useMemo(() => live.flatMap((inv) => (inv.payments || []).map((p) => ({ ...p, inv })))
    .sort((a, b) => (b.date || "").localeCompare(a.date || "")), [live]);

  const kpi = useMemo(() => {
    const m = today.slice(0, 7);
    const in30 = addDays(today, 30);
    const recurringDue = db.recurring.filter((r) => r.status === "Active" && r.nextDue <= in30).reduce((s, r) => s + Number(r.amount || 0), 0);
    return {
      month: history.filter((p) => monthKey(p.date) === m).reduce((s, p) => s + Number(p.amount), 0),
      monthCount: history.filter((p) => monthKey(p.date) === m).length,
      outstanding: receivables.reduce((s, r) => s + r.balance, 0),
      overdue: receivables.filter((r) => r.bucket !== "current").reduce((s, r) => s + r.balance, 0),
      overdueCount: receivables.filter((r) => r.bucket !== "current").length,
      expected: receivables.filter((r) => r.inv.dueDate <= in30).reduce((s, r) => s + r.balance, 0) + recurringDue,
    };
  }, [history, receivables, db.recurring, today]);

  const chart = useMemo(() => lastMonths(6).map((k) => ({
    month: monthLabel(k), amount: history.filter((p) => monthKey(p.date) === k).reduce((s, p) => s + Number(p.amount), 0),
  })), [history]);

  const ageing = useMemo(() => {
    const tot = receivables.reduce((s, r) => s + r.balance, 0) || 1;
    return BUCKETS.map((b) => { const amt = receivables.filter((r) => r.bucket === b.key).reduce((s, r) => s + r.balance, 0); return { ...b, amt, pct: (amt / tot) * 100 }; });
  }, [receivables]);

  const histRows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return history.filter((p) => !mode || p.mode === mode).filter((p) => !s || [p.inv.number, p.inv.client.company, p.inv.client.name, p.ref].some((v) => String(v || "").toLowerCase().includes(s)));
  }, [history, q, mode]);
  const histPaged = usePaged(histRows, 12);
  const recvPaged = usePaged(receivables, 10);

  const remind = (inv) => window.open(whatsappLink(inv.client.phone, reminderText(inv, db.settings.company.name)), "_blank");
  const collect = (r) => {
    update("recurring", r.id, { nextDue: advance(r.nextDue, r.cycle), lastCollected: today });
    toast(`${inr(r.amount)} collected from ${r.client}. Next due ${fmtDate(advance(r.nextDue, r.cycle))}`);
  };
  const delRec = async (r) => {
    if (await confirm({ title: "Delete recurring service?", message: `${r.service} for ${r.client} will be removed.` })) { remove("recurring", r.id); toast("Recurring service deleted"); }
  };

  const recurringMRR = db.recurring.filter((r) => r.status === "Active").reduce((s, r) => s + Number(r.amount) / (CYCLE_DAYS[r.cycle] || 1), 0);
  const payInv = db.invoices.find((x) => x.id === payId) || null;

  return (
    <div>
      <PageHeader title="Payments & Collections" subtitle="Step 2 · Who owes you money, what's coming in soon, and what you've already received."
        actions={<Button variant="secondary" icon={Eye} onClick={() => nav("/invoices")}>View invoices</Button>} />
      <FinanceGuide />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Received this month" value={compactInr(kpi.month)} icon={Wallet} tone="emerald" sub={`${kpi.monthCount} payments`} />
        <StatCard label="Still to collect" value={compactInr(kpi.outstanding)} icon={Clock} tone="amber" sub={`${receivables.length} open invoices`} />
        <StatCard label="Late payments" value={compactInr(kpi.overdue)} icon={AlertTriangle} tone="rose" sub={`${kpi.overdueCount} past due date`} />
        <StatCard label="Coming in next 30 days" value={compactInr(kpi.expected)} icon={CalendarClock} tone="sky" sub="incl. recurring services" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Monthly collections" subtitle="Payments received over the last 6 months" />
          <div className="h-64 px-2 pb-4 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--brand-500))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="rgb(var(--brand-500))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / .2)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={compactInr} width={60} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: "rgb(var(--brand-400))", strokeDasharray: 4 }} />
                <Area type="monotone" dataKey="amount" stroke="rgb(var(--brand-600))" strokeWidth={2.5} fill="url(#colGrad)" dot={{ r: 3, fill: "rgb(var(--brand-600))" }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Receivables ageing" subtitle={`${inr(kpi.outstanding)} outstanding`} />
          <div className="p-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              {ageing.filter((b) => b.amt > 0).map((b) => <div key={b.key} className={b.tone} style={{ width: `${b.pct}%` }} title={`${b.label}: ${inr(b.amt)}`} />)}
            </div>
            <div className="mt-5 space-y-3">
              {ageing.map((b) => (
                <div key={b.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className={cx("h-2.5 w-2.5 rounded-full", b.tone)} />{b.label}</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{inr(b.amt)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <Tabs value={tab} onChange={setTab} className="lg:flex-1" tabs={[
            { value: "receivables", label: "Receivables", count: receivables.length },
            { value: "history", label: "Payment history", count: history.length },
            { value: "recurring", label: "Recurring services", count: db.recurring.length },
          ]} />
          {tab === "history" && (
            <div className="flex gap-2">
              <SearchInput value={q} onChange={setQ} placeholder="Search client, invoice, ref…" className="w-full lg:w-60" />
              <Select value={mode} onChange={(e) => setMode(e.target.value)} options={PAYMENT_MODES} placeholder="All modes" className="w-36" />
              <Button variant="secondary" icon={Download} onClick={() => downloadCSV(`payments-${today}.csv`, histRows, [
                { label: "Date", key: "date" }, { label: "Client", value: (r) => r.inv.client.company || r.inv.client.name }, { label: "Invoice", value: (r) => r.inv.number },
                { label: "Mode", key: "mode" }, { label: "Reference", key: "ref" }, { label: "Amount", key: "amount" },
              ])}>CSV</Button>
            </div>
          )}
          {tab === "recurring" && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">MRR <b className="text-slate-900 dark:text-white">{inr(recurringMRR)}</b></span>
              <Button icon={Plus} onClick={() => setRecEdit({})}>Add service</Button>
            </div>
          )}
        </div>

        {tab === "receivables" && (receivables.length === 0 ? <EmptyState icon={CheckCircle2} title="All caught up!" text="No outstanding invoices right now." /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="th">Invoice</th><th className="th">Client</th><th className="th">Due date</th><th className="th">Ageing</th><th className="th text-right">Total</th><th className="th text-right">Balance</th><th className="th">Status</th><th className="th" /></tr></thead>
                <tbody>
                  {recvPaged.slice.map((r) => {
                    const b = BUCKETS.find((x) => x.key === r.bucket);
                    return (
                      <tr key={r.inv.id} className="tr">
                        <td className="td font-semibold text-slate-900 dark:text-white">{r.inv.number}</td>
                        <td className="td"><p className="font-medium">{r.inv.client.company || r.inv.client.name}</p><p className="text-xs text-slate-400">{r.inv.client.phone}</p></td>
                        <td className={cx("td", r.bucket !== "current" ? "font-semibold text-rose-600" : "text-slate-500")}>{fmtDate(r.inv.dueDate)}</td>
                        <td className="td"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"><span className={cx("h-2 w-2 rounded-full", b.tone)} />{r.bucket === "current" ? `Due in ${daysBetween(today, r.inv.dueDate)}d` : `${daysBetween(r.inv.dueDate, today)}d overdue`}</span></td>
                        <td className="td text-right tabular-nums">{inr(r.total)}</td>
                        <td className="td text-right font-bold tabular-nums text-slate-900 dark:text-white">{inr(r.balance)}</td>
                        <td className="td"><Badge className={DOC_STATUS_STYLE[r.status]}>{r.status}</Badge></td>
                        <td className="td">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="secondary" icon={MessageCircle} onClick={() => remind(r.inv)}>Remind</Button>
                            <Button size="sm" variant="soft" icon={IndianRupee} onClick={() => setPayId(r.inv.id)}>Record</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={recvPaged.page} pages={recvPaged.pages} onPage={recvPaged.setPage} total={recvPaged.total} perPage={recvPaged.perPage} />
          </>
        ))}

        {tab === "history" && (histRows.length === 0 ? <EmptyState icon={CreditCard} title="No payments found" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="th">Date</th><th className="th">Client</th><th className="th">Invoice</th><th className="th">Mode</th><th className="th">Reference</th><th className="th text-right">Amount</th></tr></thead>
                <tbody>
                  {histPaged.slice.map((p) => (
                    <tr key={`${p.inv.id}-${p.id}`} className="tr cursor-pointer" onClick={() => nav(`/invoices?open=${p.inv.id}`)}>
                      <td className="td text-slate-500">{fmtDate(p.date)}</td>
                      <td className="td font-medium">{p.inv.client.company || p.inv.client.name}</td>
                      <td className="td text-brand-600 dark:text-brand-300">{p.inv.number}</td>
                      <td className="td"><Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{p.mode}</Badge></td>
                      <td className="td text-xs text-slate-500">{p.ref || "—"}</td>
                      <td className="td text-right font-bold tabular-nums text-emerald-600">+ {inr(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={histPaged.page} pages={histPaged.pages} onPage={histPaged.setPage} total={histPaged.total} perPage={histPaged.perPage} />
          </>
        ))}

        {tab === "recurring" && (db.recurring.length === 0 ? <EmptyState icon={Repeat} title="No recurring services" text="Track AMC, SEO retainers and hosting renewals here." action={<Button icon={Plus} onClick={() => setRecEdit({})}>Add service</Button>} /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Client</th><th className="th">Service</th><th className="th">Cycle</th><th className="th text-right">Amount</th><th className="th">Next due</th><th className="th">Active</th><th className="th" /></tr></thead>
              <tbody>
                {[...db.recurring].sort((a, b) => a.nextDue.localeCompare(b.nextDue)).map((r) => {
                  const late = r.status === "Active" && r.nextDue < today;
                  return (
                    <tr key={r.id} className="tr">
                      <td className="td font-semibold text-slate-900 dark:text-white">{r.client}</td>
                      <td className="td">{r.service}</td>
                      <td className="td"><Badge className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{r.cycle}</Badge></td>
                      <td className="td text-right font-bold tabular-nums">{inr(r.amount)}</td>
                      <td className={cx("td", late ? "font-semibold text-rose-600" : "text-slate-500")}>{fmtDate(r.nextDue)}{late && <span className="ml-1.5 text-[11px]">({daysBetween(r.nextDue, today)}d late)</span>}</td>
                      <td className="td"><Toggle checked={r.status === "Active"} onChange={(v) => { update("recurring", r.id, { status: v ? "Active" : "Paused" }); toast(`${r.service} ${v ? "resumed" : "paused"}`, "info"); }} /></td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          {r.status === "Active" && <Button size="sm" variant="soft" icon={CheckCircle2} onClick={() => collect(r)}>Mark collected</Button>}
                          <Menu items={[{ label: "Edit", icon: Pencil, onClick: () => setRecEdit(r) }, { label: "Delete", icon: Trash2, danger: true, onClick: () => delRec(r) }]} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </Card>

      <RecordPaymentModal invoice={payInv} onClose={() => setPayId(null)} />
      <RecurringModal rec={recEdit} onClose={() => setRecEdit(null)} onSave={(data) => {
        if (recEdit?.id) { update("recurring", recEdit.id, data); toast("Recurring service updated"); }
        else { add("recurring", { ...data, startDate: today }, "R"); toast("Recurring service added"); }
        setRecEdit(null);
      }} />
    </div>
  );
}

function RecurringModal({ rec, onClose, onSave }) {
  const { db } = useStore();
  const [f, setF] = useState({});
  const [err, setErr] = useState("");
  const open = !!rec;
  const [lastRec, setLastRec] = useState(null);
  if (rec !== lastRec) {
    setLastRec(rec);
    setF({ client: "", service: "SEO Retainer", amount: "", cycle: "Monthly", nextDue: addDays(todayISO(), 7), status: "Active", ...(rec || {}) });
    setErr("");
  }
  const clients = [...new Set([...db.projects.map((p) => p.client), ...db.leads.filter((l) => l.stage === "Won").map((l) => l.company)])].sort();
  const save = () => {
    if (!f.client?.trim() || !f.service?.trim() || !(Number(f.amount) > 0)) return setErr("Client, service and a valid amount are required");
    onSave({ client: f.client.trim(), service: f.service.trim(), amount: Number(f.amount), cycle: f.cycle, nextDue: f.nextDue, status: f.status });
  };
  return (
    <Modal open={open} onClose={onClose} title={rec?.id ? "Edit recurring service" : "Add recurring service"} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Client" required className="col-span-2">
          <Input list="rec-clients" value={f.client || ""} onChange={(e) => setF({ ...f, client: e.target.value })} placeholder="Client / company" />
          <datalist id="rec-clients">{clients.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Service" required className="col-span-2">
          <Input list="rec-services" value={f.service || ""} onChange={(e) => setF({ ...f, service: e.target.value })} />
          <datalist id="rec-services">{["SEO Retainer", "Google Ads Management", "Hosting & AMC", "Social Media Management", "Website Maintenance"].map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Amount (₹)" required><Input type="number" value={f.amount ?? ""} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Billing cycle"><Select options={["Monthly", "Quarterly", "Yearly"]} value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value })} /></Field>
        <Field label="Next due date"><Input type="date" value={f.nextDue || ""} onChange={(e) => setF({ ...f, nextDue: e.target.value })} /></Field>
        <Field label="Status"><Select options={["Active", "Paused"]} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} /></Field>
      </div>
      {err && <p className="mt-3 text-sm font-medium text-rose-600">{err}</p>}
    </Modal>
  );
}
