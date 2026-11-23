import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Repeat, Wallet, Clock, AlertTriangle, Wrench, Plus, RotateCcw } from "lucide-react";
import { useStore } from "../../store/store";
import { Button, Card, EmptyState, PageHeader, SearchInput, Select, Tabs, Pagination, usePaged } from "../../components/ui";
import { canEdit } from "../../layout/AppLayout";
import { inr, compactInr, todayISO } from "../../utils/format";
import { FilterCard } from "./Common";
import { ExtraCard, ExtraForm, ServiceCard, ServiceForm } from "./BillingParts";
import { EXTRA_STATUSES, SERVICE_TYPES, serviceSummary, sumPay, withGst, ymOf } from "./deliveryUtils";

export default function MonthlyBilling() {
  const { db, user } = useStore();
  const [params, setParams] = useSearchParams();
  const writable = canEdit(user, "monthly-billing");
  const [tab, setTab] = useState("monthly");
  const [q, setQ] = useState("");
  const [project, setProject] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [svcForm, setSvcForm] = useState(null);
  const [extraForm, setExtraForm] = useState(null);
  const today = todayISO();
  const curYm = ymOf(today);
  const services = db.monthlyServices || [];
  const extras = db.extras || [];
  const projects = db.projects || [];

  useEffect(() => {
    if (params.get("new") === "service") { setSvcForm({ projectId: params.get("project") || "" }); setParams({}, { replace: true }); }
    else if (params.get("new") === "work") { setExtraForm({ projectId: params.get("project") || "" }); setTab("extras"); setParams({}, { replace: true }); }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpi = useMemo(() => {
    const active = services.filter((s) => s.active !== false);
    let expected = 0, collected = 0, pending = 0, overdue = 0, overdueCount = 0;
    services.forEach((s) => {
      const sum = serviceSummary(s, today);
      if (sum.cur && sum.cur.status !== "skipped") { expected += sum.cur.amount; collected += sum.cur.paid; pending += sum.cur.balance; }
      if (sum.overdue > 0) { overdue += sum.overdue; overdueCount += 1; }
    });
    const live = extras.filter((x) => x.status !== "Cancelled");
    const extraBal = live.reduce((a, x) => a + Math.max(0, withGst(x.amount, x.gstRate) - sumPay(x.payments)), 0);
    return {
      mrr: active.reduce((a, s) => a + withGst(s.amount, s.gstRate), 0), activeCount: active.length, expected, collected, pending, overdue, overdueCount,
      extraBal, extraUnpaid: live.filter((x) => withGst(x.amount, x.gstRate) - sumPay(x.payments) > 0).length,
    };
  }, [services, extras, today]);

  const svcStatus = (s) => {
    if (s.active === false) return "stopped";
    const sum = serviceSummary(s, today);
    if (sum.overdue > 0) return "overdue";
    if (sum.cur && sum.cur.status === "paid") return "paid";
    return "pending";
  };

  const svcRows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return services.filter((s) => {
      if (project && s.projectId !== project) return false;
      if (type && !(s.types || []).includes(type)) return false;
      if (status && svcStatus(s) !== status) return false;
      if (k) { const p = projects.find((x) => x.id === s.projectId); if (![s.name, s.client, p?.contact, p?.phone].some((v) => String(v || "").toLowerCase().includes(k))) return false; }
      return true;
    }).sort((a, b) => serviceSummary(b, today).overdue - serviceSummary(a, today).overdue);
  }, [services, projects, q, project, type, status, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const extraRows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return extras.filter((x) => {
      if (project && x.projectId !== project) return false;
      if (status === "balance" && !(x.status !== "Cancelled" && withGst(x.amount, x.gstRate) - sumPay(x.payments) > 0)) return false;
      if (status && status !== "balance" && x.status !== status) return false;
      if (month && ymOf(x.requestedOn) !== month) return false;
      if (k && ![x.title, x.client, x.description].some((v) => String(v || "").toLowerCase().includes(k))) return false;
      return true;
    }).sort((a, b) => (b.requestedOn || "").localeCompare(a.requestedOn || ""));
  }, [extras, q, project, status, month]);

  const svcPaged = usePaged(svcRows, 12);
  const exPaged = usePaged(extraRows, 12);
  const clear = () => { setQ(""); setProject(""); setType(""); setStatus(""); setMonth(""); };
  const switchTab = (t) => { setTab(t); setStatus(""); };
  const cardFilter = (t, st) => () => { setTab(t); setStatus((cur) => (cur === st && tab === t ? "" : st)); };

  return (
    <div>
      <PageHeader title="Monthly & Extras" subtitle="Recurring retainers and additional work billed on top of projects — schedules, collections and dues."
        actions={writable && <>
          <Button variant="secondary" icon={Wrench} onClick={() => setExtraForm({ projectId: project })}>Add work</Button>
          <Button icon={Plus} onClick={() => setSvcForm({ projectId: project })}>Add monthly service</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        <FilterCard label="Active services" value={`${compactInr(kpi.mrr)}/mo`} sub={`${kpi.activeCount} running · ${compactInr(kpi.mrr * 12)}/yr`} icon={Repeat} tone="brand" active={tab === "monthly" && !status} onClick={() => { setTab("monthly"); setStatus(""); }} />
        <FilterCard label="Collected this month" value={compactInr(kpi.collected)} sub={`of ${inr(kpi.expected)} expected`} icon={Wallet} tone="emerald" active={tab === "monthly" && status === "paid"} onClick={cardFilter("monthly", "paid")} />
        <FilterCard label="Pending this month" value={compactInr(kpi.pending)} sub="not yet received" icon={Clock} tone="amber" active={tab === "monthly" && status === "pending"} onClick={cardFilter("monthly", "pending")} />
        <FilterCard label="Overdue" value={compactInr(kpi.overdue)} sub={`${kpi.overdueCount} service${kpi.overdueCount === 1 ? "" : "s"} behind`} icon={AlertTriangle} tone="rose" active={tab === "monthly" && status === "overdue"} onClick={cardFilter("monthly", "overdue")} />
        <FilterCard label="Additional work balance" value={compactInr(kpi.extraBal)} sub={`${kpi.extraUnpaid} unpaid item${kpi.extraUnpaid === 1 ? "" : "s"}`} icon={Wrench} tone="violet" active={tab === "extras" && status === "balance"} onClick={cardFilter("extras", "balance")} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={tab} onChange={switchTab} tabs={[{ value: "monthly", label: "Monthly Services", count: services.length }, { value: "extras", label: "Additional Work", count: extras.length }]} />
        <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
          <SearchInput value={q} onChange={setQ} placeholder="Search business, client, service…" className="sm:w-64" />
          <Select value={project} onChange={(e) => setProject(e.target.value)} options={projects.map((p) => ({ value: p.id, label: p.client }))} placeholder="All projects" className="sm:w-48" />
          {tab === "monthly" ? (
            <>
              <Select value={type} onChange={(e) => setType(e.target.value)} options={SERVICE_TYPES} placeholder="All service types" className="sm:w-44" />
              <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "overdue", label: "Overdue" }, { value: "pending", label: "Pending this month" }, { value: "paid", label: "Paid this month" }, { value: "stopped", label: "Stopped" }]} placeholder="All statuses" className="sm:w-44" />
            </>
          ) : (
            <>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "balance", label: "Balance pending" }, ...EXTRA_STATUSES]} placeholder="All statuses" className="sm:w-44" />
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input sm:w-40" title="Requested in" />
            </>
          )}
          {(q || project || type || status || month) && <Button variant="ghost" icon={RotateCcw} onClick={clear}>Clear</Button>}
        </div>
      </div>

      {tab === "monthly" ? (
        svcRows.length === 0 ? (
          <Card><EmptyState icon={Repeat} title="No monthly services" text="Add SEO, Ads, AMC or hosting retainers to track each month's billing." action={writable && <Button icon={Plus} onClick={() => setSvcForm({})}>Add monthly service</Button>} /></Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{svcPaged.slice.map((s) => <ServiceCard key={s.id} s={s} onEdit={setSvcForm} canWrite={writable} />)}</div>
            {svcPaged.pages > 1 && <Card className="mt-4"><Pagination page={svcPaged.page} pages={svcPaged.pages} onPage={svcPaged.setPage} total={svcPaged.total} perPage={svcPaged.perPage} /></Card>}
          </>
        )
      ) : extraRows.length === 0 ? (
        <Card><EmptyState icon={Wrench} title="No additional work" text="Log change requests and extra deliverables to bill them separately." action={writable && <Button icon={Plus} onClick={() => setExtraForm({})}>Add work</Button>} /></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{exPaged.slice.map((x) => <ExtraCard key={x.id} x={x} onEdit={setExtraForm} canWrite={writable} />)}</div>
          {exPaged.pages > 1 && <Card className="mt-4"><Pagination page={exPaged.page} pages={exPaged.pages} onPage={exPaged.setPage} total={exPaged.total} perPage={exPaged.perPage} /></Card>}
        </>
      )}

      <ServiceForm svc={svcForm} defaultProjectId={svcForm?.projectId} onClose={() => setSvcForm(null)} />
      <ExtraForm extra={extraForm} defaultProjectId={extraForm?.projectId} onClose={() => setExtraForm(null)} />
    </div>
  );
}
