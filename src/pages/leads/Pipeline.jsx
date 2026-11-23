import { useMemo, useState } from "react";
import { Plus, IndianRupee, Target, Trophy, Briefcase, CalendarDays } from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, Button, Card, PageHeader, SearchInput, Select, StatCard, cx } from "../../components/ui";
import { BRANCHES, LEAD_STAGES, STAGE_HEX } from "../../config/constants";
import { compactInr, inr } from "../../utils/format";
import LeadForm from "./LeadForm";
import LeadDrawer from "./LeadDrawer";
import { useStageChange, PriorityChip, FollowUp, STAGE_PROB } from "./leadHelpers";

export default function Pipeline() {
  const { db, userById } = useStore();
  const { requestStage, modals } = useStageChange();
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  const [branch, setBranch] = useState("");
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);

  const leads = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.leads.filter((l) => (!owner || l.ownerId === owner) && (!branch || l.branch === branch) &&
      (!s || [l.name, l.company, l.phone, l.service].some((v) => String(v || "").toLowerCase().includes(s))));
  }, [db.leads, q, owner, branch]);

  const stats = useMemo(() => {
    const open = leads.filter((l) => !["Won", "Lost"].includes(l.stage));
    const won = leads.filter((l) => l.stage === "Won");
    const lost = leads.filter((l) => l.stage === "Lost");
    return {
      openValue: open.reduce((s, l) => s + (Number(l.value) || 0), 0),
      openCount: open.length,
      weighted: open.reduce((s, l) => s + ((Number(l.value) || 0) * (STAGE_PROB[l.stage] || 0)) / 100, 0),
      wonValue: won.reduce((s, l) => s + (Number(l.value) || 0), 0),
      winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
      wonCount: won.length,
    };
  }, [leads]);

  const onDrop = (stage) => {
    const lead = db.leads.find((l) => l.id === dragId);
    setOver(null); setDragId(null);
    if (lead) requestStage(lead, stage);
  };

  return (
    <>
      <PageHeader title="Sales pipeline" subtitle="Drag deals between stages to keep your forecast accurate."
        actions={<Button icon={Plus} onClick={() => setAdding(true)}>Add deal</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open pipeline" value={compactInr(stats.openValue)} icon={IndianRupee} tone="brand" sub={`${stats.openCount} open deals`} />
        <StatCard label="Weighted forecast" value={compactInr(stats.weighted)} icon={Target} tone="violet" sub="by stage probability" />
        <StatCard label="Won value" value={compactInr(stats.wonValue)} icon={Trophy} tone="emerald" sub={`${stats.wonCount} deals closed`} />
        <StatCard label="Win rate" value={`${stats.winRate}%`} icon={Briefcase} tone="amber" sub="won ÷ (won + lost)" />
      </div>

      <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Search deals…" className="flex-1" />
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="All owners" options={db.users.map((u) => ({ value: u.id, label: u.name }))} className="sm:w-48" />
        <Select value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="All branches" options={BRANCHES} className="sm:w-44" />
      </Card>

      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-max gap-4">
          {LEAD_STAGES.map((stage) => {
            const items = leads.filter((l) => l.stage === stage).sort((a, b) => (b.value || 0) - (a.value || 0));
            const total = items.reduce((s, l) => s + (Number(l.value) || 0), 0);
            return (
              <div key={stage}
                onDragOver={(e) => { e.preventDefault(); if (over !== stage) setOver(stage); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
                onDrop={(e) => { e.preventDefault(); onDrop(stage); }}
                className={cx("flex w-[290px] shrink-0 flex-col rounded-2xl border bg-slate-100/70 transition dark:bg-slate-900/60",
                  over === stage ? "border-brand-400 bg-brand-50/60 ring-4 ring-brand-500/10 dark:bg-brand-500/5" : "border-transparent dark:border-slate-800")}>
                <div className="rounded-t-2xl border-t-4 px-4 pb-2 pt-3" style={{ borderTopColor: STAGE_HEX[stage] }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{stage}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">{items.length}</span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{compactInr(total)}{!["Won", "Lost"].includes(stage) && <span className="font-normal text-slate-400"> · {STAGE_PROB[stage]}% prob.</span>}</p>
                </div>
                <div className="flex max-h-[calc(100vh-380px)] min-h-[200px] flex-col gap-2.5 overflow-y-auto p-2.5">
                  {items.map((l) => {
                    const own = userById(l.ownerId);
                    return (
                      <div key={l.id} draggable
                        onDragStart={(e) => { setDragId(l.id); e.dataTransfer.effectAllowed = "move"; }}
                        onDragEnd={() => { setDragId(null); setOver(null); }}
                        onClick={() => setOpenId(l.id)}
                        className={cx("cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-card transition hover:border-brand-300 hover:shadow-pop active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500/50",
                          dragId === l.id && "opacity-40")}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{l.company || l.name}</p>
                          <PriorityChip priority={l.priority} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{l.name} · {l.service}</p>
                        <p className="mt-2.5 text-[15px] font-extrabold text-slate-900 dark:text-white">{inr(l.value)}</p>
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-700">
                          <span className="flex items-center gap-1.5 text-xs text-slate-500"><Avatar name={own?.name || "?"} size="xs" />{l.source}</span>
                          {!["Won", "Lost"].includes(l.stage) && l.nextFollowUp
                            ? <span className="flex items-center gap-1 text-xs"><CalendarDays className="h-3 w-3 text-slate-400" /><FollowUp date={l.nextFollowUp} className="!text-xs" /></span>
                            : l.stage === "Lost" && l.lostReason ? <span className="max-w-[120px] truncate text-[11px] text-rose-500">{l.lostReason}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8 text-xs text-slate-400 dark:border-slate-700">Drop deals here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <LeadForm open={adding} onClose={() => setAdding(false)} />
      {openId && <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />}
      {modals}
    </>
  );
}
