// Shown at the top of every Finance page: the money flow in 4 plain steps
// (Bill → Collect → Spend → Save) plus "this month in plain words".
import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { Receipt, HandCoins, Wallet, PiggyBank, ArrowDownLeft, ArrowUpRight, Scale, Hourglass, ChevronRight } from "lucide-react";
import { useStore, invoicePaid } from "../../store/store";
import { compactInr, todayISO } from "../../utils/format";
import { docTotal } from "../docs/docUtils";
import { cx } from "../../components/ui";

export default function FinanceGuide() {
  const { db } = useStore();
  const n = useMemo(() => {
    const month = todayISO().slice(0, 7);
    const live = db.invoices.filter((i) => !["Cancelled", "Draft"].includes(i.status));
    const tax = live.filter((i) => i.type !== "Proforma");
    const toCollect = tax.reduce((s, i) => s + Math.max(0, docTotal(i) - invoicePaid(i)), 0);
    const openBills = tax.filter((i) => docTotal(i) - invoicePaid(i) > 0).length;
    const inMonth = live.flatMap((i) => i.payments || []).filter((p) => (p.date || "").startsWith(month)).reduce((s, p) => s + Number(p.amount || 0), 0);
    const outMonth = db.expenses.filter((e) => (e.date || "").startsWith(month)).reduce((s, e) => s + Number(e.amount || 0), 0);
    const saved = (db.fundTxns || []).reduce((s, t) => s + (t.type === "Withdrawal" ? -1 : 1) * Number(t.amount || 0), 0);
    const billedMonth = db.invoices.filter((i) => (i.date || "").startsWith(month) && i.status !== "Cancelled").length;
    return { toCollect, openBills, inMonth, outMonth, saved, billedMonth };
  }, [db.invoices, db.expenses, db.fundTxns]);

  const steps = [
    { to: "/invoices", n: 1, icon: Receipt, title: "Bill the client", text: "Invoices you send", value: `${n.billedMonth} this month`, tone: "text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300" },
    { to: "/payments", n: 2, icon: HandCoins, title: "Collect the money", text: "Who still has to pay", value: `${compactInr(n.toCollect)} pending`, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300" },
    { to: "/expenses", n: 3, icon: Wallet, title: "Pay your costs", text: "Rent, salaries, tools…", value: `${compactInr(n.outMonth)} this month`, tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300" },
    { to: "/funds", n: 4, icon: PiggyBank, title: "Save for later", text: "Money set aside", value: `${compactInr(n.saved)} saved`, tone: "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-300" },
  ];
  const left = n.inMonth - n.outMonth;
  const plain = [
    { icon: ArrowDownLeft, label: "Came in", value: compactInr(n.inMonth), tone: "text-emerald-600" },
    { icon: ArrowUpRight, label: "Went out", value: compactInr(n.outMonth), tone: "text-rose-600" },
    { icon: Scale, label: left >= 0 ? "Left over" : "Short by", value: compactInr(Math.abs(left)), tone: left >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600" },
    { icon: Hourglass, label: "Still to collect", value: `${compactInr(n.toCollect)} · ${n.openBills} bills`, tone: "text-amber-600" },
  ];

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {steps.map((s, i) => (
          <NavLink key={s.to} to={s.to} className={({ isActive }) => cx(
            "group relative flex min-w-0 items-center gap-3 rounded-2xl border bg-white p-3.5 transition dark:bg-slate-900",
            isActive ? "border-brand-500 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-brand-300 hover:shadow-card dark:border-slate-800",
          )}>
            {({ isActive }) => (<>
              <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", s.tone)}><s.icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Step {s.n}</p>
                <p className={cx("truncate text-sm font-bold", isActive ? "text-brand-700 dark:text-brand-300" : "text-slate-900 dark:text-white")}>{s.title}</p>
                <p className="truncate text-xs text-slate-500">{s.text} · <span className="font-semibold text-slate-700 dark:text-slate-300">{s.value}</span></p>
              </div>
              {i < steps.length - 1 && <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 xl:block" />}
            </>)}
          </NavLink>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/50">
        <span className="font-semibold text-slate-500">This month, in plain words:</span>
        {plain.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <p.icon className={cx("h-4 w-4", p.tone)} />
            <span className="text-slate-500">{p.label}</span>
            <span className={cx("font-bold tabular-nums", p.tone)}>{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
