// Contacts & Companies — one record per customer / prospect / partner with linked history.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Contact, Building2, Plus, Download, Phone, Mail, MessageCircle, Pencil, Trash2, Users, BadgeCheck, Sparkles, Globe, MapPin, Receipt, LifeBuoy, ArrowUpRight } from "lucide-react";
import { useStore, invoicePaid } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, Tabs, SearchInput, Select, Badge, Avatar, Drawer, Modal, Field, Input, Textarea, EmptyState, Pagination, usePaged, useConfirm, cx } from "../../components/ui";
import { STAGE_STYLE, DOC_STATUS_STYLE } from "../../config/constants";
import { term } from "../../config/workspace";
import { inr, compactInr, timeAgo, fmtDate, downloadCSV } from "../../utils/format";
import { docTotal } from "../docs/docUtils";

export const CONTACT_TYPES = ["Customer", "Prospect", "Partner", "Vendor"];
export const TYPE_STYLE = {
  Customer: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Prospect: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Partner: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Vendor: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};
const emptyContact = (ownerId) => ({ name: "", designation: "", companyId: "", phone: "", email: "", city: "", type: "Prospect", ownerId, tags: [], notes: "", whatsappOptIn: true, emailOptIn: true });
const emptyCompany = (ownerId) => ({ name: "", city: "", phone: "", email: "", website: "", gstin: "", type: "Prospect", size: "1–10", ownerId, tags: [], address: "" });
const wa = (p) => `https://wa.me/91${String(p || "").replace(/\D/g, "").slice(-10)}`;

