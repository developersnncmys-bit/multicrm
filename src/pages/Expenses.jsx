import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Plus, Download, Pencil, Trash2, Wallet, Clock, Layers, TrendingUp, Repeat, ChevronLeft, ChevronRight, Building2, CheckCircle2, AlertCircle, Settings2 } from "lucide-react";
import { useStore } from "../store/store";
import { useToast } from "../components/ui/Toast";
import { Button, Card, CardHeader, PageHeader, StatCard, Modal, Field, Input, Select, SearchInput, Badge, EmptyState, Pagination, usePaged, useConfirm, cx } from "../components/ui";
import { BRANCHES, EXPENSE_CATEGORIES, PAYMENT_MODES, DOC_STATUS_STYLE } from "../config/constants";
import { inr, compactInr, fmtDate, todayISO, monthKey, monthLabel, lastMonths, downloadCSV, toISO } from "../utils/format";
import FinanceGuide from "./finance/FinanceGuide";

export const CAT_COLORS = {
  Rent: "#6366f1", Salary: "#0ea5e9", Electricity: "#f59e0b", Internet: "#14b8a6", "Software & Tools": "#8b5cf6",
  Marketing: "#f43f5e", Travel: "#f97316", "Office Supplies": "#84cc16", Maintenance: "#64748b", Other: "#a1a1aa",
};
const BRANCH_COLORS = ["#6366f1", "#0ea5e9", "#f59e0b"];

const empty = () => ({ date: todayISO(), category: "Other", description: "", vendor: "", amount: "", mode: "UPI", branch: BRANCHES[0], status: "Paid", recurring: false, paidBy: "", employeeName: "", notes: "" });

const DEFAULT_RENT = { Bangalore: 45000, Mysore: 22000, Mumbai: 60000 };
// Branch rent config lives in settings.branches (shared with Settings → Branch & Rent); fall back to sensible defaults
export function branchConfig(settings) {
  const list = Array.isArray(settings?.branches) && settings.branches.length ? settings.branches : BRANCHES.map((name) => ({ name, rent: DEFAULT_RENT[name] || 0, dueDay: 5, notes: "" }));
  return list.map((b) => (typeof b === "string" ? { name: b, rent: DEFAULT_RENT[b] || 0, dueDay: 5, notes: "" } : { rent: 0, dueDay: 5, notes: "", ...b }));
}
const shiftMonth = (m, n) => { const d = new Date(`${m}-01T00:00:00`); d.setMonth(d.getMonth() + n); return toISO(d).slice(0, 7); };

const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px -8px rgb(0 0 0 / .15)" };

