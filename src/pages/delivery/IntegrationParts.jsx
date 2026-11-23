// Per-project credential vault: card with masked secrets + add/edit form.
import { useState } from "react";
import { Eye, EyeOff, Copy, Pencil, Trash2, ExternalLink, Plus, X, CalendarClock, User, Building2 } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Badge, Button, Field, Input, Modal, Select, Textarea, IconBox, cx, useConfirm } from "../../components/ui";
import { daysBetween, fmtDate, inr, timeAgo, todayISO } from "../../utils/format";
import { ProjectPicker } from "./Common";
import { INTEGRATION_CATEGORIES, INTEGRATION_STATUSES, INTEGRATION_STATUS_STYLE } from "./deliveryUtils";

export const renewalInfo = (iso, today = todayISO()) => {
  if (!iso) return null;
  const d = daysBetween(today, iso);
  return { d, overdue: d < 0, soon: d >= 0 && d <= 30, label: d < 0 ? `${-d}d overdue` : d === 0 ? "renews today" : `in ${d}d` };
};

const copy = async (text, toast, what = "Copied") => {
  try { await navigator.clipboard.writeText(text); toast(what); } catch { toast("Couldn't copy — clipboard blocked", "error"); }
};

export function IntegrationCard({ it, onEdit, canWrite = true, showProject = false }) {
  const { db, remove, update } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [shown, setShown] = useState({});
  const meta = INTEGRATION_CATEGORIES[it.category] || INTEGRATION_CATEGORIES.Other;
  const rn = renewalInfo(it.renewal);
  const project = (db.projects || []).find((p) => p.id === it.projectId);
  const reveal = (k) => {
    setShown((s) => ({ ...s, [k]: !s[k] }));
    if (!shown[k]) toast("Reveal logged for audit", "info");
  };
  const del = async () => { if (await confirm({ title: "Delete credential?", message: `${it.service} (${it.category}) will be removed from the vault.` })) { remove("integrations", it.id); toast("Credential deleted"); } };

  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-start gap-3">
        <IconBox icon={meta.icon} tone={meta.tone} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{it.service}</p>
            <Badge className={INTEGRATION_STATUS_STYLE[it.status]}>{it.status}</Badge>
            {it.mode === "Test" && <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Test</Badge>}
          </div>
          <p className="text-xs text-slate-500">{it.category}{showProject && project ? ` · ${project.client}` : ""}</p>
        </div>
        {canWrite && (
          <div className="flex gap-0.5">
            <button onClick={() => onEdit?.(it)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={del} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        {it.url && it.url !== "https://" && (
          <a href={it.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"><ExternalLink className="h-3 w-3 shrink-0" />{it.url.replace(/^https?:\/\//, "")}</a>
        )}
        {it.login && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase text-slate-400">Login</span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-200">{it.login}</span>
            <button onClick={() => copy(it.login, toast, "Login copied")} className="text-slate-400 hover:text-slate-700"><Copy className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {(it.secrets || []).map((sec, k) => (
          <div key={k} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50">
            <span className="w-20 shrink-0 truncate text-[11px] font-semibold uppercase text-slate-400" title={sec.name}>{sec.name}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-200">{shown[k] ? sec.value : "••••••••••••"}</span>
            <button onClick={() => reveal(k)} className="text-slate-400 hover:text-slate-700">{shown[k] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
            <button onClick={() => copy(sec.value, toast, `${sec.name} copied`)} className="text-slate-400 hover:text-slate-700"><Copy className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800" style={{ marginTop: 12 }}>
        <span className="flex items-center gap-1">{it.owner === "Agency" ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}{it.owner === "Agency" ? "Our account" : "Client's account"}</span>
        {Number(it.cost) > 0 && <span>{inr(it.cost)} {it.billing !== "One-time" ? `/ ${it.billing === "Monthly" ? "mo" : "yr"}` : "one-time"}</span>}
        {rn && <span className={cx("flex items-center gap-1 font-semibold", rn.overdue ? "text-rose-600" : rn.soon ? "text-amber-600" : "")}><CalendarClock className="h-3 w-3" />Renews {fmtDate(it.renewal)} ({rn.label})</span>}
        {rn && rn.overdue && canWrite && <button onClick={() => { const d = new Date(`${it.renewal}T00:00:00`); d.setFullYear(d.getFullYear() + 1); update("integrations", it.id, { renewal: d.toISOString().slice(0, 10) }); toast("Marked renewed for 1 year"); }} className="font-semibold text-brand-600 hover:underline">Mark renewed</button>}
        <span className="ml-auto">{it.updatedAt ? `Updated ${timeAgo(it.updatedAt)}` : ""}</span>
      </div>
      {it.notes && <p className="mt-2 rounded-lg bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{it.notes}</p>}
    </div>
  );
}

export function IntegrationForm({ it, defaultProjectId, onClose }) {
  const { add, update } = useStore();
  const toast = useToast();
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const [showSec, setShowSec] = useState({});
  const [last, setLast] = useState(null);
  const open = it !== null && it !== undefined;
  if (it !== last) {
    setLast(it); setErrors({}); setShowSec({});
    setF(open ? { projectId: defaultProjectId || "", category: "Payment", service: "", mode: "Live", status: "Pending", owner: "Client", url: "", login: "", secrets: INTEGRATION_CATEGORIES.Payment.secrets.map((n) => ({ name: n, value: "" })), cost: "", billing: "Free", renewal: "", notes: "", ...(it || {}) } : null);
  }
  if (!f) return null;
  const meta = INTEGRATION_CATEGORIES[f.category] || INTEGRATION_CATEGORIES.Other;
  const setCat = (category) => {
    const m = INTEGRATION_CATEGORIES[category];
    const empty = f.secrets.every((s) => !s.value);
    setF({ ...f, category, service: m.services.includes(f.service) ? f.service : "", secrets: empty ? m.secrets.map((n) => ({ name: n, value: "" })) : f.secrets });
  };
  const setSec = (i, patch) => setF({ ...f, secrets: f.secrets.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const save = () => {
    const e = {};
    if (!f.projectId) e.projectId = "Pick a project";
    if (!f.service.trim()) e.service = "Service is required";
    setErrors(e);
    if (Object.keys(e).length) return;
    const rec = { ...f, service: f.service.trim(), secrets: f.secrets.filter((s) => s.name.trim() || s.value), cost: Number(f.cost) || 0, updatedAt: new Date().toISOString() };
    if (it?.id) { update("integrations", it.id, rec); toast("Credential updated"); }
    else { add("integrations", rec, "IG"); toast("Credential saved to vault"); }
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={it?.id ? "Edit credential" : "Add credential"} subtitle="Stored encrypted once the backend is connected" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{it?.id ? "Save changes" : "Save to vault"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project" required error={errors.projectId} className="sm:col-span-2"><ProjectPicker value={f.projectId} onChange={(v) => setF({ ...f, projectId: v })} /></Field>
        <Field label="Type"><Select options={Object.keys(INTEGRATION_CATEGORIES)} value={f.category} onChange={(e) => setCat(e.target.value)} /></Field>
        <Field label="Service" required error={errors.service}>
          <Input list="svc-suggest" value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} placeholder={meta.services[0]} />
          <datalist id="svc-suggest">{meta.services.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <div className="flex flex-wrap gap-1.5 sm:col-span-2 -mt-2">
          {meta.services.map((s) => <button type="button" key={s} onClick={() => setF({ ...f, service: s })} className={cx("rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", f.service === s ? "bg-brand-50 text-brand-700 ring-brand-300 dark:bg-brand-500/10 dark:text-brand-200" : "text-slate-500 ring-slate-200 hover:ring-slate-300 dark:ring-slate-700")}>{s}</button>)}
        </div>
        <Field label="Mode"><Select options={[{ value: "Live", label: "Live" }, { value: "Test", label: "Test / Sandbox" }]} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} /></Field>
        <Field label="Status"><Select options={INTEGRATION_STATUSES} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} /></Field>
        <Field label="Account owner"><Select options={[{ value: "Client", label: "Client's account" }, { value: "Agency", label: "Our (agency) account" }]} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></Field>
        <Field label="Login / dashboard URL"><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
        <Field label="Login ID / email" className="sm:col-span-2"><Input value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <p className="label">Keys & passwords</p>
          <div className="space-y-2">
            {f.secrets.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input value={s.name} onChange={(e) => setSec(i, { name: e.target.value })} placeholder="Name" className="w-40 shrink-0" />
                <div className="relative flex-1">
                  <Input type={showSec[i] ? "text" : "password"} value={s.value} onChange={(e) => setSec(i, { value: e.target.value })} placeholder="Value" className="pr-9 font-mono" />
                  <button type="button" onClick={() => setShowSec({ ...showSec, [i]: !showSec[i] })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showSec[i] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
                <button type="button" onClick={() => setF({ ...f, secrets: f.secrets.filter((_, k) => k !== i) })} className="rounded-lg px-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <Button type="button" size="sm" variant="soft" icon={Plus} onClick={() => setF({ ...f, secrets: [...f.secrets, { name: "", value: "" }] })}>Add key</Button>
          </div>
        </div>
        <Field label="Cost (₹)"><Input type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></Field>
        <Field label="Billing"><Select options={["One-time", "Monthly", "Yearly", "Free"]} value={f.billing} onChange={(e) => setF({ ...f, billing: e.target.value })} /></Field>
        <Field label="Renewal / expiry date"><Input type="date" value={f.renewal} onChange={(e) => setF({ ...f, renewal: e.target.value })} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
