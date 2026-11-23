// Owner Dashboard — one place for the business owner, two clear jobs:
//   "Today's to-do"   → what the owner must DO today (was "Owner's Desk")
//   "Business report" → how the business is DOING this month (was "Owner View")
import { useSearchParams } from "react-router-dom";
import { ListChecks, LineChart } from "lucide-react";
import { useStore } from "../../store/store";
import { cx } from "../../components/ui";
import OwnerDesk from "./OwnerDesk";
import OwnerView from "./OwnerView";

const TABS = [
  { key: "today", label: "Today's to-do", icon: ListChecks, desc: "Urgent calls, money to chase and promises to track — tick them off one by one." },
  { key: "report", label: "Business report", icon: LineChart, desc: "Cash vs salaries, who owes you, delivery progress and branch profit — read it once a week." },
];

export default function OwnerHub() {
  const { user } = useStore();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "report" ? "report" : "today";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">Owner Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">{greet}, {user.name.split(" ")[0]} — everything the owner needs, in two tabs.</p>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setParams(t.key === "today" ? {} : { tab: t.key }, { replace: true })}
            className={cx("flex items-start gap-3 rounded-xl border p-4 text-left transition", tab === t.key ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 dark:bg-brand-500/10" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900")}>
            <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tab === t.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}><t.icon className="h-5 w-5" /></span>
            <span><span className="block font-semibold text-slate-900 dark:text-white">{t.label}</span><span className="text-sm text-slate-500">{t.desc}</span></span>
          </button>
        ))}
      </div>
      {tab === "today" ? <OwnerDesk /> : <OwnerView />}
    </div>
  );
}
