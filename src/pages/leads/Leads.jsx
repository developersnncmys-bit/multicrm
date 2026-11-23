import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Download, SlidersHorizontal, Phone, MessageCircle, Trash2, Eye, CalendarPlus, UserPlus, ArrowRightLeft, CalendarClock, XCircle, X, FileText,
  ChevronLeft, ChevronRight, Users, RefreshCw,
} from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Avatar, Button, Card, EmptyState, Field, Input, Menu, PageHeader, SearchInput, Select, Tabs, useConfirm, cx } from "../../components/ui";
import { BRANCHES, LEAD_SOURCES, LEAD_STAGES, SERVICES } from "../../config/constants";
import { addDays, daysBetween, downloadCSV, fmtDate, inr, monthKey, todayISO, uid } from "../../utils/format";
import LeadForm from "./LeadForm";
import LeadDrawer from "./LeadDrawer";
import LeadsToday from "./LeadsToday";
import { ClientsTab, SourcesTab, TeamTab } from "./LeadsInsights";
import { LogCallModal, WhatsAppModal, FollowUpModal, ProposalModal, PickModal } from "./LeadModals";
import { LostModal, StageBadge, ScorePill, NextStep, RepeatBadge, telLink } from "./leadHelpers";
import { OPEN, QUOTED_STAGES, SITES, phoneKey, priorityOf, useLeadIntel } from "./leadIntel";

