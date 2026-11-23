// Modals shared by All Leads, the lead drawer, Enquiries and Sales Desk.
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, PhoneCall, Send, X } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Field, Input, Modal, Select, Textarea, cx } from "../../components/ui";
import { addDays, fmtDate, fmtDateTime, todayISO, toISO, uid } from "../../utils/format";
import { fillTemplate, waText } from "./leadIntel";

export const CALL_RESULTS = ["Connected", "No answer", "Busy, call back", "Switched off", "Wrong number", "Just a note"];
export const PROPOSAL_STATUSES = ["Preparing", "Sent", "Negotiation", "Accepted", "Rejected"];
export const PROPOSAL_STYLE = {
  Preparing: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Sent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Negotiation: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Accepted: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Rejected: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** Small helpers that write lead activity + follow-ups consistently. */
export function useLeadActions() {
  const { update, add, user } = useStore();
  const act = (type, text) => ({ id: uid("a"), type, text, at: new Date().toISOString(), by: user.id });
  const log = (lead, type, text, patch = {}) => update("leads", lead.id, (l) => ({ ...patch, activities: [act(type, text), ...(l.activities || [])] }));
  const setFollowUp = (lead, date, note = "") => {
    update("leads", lead.id, (l) => ({
      nextFollowUp: date || "",
      activities: [act("note", date ? `Next follow-up set for ${fmtDate(date)}${note ? ` — ${note}` : ""}` : "Follow-up date removed"), ...(l.activities || [])],
    }));
    if (date) add("tasks", { title: `Follow-up — ${lead.company || lead.name}`, type: "Follow-up", date, time: "11:00", leadId: lead.id, assigneeId: lead.ownerId || user.id, done: false, notes: note }, "T");
  };
  /** Marks a fresh lead as contacted the first time someone reaches out */
  const touch = (lead) => {
    const patch = {};
    if (lead.stage === "New") patch.stage = "Contacted";
    if (lead.firstReplyMins == null) patch.firstReplyMins = Math.max(1, Math.round((Date.now() - new Date(lead.createdAt)) / 60000));
    if (lead.seen === false) patch.seen = true;
    return patch;
  };
  return { log, setFollowUp, touch, act };
}

/* ── Log call ─────────────────────────────────────────── */
export function LogCallModal({ lead, open, onClose }) {
  const { update, user } = useStore();
  const toast = useToast();
  const { touch, act } = useLeadActions();
  const [result, setResult] = useState("Connected");
  const [notes, setNotes] = useState("");
  const [next, setNext] = useState(addDays(todayISO(), 2));
  useEffect(() => { if (open) { setResult("Connected"); setNotes(""); setNext(addDays(todayISO(), 2)); } }, [open]);
  if (!lead) return null;
  const save = () => {
    const patch = result === "Just a note" ? {} : touch(lead);
    if (result === "Wrong number") Object.assign(patch, { stage: "Lost", lostReason: "Wrong number or spam", nextFollowUp: "" });
    else if (result !== "Connected" && lead.stage === "New" && result !== "Just a note") delete patch.stage; // only a real conversation counts as contacted
    if (next && result !== "Wrong number") patch.nextFollowUp = next;
    update("leads", lead.id, (l) => ({ ...patch, activities: [act(result === "Just a note" ? "note" : "call", `${result === "Just a note" ? "" : `Call — ${result}. `}${notes}`.trim()), ...(patch.stage && patch.stage !== l.stage ? [act("stage", `Stage moved from ${l.stage} to ${patch.stage}`)] : []), ...(l.activities || [])] }));
    toast(result === "Wrong number" ? "Marked as lost (wrong number)" : "Call logged");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Log call or note" subtitle={`${lead.name} · ${lead.phone}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={PhoneCall} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <div>
          <span className="label">Result</span>
          <div className="flex flex-wrap gap-1.5">
            {CALL_RESULTS.map((r) => (
              <button key={r} onClick={() => setResult(r)} className={cx("rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                result === r ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}>{r}</button>
            ))}
          </div>
        </div>
        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did they say? Budget, timeline, objections…" /></Field>
        {result !== "Wrong number" && (
          <Field label="Next follow-up">
            <div className="flex flex-wrap gap-2">
              <Input type="date" value={next} onChange={(e) => setNext(e.target.value)} className="w-44" />
              {[["Tomorrow", 1], ["3 days", 3], ["1 week", 7]].map(([l, d]) => <Button key={l} size="sm" variant="secondary" onClick={() => setNext(addDays(todayISO(), d))}>{l}</Button>)}
            </div>
          </Field>
        )}
        {result === "Wrong number" && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">This lead will be marked as Lost (wrong number or spam).</p>}
      </div>
    </Modal>
  );
}

/* ── WhatsApp template picker ─────────────────────────── */
export function WhatsAppModal({ lead, open, onClose, channel = "WhatsApp", amount }) {
  const { db, update, userById } = useStore();
  const toast = useToast();
  const { touch, act } = useLeadActions();
  const templates = (db.templates || []).filter((t) => t.channel === channel || channel === "any");
  const [tid, setTid] = useState("");
  const [text, setText] = useState("");
  const owner = lead ? userById(lead.ownerId)?.name : "";
  useEffect(() => {
    if (open && lead) { const t = templates[0]; setTid(t?.id || ""); setText(t ? fillTemplate(t.body, lead, { owner, amount }) : ""); }
  }, [open, lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lead) return null;
  const pickT = (id) => { setTid(id); const t = templates.find((x) => x.id === id); if (t) setText(fillTemplate(t.body, lead, { owner, amount })); };
  const send = () => {
    window.open(waText(lead.phone, text), "_blank", "noopener");
    const patch = touch(lead);
    const tName = templates.find((t) => t.id === tid)?.name || "Custom message";
    update("leads", lead.id, (l) => ({ ...patch, activities: [act("whatsapp", `WhatsApp sent — ${tName}`), ...(patch.stage && patch.stage !== l.stage ? [act("stage", `Stage moved from ${l.stage} to ${patch.stage}`)] : []), ...(l.activities || [])] }));
    toast("WhatsApp opened and logged");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Send WhatsApp" subtitle={`${lead.name} · +91 ${lead.phone}`} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="success" icon={Send} onClick={send} disabled={!text.trim()}>Open WhatsApp</Button></>}>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div className="space-y-1">
          <span className="label">Templates</span>
          {templates.map((t) => (
            <button key={t.id} onClick={() => pickT(t.id)} className={cx("w-full rounded-lg px-3 py-2 text-left text-sm transition", tid === t.id ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>{t.name}</button>
          ))}
        </div>
        <div>
          <span className="label">Message</span>
          <div className="rounded-xl bg-[#e7ddd3] p-3 dark:bg-slate-800">
            <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} className="!bg-[#dcf8c6] !border-transparent text-slate-800 dark:!bg-emerald-900/40 dark:text-slate-100" />
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400"><MessageCircle className="h-3.5 w-3.5" />Opens WhatsApp with this message. New leads move to Contacted.</p>
        </div>
      </div>
    </Modal>
  );
}

/* ── Follow-up date picker (mini calendar) ────────────── */
export function FollowUpModal({ lead, open, onClose }) {
  const toast = useToast();
  const { setFollowUp } = useLeadActions();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [month, setMonth] = useState(() => new Date());
  useEffect(() => { if (open && lead) { setDate(lead.nextFollowUp || addDays(todayISO(), 1)); setNote(""); setMonth(new Date(`${lead.nextFollowUp || todayISO()}T00:00:00`)); } }, [open, lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);
  if (!lead) return null;
  const today = todayISO();
  const save = () => { setFollowUp(lead, date, note); toast(`Follow-up set for ${fmtDate(date)}`); onClose(); };
  const clear = () => { setFollowUp(lead, ""); toast("Follow-up removed"); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Set follow-up" subtitle={`${lead.name} · ${lead.company || ""}`} size="sm"
      footer={<>{lead.nextFollowUp && <Button variant="ghost" icon={X} className="mr-auto text-rose-600" onClick={clear}>Remove</Button>}<Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!date}>Save follow-up</Button></>}>
      <div className="flex flex-wrap gap-1.5">
        {[["Today", 0], ["Tomorrow", 1], ["+3 days", 3], ["+1 week", 7]].map(([l, d]) => (
          <button key={l} onClick={() => { const x = addDays(today, d); setDate(x); setMonth(new Date(`${x}T00:00:00`)); }}
            className={cx("rounded-lg border px-2.5 py-1 text-xs font-semibold", date === addDays(today, d) ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300")}>{l}</button>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const iso = toISO(d); const inMonth = d.getMonth() === month.getMonth(); const past = iso < today;
            return (
              <button key={iso} disabled={past} onClick={() => setDate(iso)}
                className={cx("h-8 rounded-md text-xs font-medium transition", iso === date ? "bg-brand-600 text-white" : iso === today ? "ring-1 ring-brand-400 text-brand-700 dark:text-brand-300" : "",
                  !inMonth && "opacity-40", past ? "cursor-not-allowed text-slate-300 dark:text-slate-600" : iso !== date && "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800")}>{d.getDate()}</button>
            );
          })}
        </div>
      </div>
      <Field label="Note (optional)" className="mt-4"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Call after 5 PM, discuss pricing" /></Field>
    </Modal>
  );
}

/* ── Proposal status + comments ───────────────────────── */
export function ProposalModal({ lead, open, onClose }) {
  const { update, user, userById } = useStore();
  const toast = useToast();
  const [status, setStatus] = useState("Preparing");
  const [comment, setComment] = useState("");
  useEffect(() => { if (open && lead) { setStatus(lead.proposalStatus || "Preparing"); setComment(""); } }, [open, lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lead) return null;
  const save = () => {
    const entry = { id: uid("pl"), status, comment: comment.trim(), at: new Date().toISOString(), by: user.id };
    const stagePatch = status === "Sent" && ["New", "Contacted", "Qualified"].includes(lead.stage) ? { stage: "Proposal Sent" } : status === "Negotiation" && lead.stage !== "Won" ? { stage: "Negotiation" } : {};
    update("leads", lead.id, (l) => ({
      ...stagePatch, proposalStatus: status, proposalLog: [entry, ...(l.proposalLog || [])],
      activities: [{ id: uid("a"), type: "note", text: `Proposal ${status.toLowerCase()}${entry.comment ? ` — ${entry.comment}` : ""}`, at: entry.at, by: user.id }, ...(l.activities || [])],
    }));
    toast("Proposal status updated");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Proposal status" subtitle={`${lead.name} · ${lead.company || ""}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="flex flex-wrap gap-1.5">
        {PROPOSAL_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={cx("rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition", status === s ? `${PROPOSAL_STYLE[s]} ring-current` : "text-slate-500 ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800")}>{s}</button>
        ))}
      </div>
      <Field label="Comment" className="mt-4"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did the client say?" /></Field>
      {(lead.proposalLog || []).length > 0 && (
        <div className="mt-5">
          <p className="label">History</p>
          <ol className="space-y-2.5">
            {lead.proposalLog.map((p) => (
              <li key={p.id} className="flex gap-2.5 text-sm">
                <span className={cx("chip h-fit shrink-0", PROPOSAL_STYLE[p.status])}>{p.status}</span>
                <span className="min-w-0"><span className="block text-slate-700 dark:text-slate-200">{p.comment || "—"}</span><span className="text-xs text-slate-400">{fmtDateTime(p.at)} · {userById(p.by)?.name || "—"}</span></span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Modal>
  );
}

/* ── Assign / move pickers used by bulk bars ──────────── */
export function PickModal({ open, onClose, title, options, onPick, cta = "Apply" }) {
  const [v, setV] = useState("");
  useEffect(() => { if (open) setV(options[0]?.value ?? options[0] ?? ""); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => { onPick(v); onClose(); }}>{cta}</Button></>}>
      <Select value={v} onChange={(e) => setV(e.target.value)} options={options} />
    </Modal>
  );
}
