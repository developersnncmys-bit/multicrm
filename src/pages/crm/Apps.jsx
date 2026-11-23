// Apps & Integrations marketplace — connect channels, payments, accounting and lead portals. UI only.
import { useState } from "react";
import { Blocks, CheckCircle2, Plug, Search as SearchIcon, ExternalLink, Unplug, KeyRound, Copy } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, Tabs, Badge, Modal, Field, Input, SearchInput, EmptyState, cx } from "../../components/ui";
import { timeAgo } from "../../utils/format";

// Brand-neutral tiles: two-letter monogram + colour, no third-party logos
export const APPS = [
  { key: "whatsapp", name: "WhatsApp Business API", cat: "Messaging", color: "#16a34a", desc: "Send templates, reminders and campaigns; log every chat on the lead." },
  { key: "gmail", name: "Gmail / Google Workspace", cat: "Messaging", color: "#dc2626", desc: "Send quotations and invoices from your own mailbox; track replies." },
  { key: "outlook", name: "Outlook / Microsoft 365", cat: "Messaging", color: "#2563eb", desc: "Two-way email sync for Microsoft users." },
  { key: "sms", name: "SMS Gateway (DLT)", cat: "Messaging", color: "#7c3aed", desc: "Transactional & promotional SMS with DLT templates." },
  { key: "ivr", name: "Cloud Telephony / IVR", cat: "Messaging", color: "#0891b2", desc: "Click-to-call, call recording and missed-call leads." },
  { key: "gcal", name: "Google Calendar", cat: "Productivity", color: "#2563eb", desc: "Sync meetings & follow-ups; auto Meet links." },
  { key: "razorpay", name: "Razorpay", cat: "Payments", color: "#1d4ed8", desc: "Payment links on invoices; auto-mark paid." },
  { key: "phonepe", name: "UPI / PhonePe for Business", cat: "Payments", color: "#6d28d9", desc: "UPI QR on invoices with instant confirmation." },
  { key: "tally", name: "Tally Prime", cat: "Accounting", color: "#0f766e", desc: "Push invoices & receipts to Tally vouchers." },
  { key: "zohobooks", name: "Zoho Books", cat: "Accounting", color: "#ea580c", desc: "Sync customers, invoices and payments." },
  { key: "gst", name: "GST e-Invoice & e-Way Bill", cat: "Accounting", color: "#b45309", desc: "Generate IRN and e-way bills from invoices." },
  { key: "webforms", name: "Website Forms", cat: "Lead sources", color: "#4f46e5", desc: "Embed forms on your site; leads arrive instantly." },
  { key: "meta", name: "Meta Lead Ads", cat: "Lead sources", color: "#1d4ed8", desc: "Facebook & Instagram lead forms → CRM in seconds." },
  { key: "googleads", name: "Google Ads Lead Forms", cat: "Lead sources", color: "#ca8a04", desc: "Capture Google lead-form extensions." },
  { key: "indiamart", name: "IndiaMART", cat: "Lead sources", color: "#be123c", desc: "Auto-pull buy leads and enquiries." },
  { key: "justdial", name: "JustDial", cat: "Lead sources", color: "#ea580c", desc: "Import JustDial enquiries automatically." },
  { key: "99acres", name: "99acres / MagicBricks", cat: "Lead sources", color: "#0369a1", desc: "Property portal leads for real estate." },
  { key: "practo", name: "Practo", cat: "Lead sources", color: "#0e7490", desc: "Appointment requests for clinics." },
  { key: "zapier", name: "Zapier / Make", cat: "Developer", color: "#f97316", desc: "Connect 5,000+ apps without code." },
  { key: "webhook", name: "Webhooks & REST API", cat: "Developer", color: "#334155", desc: "Your own integrations with API keys." },
];
const CATS = ["All", "Messaging", "Payments", "Accounting", "Lead sources", "Productivity", "Developer"];

