// Enquiries Inbox — fresh enquiries from website forms, ads and portals, like an email inbox.
// Goal: reply to every new enquiry within 15 minutes. Unseen = bold; opening marks it seen.
import { useMemo, useState } from "react";
import { Inbox, Phone, MessageCircle, Timer, Zap, Repeat, MailOpen, CheckCheck, Globe, UserPlus } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, Tabs, SearchInput, Select, Badge, Avatar, EmptyState, Pagination, usePaged, cx } from "../../components/ui";
import { LEAD_SOURCES } from "../../config/constants";
import { inr, timeAgo } from "../../utils/format";
import { useLeadIntel, SITES, phoneKey, replyLabel } from "../leads/leadIntel";
import { ScorePill, StageBadge, RepeatBadge, telLink } from "../leads/leadHelpers";
import { LogCallModal, WhatsAppModal } from "../leads/LeadModals";
import LeadDrawer from "../leads/LeadDrawer";

const waitMins = (l) => Math.max(0, Math.round((Date.now() - new Date(l.createdAt)) / 60000));

export default function Enquiries() {
  const { db, update, userById } = useStore();
  const toast = useToast();
  const intel = useLeadIntel(db);
  const [tab, setTab] = useState("unreplied");
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [openId, setOpenId] = useState(null);
  const [modal, setModal] = useState(null);

  // Inbox = enquiries of the last 30 days, plus anything still unseen
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const inbox = useMemo(() => db.leads.filter((l) => l.createdAt >= cutoff || l.seen === false).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [db.leads]);
  const unseen = inbox.filter((l) => l.seen === false);
  const unreplied = inbox.filter((l) => l.stage === "New" && l.firstReplyMins == null);
  const repeat = inbox.filter((l) => intel.repeat.has(phoneKey(l.phone)));
  const replied = inbox.filter((l) => l.firstReplyMins != null);
  const fast = replied.filter((l) => l.firstReplyMins <= 15).length;
  const avgReply = replied.length ? Math.round(replied.reduce((a, l) => a + l.firstReplyMins, 0) / replied.length) : null;

  const rows = useMemo(() => {
    const base = { unseen, unreplied, repeat, all: inbox }[tab];
    const s = q.trim().toLowerCase();
    return base.filter((l) => (!source || l.source === source) && (!s || [l.name, l.company, l.phone, l.email, l.service].some((v) => String(v || "").toLowerCase().includes(s))));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, source, inbox, intel]);
  const pg = usePaged(rows, 15);

  const open = (l) => { if (l.seen === false) update("leads", l.id, { seen: true }); setOpenId(l.id); };
  const markAllSeen = () => { unseen.forEach((l) => update("leads", l.id, { seen: true })); toast(`${unseen.length} enquiries marked as seen`); };
  const owners = db.users.filter((u) => u.active && (u.role.startsWith("Sales") || u.role === "Admin"));

  return (
    <div>
      <PageHeader title="Enquiries Inbox" subtitle="New enquiries from your website, ads and lead portals. Reply fast — leads answered within 15 minutes convert far better."
        actions={unseen.length > 0 && <Button variant="secondary" icon={CheckCheck} onClick={markAllSeen}>Mark all seen</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Unseen" value={unseen.length} icon={MailOpen} tone={unseen.length ? "brand" : "slate"} sub="nobody has opened yet" onClick={() => setTab("unseen")} />
        <StatCard label="Waiting for first reply" value={unreplied.length} icon={Timer} tone={unreplied.length ? "rose" : "slate"} sub="no call or message yet" onClick={() => setTab("unreplied")} />
        <StatCard label="Replied within 15 min" value={`${replied.length ? Math.round((fast / replied.length) * 100) : 0}%`} icon={Zap} tone="emerald" sub={`average first reply ${replyLabel(avgReply)}`} />
        <StatCard label="Repeat enquiries" value={repeat.length} icon={Repeat} tone="violet" sub="same number enquired again" onClick={() => setTab("repeat")} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: "unreplied", label: "Needs reply", count: unreplied.length }, { value: "unseen", label: "Unseen", count: unseen.length }, { value: "repeat", label: "Repeat", count: repeat.length }, { value: "all", label: "Last 30 days", count: inbox.length }]} />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <SearchInput value={q} onChange={setQ} placeholder="Name, phone, service…" className="sm:w-64" />
            <Select value={source} onChange={(e) => setSource(e.target.value)} options={LEAD_SOURCES} placeholder="All sources" className="sm:w-44" />
          </div>
        </div>
        {rows.length === 0 ? <EmptyState icon={Inbox} title="Inbox clear" text="No enquiries in this view." /> : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pg.slice.map((l) => {
                const w = waitMins(l);
                const waiting = l.stage === "New" && l.firstReplyMins == null;
                return (
                  <div key={l.id} className={cx("flex flex-col gap-3 px-5 py-3.5 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40 lg:flex-row lg:items-center", l.seen === false && "bg-brand-50/40 dark:bg-brand-500/5")}>
                    <button onClick={() => open(l)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <span className="relative"><Avatar name={l.name} />{l.seen === false && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white dark:ring-slate-900" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={cx("truncate text-slate-900 dark:text-white", l.seen === false ? "font-bold" : "font-semibold")}>{l.name}</span>
                          {l.company && <span className="truncate text-sm text-slate-500">· {l.company}</span>}
                          {intel.repeat.has(phoneKey(l.phone)) && <RepeatBadge />}
                          <ScorePill s={intel.score[l.id]} />
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-slate-600 dark:text-slate-300">{(l.services || [l.service]).join(", ")}{l.budgetMax ? ` · budget up to ${inr(l.budgetMax)}` : ""}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400"><Globe className="h-3 w-3" />{l.source} · {SITES[l.site] || "Added in CRM"}{l.landingPage && ` › ${l.landingPage}`} · {l.city}</span>
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center gap-2 lg:w-[430px] lg:justify-end">
                      <span className="w-28 text-right text-xs">
                        <span className="block text-slate-500">{timeAgo(l.createdAt)}</span>
                        {waiting ? <span className={cx("font-semibold", w > 15 ? "text-rose-600" : "text-amber-600")}>waiting {replyLabel(w)}</span> : l.firstReplyMins != null ? <span className="text-emerald-600">replied in {replyLabel(l.firstReplyMins)}</span> : <StageBadge stage={l.stage} />}
                      </span>
                      <select value={l.ownerId} onChange={(e) => { update("leads", l.id, { ownerId: e.target.value }); toast(`Assigned to ${userById(e.target.value)?.name}`); }} className="input !h-8 !w-32 !py-0 text-xs" title="Assign owner">
                        {owners.map((u) => <option key={u.id} value={u.id}>{u.name.split(" ")[0]}</option>)}
                      </select>
                      <a href={telLink(l.phone)} onClick={() => setModal({ kind: "call", lead: l })}><Button size="sm" variant="secondary" icon={Phone}>Call</Button></a>
                      <Button size="sm" icon={MessageCircle} onClick={() => setModal({ kind: "wa", lead: l })}>Reply</Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination {...pg} onPage={pg.setPage} />
          </>
        )}
      </Card>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><UserPlus className="h-3.5 w-3.5" />Enquiries arrive here automatically once website forms / lead portals are connected in Apps & Integrations.</p>

      <LogCallModal lead={modal?.kind === "call" ? modal.lead : null} open={modal?.kind === "call"} onClose={() => setModal(null)} />
      <WhatsAppModal lead={modal?.kind === "wa" ? modal.lead : null} open={modal?.kind === "wa"} onClose={() => setModal(null)} />
      {openId && <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