const SALES_ROLES = ["Admin", "Sales Manager", "Sales Executive"];
const DATE_PRESETS = ["Any time", "Today", "Last 7 days", "Last 30 days", "This month", "Last month", "This year"];
const SORTS = [
  { value: "priority", label: "Priority" }, { value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" },
  { value: "value", label: "Highest value" }, { value: "score", label: "Highest score" }, { value: "followup", label: "Next follow-up" },
];

/** Saved views — id, label, predicate(lead, intel, today) */
export function buildViews(intel, today) {
  const idle = (l) => daysBetween((intel.last[l.id] || l.createdAt).slice(0, 10), today);
  return [
    { id: "open", label: "All open", fn: (l) => OPEN(l) },
    { id: "new-today", label: "New today", fn: (l) => (l.createdAt || "").slice(0, 10) === today },
    { id: "not-contacted", label: "Not contacted", fn: (l) => l.stage === "New" },
    { id: "fu-today", label: "Follow-up today", fn: (l) => OPEN(l) && l.nextFollowUp === today },
    { id: "fu-overdue", label: "Follow-up overdue", fn: (l) => OPEN(l) && l.nextFollowUp && l.nextFollowUp < today },
    { id: "no-fu", label: "No follow-up date", fn: (l) => OPEN(l) && !l.nextFollowUp },
    { id: "hot", label: "Hot", fn: (l) => OPEN(l) && intel.score[l.id]?.band === "Hot" },
    { id: "quoted-quiet", label: "Quoted, no reply 3+ days", fn: (l) => QUOTED_STAGES.includes(l.stage) && idle(l) >= 3 },
    { id: "quiet", label: "Gone quiet 14+ days", fn: (l) => OPEN(l) && idle(l) >= 14 },
    { id: "idle", label: "Clean up: idle 30+ days", fn: (l) => OPEN(l) && idle(l) >= 30 },
    { id: "repeat", label: "Same number again", fn: (l) => intel.repeat.has(phoneKey(l.phone)) },
    { id: "won", label: "Won", fn: (l) => l.stage === "Won" },
    { id: "lost", label: "Lost", fn: (l) => l.stage === "Lost" },
    { id: "all", label: "Everything", fn: () => true },
  ];
}

function inPreset(iso, preset, today) {
  if (!iso || preset === "Any time") return preset === "Any time";
  const d = iso.slice(0, 10);
  const m = monthKey(today);
  if (preset === "Today") return d === today;
  if (preset === "Last 7 days") return d >= addDays(today, -6);
  if (preset === "Last 30 days") return d >= addDays(today, -29);
  if (preset === "This month") return d.slice(0, 7) === m;
  if (preset === "Last month") { const x = new Date(`${today}T00:00:00`); x.setDate(1); x.setMonth(x.getMonth() - 1); return d.slice(0, 7) === `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; }
  if (preset === "This year") return d.slice(0, 4) === today.slice(0, 4);
  return true;
}

export default function Leads() {
  const { db, update, remove, user } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const intel = useLeadIntel(db);
  const today = todayISO();

  const [tab, setTab] = useState(params.get("tab") || "today");
  const [owner, setOwner] = useState("");
  const [branch, setBranch] = useState("");
  const [view, setView] = useState("open");
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [callLead, setCallLead] = useState(null);
  const [waLead, setWaLead] = useState(null);
  const [fuLead, setFuLead] = useState(null);
  const [propLead, setPropLead] = useState(null);

  useEffect(() => {
    let changed = false;
    if (params.get("new") === "1") { setAdding(true); params.delete("new"); changed = true; }
    const o = params.get("open"); if (o) { setOpenId(o); params.delete("open"); changed = true; }
    const t = params.get("tab"); if (t) { setTab(t); params.delete("tab"); changed = true; }
    const v = params.get("view"); if (v) { setView(v); setTab("all"); params.delete("view"); changed = true; }
    if (changed) setParams(params, { replace: true });
  }, [params, setParams]);

  const salesUsers = db.users.filter((u) => u.active && SALES_ROLES.includes(u.role));
  const base = useMemo(() => db.leads.filter((l) => (!owner || l.ownerId === owner) && (!branch || l.branch === branch)), [db.leads, owner, branch]);
  const views = useMemo(() => buildViews(intel, today), [intel, today]);
  const goView = (v) => { setView(v); setTab("all"); };
  const freshCount = base.filter((l) => l.stage === "New" && daysBetween((l.createdAt || "").slice(0, 10), today) <= 14).length;

  const actions = { onOpen: setOpenId, onCall: setCallLead, onWa: setWaLead, onFollowUp: setFuLead, onProposal: setPropLead, onEdit: setEditLead,
    onDelete: async (l) => { if (await confirm({ title: "Delete lead?", message: `${l.name} and all of its activity will be removed.` })) { remove("leads", l.id); toast("Lead deleted"); } },
    onLater: (l) => { update("leads", l.id, (x) => ({ nextFollowUp: addDays(today, 1), activities: [{ id: uid("a"), type: "note", text: "Moved to tomorrow from today's list", at: new Date().toISOString(), by: user.id }, ...(x.activities || [])] })); toast(`${l.name} moved to tomorrow`); },
  };

  return (
    <>
      <PageHeader title="All Leads" subtitle="Every enquiry from every channel — scored, prioritised and ready to work."
        actions={<>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            {[{ id: "", name: "Everyone" }, ...salesUsers].map((u) => (
              <button key={u.id} onClick={() => setOwner(u.id)} className={cx("rounded-md px-2.5 py-1.5 text-xs font-semibold transition", owner === u.id ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>{u.id ? u.name.split(" ")[0] : u.name}</button>
            ))}
          </div>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="All branches" options={BRANCHES} className="!w-36" />
          <Button icon={Plus} onClick={() => setAdding(true)}>Add lead</Button>
        </>} />

      <Tabs className="mb-5 w-fit" value={tab} onChange={setTab} tabs={[
        { value: "today", label: "Today", count: freshCount || undefined }, { value: "all", label: "All leads", count: base.filter(OPEN).length },
        { value: "clients", label: "Clients" }, { value: "sources", label: "Sources" }, { value: "team", label: "Team" },
      ]} />

      {tab === "today" && <LeadsToday leads={base} intel={intel} views={views} goView={goView} {...actions} />}
      {tab === "all" && <AllLeadsTab leads={base} intel={intel} views={views} view={view} setView={setView} {...actions} />}
      {tab === "clients" && <ClientsTab leads={base} intel={intel} onOpen={setOpenId} />}
      {tab === "sources" && <SourcesTab leads={base} intel={intel} />}
      {tab === "team" && <TeamTab leads={db.leads.filter((l) => !branch || l.branch === branch)} intel={intel} users={salesUsers} />}

      <LeadForm open={adding || !!editLead} lead={editLead} onClose={() => { setAdding(false); setEditLead(null); }} onSaved={(id) => !editLead && setOpenId(id)} />
      {openId && <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />}
      <LogCallModal lead={callLead} open={!!callLead} onClose={() => setCallLead(null)} />
      <WhatsAppModal lead={waLead} open={!!waLead} onClose={() => setWaLead(null)} />
      <FollowUpModal lead={fuLead} open={!!fuLead} onClose={() => setFuLead(null)} />
      <ProposalModal lead={propLead} open={!!propLead} onClose={() => setPropLead(null)} />
    </>
  );
}

/* ═════════════ All leads tab ═════════════ */
function AllLeadsTab({ leads, intel, views, view, setView, onOpen, onCall, onWa, onFollowUp, onProposal, onEdit, onDelete }) {
  const { db, update, remove, user, userById } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const today = todayISO();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [service, setService] = useState("");
  const [band, setBand] = useState("");
  const [sort, setSort] = useState("priority");
  const [more, setMore] = useState(false);
  const [mf, setMf] = useState({ company: "", site: "", has: "", vmin: "", vmax: "", dateField: "createdAt", preset: "Any time" });
  const [sel, setSel] = useState(new Set());
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [bulk, setBulk] = useState(""); // assign | stage | lost

  const counts = useMemo(() => Object.fromEntries(views.map((v) => [v.id, leads.filter(v.fn).length])), [views, leads]);
  const moreCount = Object.entries(mf).filter(([k, v]) => v && !(k === "dateField") && !(k === "preset" && v === "Any time")).length;

  const rows = useMemo(() => {
    const vfn = views.find((v) => v.id === view)?.fn || (() => true);
    const s = q.trim().toLowerCase();
    const dateOf = (l) => ({ createdAt: l.createdAt, last: intel.last[l.id], followup: l.nextFollowUp, won: l.stage === "Won" ? intel.last[l.id] : "" }[mf.dateField]);
    const has = (l) => ({
      quote: (intel.quoteCount[l.id] || 0) > 0, noquote: !(intel.quoteCount[l.id] > 0), meeting: (intel.meetings[l.id] || 0) > 0,
      budget: (l.budgetMax || 0) > 0, email: !!l.email, balance: (intel.balance[l.id] || 0) > 0,
    }[mf.has] ?? true);
    const out = leads.filter((l) => vfn(l)
      && (!s || [l.name, l.company, l.phone, l.email, l.id, l.requirement].some((v) => String(v || "").toLowerCase().includes(s)))
      && (!stage || l.stage === stage) && (!source || l.source === source)
      && (!service || l.service === service || (l.services || []).includes(service))
      && (!band || intel.score[l.id]?.band === band)
      && (!mf.company || String(l.company || "").toLowerCase().includes(mf.company.toLowerCase()))
      && (!mf.site || (l.site || "crm") === mf.site) && has(l)
      && (mf.vmin === "" || (l.value || 0) >= Number(mf.vmin)) && (mf.vmax === "" || (l.value || 0) <= Number(mf.vmax))
      && (mf.preset === "Any time" || inPreset(dateOf(l), mf.preset, today)));
    const cmp = {
      priority: (a, b) => priorityOf(b, intel) - priorityOf(a, intel),
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt), oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
      value: (a, b) => (b.value || 0) - (a.value || 0), score: (a, b) => (intel.score[b.id]?.score || 0) - (intel.score[a.id]?.score || 0),
      followup: (a, b) => (a.nextFollowUp || "9999").localeCompare(b.nextFollowUp || "9999"),
    }[sort];
    return out.sort(cmp);
  }, [leads, views, view, q, stage, source, service, band, mf, sort, intel, today]);

  useEffect(() => { setPage(1); }, [view, q, stage, source, service, band, mf, sort, size]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const slice = rows.slice((page - 1) * size, page * size);
  const allSel = slice.length > 0 && slice.every((l) => sel.has(l.id));
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selLeads = db.leads.filter((l) => sel.has(l.id));

  const act = (text, type = "note") => ({ id: uid("a"), type, text, at: new Date().toISOString(), by: user.id });
  const bulkApply = (fn, msg) => { selLeads.forEach((l) => update("leads", l.id, fn)); toast(msg); setSel(new Set()); };

  const exportRows = (list) => downloadCSV(`leads-${today}.csv`, list, [
    { label: "ID", key: "id" }, { label: "Name", key: "name" }, { label: "Company", key: "company" }, { label: "Mobile", key: "phone" }, { label: "Email", key: "email" },
    { label: "Source", key: "source" }, { label: "Came from", value: (l) => SITES[l.site || "crm"] }, { label: "Landing page", key: "landingPage" },
    { label: "Service", key: "service" }, { label: "All services", value: (l) => (l.services || []).join(" | ") }, { label: "Branch", key: "branch" }, { label: "City", key: "city" },
    { label: "Stage", key: "stage" }, { label: "Score", value: (l) => intel.score[l.id]?.score }, { label: "Band", value: (l) => intel.score[l.id]?.band },
    { label: "Priority", key: "priority" }, { label: "Value", key: "value" }, { label: "Budget from", key: "budgetMin" }, { label: "Budget to", key: "budgetMax" },
    { label: "Owner", value: (l) => userById(l.ownerId)?.name || "" }, { label: "Created", value: (l) => fmtDate(l.createdAt) }, { label: "Last activity", value: (l) => fmtDate(intel.last[l.id]) },
    { label: "Next follow-up", key: "nextFollowUp" }, { label: "Next step", value: (l) => intel.next[l.id]?.text }, { label: "Proposal", key: "proposalStatus" },
    { label: "First reply (min)", key: "firstReplyMins" }, { label: "Quotations", value: (l) => intel.quoteCount[l.id] || 0 }, { label: "Meetings", value: (l) => intel.meetings[l.id] || 0 },
    { label: "Balance due", value: (l) => intel.balance[l.id] || 0 }, { label: "Lost reason", key: "lostReason" }, { label: "Requirement", key: "requirement" },
  ]);

  const clearAll = () => { setQ(""); setStage(""); setSource(""); setService(""); setBand(""); setMf({ company: "", site: "", has: "", vmin: "", vmax: "", dateField: "createdAt", preset: "Any time" }); };

  return (
    <div className="space-y-4">
      {/* Saved views */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {views.map((v) => (
          <button key={v.id} onClick={() => setView(v.id)} className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
            view === v.id ? "border-brand-600 bg-brand-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
            {v.label}<span className={cx("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", view === v.id ? "bg-white/20" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>{counts[v.id]}</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 dark:border-slate-800 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, company, mobile, email…" className="lg:w-72" />
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <Select value={stage} onChange={(e) => setStage(e.target.value)} placeholder="All stages" options={LEAD_STAGES} />
            <Select value={source} onChange={(e) => setSource(e.target.value)} placeholder="All sources" options={LEAD_SOURCES} />
            <Select value={service} onChange={(e) => setService(e.target.value)} placeholder="All services" options={SERVICES} />
            <Select value={band} onChange={(e) => setBand(e.target.value)} placeholder="Any score" options={[{ value: "Hot", label: "Hot (70+)" }, { value: "Warm", label: "Warm (45–69)" }, { value: "Cold", label: "Cold (<45)" }]} />
            <Select value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS.map((s) => ({ ...s, label: `Sort: ${s.label}` }))} />
            <Button variant={more || moreCount ? "soft" : "secondary"} icon={SlidersHorizontal} onClick={() => setMore((v) => !v)}>More{moreCount ? ` (${moreCount})` : ""}</Button>
          </div>
          <Button variant="secondary" icon={Download} onClick={() => exportRows(rows)} title="Export this view">Export</Button>
        </div>

        {more && (
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 animate-fadeIn dark:border-slate-800 dark:bg-slate-800/20 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Client / company"><Input value={mf.company} onChange={(e) => setMf({ ...mf, company: e.target.value })} placeholder="Contains…" /></Field>
            <Field label="Came from"><Select value={mf.site} onChange={(e) => setMf({ ...mf, site: e.target.value })} placeholder="Anywhere" options={Object.entries(SITES).map(([value, label]) => ({ value, label }))} /></Field>
            <Field label="Has"><Select value={mf.has} onChange={(e) => setMf({ ...mf, has: e.target.value })} placeholder="Anything" options={[{ value: "quote", label: "A quotation" }, { value: "noquote", label: "No quotation" }, { value: "meeting", label: "A meeting" }, { value: "budget", label: "A budget" }, { value: "email", label: "An email" }, { value: "balance", label: "Balance due" }]} /></Field>
            <Field label="Value (₹)"><div className="flex gap-2"><Input type="number" placeholder="Min" value={mf.vmin} onChange={(e) => setMf({ ...mf, vmin: e.target.value })} /><Input type="number" placeholder="Max" value={mf.vmax} onChange={(e) => setMf({ ...mf, vmax: e.target.value })} /></div></Field>
            <Field label="Date on"><Select value={mf.dateField} onChange={(e) => setMf({ ...mf, dateField: e.target.value })} options={[{ value: "createdAt", label: "Enquired" }, { value: "last", label: "Last activity" }, { value: "followup", label: "Next follow-up" }, { value: "won", label: "Won / lost on" }]} /></Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="label">Range</span>
              <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map((p) => <button key={p} onClick={() => setMf({ ...mf, preset: p })} className={cx("rounded-lg border px-2.5 py-1.5 text-xs font-semibold", mf.preset === p ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>{p}</button>)}
                <Button size="sm" variant="ghost" icon={X} onClick={clearAll} className="ml-auto">Clear all filters</Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk bar */}
        {sel.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 bg-brand-50 px-4 py-2.5 animate-fadeIn dark:border-brand-500/20 dark:bg-brand-500/10">
            <span className="mr-1 text-sm font-semibold text-brand-800 dark:text-brand-200">{sel.size} selected</span>
            {sel.size < rows.length && <button onClick={() => setSel(new Set(rows.map((l) => l.id)))} className="text-xs font-semibold text-brand-700 underline dark:text-brand-300">Select all {rows.length} in view</button>}
            <div className="ml-auto flex flex-wrap gap-1.5">
              <Button size="sm" variant="secondary" icon={UserPlus} onClick={() => setBulk("assign")}>Assign</Button>
              <Button size="sm" variant="secondary" icon={ArrowRightLeft} onClick={() => setBulk("stage")}>Move stage</Button>
              <Button size="sm" variant="secondary" icon={CalendarClock} onClick={() => bulkApply((l) => ({ nextFollowUp: addDays(today, 7), activities: [act("Follow-up moved to next week (bulk)"), ...(l.activities || [])] }), "Follow-ups set for next week")}>Follow up next week</Button>
              <Button size="sm" variant="secondary" icon={XCircle} onClick={() => setBulk("lost")}>Mark lost</Button>
              <Button size="sm" variant="secondary" icon={Download} onClick={() => exportRows(selLeads)}>Export</Button>
              <Button size="sm" variant="ghost" icon={Trash2} className="text-rose-600" onClick={async () => { if (await confirm({ title: `Delete ${sel.size} leads?`, message: "Selected leads and their history will be removed." })) { selLeads.forEach((l) => remove("leads", l.id)); setSel(new Set()); toast("Leads deleted"); } }}>Delete</Button>
              <Button size="sm" variant="ghost" icon={X} onClick={() => setSel(new Set())}>Clear</Button>
            </div>
          </div>
        )}

        {rows.length === 0 ? <EmptyState icon={Users} title="No leads in this view" text="Try another saved view or clear the filters." action={<Button variant="secondary" icon={RefreshCw} onClick={() => { clearAll(); setView("all"); }}>Show everything</Button>} /> : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead><tr>
                  <th className="th w-10"><input type="checkbox" checked={allSel} onChange={() => setSel((s) => { const n = new Set(s); slice.forEach((l) => (allSel ? n.delete(l.id) : n.add(l.id))); return n; })} className="h-4 w-4 rounded accent-brand-600" /></th>
                  <th className="th">Lead</th><th className="th">Mobile</th><th className="th">Source</th><th className="th">Service</th><th className="th text-right">Value</th>
                  <th className="th">Stage</th><th className="th">Score</th><th className="th">Owner</th><th className="th">Age</th><th className="th">Next step</th><th className="th w-10" />
                </tr></thead>
                <tbody>
                  {slice.map((l) => {
                    const own = userById(l.ownerId);
                    const age = daysBetween((l.createdAt || "").slice(0, 10), today);
                    return (
                      <tr key={l.id} className={cx("tr cursor-pointer", sel.has(l.id) && "bg-brand-50/50 dark:bg-brand-500/5")} onClick={() => onOpen(l.id)}>
                        <td className="td" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(l.id)} onChange={() => toggle(l.id)} className="h-4 w-4 rounded accent-brand-600" /></td>
                        <td className="td">
                          <div className="flex items-center gap-2.5">
                            <span className="relative"><Avatar name={l.name} size="sm" />{l.seen === false && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900" />}</span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">{l.name}{intel.repeat.has(phoneKey(l.phone)) && <RepeatBadge />}</p>
                              <p className="max-w-[180px] truncate text-xs text-slate-500">{l.company || "Individual"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="td tabular-nums text-slate-600 dark:text-slate-300">{l.phone}</td>
                        <td className="td"><p className="text-slate-700 dark:text-slate-200">{l.source}</p>{l.landingPage && <p className="text-[11px] text-slate-400">{l.landingPage}</p>}</td>
                        <td className="td max-w-[160px] truncate text-slate-600 dark:text-slate-300">{l.service}{(l.services || []).length > 1 && <span className="ml-1 text-xs text-slate-400">+{l.services.length - 1}</span>}</td>
                        <td className="td text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">{inr(l.value)}</td>
                        <td className="td"><StageBadge stage={l.stage} /></td>
                        <td className="td"><ScorePill s={intel.score[l.id]} /></td>
                        <td className="td"><span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><Avatar name={own?.name || "?"} size="xs" />{own?.name.split(" ")[0] || "—"}</span></td>
                        <td className="td text-slate-500">{age === 0 ? "Today" : `${age}d`}</td>
                        <td className="td max-w-[220px] truncate"><NextStep n={intel.next[l.id]} /></td>
                        <td className="td" onClick={(e) => e.stopPropagation()}>
                          <RowMenu l={l} {...{ onOpen, onCall, onWa, onFollowUp, onProposal, onEdit, onDelete }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {slice.map((l) => (
                <div key={l.id} onClick={() => onOpen(l.id)} className="flex gap-3 p-4">
                  <Avatar name={l.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><p className="truncate font-semibold text-slate-800 dark:text-slate-100">{l.name}</p><ScorePill s={intel.score[l.id]} /></div>
                    <p className="truncate text-xs text-slate-500">{l.company} · {l.service}</p>
                    <div className="mt-2 flex items-center justify-between"><StageBadge stage={l.stage} /><span className="text-sm font-semibold">{inr(l.value)}</span></div>
                    <NextStep n={intel.next[l.id]} className="mt-1.5 block" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
              <span className="text-slate-500">{rows.length} leads · {inr(rows.reduce((s, l) => s + (l.value || 0), 0))} total value</span>
              <div className="flex items-center gap-2">
                <Select value={size} onChange={(e) => setSize(Number(e.target.value))} options={[10, 20, 50, 100].map((n) => ({ value: n, label: `${n} / page` }))} className="!h-8 !w-28 !py-1 text-xs" />
                <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-medium text-slate-600 dark:text-slate-300">{page} / {pages}</span>
                <Button size="icon" variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <PickModal open={bulk === "assign"} onClose={() => setBulk("")} title={`Assign ${sel.size} leads to`} options={db.users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))}
        onPick={(uidv) => bulkApply((l) => ({ ownerId: uidv, activities: [act(`Assigned to ${userById(uidv)?.name}`), ...(l.activities || [])] }), `Assigned to ${userById(uidv)?.name}`)} cta="Assign" />
      <PickModal open={bulk === "stage"} onClose={() => setBulk("")} title={`Move ${sel.size} leads to`} options={LEAD_STAGES.filter((s) => s !== "Lost")}
        onPick={(st) => bulkApply((l) => (l.stage === st ? {} : { stage: st, nextFollowUp: st === "Won" ? "" : l.nextFollowUp, activities: [act(`Stage moved from ${l.stage} to ${st}`, "stage"), ...(l.activities || [])] }), `Moved to ${st}`)} cta="Move" />
      <LostModal open={bulk === "lost"} count={sel.size} onClose={() => setBulk("")}
        onConfirm={(reason) => { bulkApply((l) => ({ stage: "Lost", lostReason: reason, nextFollowUp: "", activities: [act(`Stage changed to Lost — ${reason}`, "stage"), ...(l.activities || [])] }), "Marked as lost"); setBulk(""); }} />
    </div>
  );
}

export function RowMenu({ l, onOpen, onCall, onWa, onFollowUp, onProposal, onEdit, onDelete }) {
  return (
    <Menu items={[
      { label: "Open", icon: Eye, onClick: () => onOpen(l.id) },
      { label: "Call & log", icon: Phone, onClick: () => { window.location.href = telLink(l.phone); onCall(l); } },
      { label: "WhatsApp", icon: MessageCircle, onClick: () => onWa(l) },
      { label: "Set follow-up", icon: CalendarPlus, onClick: () => onFollowUp(l) },
      onProposal && { label: "Proposal status", icon: FileText, onClick: () => onProposal(l) },
      onEdit && { label: "Edit", icon: SlidersHorizontal, onClick: () => onEdit(l) },
      onDelete && { label: "Delete", icon: Trash2, danger: true, onClick: () => onDelete(l) },
    ]} />
  );
}
