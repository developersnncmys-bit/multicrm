import { useEffect, useState } from "react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Field, Input, Modal, Select, Textarea } from "../../components/ui";
import { BRANCHES, LEAD_SOURCES, SERVICES, LEAD_STAGES, PRIORITIES } from "../../config/constants";
import { uid, addDays, todayISO } from "../../utils/format";

const blank = (user) => ({
  name: "", company: "", phone: "", email: "", source: "Website", service: SERVICES[0], branch: user?.branch || "Bangalore", city: "",
  value: "", priority: "Warm", ownerId: user?.id || "", stage: "New", nextFollowUp: addDays(todayISO(), 1), requirement: "",
});

export default function LeadForm({ open, onClose, lead, onSaved }) {
  const { db, add, update, notify, user } = useStore();
  const toast = useToast();
  const [f, setF] = useState(blank(user));
  const [err, setErr] = useState({});

  useEffect(() => {
    if (open) { setF(lead ? { ...blank(user), ...lead, value: lead.value ?? "" } : blank(user)); setErr({}); }
  }, [open, lead]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = "Name is required";
    const digits = String(f.phone).replace(/\D/g, "");
    if (!digits) er.phone = "Phone is required";
    else if (digits.slice(-10).length !== 10 || digits.length > 12) er.phone = "Enter a valid 10-digit mobile number";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = "Enter a valid email";
    if (f.value !== "" && Number(f.value) < 0) er.value = "Value can't be negative";
    setErr(er);
    if (Object.keys(er).length) return;

    const data = { ...f, name: f.name.trim(), phone: digits.slice(-10), value: Number(f.value) || 0 };
    if (lead) {
      const changedStage = lead.stage !== data.stage;
      update("leads", lead.id, (l) => ({
        ...data,
        activities: changedStage ? [{ id: uid("a"), type: "stage", text: `Stage moved from ${l.stage} to ${data.stage}`, at: new Date().toISOString(), by: user.id }, ...(l.activities || [])] : l.activities,
      }));
      toast("Lead updated");
      onSaved?.(lead.id);
    } else {
      const now = new Date().toISOString();
      const rec = add("leads", { ...data, createdAt: now, lostReason: "", activities: [{ id: uid("a"), type: "created", text: `Lead captured from ${data.source}`, at: now, by: user.id }] }, "L");
      notify("New lead added", `${data.name}${data.company ? ` (${data.company})` : ""} — ${data.service}`, "/leads");
      toast("Lead added successfully");
      onSaved?.(rec.id);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={lead ? "Edit lead" : "Add new lead"} subtitle={lead ? `${lead.id} · created by ${db.users.find((u) => u.id === lead.ownerId)?.name || "—"}` : "Capture contact details and what they need."}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{lead ? "Save changes" : "Add lead"}</Button></>}>
      <form onSubmit={save} className="space-y-6">
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Contact</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={err.name}><Input value={f.name} onChange={set("name")} placeholder="e.g. Rahul Sharma" autoFocus /></Field>
            <Field label="Company / Business"><Input value={f.company} onChange={set("company")} placeholder="e.g. GreenLeaf Organics" /></Field>
            <Field label="Mobile number" required error={err.phone}><Input value={f.phone} onChange={set("phone")} placeholder="98450 12345" inputMode="tel" /></Field>
            <Field label="Email" error={err.email}><Input type="email" value={f.email} onChange={set("email")} placeholder="name@company.com" /></Field>
            <Field label="City"><Input value={f.city} onChange={set("city")} placeholder="Bangalore" /></Field>
            <Field label="Branch"><Select value={f.branch} onChange={set("branch")} options={BRANCHES} /></Field>
          </div>
        </section>
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Deal</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Service"><Select value={f.service} onChange={set("service")} options={SERVICES} /></Field>
            <Field label="Source"><Select value={f.source} onChange={set("source")} options={LEAD_SOURCES} /></Field>
            <Field label="Estimated value (₹)" error={err.value}><Input type="number" min="0" value={f.value} onChange={set("value")} placeholder="75000" /></Field>
            <Field label="Stage"><Select value={f.stage} onChange={set("stage")} options={LEAD_STAGES} /></Field>
            <Field label="Priority"><Select value={f.priority} onChange={set("priority")} options={PRIORITIES} /></Field>
            <Field label="Owner"><Select value={f.ownerId} onChange={set("ownerId")} options={db.users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))} /></Field>
            <Field label="Next follow-up"><Input type="date" value={f.nextFollowUp || ""} onChange={set("nextFollowUp")} /></Field>
          </div>
          <Field label="Requirement / notes" className="mt-4"><Textarea rows={3} value={f.requirement} onChange={set("requirement")} placeholder="What are they looking for? Budget, timeline, references…" /></Field>
        </section>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