export default function Expenses() {
  const { db, add, update, remove, setSettings } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [branch, setBranch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [rentEdit, setRentEdit] = useState(null);
  const branchesCfg = branchConfig(db.settings);

  useEffect(() => {
    if (params.get("new")) { setForm(empty()); params.delete("new"); setParams(params, { replace: true }); }
  }, [params, setParams]);

  const inMonth = useMemo(() => db.expenses.filter((e) => monthKey(e.date) === month && (!branch || e.branch === branch)), [db.expenses, month, branch]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return inMonth
      .filter((e) => (!category || e.category === category) && (!status || e.status === status))
      .filter((e) => !s || [e.description, e.vendor, e.category, e.mode].some((v) => String(v || "").toLowerCase().includes(s)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [inMonth, category, status, q]);
  const pg = usePaged(rows, 12);

  // KPIs
  const prevMonth = useMemo(() => { const d = new Date(`${month}-01T00:00:00`); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }, [month]);
  const sum = (arr) => arr.reduce((s, e) => s + Number(e.amount || 0), 0);
  const thisTotal = sum(inMonth);
  const prevTotal = sum(db.expenses.filter((e) => monthKey(e.date) === prevMonth && (!branch || e.branch === branch)));
  const delta = prevTotal ? Math.round(((thisTotal - prevTotal) / prevTotal) * 100) : null;
  const pending = inMonth.filter((e) => e.status === "Pending");
  const byCat = useMemo(() => {
    const m = {};
    inMonth.forEach((e) => { m[e.category] = (m[e.category] || 0) + Number(e.amount || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [inMonth]);
  const months6 = lastMonths(6);
  const trend = useMemo(() => months6.map((m) => {
    const row = { month: monthLabel(m) };
    BRANCHES.forEach((b) => { row[b] = sum(db.expenses.filter((e) => monthKey(e.date) === m && e.branch === b)); });
    return row;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [db.expenses]);
  const avgMonthly = Math.round(months6.reduce((s, m) => s + sum(db.expenses.filter((e) => monthKey(e.date) === m && (!branch || e.branch === branch))), 0) / months6.length);

  const rentRows = branchesCfg.map((b) => {
    const paid = db.expenses.filter((e) => e.category === "Rent" && e.branch === b.name && monthKey(e.date) === month);
    const paidAmt = sum(paid.filter((e) => e.status === "Paid"));
    const dueDate = `${month}-${String(Math.min(28, Number(b.dueDay) || 5)).padStart(2, "0")}`;
    const isPaid = paidAmt > 0 && paidAmt >= (Number(b.rent) || 0);
    return { ...b, paidAmt, isPaid, dueDate, late: !isPaid && dueDate < todayISO(), pendingRec: paid.find((e) => e.status === "Pending") };
  });
  const rentTotal = rentRows.reduce((s, b) => s + (Number(b.rent) || 0), 0);
  const rentDue = rentRows.filter((b) => !b.isPaid).reduce((s, b) => s + Math.max(0, (Number(b.rent) || 0) - b.paidAmt), 0);
  const payRent = (b) => {
    if (b.pendingRec) update("expenses", b.pendingRec.id, { status: "Paid" });
    else add("expenses", { date: month === todayISO().slice(0, 7) ? todayISO() : b.dueDate, category: "Rent", description: `Office rent — ${b.name}`, vendor: "Landlord", amount: Math.max(0, (Number(b.rent) || 0) - b.paidAmt), mode: "Bank Transfer", branch: b.name, status: "Paid", recurring: true, paidBy: "", employeeName: "", notes: "" }, "X");
    toast(`Rent for ${b.name} marked paid`);
  };
  const saveRent = () => {
    const next = branchesCfg.map((b) => (b.name === rentEdit.name ? { ...b, rent: Number(rentEdit.rent) || 0, dueDay: Math.min(28, Math.max(1, Number(rentEdit.dueDay) || 1)), notes: rentEdit.notes } : b));
    setSettings("branches", next);
    toast(`Rent settings saved for ${rentEdit.name}`);
    setRentEdit(null);
  };

  const save = () => {
    const err = {};
    if (!form.description.trim()) err.description = "Description is required";
    if (!(Number(form.amount) > 0)) err.amount = "Enter an amount greater than 0";
    if (!form.date) err.date = "Pick a date";
    setErrors(err);
    if (Object.keys(err).length) return;
    const rec = { ...form, amount: Number(form.amount) };
    if (form.id) { update("expenses", form.id, rec); toast("Expense updated"); }
    else { add("expenses", rec, "X"); toast("Expense added"); }
    setForm(null);
  };

  const del = async (e) => {
    if (await confirm({ title: "Delete expense?", message: `“${e.description}” (${inr(e.amount)}) will be removed permanently.` })) {
      remove("expenses", e.id); toast("Expense deleted");
    }
  };

  const exportCSV = () => downloadCSV(`expenses-${month}.csv`, rows, [
    { label: "Date", key: "date" }, { label: "Description", key: "description" }, { label: "Vendor", key: "vendor" }, { label: "Category", key: "category" },
    { label: "Branch", key: "branch" }, { label: "Mode", key: "mode" }, { label: "Paid by", key: "paidBy" }, { label: "Employee", key: "employeeName" }, { label: "Amount", key: "amount" }, { label: "Status", key: "status" },
  ]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Step 3 · Every rupee going out — rent, salaries, tools and more. Use the arrows to change month."
        actions={<>
          <div className="flex items-center rounded-lg border border-slate-300/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" title="Previous month"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-[92px] text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
            <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" title="Next month"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <Button variant="secondary" icon={Download} onClick={exportCSV}>Export</Button>
          <Button icon={Plus} onClick={() => { setErrors({}); setForm(empty()); }}>Add Expense</Button>
        </>} />

      <FinanceGuide />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Spent in ${monthLabel(month)}`} value={inr(thisTotal)} icon={Wallet} tone="brand" delta={delta} deltaLabel="vs last month" />
        <StatCard label="Bills you still have to pay" value={inr(sum(pending))} icon={Clock} tone="amber" sub={`${pending.length} bill${pending.length === 1 ? "" : "s"} to pay`} onClick={() => setStatus("Pending")} />
        <StatCard label="Biggest cost" value={byCat[0]?.name || "—"} icon={Layers} tone="violet" sub={byCat[0] ? `${inr(byCat[0].value)} · ${Math.round((byCat[0].value / (thisTotal || 1)) * 100)}% of spend` : "No spend yet"} />
        <StatCard label="Average per month" value={compactInr(avgMonthly)} icon={TrendingUp} tone="sky" sub={branch || "All branches"} />
      </div>

      {/* Rent status for every office */}
      <Card className="mb-6">
        <CardHeader title="Office rent status" subtitle={`${monthLabel(month)} · total rent ${inr(rentTotal)} · ${rentDue ? `${inr(rentDue)} yet to be paid` : "all offices paid"}`} />
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {rentRows.map((b) => (
            <div key={b.name} className={cx("rounded-xl border p-4", b.isPaid ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5" : b.late ? "border-rose-200 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-500/5" : "border-slate-200 dark:border-slate-800")}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm dark:bg-slate-800"><Building2 className="h-4 w-4" /></span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{b.name}</p>
                    <p className="text-xs text-slate-500">Due on day {b.dueDay} · {fmtDate(b.dueDate)}</p>
                  </div>
                </div>
                <button onClick={() => setRentEdit({ ...b })} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-600 dark:hover:bg-slate-800" title="Edit rent"><Settings2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{inr(b.rent)}</p>
                  {b.notes && <p className="max-w-[180px] truncate text-xs text-slate-500" title={b.notes}>{b.notes}</p>}
                </div>
                {b.isPaid ? (
                  <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Paid</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={cx("chip", b.late ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300")}><AlertCircle className="h-3.5 w-3.5" />{b.late ? "Late" : "Unpaid"}</span>
                    <Button size="sm" variant="soft" onClick={() => payRent(b)}>Mark paid</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader title="Spend by category" subtitle={monthLabel(month)} />
          {byCat.length === 0 ? <EmptyState title="No expenses this month" /> : (
            <div className="flex flex-col items-center gap-4 p-5 sm:flex-row">
              <div className="relative h-48 w-48 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                      {byCat.map((c) => <Cell key={c.name} fill={CAT_COLORS[c.name] || "#94a3b8"} />)}
                    </Pie>
                    <Tooltip formatter={(v) => inr(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] text-slate-500">Total</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">{compactInr(thisTotal)}</span>
                </div>
              </div>
              <ul className="w-full space-y-2">
                {byCat.slice(0, 7).map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLORS[c.name] || "#94a3b8" }} />
                    <span className="flex-1 truncate text-slate-600 dark:text-slate-300">{c.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{compactInr(c.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader title="Last 6 months by branch" subtitle="Stacked monthly spend" />
          <div className="h-64 p-3 pr-5">
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ top: 10, left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
                <YAxis tickFormatter={compactInr} tickLine={false} axisLine={false} fontSize={11} stroke="#94a3b8" width={60} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={tooltipStyle} cursor={{ fill: "#94a3b81a" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {BRANCHES.map((b, i) => <Bar key={b} dataKey={b} stackId="a" fill={BRANCH_COLORS[i]} radius={i === BRANCHES.length - 1 ? [6, 6, 0, 0] : 0} maxBarSize={44} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search description, vendor…" className="lg:w-72" />
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="input" />
            <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={BRANCHES} placeholder="All branches" />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} options={EXPENSE_CATEGORIES} placeholder="All categories" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} options={["Paid", "Pending"]} placeholder="Any status" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Wallet} title="No expenses found" text="Try a different month or clear the filters." action={<Button icon={Plus} onClick={() => setForm(empty())}>Add Expense</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className="th">Date</th><th className="th">Description</th><th className="th">Category</th><th className="th">Branch</th><th className="th">Mode</th><th className="th text-right">Amount</th><th className="th">Status</th><th className="th" />
                </tr></thead>
                <tbody>
                  {pg.slice.map((e) => (
                    <tr key={e.id} className="tr">
                      <td className="td text-slate-500">{fmtDate(e.date)}</td>
                      <td className="td">
                        <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">{e.description}{e.recurring && <Repeat className="h-3.5 w-3.5 text-brand-500" title="Recurring monthly" />}</p>
                        {(e.vendor || e.employeeName || e.paidBy) && <p className="text-xs text-slate-500">{[e.vendor, e.employeeName && `Employee: ${e.employeeName}`, e.paidBy && `Paid by ${e.paidBy}`].filter(Boolean).join(" · ")}</p>}
                      </td>
                      <td className="td"><Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><span className="h-1.5 w-1.5 rounded-full" style={{ background: CAT_COLORS[e.category] || "#94a3b8" }} />{e.category}</Badge></td>
                      <td className="td text-slate-600 dark:text-slate-300">{e.branch}</td>
                      <td className="td text-slate-600 dark:text-slate-300">{e.mode}</td>
                      <td className="td text-right font-bold text-slate-900 dark:text-white">{inr(e.amount)}</td>
                      <td className="td">
                        <button onClick={() => { update("expenses", e.id, { status: e.status === "Paid" ? "Pending" : "Paid" }); toast(`Marked as ${e.status === "Paid" ? "Pending" : "Paid"}`); }}
                          title="Click to toggle" className={cx("chip transition hover:opacity-80", DOC_STATUS_STYLE[e.status])}>{e.status}</button>
                      </td>
                      <td className="td text-right">
                        <div className="flex justify-end gap-1">
                          <button title="Edit" onClick={() => { setErrors({}); setForm({ recurring: false, ...e }); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                          <button title="Delete" onClick={() => del(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="td font-bold" colSpan={5}>Total ({rows.length})</td>
                    <td className="td text-right font-extrabold text-slate-900 dark:text-white">{inr(sum(rows))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination {...pg} onPage={pg.setPage} />
          </>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit expense" : "Add expense"} subtitle="Record a bill or payment made by the business."
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>{form?.id ? "Save changes" : "Add expense"}</Button></>}>
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Description" required error={errors.description} className="sm:col-span-2"><Input value={form.description} onChange={set("description")} placeholder="e.g. Office rent — Bangalore" autoFocus /></Field>
            <Field label="Amount (₹)" required error={errors.amount}><Input type="number" min="0" value={form.amount} onChange={set("amount")} placeholder="0" /></Field>
            <Field label="Date" required error={errors.date}><Input type="date" value={form.date} onChange={set("date")} /></Field>
            <Field label="Category"><Select value={form.category} onChange={set("category")} options={EXPENSE_CATEGORIES} /></Field>
            <Field label="Vendor / Paid to"><Input value={form.vendor} onChange={set("vendor")} placeholder="Optional" /></Field>
            <Field label="Payment mode"><Select value={form.mode} onChange={set("mode")} options={PAYMENT_MODES} /></Field>
            <Field label="Branch / Office"><Select value={form.branch} onChange={set("branch")} options={BRANCHES} /></Field>
            <Field label="Paid by"><Input value={form.paidBy || ""} onChange={set("paidBy")} placeholder="Who paid (e.g. Owner, Accounts)" /></Field>
            {form.category === "Salary" && <Field label="Employee name" hint="For salary payments"><Input value={form.employeeName || ""} onChange={set("employeeName")} list="exp-emps" placeholder="Pick or type" /><datalist id="exp-emps">{(db.employees || []).map((em) => <option key={em.id} value={em.name} />)}</datalist></Field>}
            <Field label="Notes" className="sm:col-span-2"><Input value={form.notes || ""} onChange={set("notes")} placeholder="Optional" /></Field>
            <Field label="Status">
              <div className="flex gap-2">
                {["Paid", "Pending"].map((s) => (
                  <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, status: s }))}
                    className={cx("flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition", form.status === s ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300")}>{s}</button>
                ))}
              </div>
            </Field>
            <label className="flex items-center gap-2.5 self-end pb-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={!!form.recurring} onChange={set("recurring")} className="h-4 w-4 rounded accent-brand-600" />
              Recurring every month
            </label>
          </div>
        )}
      </Modal>

      <Modal open={!!rentEdit} onClose={() => setRentEdit(null)} title={`Rent — ${rentEdit?.name || ""}`} subtitle="Monthly rent amount, due day and notes for this office." size="sm"
        footer={<><Button variant="secondary" onClick={() => setRentEdit(null)}>Cancel</Button><Button onClick={saveRent}>Save</Button></>}>
        {rentEdit && (
          <div className="space-y-4">
            <Field label="Monthly rent (₹)"><Input type="number" min="0" value={rentEdit.rent} onChange={(e) => setRentEdit((x) => ({ ...x, rent: e.target.value }))} /></Field>
            <Field label="Due day of month" hint="1–28"><Input type="number" min="1" max="28" value={rentEdit.dueDay} onChange={(e) => setRentEdit((x) => ({ ...x, dueDay: e.target.value }))} /></Field>
            <Field label="Notes"><Input value={rentEdit.notes || ""} onChange={(e) => setRentEdit((x) => ({ ...x, notes: e.target.value }))} placeholder="e.g. Landlord: Mr. Rao, pay by NEFT" /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