export default function Contacts() {
  const { db, add, update, remove, user, userById, log } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("contacts");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [owner, setOwner] = useState("");
  const [open, setOpen] = useState(null); // { kind, id }
  const [form, setForm] = useState(null); // { kind, data }
  const [err, setErr] = useState({});

  const contacts = db.contacts || [];
  const companies = db.companies || [];
  const companyById = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c])), [companies]);

  useEffect(() => {
    const o = params.get("open"); const n = params.get("new");
    if (o) { setOpen({ kind: o.startsWith("CO") ? "company" : "contact", id: o }); setTab(o.startsWith("CO") ? "companies" : "contacts"); }
    if (n) setForm({ kind: n === "company" ? "company" : "contact", data: n === "company" ? emptyCompany(user.id) : emptyContact(user.id) });
    if (o || n) { params.delete("open"); params.delete("new"); setParams(params, { replace: true }); }
  }, [params, setParams, user.id]);

  // Revenue per company name from invoices
  const revenueOf = useMemo(() => {
    const m = {};
    db.invoices.forEach((i) => { const k = i.client?.company; if (k) m[k] = (m[k] || 0) + invoicePaid(i); });
    return m;
  }, [db.invoices]);
  const openDealsOf = useMemo(() => {
    const m = {};
    db.leads.filter((l) => !["Won", "Lost"].includes(l.stage)).forEach((l) => { m[l.company] = (m[l.company] || 0) + Number(l.value || 0); });
    return m;
  }, [db.leads]);

  const s = q.trim().toLowerCase();
  const has = (...f) => !s || f.some((v) => String(v || "").toLowerCase().includes(s));
  const contactRows = useMemo(() => contacts
    .filter((c) => (!type || c.type === type) && (!owner || c.ownerId === owner) && has(c.name, c.phone, c.email, c.city, companyById[c.companyId]?.name))
    .sort((a, b) => (b.lastContact || "").localeCompare(a.lastContact || "")),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [contacts, type, owner, s, companyById]);
  const companyRows = useMemo(() => companies
    .filter((c) => (!type || c.type === type) && (!owner || c.ownerId === owner) && has(c.name, c.city, c.gstin, c.email))
    .sort((a, b) => (revenueOf[b.name] || 0) - (revenueOf[a.name] || 0)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [companies, type, owner, s, revenueOf]);
  const pgC = usePaged(contactRows, 14);
  const pgO = usePaged(companyRows, 14);

  const kpi = {
    contacts: contacts.length, customers: contacts.filter((c) => c.type === "Customer").length,
    prospects: contacts.filter((c) => c.type === "Prospect").length, companies: companies.length,
    newMonth: contacts.filter((c) => (c.createdAt || "").slice(0, 7) === new Date().toISOString().slice(0, 7)).length,
  };

  const save = () => {
    const d = form.data; const e = {};
    if (!d.name.trim()) e.name = "Name is required";
    if (form.kind === "contact" && d.phone && !/^\+?[\d\s-]{10,15}$/.test(d.phone)) e.phone = "Enter a valid phone number";
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) e.email = "Enter a valid email";
    if (form.kind === "contact" && !d.id && d.phone && contacts.some((c) => c.phone.replace(/\D/g, "").slice(-10) === d.phone.replace(/\D/g, "").slice(-10))) e.phone = "A contact with this phone already exists";
    setErr(e);
    if (Object.keys(e).length) return;
    const col = form.kind === "contact" ? "contacts" : "companies";
    if (d.id) { update(col, d.id, d); toast("Saved"); log("updated", form.kind === "contact" ? "Contact" : "Company", d.name); }
    else { const r = add(col, { ...d, createdAt: new Date().toISOString(), lastContact: new Date().toISOString(), leadIds: [] }, form.kind === "contact" ? "CT" : "CO"); toast(`${d.name} added`); log("created", form.kind === "contact" ? "Contact" : "Company", d.name); setOpen({ kind: form.kind, id: r.id }); }
    setForm(null);
  };
  const del = async (kind, rec) => {
    if (!(await confirm({ title: `Delete ${rec.name}?`, message: kind === "company" ? "Contacts linked to this company are kept but unlinked." : "Linked leads and invoices are kept." }))) return;
    if (kind === "company") contacts.filter((c) => c.companyId === rec.id).forEach((c) => update("contacts", c.id, { companyId: "" }));
    remove(kind === "contact" ? "contacts" : "companies", rec.id);
    log("deleted", kind === "contact" ? "Contact" : "Company", rec.name);
    setOpen(null); toast("Deleted");
  };
  const exportCSV = () => tab === "contacts"
    ? downloadCSV("contacts.csv", contactRows, [{ label: "Name", key: "name" }, { label: "Designation", key: "designation" }, { label: "Company", value: (c) => companyById[c.companyId]?.name || "" }, { label: "Phone", key: "phone" }, { label: "Email", key: "email" }, { label: "City", key: "city" }, { label: "Type", key: "type" }, { label: "Owner", value: (c) => userById(c.ownerId)?.name || "" }])
    : downloadCSV("companies.csv", companyRows, [{ label: "Company", key: "name" }, { label: "City", key: "city" }, { label: "GSTIN", key: "gstin" }, { label: "Type", key: "type" }, { label: "Revenue", value: (c) => revenueOf[c.name] || 0 }, { label: "Open deals", value: (c) => openDealsOf[c.name] || 0 }]);

  const owners = db.users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }));

  return (
    <div>
      <PageHeader title="Contacts & Companies" subtitle={`Every ${term("client").toLowerCase()}, prospect, partner and vendor — with their full history in one place.`}
        actions={<>
          <Button variant="secondary" icon={Download} onClick={exportCSV}>Export</Button>
          <Button variant="secondary" icon={Building2} onClick={() => { setErr({}); setForm({ kind: "company", data: emptyCompany(user.id) }); }}>Add company</Button>
          <Button icon={Plus} onClick={() => { setErr({}); setForm({ kind: "contact", data: emptyContact(user.id) }); }}>Add contact</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Contacts" value={kpi.contacts} icon={Contact} sub={`${kpi.newMonth} added this month`} />
        <StatCard label={`${term("client")}s`} value={kpi.customers} icon={BadgeCheck} tone="emerald" sub="have bought from you" onClick={() => { setTab("contacts"); setType("Customer"); }} />
        <StatCard label="Prospects" value={kpi.prospects} icon={Sparkles} tone="sky" sub="in conversation" onClick={() => { setTab("contacts"); setType("Prospect"); }} />
        <StatCard label="Companies" value={kpi.companies} icon={Building2} tone="violet" sub={`${compactInr(Object.values(revenueOf).reduce((a, b) => a + b, 0))} collected`} onClick={() => setTab("companies")} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: "contacts", label: "Contacts", count: contacts.length }, { value: "companies", label: "Companies", count: companies.length }]} />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <SearchInput value={q} onChange={setQ} placeholder={tab === "contacts" ? "Name, phone, email, company…" : "Company, city, GSTIN…"} className="sm:w-72" />
            <Select value={type} onChange={(e) => setType(e.target.value)} options={CONTACT_TYPES} placeholder="All types" className="sm:w-40" />
            <Select value={owner} onChange={(e) => setOwner(e.target.value)} options={owners} placeholder="All owners" className="sm:w-44" />
          </div>
        </div>

        {tab === "contacts" ? (
          contactRows.length === 0 ? <EmptyState icon={Contact} title="No contacts match" text="Try clearing filters, or add your first contact." /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="th">Name</th><th className="th">Company</th><th className="th">Phone / Email</th><th className="th">Type</th><th className="th">Owner</th><th className="th">Last contact</th><th className="th text-right">Reach</th></tr></thead>
                  <tbody>
                    {pgC.slice.map((c) => (
                      <tr key={c.id} className="tr cursor-pointer" onClick={() => setOpen({ kind: "contact", id: c.id })}>
                        <td className="td"><div className="flex items-center gap-3"><Avatar name={c.name} size="sm" /><div><p className="font-semibold text-slate-900 dark:text-white">{c.name}</p><p className="text-xs text-slate-500">{c.designation || "—"}{c.city ? ` · ${c.city}` : ""}</p></div></div></td>
                        <td className="td">{companyById[c.companyId]?.name || <span className="text-slate-400">—</span>}</td>
                        <td className="td"><p>{c.phone || "—"}</p><p className="text-xs text-slate-500">{c.email}</p></td>
                        <td className="td"><Badge className={TYPE_STYLE[c.type]}>{c.type}</Badge></td>
                        <td className="td"><span className="flex items-center gap-2"><Avatar name={userById(c.ownerId)?.name || "?"} size="xs" /><span className="text-xs">{userById(c.ownerId)?.name.split(" ")[0] || "—"}</span></span></td>
                        <td className="td text-xs text-slate-500">{timeAgo(c.lastContact)}</td>
                        <td className="td" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <a href={`tel:${c.phone}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="Call"><Phone className="h-4 w-4" /></a>
                            <a href={wa(c.phone)} target="_blank" rel="noreferrer" className={cx("rounded-lg p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10", c.whatsappOptIn ? "text-emerald-600" : "text-slate-300")} title={c.whatsappOptIn ? "WhatsApp" : "Not opted in for WhatsApp"}><MessageCircle className="h-4 w-4" /></a>
                            <a href={`mailto:${c.email}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="Email"><Mail className="h-4 w-4" /></a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination {...pgC} onPage={pgC.setPage} />
            </>
          )
        ) : (
          companyRows.length === 0 ? <EmptyState icon={Building2} title="No companies match" text="Try clearing filters, or add a company." /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="th">Company</th><th className="th">City</th><th className="th">Contacts</th><th className="th">Type</th><th className="th text-right">Open deals</th><th className="th text-right">Revenue collected</th><th className="th">Owner</th></tr></thead>
                  <tbody>
                    {pgO.slice.map((c) => (
                      <tr key={c.id} className="tr cursor-pointer" onClick={() => setOpen({ kind: "company", id: c.id })}>
                        <td className="td"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">{c.name.slice(0, 2).toUpperCase()}</span><div><p className="font-semibold text-slate-900 dark:text-white">{c.name}</p><p className="text-xs text-slate-500">{c.gstin || "No GSTIN"}</p></div></div></td>
                        <td className="td">{c.city || "—"}</td>
                        <td className="td"><span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />{contacts.filter((x) => x.companyId === c.id).length}</span></td>
                        <td className="td"><Badge className={TYPE_STYLE[c.type]}>{c.type}</Badge></td>
                        <td className="td text-right">{openDealsOf[c.name] ? inr(openDealsOf[c.name]) : <span className="text-slate-400">—</span>}</td>
                        <td className="td text-right font-semibold text-slate-900 dark:text-white">{revenueOf[c.name] ? inr(revenueOf[c.name]) : <span className="font-normal text-slate-400">—</span>}</td>
                        <td className="td text-xs">{userById(c.ownerId)?.name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination {...pgO} onPage={pgO.setPage} />
            </>
          )
        )}
      </Card>

      {open && <RecordDrawer open={open} onClose={() => setOpen(null)} companyById={companyById} revenueOf={revenueOf} openDealsOf={openDealsOf}
        onEdit={(kind, data) => { setErr({}); setForm({ kind, data: { ...data } }); }} onDelete={del} onOpen={setOpen} nav={nav} />}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.data.id ? `Edit ${form?.kind}` : `Add ${form?.kind}`} size="lg"
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>{form?.data.id ? "Save changes" : `Add ${form?.kind}`}</Button></>}>
        {form && (() => {
          const d = form.data; const set = (k) => (e) => setForm({ ...form, data: { ...d, [k]: e.target.value } });
          return form.kind === "contact" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={err.name}><Input value={d.name} onChange={set("name")} autoFocus /></Field>
              <Field label="Designation"><Input value={d.designation} onChange={set("designation")} placeholder="Owner, Purchase Head…" /></Field>
              <Field label="Phone" error={err.phone}><Input value={d.phone} onChange={set("phone")} /></Field>
              <Field label="Email" error={err.email}><Input type="email" value={d.email} onChange={set("email")} /></Field>
              <Field label="Company"><Select value={d.companyId} onChange={set("companyId")} placeholder="— Individual —" options={companies.map((c) => ({ value: c.id, label: c.name }))} /></Field>
              <Field label="City"><Input value={d.city} onChange={set("city")} /></Field>
              <Field label="Type"><Select value={d.type} onChange={set("type")} options={CONTACT_TYPES} /></Field>
              <Field label="Owner"><Select value={d.ownerId} onChange={set("ownerId")} options={owners} /></Field>
              <Field label="Tags" hint="Comma separated" className="sm:col-span-2"><Input value={(d.tags || []).join(", ")} onChange={(e) => setForm({ ...form, data: { ...d, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } })} /></Field>
              <Field label="Notes" className="sm:col-span-2"><Textarea value={d.notes || ""} onChange={set("notes")} /></Field>
              <div className="flex flex-wrap gap-5 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.whatsappOptIn} onChange={(e) => setForm({ ...form, data: { ...d, whatsappOptIn: e.target.checked } })} className="h-4 w-4 accent-brand-600" />Agreed to WhatsApp messages</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.emailOptIn} onChange={(e) => setForm({ ...form, data: { ...d, emailOptIn: e.target.checked } })} className="h-4 w-4 accent-brand-600" />Agreed to marketing emails</label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Company name" required error={err.name} className="sm:col-span-2"><Input value={d.name} onChange={set("name")} autoFocus /></Field>
              <Field label="Phone"><Input value={d.phone} onChange={set("phone")} /></Field>
              <Field label="Email" error={err.email}><Input value={d.email} onChange={set("email")} /></Field>
              <Field label="Website"><Input value={d.website} onChange={set("website")} /></Field>
              <Field label="GSTIN"><Input value={d.gstin} onChange={(e) => setForm({ ...form, data: { ...d, gstin: e.target.value.toUpperCase() } })} /></Field>
              <Field label="City"><Input value={d.city} onChange={set("city")} /></Field>
              <Field label="Team size"><Select value={d.size} onChange={set("size")} options={["1–10", "11–50", "51–200", "200+"]} /></Field>
              <Field label="Type"><Select value={d.type} onChange={set("type")} options={CONTACT_TYPES} /></Field>
              <Field label="Owner"><Select value={d.ownerId} onChange={set("ownerId")} options={owners} /></Field>
              <Field label="Billing address" className="sm:col-span-2"><Textarea value={d.address || ""} onChange={set("address")} /></Field>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function Section({ title, icon: Icon, count, children }) {
  return (
    <div className="border-t border-slate-100 px-6 py-5 dark:border-slate-800">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Icon className="h-3.5 w-3.5" />{title}{count !== undefined && <span className="rounded bg-slate-100 px-1.5 text-[10px] dark:bg-slate-800">{count}</span>}</p>
      {children}
    </div>
  );
}

function RecordDrawer({ open, onClose, companyById, revenueOf, openDealsOf, onEdit, onDelete, onOpen, nav }) {
  const { db, userById } = useStore();
  const isCo = open.kind === "company";
  const rec = (isCo ? db.companies : db.contacts)?.find((x) => x.id === open.id);
  if (!rec) return null;
  const co = isCo ? rec : companyById[rec.companyId];
  const phoneKey = (p) => String(p || "").replace(/\D/g, "").slice(-10);
  const leads = db.leads.filter((l) => (isCo ? l.company === rec.name : (rec.leadIds || []).includes(l.id) || phoneKey(l.phone) === phoneKey(rec.phone)));
  const invoices = db.invoices.filter((i) => (co ? i.client?.company === co.name : phoneKey(i.client?.phone) === phoneKey(rec.phone)));
  const tickets = (db.tickets || []).filter((t) => (isCo ? t.company === rec.name : t.contactId === rec.id));
  const people = isCo ? (db.contacts || []).filter((c) => c.companyId === rec.id) : [];
  const empty = <p className="text-sm text-slate-400">Nothing yet</p>;

  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={rec.name}
      subtitle={<span className="flex flex-wrap items-center gap-2"><Badge className={TYPE_STYLE[rec.type]}>{rec.type}</Badge>{!isCo && rec.designation}{!isCo && co && <button onClick={() => onOpen({ kind: "company", id: co.id })} className="font-medium text-brand-600 hover:underline dark:text-brand-300">{co.name}</button>}</span>}
      footer={<><Button variant="ghost" icon={Trash2} className="mr-auto text-rose-600" onClick={() => onDelete(open.kind, rec)}>Delete</Button><Button variant="secondary" icon={Pencil} onClick={() => onEdit(open.kind, rec)}>Edit</Button>{!isCo && <Button icon={Plus} onClick={() => nav(`/leads?new=1`)}>New lead</Button>}</>}>
      <div className="grid grid-cols-3 gap-3 px-6 py-5">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p className="text-xs text-slate-500">Revenue collected</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{inr(co ? revenueOf[co.name] || 0 : 0)}</p></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p className="text-xs text-slate-500">Open deals</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{inr(co ? openDealsOf[co.name] || 0 : leads.filter((l) => !["Won", "Lost"].includes(l.stage)).reduce((a, l) => a + l.value, 0))}</p></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p className="text-xs text-slate-500">Open tickets</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{tickets.filter((t) => !["Resolved", "Closed"].includes(t.status)).length}</p></div>
      </div>
      <div className="grid grid-cols-1 gap-3 px-6 pb-5 text-sm sm:grid-cols-2">
        {[[Phone, rec.phone, `tel:${rec.phone}`], [Mail, rec.email, `mailto:${rec.email}`], [MapPin, rec.city], [Globe, rec.website, rec.website ? `https://${rec.website.replace(/^https?:\/\//, "")}` : null]].filter((x) => x[1]).map(([I, v, href], i) => (
          <p key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><I className="h-4 w-4 text-slate-400" />{href ? <a href={href} target="_blank" rel="noreferrer" className="hover:text-brand-600 hover:underline">{v}</a> : v}</p>
        ))}
        {isCo && rec.gstin && <p className="text-slate-600 dark:text-slate-300"><span className="text-slate-400">GSTIN</span> {rec.gstin}</p>}
        <p className="text-slate-600 dark:text-slate-300"><span className="text-slate-400">Owner</span> {userById(rec.ownerId)?.name || "—"}</p>
        {(rec.tags || []).length > 0 && <div className="flex flex-wrap gap-1 sm:col-span-2">{rec.tags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">{t}</span>)}</div>}
        {rec.notes && <p className="rounded-lg bg-amber-50 p-3 text-slate-700 dark:bg-amber-500/10 dark:text-amber-100 sm:col-span-2">{rec.notes}</p>}
      </div>
      {!isCo && (
        <div className="flex gap-2 px-6 pb-5">
          <a href={`tel:${rec.phone}`} className="flex-1"><Button variant="secondary" icon={Phone} className="w-full">Call</Button></a>
          <a href={wa(rec.phone)} target="_blank" rel="noreferrer" className="flex-1"><Button variant="secondary" icon={MessageCircle} className="w-full">WhatsApp</Button></a>
          <a href={`mailto:${rec.email}`} className="flex-1"><Button variant="secondary" icon={Mail} className="w-full">Email</Button></a>
        </div>
      )}
      {isCo && (
        <Section title="People" icon={Users} count={people.length}>
          {people.length ? <div className="space-y-2">{people.map((p) => (
            <button key={p.id} onClick={() => onOpen({ kind: "contact", id: p.id })} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
              <Avatar name={p.name} size="sm" /><span className="flex-1"><span className="block text-sm font-semibold">{p.name}</span><span className="text-xs text-slate-500">{p.designation} · {p.phone}</span></span><ArrowUpRight className="h-4 w-4 text-slate-300" />
            </button>))}</div> : empty}
        </Section>
      )}
      <Section title="Leads & deals" icon={Sparkles} count={leads.length}>
        {leads.length ? <div className="space-y-2">{leads.slice(0, 8).map((l) => (
          <button key={l.id} onClick={() => nav(`/leads?open=${l.id}`)} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-2.5 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
            <span className="flex-1"><span className="block text-sm font-semibold">{l.service}</span><span className="text-xs text-slate-500">{l.id} · {fmtDate(l.createdAt)}</span></span>
            <span className="text-sm font-semibold">{compactInr(l.value)}</span><Badge className={STAGE_STYLE[l.stage]}>{l.stage}</Badge>
          </button>))}</div> : empty}
      </Section>
      <Section title="Invoices" icon={Receipt} count={invoices.length}>
        {invoices.length ? <div className="space-y-2">{invoices.slice(0, 6).map((i) => (
          <button key={i.id} onClick={() => nav(`/invoices?open=${i.id}`)} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-2.5 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
            <span className="flex-1"><span className="block text-sm font-semibold">{i.number}</span><span className="text-xs text-slate-500">{fmtDate(i.date)}</span></span>
            <span className="text-sm font-semibold">{inr(docTotal(i))}</span><Badge className={DOC_STATUS_STYLE[i.status]}>{i.status}</Badge>
          </button>))}</div> : empty}
      </Section>
      <Section title="Support tickets" icon={LifeBuoy} count={tickets.length}>
        {tickets.length ? <div className="space-y-2">{tickets.slice(0, 6).map((t) => (
          <button key={t.id} onClick={() => nav(`/tickets?open=${t.id}`)} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-2.5 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
            <span className="flex-1"><span className="block text-sm font-semibold">{t.subject}</span><span className="text-xs text-slate-500">{t.number} · {timeAgo(t.createdAt)}</span></span><span className="text-xs font-semibold text-slate-500">{t.status}</span>
          </button>))}</div> : empty}
      </Section>
    </Drawer>
  );
}