export default function Apps() {
  const { db, setAppConnection, log } = useStore();
  const toast = useToast();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [account, setAccount] = useState("");
  const conns = db.appConnections || {};
  const rows = APPS.filter((a) => (cat === "All" || a.cat === cat) && (!q || a.name.toLowerCase().includes(q.toLowerCase())));
  const connectedCount = APPS.filter((a) => conns[a.key]?.connected).length;

  const connect = () => {
    setAppConnection(sel.key, { connected: true, account: account || "Connected", at: new Date().toISOString() });
    log("connected", "Integration", sel.name);
    toast(`${sel.name} connected (demo)`); setSel(null);
  };
  const disconnect = (a) => { setAppConnection(a.key, { connected: false }); log("disconnected", "Integration", a.name); toast(`${a.name} disconnected`); setSel(null); };

  return (
    <div>
      <PageHeader title="Apps & Integrations" subtitle="Connect the tools this business already uses. Leads, payments and messages then flow in automatically." />
      <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><Plug className="h-5 w-5" /></span>
        <div className="flex-1"><p className="font-semibold text-slate-900 dark:text-white">{connectedCount} of {APPS.length} apps connected</p><p className="text-sm text-slate-500">Connections go live once the backend is configured for this workspace.</p></div>
        <SearchInput value={q} onChange={setQ} placeholder="Search apps…" className="sm:w-64" />
      </Card>
      <Tabs className="mb-4 w-fit" value={cat} onChange={setCat} tabs={CATS} />
      {rows.length === 0 ? <Card><EmptyState icon={SearchIcon} title="No apps found" /></Card> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((a) => {
            const c = conns[a.key];
            return (
              <Card key={a.key} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white" style={{ background: a.color }}>{a.name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").slice(0, 2).map((w) => w[0]).join("")}</span>
                  <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900 dark:text-white">{a.name}</p><p className="text-xs text-slate-500">{a.cat}</p></div>
                  {c?.connected && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
                </div>
                <p className="mt-3 flex-1 text-sm text-slate-600 dark:text-slate-300">{a.desc}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  {c?.connected ? <span className="truncate text-xs text-slate-500">{c.account}{c.at && ` · ${timeAgo(c.at)}`}</span> : <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800">Not connected</Badge>}
                  <Button size="sm" variant={c?.connected ? "secondary" : "primary"} onClick={() => { setAccount(""); setSel(a); }}>{c?.connected ? "Manage" : "Connect"}</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.name} subtitle={sel?.desc}
        footer={sel && (conns[sel.key]?.connected
          ? <><Button variant="ghost" icon={Unplug} className="mr-auto text-rose-600" onClick={() => disconnect(sel)}>Disconnect</Button><Button variant="secondary" onClick={() => setSel(null)}>Close</Button></>
          : <><Button variant="secondary" onClick={() => setSel(null)}>Cancel</Button><Button icon={Plug} onClick={connect}>Connect</Button></>)}>
        {sel && (conns[sel.key]?.connected ? (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" />Connected as {conns[sel.key].account}</p>
            {sel.key === "webforms" || sel.key === "webhook" ? (
              <Field label="Lead capture endpoint">
                <div className="flex gap-2"><Input readOnly value={`https://api.yourcrm.in/v1/hooks/${sel.key}/ws_demo123`} className="font-mono text-xs" /><Button variant="secondary" size="icon" onClick={() => { navigator.clipboard?.writeText(`https://api.yourcrm.in/v1/hooks/${sel.key}/ws_demo123`); toast("Copied"); }}><Copy className="h-4 w-4" /></Button></div>
              </Field>
            ) : <p className="text-slate-500">Data syncs every 5 minutes. Errors appear in the Audit Log.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Account / ID" hint="e.g. business phone, email or seller ID"><Input value={account} onChange={(e) => setAccount(e.target.value)} autoFocus /></Field>
            <Field label="API key / token"><div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input type="password" placeholder="Paste key (stored encrypted)" className="pl-9" /></div></Field>
            <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">Setup guide<ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
        ))}
      </Modal>
    </div>
  );
}
