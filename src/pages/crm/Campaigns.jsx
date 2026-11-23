// Campaigns — WhatsApp / SMS / email broadcasts to a filtered audience, with delivery funnel.
import { useMemo, useState } from "react";
import { Megaphone, Plus, MessageCircle, Mail, Smartphone, Send, Users, Eye, MousePointerClick, Reply, Copy, Trash2, Pause, Play, CalendarClock, Info } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, Tabs, Badge, Modal, Field, Input, Textarea, Select, Menu, EmptyState, Progress, useConfirm, cx } from "../../components/ui";
import { LEAD_STAGES, LEAD_SOURCES } from "../../config/constants";
import { inr, fmtDate, todayISO, addDays } from "../../utils/format";

const CH = { WhatsApp: { icon: MessageCircle, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10", rate: 0.8 }, Email: { icon: Mail, tone: "text-sky-600 bg-sky-50 dark:bg-sky-500/10", rate: 0 }, SMS: { icon: Smartphone, tone: "text-violet-600 bg-violet-50 dark:bg-violet-500/10", rate: 0.25 } };
const STATUS_STYLE = { Draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", Scheduled: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", Running: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", Paused: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const empty = () => ({ name: "", channel: "WhatsApp", target: "contacts", ctype: "", stage: "", source: "", city: "", message: "Hi {name}, ", subject: "", when: "now", date: addDays(todayISO(), 1), time: "11:00" });

export default function Campaigns() {
  const { db, add, update, remove, user, log } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState(null);
  const [err, setErr] = useState({});
  const list = db.campaigns || [];
  const rows = list.filter((c) => tab === "all" || c.status === tab);
  const tot = list.reduce((a, c) => ({ sent: a.sent + c.sent, read: a.read + c.read, replied: a.replied + c.replied, leads: a.leads + c.leads, cost: a.cost + (c.cost || 0) }), { sent: 0, read: 0, replied: 0, leads: 0, cost: 0 });

  // Live audience for the form, respecting opt-in per channel
  const audience = useMemo(() => {
    if (!form) return [];
    const optOk = (c) => (form.channel === "Email" ? c.emailOptIn && c.email : form.channel === "WhatsApp" ? c.whatsappOptIn : !!c.phone);
    if (form.target === "contacts") return (db.contacts || []).filter((c) => (!form.ctype || c.type === form.ctype) && (!form.city || c.city === form.city) && optOk(c));
    return db.leads.filter((l) => (!form.stage || l.stage === form.stage) && (!form.source || l.source === form.source) && (!form.city || l.city === form.city) && (form.channel !== "Email" || l.email));
  }, [form, db.contacts, db.leads]);
  const cities = [...new Set((db.contacts || []).map((c) => c.city).filter(Boolean))];

  const save = (asDraft) => {
    const e = {};
    if (!form.name.trim()) e.name = "Give the campaign a name";
    if (form.message.trim().length < 10) e.message = "Write the message";
    if (!asDraft && !audience.length) e.audience = "No one matches this audience";
    setErr(e);
    if (Object.keys(e).length) return;
    const now = !asDraft && form.when === "now";
    const size = audience.length;
    const sent = now ? size : 0;
    const label = form.target === "contacts" ? [form.ctype || "All contacts", form.city].filter(Boolean).join(" · ") : ["Leads", form.stage, form.source, form.city].filter(Boolean).join(" · ");
    add("campaigns", {
      name: form.name, channel: form.channel, status: asDraft ? "Draft" : now ? "Running" : "Scheduled", audience: label, audienceSize: size,
      sent, delivered: Math.round(sent * 0.96), read: 0, clicked: 0, replied: 0, leads: 0, scheduledAt: now ? todayISO() : form.date, time: form.time,
      createdBy: user.id, cost: Math.round(size * CH[form.channel].rate), message: form.message, subject: form.subject,
    }, "CM");
    log("created", "Campaign", `${form.name} · ${form.channel} · ${size} recipients`);
    toast(asDraft ? "Saved as draft" : now ? `Sending to ${size} people (demo)` : `Scheduled for ${fmtDate(form.date)} ${form.time}`);
    setForm(null);
  };
  const preview = (form?.message || "").replace(/{name}/g, audience[0]?.name?.split(" ")[0] || "Rahul").replace(/{company}/g, db.settings.company.name);

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Send offers, reminders and newsletters to the right people — only those who agreed to receive them."
        actions={<Button icon={Plus} onClick={() => { setErr({}); setForm(empty()); }}>New campaign</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Messages sent" value={tot.sent.toLocaleString("en-IN")} icon={Send} sub={`${list.length} campaigns`} />
        <StatCard label="Read rate" value={`${pct(tot.read, tot.sent)}%`} icon={Eye} tone="sky" sub={`${tot.read.toLocaleString("en-IN")} opened`} />
        <StatCard label="Replies" value={tot.replied} icon={Reply} tone="emerald" sub={`${pct(tot.replied, tot.read)}% of readers replied`} />
        <StatCard label="Leads generated" value={tot.leads} icon={Users} tone="violet" sub={`${inr(tot.cost)} spent`} />
      </div>

      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={["all", "Running", "Scheduled", "Completed", "Draft"].map((v) => ({ value: v, label: v === "all" ? "All" : v, count: v === "all" ? list.length : list.filter((c) => c.status === v).length }))} />

      {rows.length === 0 ? <Card><EmptyState icon={Megaphone} title="No campaigns here" text="Create one to reach many customers at once." /></Card> : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map((c) => {
            const C = CH[c.channel] || CH.WhatsApp;
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", C.tone)}><C.icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{c.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500"><span>{c.channel}</span>·<span>{c.audience}</span>·<span>{c.audienceSize.toLocaleString("en-IN")} people</span></p>
                  </div>
                  <Badge className={STATUS_STYLE[c.status]}>{c.status}</Badge>
                  <Menu items={[
                    ["Running", "Scheduled"].includes(c.status) && { label: "Pause", icon: Pause, onClick: () => update("campaigns", c.id, { status: "Paused" }) },
                    ["Paused", "Draft"].includes(c.status) && { label: c.status === "Draft" ? "Send now" : "Resume", icon: Play, onClick: () => { update("campaigns", c.id, { status: "Running", sent: c.sent || c.audienceSize, delivered: c.delivered || Math.round(c.audienceSize * 0.96) }); toast("Sending (demo)"); } },
                    { label: "Duplicate", icon: Copy, onClick: () => { setErr({}); setForm({ ...empty(), name: `${c.name} (copy)`, channel: c.channel, message: c.message || "", subject: c.subject || "" }); } },
                    { label: "Delete", icon: Trash2, danger: true, onClick: async () => { if (await confirm({ title: `Delete “${c.name}”?` })) { remove("campaigns", c.id); toast("Deleted"); } } },
                  ]} />
                </div>
                {c.sent > 0 ? (
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {[["Sent", c.sent, c.audienceSize, Send], ["Delivered", c.delivered, c.sent, Send], ["Read", c.read, c.delivered, Eye], ["Replied", c.replied, c.read, Reply]].map(([k, v, base, I]) => (
                      <div key={k}>
                        <p className="flex items-center gap-1 text-[11px] font-medium text-slate-500"><I className="h-3 w-3" />{k}</p>
                        <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{v.toLocaleString("en-IN")}</p>
                        <Progress value={pct(v, base)} className="mt-1" />
                        <p className="mt-0.5 text-[11px] text-slate-400">{pct(v, base)}%</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300"><CalendarClock className="h-4 w-4 text-slate-400" />{c.status === "Draft" ? "Draft — not sent yet" : `Goes out on ${fmtDate(c.scheduledAt)}${c.time ? ` at ${c.time}` : ""}`}</p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                  <span className="flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" />{c.clicked} clicks · {c.leads} new leads</span>
                  <span>{c.cost ? inr(c.cost) : "Free"} · {fmtDate(c.scheduledAt)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="New campaign" size="xl"
        footer={<><Button variant="secondary" onClick={() => save(true)}>Save draft</Button><Button icon={form?.when === "now" ? Send : CalendarClock} onClick={() => save(false)}>{form?.when === "now" ? `Send to ${audience.length}` : "Schedule"}</Button></>}>
        {form && (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              <Field label="Campaign name" required error={err.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diwali offer 2026" autoFocus /></Field>
              <div>
                <span className="label">Channel</span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CH).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => setForm({ ...form, channel: k })} className={cx("flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition", form.channel === k ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300")}>
                      <v.icon className="h-4 w-4" />{k}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-3 flex items-center justify-between"><span className="label !mb-0">Audience</span><Tabs value={form.target} onChange={(v) => setForm({ ...form, target: v })} tabs={[{ value: "contacts", label: "Contacts" }, { value: "leads", label: "Leads" }]} /></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {form.target === "contacts"
                    ? <Select value={form.ctype} onChange={(e) => setForm({ ...form, ctype: e.target.value })} placeholder="All types" options={["Customer", "Prospect", "Partner", "Vendor"]} />
                    : <><Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} placeholder="Any stage" options={LEAD_STAGES} /><Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Any source" options={LEAD_SOURCES} /></>}
                  <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Any city" options={cities} />
                </div>
                <p className={cx("mt-3 flex items-center gap-2 text-sm font-semibold", audience.length ? "text-emerald-600" : "text-rose-600")}><Users className="h-4 w-4" />{audience.length} people will receive this{err.audience && ` — ${err.audience}`}</p>
                {form.target === "contacts" && <p className="mt-1 text-xs text-slate-400">Only contacts who agreed to {form.channel} messages are counted.</p>}
              </div>
              {form.channel === "Email" && <Field label="Subject line"><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>}
              <Field label="Message" required error={err.message} hint="Use {name} and {company} — filled in for each person"><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
              <div className="flex flex-wrap items-center gap-3">
                <Tabs value={form.when} onChange={(v) => setForm({ ...form, when: v })} tabs={[{ value: "now", label: "Send now" }, { value: "later", label: "Schedule" }]} />
                {form.when === "later" && <><Input type="date" value={form.date} min={todayISO()} onChange={(e) => setForm({ ...form, date: e.target.value })} className="!w-40" /><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="!w-28" /></>}
              </div>
            </div>
            <div>
              <span className="label">Preview</span>
              <div className="rounded-2xl bg-[#e5ddd5] p-4 dark:bg-slate-800">
                <div className="ml-auto max-w-[95%] rounded-xl rounded-tr-sm bg-white p-3 text-sm shadow-sm dark:bg-slate-900">
                  {form.channel === "Email" && form.subject && <p className="mb-1 font-semibold">{form.subject}</p>}
                  <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-100">{preview || "Your message…"}</p>
                  <p className="mt-1 text-right text-[10px] text-slate-400">11:00 ✓✓</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                <p className="flex justify-between"><span>Recipients</span><b>{audience.length}</b></p>
                <p className="flex justify-between"><span>Estimated cost</span><b>{inr(Math.round(audience.length * CH[form.channel].rate))}</b></p>
                {form.channel === "WhatsApp" && <p className="flex gap-1.5 pt-1 text-slate-400"><Info className="mt-0.5 h-3 w-3 shrink-0" />Uses an approved WhatsApp Business template. Connect it in Apps & Integrations.</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
