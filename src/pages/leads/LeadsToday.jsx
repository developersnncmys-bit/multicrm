import { useMemo, useState } from "react";
import { Sparkles, PhoneOff, CalendarClock, FileClock, Flame, Trophy, Phone, MessageCircle, Clock3, Video, Copy, CalendarX, Trash2, ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, Button, Card, CardHeader, EmptyState, Select, cx } from "../../components/ui";
import { compactInr, daysBetween, inr, monthKey, todayISO } from "../../utils/format";
import { ScorePill, NextStep, telLink } from "./leadHelpers";
import { MEETING_TYPES, OPEN, QUOTED_STAGES, priorityOf } from "./leadIntel";

const AGE_BUCKETS = [["Today", 0, 0, "bg-emerald-500"], ["1–7 days", 1, 7, "bg-sky-500"], ["8–30 days", 8, 30, "bg-amber-500"], ["31–90 days", 31, 90, "bg-orange-500"], ["90+ days", 91, 1e9, "bg-rose-500"]];

export default function LeadsToday({ leads, intel, views, goView, onOpen, onCall, onWa, onLater }) {
  const { db, userById } = useStore();
  const today = todayISO();
  const thisMonth = monthKey(today);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const count = (id) => leads.filter(views.find((v) => v.id === id).fn);

  const t = useMemo(() => {
    const newToday = count("new-today");
    const srcTop = Object.entries(newToday.reduce((a, l) => ({ ...a, [l.source]: (a[l.source] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
    const notContacted = count("not-contacted");
    const quoted = count("quoted-quiet");
    const hot = count("hot");
    const monthLeads = leads.filter((l) => monthKey(l.createdAt) === thisMonth);
    const wonMonth = leads.filter((l) => l.stage === "Won" && monthKey(intel.last[l.id]) === thisMonth);
    return {
      tiles: [
        { id: "new-today", label: "New today", value: newToday.length, sub: srcTop.length ? `Top: ${srcTop.join(", ")}` : "No new enquiries yet", icon: Sparkles, tone: "text-sky-600 bg-sky-50 dark:bg-sky-500/10" },
        { id: "not-contacted", label: "Not contacted yet", value: notContacted.length, sub: `${notContacted.filter((l) => daysBetween(l.createdAt.slice(0, 10), today) > 14).length} older than 14 days`, icon: PhoneOff, tone: "text-rose-600 bg-rose-50 dark:bg-rose-500/10" },
        { id: "fu-today", label: "Follow-ups today", value: count("fu-today").length, sub: `+${count("fu-overdue").length} overdue`, icon: CalendarClock, tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
        { id: "quoted-quiet", label: "Quoted, no reply", value: quoted.length, sub: `${compactInr(quoted.reduce((s, l) => s + (l.value || 0), 0))} waiting`, icon: FileClock, tone: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
        { id: "hot", label: "Hot leads", value: hot.length, sub: `${compactInr(hot.reduce((s, l) => s + (l.value || 0), 0))} in play`, icon: Flame, tone: "text-orange-600 bg-orange-50 dark:bg-orange-500/10" },
        { id: "won", label: "Won this month", value: wonMonth.length, sub: `${compactInr(wonMonth.reduce((s, l) => s + (l.value || 0), 0))} · ${monthLeads.length ? Math.round((wonMonth.length / monthLeads.length) * 100) : 0}% of enquiries`, icon: Trophy, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
      ],
      queue: leads.filter((l) => OPEN(l) && (l.stage === "New" || (l.nextFollowUp && l.nextFollowUp <= today) || intel.meetingToday[l.id] || intel.score[l.id]?.band === "Hot"))
        .sort((a, b) => priorityOf(b, intel) - priorityOf(a, intel)),
      funnel: [
        ["Enquiries", monthLeads.length], ["Contacted", monthLeads.filter((l) => l.stage !== "New").length],
        ["Quoted", monthLeads.filter((l) => [...QUOTED_STAGES, "Won"].includes(l.stage) || ["Sent", "Negotiation", "Accepted"].includes(l.proposalStatus)).length],
        ["Won", monthLeads.filter((l) => l.stage === "Won").length],
      ],
      age: AGE_BUCKETS.map(([label, a, b, c]) => [label, leads.filter((l) => OPEN(l) && (() => { const d = daysBetween(l.createdAt.slice(0, 10), today); return d >= a && d <= b; })()).length, c]),
      decide: [
        { id: "repeat", label: "Same number again", icon: Copy, n: count("repeat").length },
        { id: "no-fu", label: "No follow-up date", icon: CalendarX, n: count("no-fu").length },
        { id: "idle", label: "Clean up old leads (30+ days idle)", icon: Trash2, n: count("idle").length },
      ],
    };
  }, [leads, intel, views, today, thisMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const meetings = (db.tasks || []).filter((x) => x.date === today && MEETING_TYPES.includes(x.type) && x.status !== "Cancelled").sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const pages = Math.max(1, Math.ceil(t.queue.length / size));
  const pg = Math.min(page, pages);
  const slice = t.queue.slice((pg - 1) * size, pg * size);
  const ageTotal = t.age.reduce((s, a) => s + a[1], 0) || 1;
  const funnelMax = t.funnel[0][1] || 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {t.tiles.map((x) => (
          <button key={x.id} onClick={() => goView(x.id)} className="card group p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop dark:hover:border-brand-500/40">
            <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-slate-500">{x.label}</span><span className={cx("flex h-8 w-8 items-center justify-center rounded-lg", x.tone)}><x.icon className="h-4 w-4" /></span></div>
            <p className="mt-2 text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">{x.value}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{x.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <CardHeader title="Your list for today" subtitle={`${t.queue.length} leads ranked by score, urgency and value`} action={<Select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }} options={[10, 20, 50].map((n) => ({ value: n, label: `${n} / page` }))} className="!h-8 !w-28 !py-1 text-xs" />} />
          {slice.length === 0 ? <EmptyState icon={ListChecks} title="Nothing urgent" text="No new, hot or due leads right now. Great job!" /> : (
            <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {slice.map((l, i) => (
                <li key={l.id} onClick={() => onOpen(l.id)} className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:flex-nowrap">
                  <span className="w-5 text-right text-xs font-bold tabular-nums text-slate-400">{(pg - 1) * size + i + 1}</span>
                  <Avatar name={l.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{l.name}<span className="truncate font-normal text-slate-400">· {l.company || l.service}</span></p>
                    <NextStep n={intel.next[l.id]} />
                  </div>
                  <ScorePill s={intel.score[l.id]} />
                  <span className="hidden w-24 text-right text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200 lg:block">{inr(l.value)}</span>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <a href={telLink(l.phone)} onClick={() => onCall(l)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700"><Phone className="h-3.5 w-3.5" />Call</a>
                    <Button size="sm" variant="secondary" icon={MessageCircle} onClick={() => onWa(l)}>WhatsApp</Button>
                    <Button size="sm" variant="ghost" icon={Clock3} onClick={() => onLater(l)} title="Move follow-up to tomorrow">Later</Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2.5 text-sm dark:border-slate-800">
              <Button size="icon" variant="ghost" disabled={pg <= 1} onClick={() => setPage(pg - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-slate-600 dark:text-slate-300">{pg} / {pages}</span>
              <Button size="icon" variant="ghost" disabled={pg >= pages} onClick={() => setPage(pg + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Meetings today" subtitle={`${meetings.length} scheduled`} />
            <div className="space-y-1 p-3">
              {meetings.length === 0 && <p className="py-4 text-center text-sm text-slate-500">No meetings today</p>}
              {meetings.map((m) => (
                <button key={m.id} onClick={() => m.leadId && onOpen(m.leadId)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="flex h-9 w-12 flex-col items-center justify-center rounded-lg bg-violet-50 text-[11px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><Video className="mb-0.5 h-3 w-3" />{m.time}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{m.title}</span><span className="text-xs text-slate-500">{m.type} · {userById(m.assigneeId)?.name || "—"}{m.done ? " · Done" : ""}</span></span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Needs a decision" subtitle="Clean data = better follow-ups" />
            <div className="space-y-1 p-3">
              {t.decide.map((d) => (
                <button key={d.id} onClick={() => goView(d.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <d.icon className="h-4 w-4 text-slate-400" /><span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{d.label}</span>
                  <span className={cx("rounded-full px-2 py-0.5 text-xs font-bold", d.n ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>{d.n}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Open leads by age</h3>
          <p className="text-xs text-slate-500">Older leads convert less — work them or clean them up</p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            {t.age.map(([label, n, c]) => n > 0 && <div key={label} className={c} style={{ width: `${(n / ageTotal) * 100}%` }} title={`${label}: ${n}`} />)}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {t.age.map(([label, n, c]) => (
              <div key={label}><span className={cx("mb-1 block h-1.5 w-6 rounded-full", c)} /><p className="text-lg font-bold text-slate-900 dark:text-white">{n}</p><p className="text-[11px] text-slate-500">{label}</p></div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">This month's funnel</h3>
          <p className="text-xs text-slate-500">Enquiries received this month and how far they got</p>
          <div className="mt-4 space-y-2.5">
            {t.funnel.map(([label, n], i) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-20 text-sm text-slate-600 dark:text-slate-300">{label}</span>
                <div className="h-7 flex-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  <div className="flex h-full items-center rounded-md bg-brand-500 px-2 text-xs font-bold text-white transition-all" style={{ width: `${Math.max(6, (n / funnelMax) * 100)}%`, opacity: 1 - i * 0.15 }}>{n}</div>
                </div>
                <span className="w-12 text-right text-xs font-semibold text-slate-500">{i === 0 ? "" : `${t.funnel[0][1] ? Math.round((n / t.funnel[0][1]) * 100) : 0}%`}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
