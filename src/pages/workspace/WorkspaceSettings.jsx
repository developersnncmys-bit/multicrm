// Settings → Workspace & Modules: industry, plan, module switches, services and lead sources.
import { useState } from "react";
import { Save, Rocket, RotateCcw, Info } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, Field, useConfirm } from "../../components/ui";
import { INDUSTRIES, defaultWorkspace, MODULE_CATALOG } from "../../config/workspace";
import { IndustryGrid, PlanCards, ModulePicker, ChipEditor } from "./parts";
import { openSetupWizard } from "./SetupWizard";

export default function WorkspaceSettings() {
  const { db, setSettings, resetDemo, log } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const saved = { ...defaultWorkspace(db.settings.workspace?.industry), ...db.settings.workspace };
  const [ws, setWs] = useState(saved);
  const dirty = JSON.stringify(ws) !== JSON.stringify(saved);
  const preset = INDUSTRIES[ws.industry];
  const industryChanged = ws.industry !== saved.industry;

  const save = async () => {
    if (industryChanged) {
      const ok = await confirm({ title: `Switch to ${preset.label}?`, danger: false, confirmText: "Switch & load sample data",
        message: `Delivery stages change to “${preset.stages.slice(0, 3).join(" → ")} …”. Existing records use the old stages, so sample data for ${preset.label} will be loaded. Company profile and branding are kept.` });
      if (!ok) return;
      resetDemo(ws.industry, ws);
    } else setSettings("workspace", ws);
    log("updated", "Workspace", `${preset.label} · ${ws.enabled.length} modules on`);
    toast("Workspace updated");
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Workspace & Modules</h2>
            <p className="mt-0.5 text-sm text-slate-500">Make this CRM fit the client: industry vocabulary, what's switched on, and their own lists.</p>
          </div>
          <Button variant="secondary" icon={Rocket} onClick={openSetupWizard}>Run setup wizard</Button>
        </div>
        <div className="space-y-8 p-6">
          <section>
            <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">Business type</h3>
            <p className="mb-3 text-sm text-slate-500">Sets delivery stages, milestones and words used across menus.</p>
            <IndustryGrid value={ws.industry} onChange={(k) => { const d = defaultWorkspace(k); setWs({ ...ws, industry: k, enabled: d.enabled, services: d.services, sources: d.sources }); }} />
          </section>
          <section>
            <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">Plan</h3>
            <p className="mb-3 text-sm text-slate-500">Choosing a plan switches on its modules. You can still adjust each one below.</p>
            <PlanCards value={ws.plan} industry={ws.industry} onPick={(plan, enabled) => setWs({ ...ws, plan, enabled })} />
          </section>
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div><h3 className="font-semibold text-slate-900 dark:text-white">Modules</h3><p className="text-sm text-slate-500">Switched-off modules disappear from the menu, search and dashboard for everyone.</p></div>
              <span className="shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">{MODULE_CATALOG.filter((m) => m.core || ws.enabled.includes(m.key)).length}/{MODULE_CATALOG.length} on</span>
            </div>
            <ModulePicker enabled={ws.enabled} onChange={(enabled) => setWs({ ...ws, enabled })} industry={ws.industry} />
          </section>
          <section className="grid gap-5 lg:grid-cols-2">
            <Field label={`${preset.terms.product}s offered`} hint="Used in lead forms, filters and reports. Press Enter to add.">
              <ChipEditor items={ws.services} onChange={(services) => setWs({ ...ws, services })} placeholder="Add and press Enter…" />
            </Field>
            <Field label="Lead sources" hint="Where enquiries come from. Press Enter to add.">
              <ChipEditor items={ws.sources} onChange={(sources) => setWs({ ...ws, sources })} placeholder="Add and press Enter…" />
            </Field>
          </section>
          {industryChanged && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"><Info className="mt-0.5 h-4 w-4 shrink-0" />Changing business type reloads sample data for {preset.label}. Once the backend is connected this becomes a stage-mapping step instead.</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          {dirty && <Button variant="ghost" icon={RotateCcw} onClick={() => setWs(saved)}>Discard</Button>}
          {dirty && <span className="text-xs font-medium text-amber-600">Unsaved changes</span>}
          <Button icon={Save} onClick={save} disabled={!dirty}>Save workspace</Button>
        </div>
      </Card>
    </div>
  );
}
