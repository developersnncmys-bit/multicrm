// Sales Desk — a focused calling screen. Left: today's call queue (ranked).
// Right: one lead at a time with score reasons, a talk script, templates and one-click actions.
import { useMemo, useState } from "react";
import { Headset, Phone, MessageCircle, CalendarClock, FileText, SkipForward, PhoneCall, PhoneOff, Send, Target, Lightbulb, History, Mail } from "lucide-react";
import { useStore } from "../../store/store";
import { Button, Card, CardHeader, PageHeader, StatCard, Tabs, Badge, Avatar, EmptyState, cx } from "../../components/ui";
import { inr, timeAgo, todayISO } from "../../utils/format";
import { useLeadIntel, priorityOf, OPEN, fillTemplate } from "../leads/leadIntel";
import { ScorePill, NextStep, StageBadge, telLink } from "../leads/leadHelpers";
import { LogCallModal, WhatsAppModal, FollowUpModal, ProposalModal } from "../leads/LeadModals";
import LeadDrawer from "../leads/LeadDrawer";

// What to say, by stage — editable later from Settings once scripts are stored in the backend
const SCRIPTS = {
  New: ["Thank them for the enquiry and confirm what they need.", "Ask: timeline, budget range, who decides.", "Offer a short meeting or demo — book it before ending the call."],
  Contacted: ["Recap the last conversation in one line.", "Share 1–2 relevant examples / references.", "Agree on the next step and a date."],
  Qualified: ["Confirm scope and budget fit.", "Tell them when the quotation will reach them.", "Ask who else needs to see it."],
  "Proposal Sent": ["Ask if they went through the quotation.", "Handle doubts: price, timeline, scope.", "Ask for a decision date; offer a call with the decision maker."],
  Negotiation: ["Find the one thing blocking yes.", "Offer options (phased payment / reduced scope), not a straight discount.", "Close: confirm advance amount and start date."],
};

