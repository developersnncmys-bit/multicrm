// Add / edit project modal with full financials + stage auto-rules.
import { useState } from "react";
import { firstStage, liveStage } from "../../config/workspace";
import { useStore } from "../../store/store";
import { Button, Field, Input, Modal, Select, Textarea, Toggle } from "../../components/ui";
import { BRANCHES, LEAD_SOURCES, PRIORITIES, PROJECT_STAGES, SERVICES } from "../../config/constants";
import { addDays, fmtDate, inr, todayISO } from "../../utils/format";
import { GstPicker } from "./Common";
import { withGst } from "./deliveryUtils";

export const stageOptions = () => [{ value: "", label: "Not started" }, ...PROJECT_STAGES.map((s) => ({ value: s, label: s }))];

// Rules carried over from the old CRM:
// - "Completed" ⇄ completed checkbox + completion date
// - any stage except On Hold / Not started fills the onboarded date with today if empty
// - every stage change is time-stamped
export function stagePatch(p, stage, today = todayISO()) {
  const patch = { stage };
  if (stage) patch.stageTimestamps = { ...(p.stageTimestamps || {}), [stage]: new Date().toISOString() };
  if (stage && stage !== "On Hold" && !p.onboardedDate) patch.onboardedDate = today;
  if (stage === "Completed") {
    patch.completionDate = p.completionDate || today;
    patch.completedAt = today;
    patch.milestones = (p.milestones || []).map((m) => ({ ...m, done: true }));
  } else if (p.stage === "Completed") { patch.completionDate = ""; patch.completedAt = ""; }
  return patch;
}

