// Automations — no-code "When X → do Y" rules. UI only; the backend will run them.
import { useState } from "react";
import { Workflow, Plus, Zap, Play, Trash2, Pencil, ArrowDown, Clock, CheckCircle2, X } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, Tabs, Badge, Toggle, Modal, Field, Input, Select, Menu, EmptyState, useConfirm, cx } from "../../components/ui";
import { term } from "../../config/workspace";
import { timeAgo } from "../../utils/format";

const TRIGGERS = () => [
  ["Sales", "Lead created"], ["Sales", "Lead created · source is Website"], ["Sales", "Lead in New stage for 2 hours"], ["Sales", "Lead stage changes to Won"], ["Sales", "Lead stage changes to Lost"],
  ["Sales", "Quotation Sent · no reply in 3 days"], ["Finance", "Invoice is 1 / 7 / 15 days overdue"], ["Finance", "Payment recorded on invoice"],
  ["Delivery", `${term("project")} stage changes`], ["Delivery", `${term("project")} marked Completed`], ["Support", "Ticket created"], ["Support", "Ticket open past SLA due time"],
  ["Marketing", "Contact birthday is today"], ["Marketing", "Contact added with tag VIP"],
];
const ACTIONS = () => ["Send WhatsApp template", "Send email template", "Send SMS", "Assign round-robin to Sales team", "Assign to a user", "Create follow-up task", "Notify a user", "Change priority", "Add tag", `Create ${term("project")}`, "Raise proforma invoice", "Escalate to Admin", "Wait (delay)", "Call a webhook"];
const CAT_TONE = { Sales: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", Finance: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", Delivery: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300", Support: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", Marketing: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" };

export default function Automations() {
  const { db, add, update, remove, log } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [cat, setCat] = useState("All");
  const [form, setForm] = useState(null);
  const list = db.automations || [];
  const rows = list.filter((a) => cat === "All" || a.category === cat);
  const runs = list.reduce((s, a) => s + (a.runs || 0), 0);

  const save = () => {
    if (!form.name.trim() || !form.trigger || !form.actions.filter(Boolean).length) { toast("Add a name, a trigger and at least one action", "error"); return; }
    const category = TRIGGERS().find((t) => t[1] === form.trigger)?.[0] || "Sales";
    const rec = { ...form, actions: form.actions.filter(Boolean), category };
    if (form.id) update("automations", form.id, rec);
    else add("automations", { ...rec, runs: 0, lastRun: "", active: true, createdBy: "u1" }, "AU");
    log(form.id ? "updated" : "created", "Automation", rec.name);
    toast(form.id ? "Automation updated" : "Automation is live");
    setForm(null);
  };

  return (
    <div>
      <PageHeader title="Automations" subtitle="Let the CRM do the repetitive work — follow-ups, reminders, assignments and alerts."
        actions={<Button icon={Plus} onClick={() => setForm({ name: "", trigger: "", actions: [""] })}>New automation</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Active rules" value={list.filter((a) => a.active).length} icon={Zap} sub={`${list.length} total`} />
        <StatCard label="Runs this month" value={runs.toLocaleString("en-IN")} icon={Play} tone="emerald" sub="actions done automatically" />
        <StatCard label="Time saved" value={`~${Math.round(runs * 3 / 60)} hrs`} icon={Clock} tone="violet" sub="at 3 min per manual action" />
        <StatCard label="Success rate" value="99.2%" icon={CheckCircle2} tone="sky" sub="last 30 days" />
      </div>
      <Tabs className="mb-4 w-fit" value={cat} onChange={setCat} tabs={["All", "Sales", "Finance", "Delivery", "Support", "Marketing"]} />
      {rows.length === 0 ? <Card><EmptyState icon={Workflow} title="No automations here" /></Card> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {rows.map((a) => (
            <Card key={a.id} className={cx("flex flex-col p-5", !a.active && "opacity-60")}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900 dark:text-white">{a.name}</p><Badge className={cx("mt-1", CAT_TONE[a.category])}>{a.category}</Badge></div>
                <Toggle checked={a.active} onChange={(v) => { update("automations", a.id, { active: v }); toast(v ? "Turned on" : "Paused"); }} />
                <Menu items={[{ label: "Edit", icon: Pencil, onClick: () => setForm({ ...a, actions: [...a.actions] }) }, { label: "Delete", icon: Trash2, danger: true, onClick: async () => { if (await confirm({ title: `Delete “${a.name}”?` })) { remove("automations", a.id); toast("Deleted"); } } }]} />
              </div>
              <div className="mt-4 flex-1 space-y-1.5 text-sm">
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"><Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><b>When</b> {a.trigger}</span></p>
                {a.actions.map((x, i) => (
                  <div key={i}><ArrowDown className="mx-auto h-3 w-3 text-slate-300" /><p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200"><b className="text-slate-400">Then</b> {x}</p></div>
                ))}
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">Ran {a.runs} times{a.lastRun && ` · last ${timeAgo(a.lastRun)}`}</p>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit automation" : "New automation"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>{form?.id ? "Save" : "Turn on"}</Button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welcome new website leads" autoFocus /></Field>
            <Field label="When this happens…"><Select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="Choose a trigger" options={TRIGGERS().map(([g, t]) => ({ value: t, label: `${g} · ${t}` }))} /></Field>
            <div>
              <span className="label">…do these, in order</span>
              <div className="space-y-2">
                {form.actions.map((x, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="flex h-9 w-7 items-center justify-center text-xs font-bold text-slate-400">{i + 1}</span>
                    <Select value={x} onChange={(e) => setForm({ ...form, actions: form.actions.map((y, k) => (k === i ? e.target.value : y)) })} placeholder="Choose an action" options={ACTIONS()} />
                    {form.actions.length > 1 && <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, actions: form.actions.filter((_, k) => k !== i) })}><X className="h-4 w-4" /></Button>}
                  </div>
                ))}
              </div>
              <Button size="sm" variant="soft" icon={Plus} className="ml-9 mt-2" onClick={() => setForm({ ...form, actions: [...form.actions, ""] })}>Add step</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
