// First-run setup for a new client workspace: business type → company → modules → finish.
// Open it from anywhere with openSetupWizard().
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ArrowLeft, Rocket, Check } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Field, Input, Modal, Toggle, cx } from "../../components/ui";
import { INDUSTRIES, defaultWorkspace, MODULE_CATALOG } from "../../config/workspace";
import { IndustryGrid, PlanCards, ModulePicker } from "./parts";

const EVT = "nexora:setup-wizard";
export const openSetupWizard = () => window.dispatchEvent(new Event(EVT));
const ACCENTS = [["indigo", "#4f46e5"], ["violet", "#7c3aed"], ["sky", "#0284c7"], ["emerald", "#059669"], ["amber", "#d97706"], ["rose", "#e11d48"]];
const STEPS = ["Business type", "Company", "Modules", "Finish"];

export function SetupBanner() {
  const { db, user } = useStore();
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem("nexora_setup_hide") === "1"; } catch { return false; } });
  if (user?.role !== "Admin" || db.settings.workspace?.setupDone || hidden) return null;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4 dark:border-brand-500/30 dark:from-brand-500/10 dark:to-slate-900 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"><Sparkles className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900 dark:text-white">Set up this workspace for your business</p>
        <p className="text-sm text-slate-500">Pick your industry and the modules you need — the CRM adapts its menus, stages and wording in 2 minutes.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => { setHidden(true); try { sessionStorage.setItem("nexora_setup_hide", "1"); } catch { /* ignore */ } }}>Later</Button>
        <Button size="sm" icon={Rocket} onClick={openSetupWizard}>Start setup</Button>
      </div>
    </div>
  );
}

export default function SetupWizard() {
  const { db, setSettings, resetDemo, log } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ws, setWs] = useState(null);
  const [company, setCompany] = useState(null);
  const [accent, setAccent] = useState("indigo");
  const [loadSample, setLoadSample] = useState(true);

  useEffect(() => {
    const h = () => {
      setWs({ ...defaultWorkspace(db.settings.workspace?.industry || "general"), ...db.settings.workspace });
      setCompany({ ...db.settings.company });
      setAccent(db.settings.accent || "indigo");
      setStep(0); setLoadSample(true); setOpen(true);
    };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, [db.settings]);

  if (!open || !ws) return null;
  const preset = INDUSTRIES[ws.industry];
  const pickIndustry = (k) => { const d = defaultWorkspace(k); setWs((w) => ({ ...w, industry: k, enabled: d.enabled, services: d.services, sources: d.sources })); };
  const finish = () => {
    const next = { ...ws, setupDone: true };
    if (loadSample) resetDemo(ws.industry, next);
    else setSettings("workspace", next);
    setSettings("company", company);
    setSettings("accent", accent);
    log("updated", "Workspace", `Setup: ${preset.label} · ${next.enabled.length} modules`);
    setOpen(false);
    toast(`Workspace ready for ${preset.label}`);
    nav("/");
  };
  const on = MODULE_CATALOG.filter((m) => m.core || ws.enabled.includes(m.key));

  return (
    <Modal open onClose={() => setOpen(false)} size="xl" title="Workspace setup" subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
      footer={<>
        {step > 0 && <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(step - 1)}>Back</Button>}
        {step < STEPS.length - 1 ? <Button onClick={() => setStep(step + 1)}>Continue<ArrowRight className="h-4 w-4" /></Button> : <Button icon={Rocket} onClick={finish}>Launch workspace</Button>}
      </>}>
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800")}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className={cx("hidden text-xs font-semibold sm:block", i === step ? "text-slate-900 dark:text-white" : "text-slate-400")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          <p className="mb-4 text-sm text-slate-500">This sets the vocabulary, delivery stages, services and lead sources. You can fine-tune everything later in Settings → Workspace & Modules.</p>
          <IndustryGrid value={ws.industry} onChange={pickIndustry} />
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{preset.terms.projects} will move through:</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {preset.stages.slice(0, 7).map((s, i) => <span key={s} className="flex items-center gap-1.5"><span className="rounded-md bg-white px-2 py-1 text-xs font-medium shadow-sm dark:bg-slate-900">{s}</span>{i < 6 && <ArrowRight className="h-3 w-3 text-slate-300" />}</span>)}
            </div>
          </div>
        </>
      )}

      {step === 1 && company && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company name" className="sm:col-span-2" required><Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} autoFocus /></Field>
          <Field label="Business email"><Input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></Field>
          <Field label="Website"><Input value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} /></Field>
          <Field label="GSTIN" hint="Printed on quotations & invoices"><Input value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })} /></Field>
          <div className="sm:col-span-2">
            <span className="label">Brand colour</span>
            <div className="flex gap-2">
              {ACCENTS.map(([k, hex]) => (
                <button key={k} type="button" onClick={() => { setAccent(k); document.documentElement.dataset.accent = k; }} title={k}
                  className={cx("flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 transition dark:ring-offset-slate-900", accent === k && "ring-2 ring-slate-900 dark:ring-white")} style={{ background: hex }}>
                  {accent === k && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <PlanCards value={ws.plan} industry={ws.industry} onPick={(plan, enabled) => setWs({ ...ws, plan, enabled })} />
          <p className="text-sm text-slate-500">Recommended for <b className="text-slate-700 dark:text-slate-200">{preset.label}</b> is pre-selected. Switch anything on or off — staff only see what's on.</p>
          <ModulePicker enabled={ws.enabled} onChange={(enabled) => setWs({ ...ws, enabled })} industry={ws.industry} compact />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Industry", preset.label], ["Modules on", `${on.length} of ${MODULE_CATALOG.length}`], ["Plan", ws.plan]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{v}</p></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">{on.map((m) => <span key={m.key} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{m.label}</span>)}</div>
          <div className="flex items-start justify-between gap-4 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Load {preset.short.toLowerCase()} sample data</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Replaces current demo records with realistic {preset.label.toLowerCase()} leads, {preset.terms.projects.toLowerCase()}, tickets and invoices — ideal for a client demo.</p>
            </div>
            <Toggle checked={loadSample} onChange={setLoadSample} />
          </div>
        </div>
      )}
    </Modal>
  );
}