const Section = ({ title, children }) => (
  <div className="sm:col-span-2">
    <p className="mb-3 mt-2 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">{title}</p>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

export function ProjectModal({ p, onClose, onSave }) {
  const { db } = useStore();
  const [f, setF] = useState({});
  const [errors, setErrors] = useState({});
  const [last, setLast] = useState(null);
  if (p !== last) {
    setLast(p);
    const start = todayISO();
    setF({
      name: "", client: "", contact: "", phone: "", email: "", industry: "", location: "", requirements: "", service: SERVICES[0], stage: firstStage(), branch: BRANCHES[0], priority: "Warm", source: "Referral",
      startDate: start, deadline: addDays(start, 45), value: "", gstRate: 18, gstin: "", advanceReceived: "", advanceDate: "", agreedTimelineDays: 45, onboardedDate: start, completionDate: "",
      managerId: (db.users || []).find((u) => u.role === "Project Manager")?.id || "", ownerId: "", team: [], developers: [], leadId: "",
      ...(p || {}),
    });
    setErrors({});
  }
  if (!p) return null;
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const total = withGst(f.value, f.gstRate);
  const remaining = Math.max(0, total - (Number(f.advanceReceived) || 0));
  const finalPayDate = f.onboardedDate && Number(f.agreedTimelineDays) > 0 ? addDays(f.onboardedDate, Number(f.agreedTimelineDays)) : "";
  const completed = f.stage === "Completed";

  const pickLead = (id) => {
    const l = (db.leads || []).find((x) => x.id === id);
    if (!l) return set({ leadId: "" });
    set({ leadId: l.id, client: l.company, contact: l.name, phone: l.phone, email: l.email, service: l.service, branch: l.branch, value: l.value, priority: l.priority, source: l.source, ownerId: l.ownerId, location: l.city || "", requirements: l.requirement || "", name: `${l.company} — ${l.service}` });
  };
  const setStage = (stage) => {
    const patch = { stage };
    if (stage && stage !== "On Hold" && !f.onboardedDate) patch.onboardedDate = todayISO();
    if (stage === "Completed" && !f.completionDate) patch.completionDate = todayISO();
    if (stage !== "Completed" && f.stage === "Completed") patch.completionDate = "";
    set(patch);
  };
  const toggleCompleted = (v) => set(v ? { stage: "Completed", completionDate: f.completionDate || todayISO() } : { stage: liveStage(), completionDate: "" });

  const save = () => {
    const e = {};
    if (!f.client?.trim()) e.client = "Client / business is required";
    if (f.phone && !/^\d{10}$/.test(String(f.phone).replace(/\D/g, "").slice(-10))) e.phone = "Enter a 10-digit mobile number";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email";
    if (f.deadline && f.startDate && f.deadline < f.startDate) e.deadline = "Deadline must be after the start date";
    if (f.gstin && f.gstin.length !== 15) e.gstin = "GSTIN must be 15 characters";
    if (Number(f.advanceReceived) > total && total > 0) e.advanceReceived = "Advance can't exceed the total incl. GST";
    setErrors(e);
    if (Object.keys(e).length) return;
    const stamps = { ...(f.stageTimestamps || {}) };
    if (f.stage && f.stage !== p.stage) stamps[f.stage] = new Date().toISOString();
    onSave({
      ...f, name: f.name?.trim() || `${f.client.trim()} — ${f.service}`, client: f.client.trim(), value: Number(f.value) || 0, gstRate: Number(f.gstRate) || 0,
      advanceReceived: Number(f.advanceReceived) || 0, agreedTimelineDays: Number(f.agreedTimelineDays) || 0, stageTimestamps: stamps,
      ...(completed ? { completedAt: f.completionDate } : {}),
    });
  };

  const won = (db.leads || []).filter((l) => ["Won", "Negotiation"].includes(l.stage));
  return (
    <Modal open onClose={onClose} title={p.id ? "Edit project" : "New project"} subtitle={p.id ? f.client : "Onboard a won deal and track delivery & money"} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{p.id ? "Save changes" : "Create project"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!p.id && (
          <Field label="Create from a won deal (optional)" className="sm:col-span-2">
            <Select value={f.leadId || ""} onChange={(e) => pickLead(e.target.value)} options={won.map((l) => ({ value: l.id, label: `${l.company} · ${l.service} · ${inr(l.value)}` }))} placeholder="— Select a deal to autofill —" />
          </Field>
        )}
        <Section title="Client">
          <Field label="Business / client" required error={errors.client}><Input value={f.client || ""} onChange={(e) => set({ client: e.target.value })} /></Field>
          <Field label="Contact person"><Input value={f.contact || ""} onChange={(e) => set({ contact: e.target.value })} /></Field>
          <Field label="Phone" error={errors.phone}><Input value={f.phone || ""} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="Email" error={errors.email}><Input type="email" value={f.email || ""} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Industry"><Input value={f.industry || ""} onChange={(e) => set({ industry: e.target.value })} placeholder="e.g. Healthcare" /></Field>
          <Field label="Location"><Input value={f.location || ""} onChange={(e) => set({ location: e.target.value })} /></Field>
        </Section>
        <Section title="Project">
          <Field label="Project name" hint="Leave blank to auto-generate"><Input value={f.name || ""} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Service"><Select options={SERVICES} value={f.service} onChange={(e) => set({ service: e.target.value })} /></Field>
          <Field label="Project stage"><Select options={stageOptions()} value={f.stage || ""} onChange={(e) => setStage(e.target.value)} /></Field>
          <Field label="Priority"><Select options={PRIORITIES} value={f.priority} onChange={(e) => set({ priority: e.target.value })} /></Field>
          <Field label="Branch"><Select options={BRANCHES} value={f.branch} onChange={(e) => set({ branch: e.target.value })} /></Field>
          <Field label="Source"><Select options={LEAD_SOURCES} value={f.source} onChange={(e) => set({ source: e.target.value })} /></Field>
          <Field label="Sales rep / owner"><Select options={(db.users || []).map((u) => ({ value: u.id, label: u.name }))} value={f.ownerId || ""} onChange={(e) => set({ ownerId: e.target.value })} placeholder="Unassigned" /></Field>
          <Field label="Project manager"><Select options={(db.users || []).map((u) => ({ value: u.id, label: `${u.name} — ${u.role}` }))} value={f.managerId || ""} onChange={(e) => set({ managerId: e.target.value })} placeholder="Unassigned" /></Field>
          <Field label="Start date"><Input type="date" value={f.startDate || ""} onChange={(e) => set({ startDate: e.target.value })} /></Field>
          <Field label="Deadline" error={errors.deadline}><Input type="date" value={f.deadline || ""} onChange={(e) => set({ deadline: e.target.value })} /></Field>
          <Field label="Requirements" className="sm:col-span-2"><Textarea rows={2} value={f.requirements || ""} onChange={(e) => set({ requirements: e.target.value })} /></Field>
        </Section>
        <Section title="Money">
          <Field label="Total amount agreed (excl. GST)"><Input type="number" value={f.value ?? ""} onChange={(e) => set({ value: e.target.value })} /></Field>
          <div className="hidden sm:block" />
          <div className="sm:col-span-2">
            <GstPicker amount={f.value} rate={f.gstRate} gstin={f.gstin} onChange={(patch) => set(patch)} />
            {errors.gstin && <p className="mt-1 text-xs font-medium text-rose-600">{errors.gstin}</p>}
          </div>
          <Field label="Advance received (₹)" error={errors.advanceReceived}><Input type="number" value={f.advanceReceived ?? ""} onChange={(e) => set({ advanceReceived: e.target.value, advanceDate: f.advanceDate || (e.target.value ? todayISO() : "") })} /></Field>
          <Field label="Advance received on"><Input type="date" value={f.advanceDate || ""} onChange={(e) => set({ advanceDate: e.target.value })} /></Field>
          <Field label="Remaining balance (incl. GST)"><div className="input flex items-center bg-slate-50 font-semibold dark:bg-slate-800/60"><span className={remaining ? "text-rose-600" : "text-emerald-600"}>{inr(remaining)}</span><span className="ml-auto text-xs font-normal text-slate-400">of {inr(total)}</span></div></Field>
          <Field label="Agreed timeline (days)"><Input type="number" value={f.agreedTimelineDays ?? ""} onChange={(e) => set({ agreedTimelineDays: e.target.value })} /></Field>
          <Field label="Final payment date" hint="Onboarded date + agreed timeline"><div className="input flex items-center bg-slate-50 dark:bg-slate-800/60">{finalPayDate ? fmtDate(finalPayDate) : "—"}</div></Field>
        </Section>
        <Section title="Delivery dates">
          <Field label="Client onboarded on"><Input type="date" value={f.onboardedDate || ""} onChange={(e) => set({ onboardedDate: e.target.value })} /></Field>
          <Field label="Project completion date"><Input type="date" value={f.completionDate || ""} disabled={!completed} onChange={(e) => set({ completionDate: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Toggle checked={completed} onChange={toggleCompleted} label="Project completed" /></div>
        </Section>
      </div>
    </Modal>
  );
}