export default function SalesDesk() {
  const { db, user } = useStore();
  const intel = useLeadIntel(db);
  const today = todayISO();
  const [scope, setScope] = useState(user.role === "Admin" ? "all" : "mine");
  const [filter, setFilter] = useState("queue");
  const [currentId, setCurrentId] = useState(null);
  const [skipped, setSkipped] = useState([]);
  const [modal, setModal] = useState(null);
  const [drawer, setDrawer] = useState(false);

  const queue = useMemo(() => db.leads
    .filter((l) => OPEN(l) && (scope === "all" || l.ownerId === user.id) && !skipped.includes(l.id))
    .filter((l) => ({
      queue: (l.stage === "New" && l.firstReplyMins == null) || (l.nextFollowUp && l.nextFollowUp <= today) || intel.meetingToday[l.id],
      hot: intel.score[l.id]?.band === "Hot",
      closing: ["Proposal Sent", "Negotiation"].includes(l.stage),
      all: true,
    }[filter]))
    .sort((a, b) => priorityOf(b, intel) - priorityOf(a, intel)),
  [db.leads, intel, scope, filter, skipped, user.id, today]);
  const lead = db.leads.find((l) => l.id === currentId && queue.some((x) => x.id === l.id)) || queue[0];

  // Today's scoreboard from activity logs
  const mineToday = db.leads.flatMap((l) => (l.activities || []).filter((a) => a.at?.slice(0, 10) === today && (scope === "all" || a.by === user.id)));
  const calls = mineToday.filter((a) => a.type === "call");
  const connected = calls.filter((a) => /Connected/.test(a.text)).length;
  const messages = mineToday.filter((a) => ["whatsapp", "email"].includes(a.type)).length;
  const target = 40;

  const next = () => { if (lead) setSkipped((s) => [...s, lead.id]); setCurrentId(null); };
  const templates = (db.templates || []).filter((t) => t.channel === "WhatsApp").slice(0, 6);

  return (
    <div>
      <PageHeader title="Sales Desk" subtitle="Your calling desk — work the queue top to bottom. Every call, message and follow-up is logged on the lead automatically."
        actions={["Admin", "Sales Manager"].includes(user.role) && <Tabs value={scope} onChange={setScope} tabs={[{ value: "mine", label: "My leads" }, { value: "all", label: "All leads" }]} />} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Calls today" value={`${calls.length}/${target}`} icon={PhoneCall} sub={`${Math.round((calls.length / target) * 100)}% of daily target`} />
        <StatCard label="Connected" value={connected} icon={Phone} tone="emerald" sub={`${calls.length ? Math.round((connected / calls.length) * 100) : 0}% pick-up rate`} />
        <StatCard label="Messages sent" value={messages} icon={Send} tone="sky" sub="WhatsApp & email today" />
        <StatCard label="Left in queue" value={queue.length} icon={Target} tone={queue.length ? "amber" : "slate"} sub={skipped.length ? `${skipped.length} skipped` : "ranked by priority"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="flex max-h-[calc(100vh-150px)] flex-col">
          <div className="border-b border-slate-100 p-3 dark:border-slate-800">
            <Tabs value={filter} onChange={(v) => { setFilter(v); setCurrentId(null); }} tabs={[{ value: "queue", label: "Due now" }, { value: "hot", label: "Hot" }, { value: "closing", label: "Closing" }, { value: "all", label: "All open" }]} />
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {queue.length === 0 && <EmptyState icon={Headset} title="Queue empty" text={skipped.length ? "You skipped the rest." : "Nothing due right now."} action={skipped.length > 0 && <Button size="sm" variant="secondary" onClick={() => setSkipped([])}>Bring back skipped</Button>} />}
            {queue.slice(0, 60).map((l) => (
              <button key={l.id} onClick={() => setCurrentId(l.id)} className={cx("flex w-full items-start gap-3 px-4 py-3 text-left transition", lead?.id === l.id ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40")}>
                <Avatar name={l.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{l.name}</span><ScorePill s={intel.score[l.id]} /></span>
                  <span className="block truncate text-xs text-slate-500">{l.company} · {inr(l.value)}</span>
                  <NextStep n={intel.next[l.id]} />
                </span>
              </button>
            ))}
          </div>
        </Card>

        {!lead ? <Card><EmptyState icon={Headset} title="Pick a lead from the queue" /></Card> : (
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar name={lead.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{lead.name}</h2><StageBadge stage={lead.stage} /><ScorePill s={intel.score[lead.id]} /></div>
                  <p className="text-sm text-slate-500">{lead.company} · {lead.city} · via {lead.source} · {timeAgo(lead.createdAt)}</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200"><b>{(lead.services || [lead.service]).join(", ")}</b> · {inr(lead.value)}{lead.budgetMax ? ` (budget up to ${inr(lead.budgetMax)})` : ""}</p>
                  {lead.requirement && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">“{lead.requirement}”</p>}
                  <NextStep n={intel.next[lead.id]} className="mt-2 block" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDrawer(true)}>Full profile</Button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <a href={telLink(lead.phone)} onClick={() => setModal("call")} className="col-span-2 sm:col-span-1"><Button icon={Phone} className="w-full">Call {lead.phone}</Button></a>
                <Button variant="secondary" icon={PhoneOff} onClick={() => setModal("call")}>Log result</Button>
                <Button variant="secondary" icon={MessageCircle} onClick={() => setModal("wa")}>WhatsApp</Button>
                <Button variant="secondary" icon={CalendarClock} onClick={() => setModal("fu")}>Follow-up</Button>
                <Button variant="secondary" icon={FileText} onClick={() => setModal("proposal")}>Proposal</Button>
                <Button variant="soft" icon={SkipForward} onClick={next}>Next lead</Button>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="What to say" subtitle={`Script for ${lead.stage}`} action={<Lightbulb className="h-4 w-4 text-amber-500" />} />
                <ol className="space-y-2 p-5 pt-3 text-sm">
                  {(SCRIPTS[lead.stage] || SCRIPTS.Contacted).map((s, i) => <li key={i} className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{i + 1}</span><span className="text-slate-700 dark:text-slate-200">{s}</span></li>)}
                </ol>
              </Card>
              <Card>
                <CardHeader title="Why this score" subtitle="What pushes this lead up or down" />
                <div className="space-y-1.5 p-5 pt-3">
                  {(intel.score[lead.id]?.parts || []).map((p, i) => (
                    <p key={i} className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-300">{p.label}</span><span className={cx("font-semibold tabular-nums", p.pts >= 0 ? "text-emerald-600" : "text-rose-600")}>{p.pts > 0 ? "+" : ""}{p.pts}</span></p>
                  ))}
                </div>
              </Card>
              <Card>
                <CardHeader title="Quick messages" subtitle="Tap to preview & send on WhatsApp" />
                <div className="space-y-2 p-5 pt-3">
                  {templates.map((t) => (
                    <button key={t.id} onClick={() => setModal("wa")} className="w-full rounded-lg border border-slate-100 p-2.5 text-left hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-800 dark:hover:bg-brand-500/5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.name}</p>
                      <p className="line-clamp-1 text-xs text-slate-500">{fillTemplate(t.body, lead)}</p>
                    </button>
                  ))}
                </div>
              </Card>
              <Card>
                <CardHeader title="History" subtitle="Latest first" action={<History className="h-4 w-4 text-slate-400" />} />
                <div className="max-h-72 space-y-3 overflow-y-auto p-5 pt-3">
                  {(lead.activities || []).slice(0, 10).map((a) => (
                    <div key={a.id} className="flex gap-2.5 text-sm">
                      <span className="mt-0.5">{a.type === "call" ? <Phone className="h-3.5 w-3.5 text-emerald-500" /> : a.type === "email" ? <Mail className="h-3.5 w-3.5 text-sky-500" /> : <MessageCircle className="h-3.5 w-3.5 text-slate-400" />}</span>
                      <div><p className="text-slate-700 dark:text-slate-200">{a.text}</p><p className="text-xs text-slate-400">{timeAgo(a.at)}</p></div>
                    </div>
                  ))}
                  {!(lead.activities || []).length && <Badge>No history yet</Badge>}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      <LogCallModal lead={modal === "call" ? lead : null} open={modal === "call"} onClose={() => setModal(null)} />
      <WhatsAppModal lead={modal === "wa" ? lead : null} open={modal === "wa"} onClose={() => setModal(null)} />
      <FollowUpModal lead={modal === "fu" ? lead : null} open={modal === "fu"} onClose={() => setModal(null)} />
      <ProposalModal lead={modal === "proposal" ? lead : null} open={modal === "proposal"} onClose={() => setModal(null)} />
      {drawer && lead && <LeadDrawer leadId={lead.id} onClose={() => setDrawer(false)} />}
    </div>
  );
}
