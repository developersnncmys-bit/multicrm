import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plug, CheckCircle2, AlertTriangle, CalendarClock, Plus, ChevronDown, ChevronRight, FolderKanban } from "lucide-react";
import { useStore } from "../../store/store";
import { Button, Card, EmptyState, PageHeader, Pagination, SearchInput, Select, cx, usePaged } from "../../components/ui";
import { canEdit } from "../../layout/AppLayout";
import { FilterCard } from "./Common";
import { IntegrationCard, IntegrationForm, renewalInfo } from "./IntegrationParts";
import { INTEGRATION_CATEGORIES, INTEGRATION_STATUSES, INTEGRATION_STATUS_STYLE } from "./deliveryUtils";

export default function Integrations() {
  const { db, user } = useStore();
  const [params, setParams] = useSearchParams();
  const writable = canEdit(user, "integrations");
  const [q, setQ] = useState("");
  const [project, setProject] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [card, setCard] = useState("");
  const [form, setForm] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const items = db.integrations || [];
  const projects = db.projects || [];

  useEffect(() => {
    if (params.get("new")) { setForm({ projectId: params.get("project") || "" }); setParams({}, { replace: true }); }
    else if (params.get("project")) { setProject(params.get("project")); setParams({}, { replace: true }); }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpi = useMemo(() => ({
    total: items.length,
    live: items.filter((i) => i.status === "Live").length,
    issues: items.filter((i) => i.status === "Issue").length,
    renew: items.filter((i) => { const r = renewalInfo(i.renewal); return r && (r.overdue || r.soon); }).length,
  }), [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => {
      if (project && i.projectId !== project) return false;
      if (category && i.category !== category) return false;
      if (status && i.status !== status) return false;
      if (card === "live" && i.status !== "Live") return false;
      if (card === "issues" && i.status !== "Issue") return false;
      if (card === "renew") { const r = renewalInfo(i.renewal); if (!r || !(r.overdue || r.soon)) return false; }
      if (s) {
        const p = projects.find((x) => x.id === i.projectId);
        if (![i.service, i.category, i.login, p?.client, p?.name].some((v) => String(v || "").toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [items, projects, q, project, category, status, card]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((i) => { if (!map.has(i.projectId)) map.set(i.projectId, []); map.get(i.projectId).push(i); });
    return [...map.entries()].map(([pid, list]) => ({ pid, project: projects.find((p) => p.id === pid), list }))
      .sort((a, b) => String(a.project?.client || "~").localeCompare(String(b.project?.client || "~")));
  }, [filtered, projects]);
  const paged = usePaged(groups, 10);

  const cardBtn = (k) => () => setCard((c) => (c === k ? "" : k));

  return (
    <div>
      <PageHeader title="Credential Vault" subtitle="Every client integration — payment gateways, hosting, domains, APIs and store accounts — in one secure place."
        actions={writable && <Button icon={Plus} onClick={() => setForm({ projectId: project })}>Add credential</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <FilterCard label="Total integrations" value={kpi.total} sub={`${new Set(items.map((i) => i.projectId)).size} projects`} icon={Plug} tone="brand" active={card === ""} onClick={() => setCard("")} />
        <FilterCard label="Live" value={kpi.live} sub="working in production" icon={CheckCircle2} tone="emerald" active={card === "live"} onClick={cardBtn("live")} />
        <FilterCard label="Issues" value={kpi.issues} sub="need attention" icon={AlertTriangle} tone="rose" active={card === "issues"} onClick={cardBtn("issues")} />
        <FilterCard label="Renewals due" value={kpi.renew} sub="overdue or in 30 days" icon={CalendarClock} tone="amber" active={card === "renew"} onClick={cardBtn("renew")} />
      </div>

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-2 lg:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Search project, service, username…" className="lg:flex-1" />
          <Select value={project} onChange={(e) => setProject(e.target.value)} options={projects.map((p) => ({ value: p.id, label: p.client }))} placeholder="All projects" className="lg:w-56" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={Object.keys(INTEGRATION_CATEGORIES)} placeholder="All types" className="lg:w-44" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={INTEGRATION_STATUSES} placeholder="All statuses" className="lg:w-40" />
        </div>
      </Card>

      {groups.length === 0 ? (
        <Card><EmptyState icon={Plug} title="No credentials found" text="Try clearing filters, or add the first credential for a project." action={writable && <Button icon={Plus} onClick={() => setForm({ projectId: project })}>Add credential</Button>} /></Card>
      ) : (
        <div className="space-y-4">
          {paged.slice.map((g) => {
            const isCol = collapsed[g.pid];
            const issues = g.list.filter((i) => i.status === "Issue").length;
            return (
              <Card key={g.pid || "none"} className="overflow-hidden">
                <button onClick={() => setCollapsed((c) => ({ ...c, [g.pid]: !c[g.pid] }))} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  {isCol ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><FolderKanban className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900 dark:text-white">{g.project?.client || "No project linked"}</span>
                    <span className="block truncate text-xs text-slate-500">{g.project?.service || ""}</span>
                  </span>
                  {issues > 0 && <span className={cx("chip", INTEGRATION_STATUS_STYLE.Issue)}>{issues} issue{issues > 1 ? "s" : ""}</span>}
                  <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{g.list.length} credential{g.list.length > 1 ? "s" : ""}</span>
                  {writable && <span onClick={(e) => { e.stopPropagation(); setForm({ projectId: g.pid }); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" title="Add to this project"><Plus className="h-4 w-4" /></span>}
                </button>
                {!isCol && (
                  <div className="grid gap-3 border-t border-slate-100 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/40 md:grid-cols-2 2xl:grid-cols-3">
                    {g.list.map((i) => <IntegrationCard key={i.id} it={i} onEdit={setForm} canWrite={writable} />)}
                  </div>
                )}
              </Card>
            );
          })}
          {paged.pages > 1 && <Card><Pagination page={paged.page} pages={paged.pages} onPage={paged.setPage} total={paged.total} perPage={paged.perPage} /></Card>}
        </div>
      )}

      <IntegrationForm it={form} defaultProjectId={form?.projectId} onClose={() => setForm(null)} />
    </div>
  );
}
