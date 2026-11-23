import { useRef, useState } from "react";
import { Building2, Landmark, FileText, Target, Palette, Database, Upload, Download, RotateCcw, Check, Sun, Moon, ImagePlus, Save, Sparkles, LayoutGrid } from "lucide-react";
import WorkspaceSettings from "./workspace/WorkspaceSettings";
import { INDUSTRIES } from "../config/workspace";
import { useStore } from "../store/store";
import { useToast } from "../components/ui/Toast";
import { Button, Card, PageHeader, Field, Input, Textarea, useConfirm, cx } from "../components/ui";
import { BRAND } from "../config/brand";
import { inr } from "../utils/format";

const VERSION = "v2.0.0";
const SECTIONS = [
  { key: "workspace", label: "Workspace & Modules", icon: LayoutGrid, desc: "Industry, plan and which modules are on" },
  { key: "company", label: "Company Profile", icon: Building2, desc: "Shown on quotations, invoices and payslips" },
  { key: "bank", label: "Bank & Payments", icon: Landmark, desc: "Printed on invoices for client payments" },
  { key: "docs", label: "Quotes & Invoices", icon: FileText, desc: "Numbering, tax defaults and terms" },
  { key: "targets", label: "Targets", icon: Target, desc: "Used on dashboard & leaderboard" },
  { key: "appearance", label: "Appearance", icon: Palette, desc: "Brand colour and theme" },
  { key: "data", label: "Data & Backup", icon: Database, desc: "Export, import and reset" },
];
const ACCENTS = [
  { key: "indigo", hex: "#4f46e5" }, { key: "violet", hex: "#7c3aed" }, { key: "sky", hex: "#0284c7" },
  { key: "emerald", hex: "#059669" }, { key: "amber", hex: "#d97706" }, { key: "rose", hex: "#e11d48" },
];

function Section({ title, desc, children, onSave, dirty }) {
  return (
    <Card>
      <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-slate-500">{desc}</p>}
      </div>
      <div className="p-6">{children}</div>
      {onSave && (
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          {dirty && <span className="text-xs font-medium text-amber-600">Unsaved changes</span>}
          <Button icon={Save} onClick={onSave} disabled={!dirty}>Save changes</Button>
        </div>
      )}
    </Card>
  );
}

