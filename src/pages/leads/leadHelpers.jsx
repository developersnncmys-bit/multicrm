// Shared lead helpers: stage changes (with activity log), Lost-reason modal, Won → project.
import { useState } from "react";
import { firstStage, milestoneTitles } from "../../config/workspace";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Field, Modal, Select, Textarea, Badge, cx } from "../../components/ui";
import { STAGE_STYLE, STAGE_DOT, PRIORITY_STYLE } from "../../config/constants";
import { uid, addDays, todayISO, daysBetween, fmtDate } from "../../utils/format";
import { BAND_STYLE, TONE_TEXT } from "./leadIntel";

export const STAGE_PROB = { New: 10, Contacted: 20, Qualified: 40, "Proposal Sent": 60, Negotiation: 80, Won: 100, Lost: 0 };
export const LOST_REASONS = ["Not responding", "Budget too low", "Went with another agency", "Just enquiring", "Timeline not suitable", "Did it in-house", "Project cancelled", "Wrong number or spam"];

export const StageBadge = ({ stage }) => (
  <Badge className={cx("ring-1 ring-inset", STAGE_STYLE[stage])} dot={STAGE_DOT[stage]}>{stage}</Badge>
);
export const PriorityChip = ({ priority }) => <Badge className={PRIORITY_STYLE[priority]}>{priority}</Badge>;

export function FollowUp({ date, className }) {
  if (!date) return <span className={cx("text-slate-400", className)}>—</span>;
  const d = daysBetween(todayISO(), date);
  const tone = d < 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : d === 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-slate-600 dark:text-slate-300";
  const label = d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Today" : d === 1 ? "Tomorrow" : fmtDate(date);
  return <span className={cx("text-sm", tone, className)}>{label}</span>;
}

export const waLink = (phone) => `https://wa.me/91${String(phone || "").replace(/\D/g, "").slice(-10)}`;
export const telLink = (phone) => `tel:+91${String(phone || "").replace(/\D/g, "").slice(-10)}`;

/** Hook returning stage-change helpers. `requestStage(lead, stage)` handles Lost reasons + Won project prompt via modals rendered by <StageModals/>. */
export function useStageChange() {
  const { update, add, notify, user, db } = useStore();
  const toast = useToast();
  const [lostFor, setLostFor] = useState(null); // { lead, stage }
  const [wonFor, setWonFor] = useState(null);   // lead

  const applyStage = (lead, stage, extra = {}) => {
    if (lead.stage === stage) return;
    const text = stage === "Lost" ? `Stage changed to Lost — ${extra.lostReason}` : `Stage moved from ${lead.stage} to ${stage}`;
    update("leads", lead.id, (l) => ({
      stage,
      ...extra,
      nextFollowUp: ["Won", "Lost"].includes(stage) ? "" : l.nextFollowUp,
      activities: [{ id: uid("a"), type: "stage", text, at: new Date().toISOString(), by: user.id }, ...(l.activities || [])],
    }));
    toast(`${lead.name} moved to ${stage}`);
    if (stage === "Won") notify("Deal won 🎉", `${lead.company} — ${lead.service}`, "/leads");
  };

  const requestStage = (lead, stage) => {
    if (!lead || lead.stage === stage) return;
    if (stage === "Lost") return setLostFor({ lead, stage });
    applyStage(lead, stage, { lostReason: "" });
    if (stage === "Won" && !db.projects.some((p) => p.leadId === lead.id)) setWonFor(lead);
  };

  const createProject = (lead) => {
    const start = todayISO();
    add("projects", {
      name: `${lead.company || lead.name} — ${lead.service}`, client: lead.company || lead.name, contact: lead.name, phone: lead.phone,
      leadId: lead.id, service: lead.service, stage: firstStage(), startDate: start, deadline: addDays(start, 45), value: Number(lead.value) || 0,
      managerId: "u6", team: [], branch: lead.branch,
      milestones: milestoneTitles().map((t, k) => ({ id: `m${k}`, title: t, done: false })),
      notes: "",
    }, "P");
    toast("Project created from this deal");
  };

  const modals = (
    <>
      <LostModal open={!!lostFor} lead={lostFor?.lead} onClose={() => setLostFor(null)}
        onConfirm={(reason) => { applyStage(lostFor.lead, "Lost", { lostReason: reason }); setLostFor(null); }} />
      <Modal open={!!wonFor} onClose={() => setWonFor(null)} title="Deal won 🎉" size="sm"
        footer={<><Button variant="secondary" onClick={() => setWonFor(null)}>Not now</Button><Button onClick={() => { createProject(wonFor); setWonFor(null); }}>Create project</Button></>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">Great work! Do you want to start a delivery project for <b>{wonFor?.company}</b> ({wonFor?.service}) right away?</p>
      </Modal>
    </>
  );
  return { requestStage, modals, createProject };
}

export function LostModal({ open, lead, onClose, onConfirm, count }) {
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const [note, setNote] = useState("");
  return (
    <Modal open={open} onClose={onClose} title={count ? "Mark leads as Lost" : "Mark lead as Lost"} subtitle={count ? `${count} selected leads` : lead ? `${lead.name} · ${lead.company}` : ""} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => { onConfirm(note ? `${reason} (${note})` : reason); setNote(""); }}>Mark as Lost</Button></>}>
      <div className="space-y-4">
        <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)} options={LOST_REASONS} /></Field>
        <Field label="Notes (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering for next time…" /></Field>
      </div>
    </Modal>
  );
}

/* Lead score pill + next-step text (see leadIntel.js) */
export function ScorePill({ s, className }) {
  if (!s) return null;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ring-1 ring-inset", BAND_STYLE[s.band], className)} title={`${s.band} lead`}>
      {s.score}<span className="font-semibold opacity-70">{s.band}</span>
    </span>
  );
}
export const NextStep = ({ n, className }) => (n ? <span className={cx("text-xs font-medium", TONE_TEXT[n.tone], className)}>{n.text}</span> : null);
export const RepeatBadge = () => <span className="rounded bg-violet-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">Repeat</span>;