// Local draft for one settings section; saves via setSettings(section, draft)
function useDraft(section) {
  const { db, setSettings } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState(() => ({ ...db.settings[section] }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(db.settings[section]);
  const set = (k, num) => (e) => setDraft((d) => ({ ...d, [k]: num ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value }));
  const save = () => { setSettings(section, draft); toast("Settings saved"); };
  return { draft, set, save, dirty };
}

function Company() {
  const { draft, set, save, dirty } = useDraft("company");
  const toast = useToast();
  const fileRef = useRef(null);
  const [logo, setLogo] = useState(null);
  return (
    <Section title="Company Profile" desc="These details appear on every document you send." onSave={save} dirty={dirty}>
      <div className="mb-6 flex items-center gap-5">
        <button type="button" onClick={() => fileRef.current?.click()} className="flex h-24 w-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700">
          {logo ? <img src={logo} alt="Logo" className="h-full w-full object-contain" /> : <><ImagePlus className="h-6 w-6" /><span className="mt-1 text-[11px] font-semibold">Upload logo</span></>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          setLogo(URL.createObjectURL(f)); toast("Logo preview loaded — saved permanently after backend setup", "info");
        }} />
        <div className="text-sm text-slate-500"><p className="font-semibold text-slate-700 dark:text-slate-200">Company logo</p><p>PNG or SVG, at least 256×256px. Shown on invoices and the login page.</p></div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name" className="sm:col-span-2"><Input value={draft.name} onChange={set("name")} /></Field>
        <Field label="Email"><Input type="email" value={draft.email} onChange={set("email")} /></Field>
        <Field label="Phone"><Input value={draft.phone} onChange={set("phone")} /></Field>
        <Field label="Website"><Input value={draft.website} onChange={set("website")} /></Field>
        <Field label="State"><Input value={draft.state} onChange={set("state")} /></Field>
        <Field label="GSTIN"><Input value={draft.gstin} onChange={set("gstin")} className="uppercase" /></Field>
        <Field label="PAN"><Input value={draft.pan} onChange={set("pan")} className="uppercase" /></Field>
        <Field label="Registered address" className="sm:col-span-2"><Textarea value={draft.address} onChange={set("address")} /></Field>
      </div>
    </Section>
  );
}

function Bank() {
  const { draft, set, save, dirty } = useDraft("bank");
  return (
    <Section title="Bank & Payments" desc="Clients will see these on invoices." onSave={save} dirty={dirty}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Account holder name" className="sm:col-span-2"><Input value={draft.accountName} onChange={set("accountName")} /></Field>
        <Field label="Bank name"><Input value={draft.bankName} onChange={set("bankName")} /></Field>
        <Field label="Branch"><Input value={draft.branch} onChange={set("branch")} /></Field>
        <Field label="Account number"><Input value={draft.accountNumber} onChange={set("accountNumber")} /></Field>
        <Field label="IFSC code"><Input value={draft.ifsc} onChange={set("ifsc")} className="uppercase" /></Field>
        <Field label="UPI ID" className="sm:col-span-2" hint="A UPI QR code is generated from this ID on invoices."><Input value={draft.upi} onChange={set("upi")} /></Field>
      </div>
      <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-5 text-white shadow-lg sm:max-w-sm">
        <p className="text-xs uppercase tracking-wider text-slate-400">Preview</p>
        <p className="mt-3 text-lg font-bold">{draft.bankName || "Bank name"}</p>
        <p className="mt-1 font-mono tracking-widest">{(draft.accountNumber || "0000000000").replace(/(.{4})/g, "$1 ")}</p>
        <div className="mt-4 flex justify-between text-xs text-slate-300"><span>{draft.accountName}</span><span>{draft.ifsc}</span></div>
      </div>
    </Section>
  );
}

function Docs() {
  const { draft, set, save, dirty } = useDraft("docs");
  return (
    <Section title="Quotes & Invoices" desc="Defaults applied to every new document." onSave={save} dirty={dirty}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Quotation prefix" hint={`Next: ${draft.quotePrefix}0119`}><Input value={draft.quotePrefix} onChange={set("quotePrefix")} /></Field>
        <Field label="Invoice prefix" hint={`Next: ${draft.invoicePrefix}0213`}><Input value={draft.invoicePrefix} onChange={set("invoicePrefix")} /></Field>
        <Field label="Default GST %">
          <div className="flex gap-2">
            {[0, 5, 12, 18, 28].map((g) => (
              <button key={g} type="button" onClick={() => set("defaultGst", true)({ target: { value: String(g) } })}
                className={cx("flex-1 rounded-xl border py-2 text-sm font-semibold transition", Number(draft.defaultGst) === g ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300")}>{g}%</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quote validity (days)"><Input type="number" min="1" value={draft.quoteValidity} onChange={set("quoteValidity", true)} /></Field>
          <Field label="Payment terms (days)"><Input type="number" min="0" value={draft.paymentTerms} onChange={set("paymentTerms", true)} /></Field>
        </div>
        <Field label="Terms & conditions" className="sm:col-span-2" hint="Printed at the bottom of quotations and invoices."><Textarea rows={6} value={draft.terms} onChange={set("terms")} /></Field>
      </div>
    </Section>
  );
}

function Targets() {
  const { draft, set, save, dirty } = useDraft("targets");
  return (
    <Section title="Targets" desc="Monthly goals that power progress bars across the CRM." onSave={save} dirty={dirty}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Monthly revenue target (₹)" hint={draft.monthlyRevenue ? inr(draft.monthlyRevenue) : ""}><Input type="number" min="0" value={draft.monthlyRevenue} onChange={set("monthlyRevenue", true)} /></Field>
        <Field label="Monthly new-lead target"><Input type="number" min="0" value={draft.monthlyLeads} onChange={set("monthlyLeads", true)} /></Field>
      </div>
    </Section>
  );
}

function Appearance() {
  const { db, setSettings, dark, setDark } = useStore();
  const toast = useToast();
  return (
    <Section title="Appearance" desc="Make the CRM match your brand. Changes apply instantly.">
      <p className="label">Brand colour</p>
      <div className="flex flex-wrap gap-3">
        {ACCENTS.map((a) => (
          <button key={a.key} onClick={() => { setSettings("accent", a.key); toast(`Accent set to ${a.key}`); }}
            className={cx("group flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition", db.settings.accent === a.key ? "border-brand-500 ring-4 ring-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-700")}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow" style={{ background: a.hex }}>{db.settings.accent === a.key && <Check className="h-5 w-5" />}</span>
            <span className="text-xs font-semibold capitalize text-slate-600 dark:text-slate-300">{a.key}</span>
          </button>
        ))}
      </div>
      <p className="label mt-8">Theme</p>
      <div className="grid max-w-md grid-cols-2 gap-3">
        {[{ v: false, label: "Light", icon: Sun }, { v: true, label: "Dark", icon: Moon }].map((t) => (
          <button key={t.label} onClick={() => setDark(t.v)}
            className={cx("overflow-hidden rounded-2xl border text-left transition", dark === t.v ? "border-brand-500 ring-4 ring-brand-500/10" : "border-slate-200 dark:border-slate-700")}>
            <div className={cx("flex h-20 gap-1.5 p-2", t.v ? "bg-slate-950" : "bg-slate-100")}>
              <div className={cx("w-1/4 rounded-md", t.v ? "bg-slate-800" : "bg-slate-800")} />
              <div className="flex flex-1 flex-col gap-1.5"><div className={cx("h-3 rounded", t.v ? "bg-slate-800" : "bg-white")} /><div className={cx("flex-1 rounded", t.v ? "bg-slate-900" : "bg-white")} /></div>
            </div>
            <p className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><t.icon className="h-4 w-4" />{t.label}</p>
          </button>
        ))}
      </div>
    </Section>
  );
}

function DataBackup() {
  const { db, resetDemo } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef(null);
  const counts = [["Leads", db.leads.length], ["Quotations", db.quotations.length], ["Invoices", db.invoices.length], ["Projects", db.projects.length], ["Expenses", db.expenses.length], ["Employees", db.employees.length]];
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `crm-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded");
  };
  return (
    <Section title="Data & Backup" desc="Your data is stored in this browser during the demo phase.">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {counts.map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60"><p className="text-xs text-slate-500">{k}</p><p className="text-xl font-extrabold text-slate-900 dark:text-white">{v}</p></div>)}
      </div>
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center">
          <div className="flex-1"><p className="font-semibold text-slate-800 dark:text-slate-100">Export full backup</p><p className="text-sm text-slate-500">Download every record as a JSON file.</p></div>
          <Button variant="secondary" icon={Download} onClick={exportJSON}>Export JSON</Button>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center">
          <div className="flex-1"><p className="font-semibold text-slate-800 dark:text-slate-100">Import data</p><p className="text-sm text-slate-500">Bulk-import leads or restore a backup file.</p></div>
          <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) toast("Import will be available once the backend is connected", "info"); e.target.value = ""; }} />
          <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>Choose file</Button>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-500/30 dark:bg-rose-500/5 sm:flex-row sm:items-center">
          <div className="flex-1"><p className="font-semibold text-rose-700 dark:text-rose-300">Reset demo data</p><p className="text-sm text-slate-500">Restore the original sample data. All your changes will be lost.</p></div>
          <Button variant="danger" icon={RotateCcw} onClick={async () => {
            if (await confirm({ title: "Reset all data?", message: "Every lead, quotation, invoice and setting will be replaced with fresh sample data.", confirmText: "Reset data" })) { resetDemo(db.settings.workspace?.industry, db.settings.workspace); toast("Demo data restored"); }
          }}>Reset</Button>
        </div>
      </div>
    </Section>
  );
}

export default function Settings() {
  const [active, setActive] = useState(() => new URLSearchParams(window.location.search).get("tab") || "workspace");
  const { db } = useStore();
  const Comp = { workspace: WorkspaceSettings, company: Company, bank: Bank, docs: Docs, targets: Targets, appearance: Appearance, data: DataBackup }[active];
  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your company profile, documents and preferences." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <div className="space-y-4">
          <Card className="p-2">
            <nav className="flex gap-1 overflow-x-auto lg:flex-col">
              {SECTIONS.map((s) => (
                <button key={s.key} onClick={() => setActive(s.key)}
                  className={cx("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition", active === s.key ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800")}>
                  <s.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-sm font-semibold">{s.label}</span>
                    <span className="hidden truncate text-[11px] text-slate-400 lg:block">{s.desc}</span>
                  </span>
                </button>
              ))}
            </nav>
          </Card>
          <Card className="hidden p-4 lg:block">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" /><p className="text-sm font-bold text-slate-900 dark:text-white">{BRAND.productName}</p><span className="ml-auto rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">{VERSION}</span></div>
            <p className="mt-1 text-xs text-slate-500">{BRAND.tagline}</p>
            <p className="mt-2 text-xs text-slate-400">Licensed to {db.settings.company.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{INDUSTRIES[db.settings.workspace?.industry]?.label} · {db.settings.workspace?.plan} plan</p>
          </Card>
        </div>
        {/* key resets the draft when switching sections */}
        <Comp key={active} />
      </div>
    </div>
  );
}
