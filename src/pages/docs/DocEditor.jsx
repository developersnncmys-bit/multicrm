import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Copy, Send, Save, UserSearch, BadgeCheck, Building2 } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Field, Input, Select, Textarea, Modal, cx } from "../../components/ui";
import { BRANCHES } from "../../config/constants";
import { calcTotals, amountInWords, inr, todayISO, addDays, uid } from "../../utils/format";
import { nextNumber, SERVICE_CATALOG, QUOTE_CATEGORIES, QUOTE_CATEGORY_NAMES, verifyGstin, officeFor } from "./docUtils";

const blankItem = () => ({ id: uid("i"), desc: "", hsn: "998314", qty: 1, rate: 0 });
const LEAD_SERVICE_HSN = { SEO: "998361", "Google Ads": "998361", "Social Media Marketing": "998361", "Branding & Logo": "998383", "Hosting & Maintenance": "998315" };

/**
 * Shared editor for quotations and invoices (tax + proforma).
 * kind: "quote" | "invoice" · initial: existing doc (edit) or partial doc (prefill) · onSaved(record, { sent })
 */
export default function DocEditor({ open, kind, initial, onClose, onSaved }) {
  const { db, add, update, user } = useStore();
  const toast = useToast();
  const isQuote = kind === "quote";
  const col = isQuote ? "quotations" : "invoices";
  const cfg = db.settings.docs || {};
  const series = db.settings.invoiceSeries || {};
  const editing = !!initial?.id;

  const prefixFor = (type) => (isQuote ? cfg.quotePrefix : type === "Proforma" ? (series.proformaPrefix || `PRF-${todayISO().slice(0, 4)}-`) : (cfg.invoicePrefix || series.taxPrefix));

  const build = () => {
    const date = todayISO();
    const type = initial?.type || "Tax";
    const category = initial?.serviceCategory || "Website Development";
    const base = {
      number: nextNumber(prefixFor(type), db[col]),
      leadId: "", client: { name: "", company: "", email: "", phone: "", address: "", city: "", state: "", pincode: "", gstin: "", pan: "" },
      date, items: [blankItem()], discountPct: 0, discountMode: "pct", gstPct: Number(cfg.defaultGst) || 18, interState: false,
      branch: user?.branch || BRANCHES[0],
      notes: isQuote ? "Thank you for considering us. We look forward to working with you." : type === "Proforma" ? "Proforma invoice — tax invoice will be raised on receipt of payment." : "Payment due within the due date. Thank you for your business!",
      ...(isQuote
        ? { validUntil: addDays(date, Number(cfg.quoteValidity) || 15), status: "Draft", serviceCategory: category, replyEmail: user?.email || "", terms: QUOTE_CATEGORIES[category]?.terms || "", revision: 1, negotiation: [] }
        : { type, dueDate: addDays(date, type === "Proforma" ? 15 : Number(cfg.paymentTerms) || 30), status: "Draft", payments: [] }),
    };
    if (!initial) return base;
    const merged = { ...base, ...initial, client: { ...base.client, ...(initial.client || {}) }, items: (initial.items?.length ? initial.items : base.items).map((i) => ({ ...i })) };
    if (!initial.id && initial.type && !initial.number) merged.number = nextNumber(prefixFor(initial.type), db[col]);
    return merged;
  };

  const [d, setD] = useState(build);
  const [errors, setErrors] = useState({});
  const [discAmt, setDiscAmt] = useState("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { const b = build(); setD(b); setErrors({}); setDiscAmt(b.discountAmt ? String(b.discountAmt) : ""); } }, [open, initial]);

  const totals = useMemo(() => calcTotals(d.items, d.discountPct, d.gstPct, d.interState), [d.items, d.discountPct, d.gstPct, d.interState]);
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const setClient = (patch) => setD((x) => ({ ...x, client: { ...x.client, ...patch } }));
  const setItem = (id, patch) => setD((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  // ₹ discount → keep discountPct in sync so totals everywhere stay consistent
  useEffect(() => {
    if (d.discountMode !== "amt") return;
    const amt = Number(discAmt) || 0;
    const pct = totals.subtotal ? Math.min(100, (amt / totals.subtotal) * 100) : 0;
    if (Math.abs(pct - (Number(d.discountPct) || 0)) > 0.0001) set({ discountPct: Number(pct.toFixed(4)), discountAmt: amt });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discAmt, totals.subtotal, d.discountMode]);

  const office = officeFor(db.settings, d.branch);
  const setBranch = (branch) => {
    const o = officeFor(db.settings, branch);
    const clientState = d.client.state;
    set({ branch, interState: clientState ? clientState !== o.state : d.interState });
  };

  const pickLead = (id) => {
    const l = db.leads.find((x) => x.id === id);
    if (!l) return set({ leadId: "" });
    setD((x) => ({
      ...x, leadId: l.id, branch: l.branch || x.branch, interState: l.branch === "Mumbai",
      client: { ...x.client, name: l.name, company: l.company, email: l.email, phone: l.phone, city: x.client.city || l.city || "", gstin: x.client.gstin || l.gstin || "" },
      items: x.items.length === 1 && !x.items[0].desc ? [{ ...blankItem(), desc: l.service, hsn: LEAD_SERVICE_HSN[l.service] || "998314", rate: l.value ? Math.round(l.value / 1.18) : 0 }] : x.items,
    }));
  };

  const quickAdd = (svc) => setD((x) => {
    const items = x.items.length === 1 && !x.items[0].desc && !Number(x.items[0].rate) ? [] : x.items;
    return { ...x, items: [...items, { ...blankItem(), desc: svc.name === "Custom item" ? "" : svc.name, hsn: svc.hsn, rate: svc.rate }] };
  });

  const pickCatalog = (id, name) => {
    const svc = SERVICE_CATALOG.find((s) => s.name === name);
    if (svc) setItem(id, { desc: svc.name === "Custom item" ? "" : svc.name, hsn: svc.hsn, rate: svc.rate || 0 });
  };

  const setCategory = (cat) => {
    const prevDefault = QUOTE_CATEGORIES[d.serviceCategory]?.terms || "";
    set({ serviceCategory: cat, terms: !d.terms || d.terms === prevDefault ? QUOTE_CATEGORIES[cat]?.terms || "" : d.terms });
  };

  const verify = () => {
    const r = verifyGstin(d.client.gstin);
    if (!r.ok) { setErrors((e) => ({ ...e, gstin: r.error })); return toast(r.error, "error"); }
    setErrors((e) => ({ ...e, gstin: undefined }));
    setClient({ gstin: r.gstin, state: r.state, pan: r.pan });
    set({ interState: r.state !== office.state });
    toast(`GSTIN verified · ${r.state} · PAN ${r.pan}`);
  };

  const validate = () => {
    const e = {};
    if (!d.client.name.trim() && !d.client.company.trim()) e.client = "Client name or company is required";
    if (!d.items.some((i) => String(i.desc).trim() && Number(i.rate) > 0)) e.items = "Add at least one item with a description and rate";
    if (!d.number.trim()) e.number = "Number is required";
    if (db[col].some((x) => x.number === d.number.trim() && x.id !== d.id)) e.number = "This number is already used";
    if (d.client.email && !/^\S+@\S+\.\S+$/.test(d.client.email)) e.email = "Invalid email";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = (markSent) => {
    if (!validate()) return;
    const items = d.items.filter((i) => String(i.desc).trim() || Number(i.rate) > 0).map((i) => ({ ...i, qty: Number(i.qty) || 1, rate: Number(i.rate) || 0 }));
    const rec = { ...d, number: d.number.trim(), items, discountPct: Number(d.discountPct) || 0, gstPct: Number(d.gstPct) || 0, discountAmt: d.discountMode === "amt" ? Number(discAmt) || 0 : 0 };
    if (markSent && ["Draft", undefined].includes(d.status)) rec.status = "Sent";
    let saved;
    if (editing) { update(col, d.id, rec); saved = { ...rec }; }
    else { const { id: _drop, ...rest } = rec; saved = add(col, isQuote ? { ...rest, createdBy: user?.id } : rest, isQuote ? "Q" : "I"); }
    if (markSent && isQuote) {
      const t = calcTotals(items, rec.discountPct, rec.gstPct, rec.interState);
      const body = `Dear ${rec.client.name || "Sir/Madam"},\n\nPlease find our quotation ${rec.number} for ${rec.serviceCategory} — ${inr(t.total)} (incl. GST), valid until ${rec.validUntil}.\n\nLooking forward to working with you.\n\nRegards,\n${user?.name || ""}\n${db.settings.company.name}`;
      window.location.href = `mailto:${rec.client.email || ""}?cc=${encodeURIComponent(rec.replyEmail || "")}&subject=${encodeURIComponent(`Quotation ${rec.number} — ${db.settings.company.name}`)}&body=${encodeURIComponent(body)}`;
    }
    const label = isQuote ? "Quotation" : d.type === "Proforma" ? "Proforma" : "Invoice";
    toast(`${label} ${rec.number} ${editing ? "updated" : "created"}${markSent ? (isQuote ? " & sent to client" : " & marked sent") : ""}`);
    onSaved?.(saved, { sent: markSent });
    onClose();
  };

  const leadOptions = db.leads.filter((l) => l.stage !== "Lost").map((l) => ({ value: l.id, label: `${l.name} · ${l.company}` }));
  const discountShown = d.discountMode === "amt" ? `₹${Number(discAmt || 0).toLocaleString("en-IN")}` : `${d.discountPct}%`;

  return (
    <Modal open={open} onClose={onClose} size="xl"
      title={`${editing ? "Edit" : "New"} ${isQuote ? (d.revision > 1 ? `Quotation · Revision ${d.revision}` : "Quotation") : d.type === "Proforma" ? "Proforma Invoice" : "Tax Invoice"}`}
      subtitle={d.number}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="secondary" icon={Save} onClick={() => save(false)}>{editing ? "Save changes" : "Save"}</Button>
        {(!editing || d.status === "Draft" || isQuote) && <Button icon={Send} onClick={() => save(true)}>{isQuote ? "Save & send mail" : "Save & mark sent"}</Button>}
      </>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {/* Client */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{isQuote ? "Prepared for" : "Bill to"}</h3>
              <div className="flex w-full items-center gap-2 sm:w-80">
                <UserSearch className="h-4 w-4 shrink-0 text-slate-400" />
                <Select value={d.leadId || ""} onChange={(e) => pickLead(e.target.value)} options={leadOptions} placeholder="Link to enquiry / lead (autofill)…" className="h-9 py-1.5" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client name" required error={errors.client}><Input value={d.client.name} onChange={(e) => setClient({ name: e.target.value })} placeholder="Contact person" /></Field>
              <Field label="Business / company"><Input value={d.client.company} onChange={(e) => setClient({ company: e.target.value })} /></Field>
              <Field label="Email" error={errors.email}><Input type="email" value={d.client.email} onChange={(e) => setClient({ email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={d.client.phone} onChange={(e) => setClient({ phone: e.target.value })} /></Field>
              <Field label="Billing address" className="sm:col-span-2"><Input value={d.client.address} onChange={(e) => setClient({ address: e.target.value })} placeholder="Street, area" /></Field>
              {!isQuote && <>
                <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                  <Field label="City"><Input value={d.client.city || ""} onChange={(e) => setClient({ city: e.target.value })} /></Field>
                  <Field label="State"><Input value={d.client.state || ""} onChange={(e) => { setClient({ state: e.target.value }); set({ interState: !!e.target.value && e.target.value !== office.state }); }} /></Field>
                  <Field label="Pincode"><Input value={d.client.pincode || ""} onChange={(e) => setClient({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></Field>
                </div>
              </>}
              <Field label="Client GSTIN" error={errors.gstin}>
                <div className="flex gap-2">
                  <Input value={d.client.gstin} onChange={(e) => setClient({ gstin: e.target.value.toUpperCase() })} placeholder="Optional" maxLength={15} />
                  {!isQuote && <Button type="button" variant="soft" size="sm" className="h-[38px]" icon={BadgeCheck} onClick={verify}>Verify & Fill</Button>}
                </div>
              </Field>
              {!isQuote ? <Field label="PAN"><Input value={d.client.pan || ""} onChange={(e) => setClient({ pan: e.target.value.toUpperCase() })} maxLength={10} /></Field>
                : <Field label="Branch"><Select options={BRANCHES} value={d.branch} onChange={(e) => setBranch(e.target.value)} /></Field>}
            </div>
          </section>

          {isQuote && (
            <section className="grid gap-3 sm:grid-cols-2">
              <Field label="Service category" hint="Fills default terms and the proposal content"><Select options={QUOTE_CATEGORY_NAMES} value={d.serviceCategory} onChange={(e) => setCategory(e.target.value)} /></Field>
              <Field label="Your email (replies go here)" hint="Added as CC when sending"><Input type="email" value={d.replyEmail || ""} onChange={(e) => set({ replyEmail: e.target.value })} /></Field>
            </section>
          )}

          {!isQuote && (
            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex flex-wrap items-start gap-4">
                <Field label="Office location" className="w-48"><Select options={BRANCHES} value={d.branch} onChange={(e) => setBranch(e.target.value)} /></Field>
                <div className="min-w-0 flex-1 text-xs text-slate-500">
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300"><Building2 className="h-3.5 w-3.5" />Billing from</p>
                  <p>{office.name} · {office.address}{office.city ? `, ${office.city}` : ""} {office.pincode}</p>
                  <p>{office.state} · GSTIN {office.gstin || "—"}</p>
                </div>
              </div>
            </section>
          )}

          {/* Doc meta */}
          <section className="grid gap-3 sm:grid-cols-4">
            <Field label={isQuote ? "Quote no." : "Invoice no."} error={errors.number}><Input value={d.number} onChange={(e) => set({ number: e.target.value })} /></Field>
            <Field label={isQuote ? "Date" : "Invoice date"}><Input type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} /></Field>
            {isQuote || d.type === "Proforma"
              ? <Field label="Valid until"><Input type="date" value={isQuote ? d.validUntil : d.dueDate} onChange={(e) => set(isQuote ? { validUntil: e.target.value } : { dueDate: e.target.value })} /></Field>
              : <Field label="Due date"><Input type="date" value={d.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></Field>}
            {!isQuote
              ? <Field label="Invoice type"><Select options={["Tax", "Proforma"]} value={d.type} disabled={editing} onChange={(e) => set({ type: e.target.value, number: nextNumber(prefixFor(e.target.value), db[col]) })} /></Field>
              : <div />}
          </section>

          {/* Items */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{isQuote ? "Deliverables & pricing" : "Line items"}</h3>
              <Button size="sm" variant="soft" icon={Plus} onClick={() => set({ items: [...d.items, blankItem()] })}>Add row</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr><th className="th w-8">#</th><th className="th">Description</th><th className="th w-28">HSN/SAC</th><th className="th w-20">Qty</th><th className="th w-32">Rate (₹)</th><th className="th w-28 text-right">Amount</th><th className="th w-16" /></tr>
                </thead>
                <tbody>
                  {d.items.map((it, idx) => (
                    <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 text-xs text-slate-400">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <Input list="svc-catalog" value={it.desc} onChange={(e) => { setItem(it.id, { desc: e.target.value }); if (SERVICE_CATALOG.some((s) => s.name === e.target.value)) pickCatalog(it.id, e.target.value); }} placeholder="Pick from catalog or type" className="h-9 py-1" />
                      </td>
                      <td className="px-2 py-2"><Input value={it.hsn} onChange={(e) => setItem(it.id, { hsn: e.target.value })} className="h-9 py-1" /></td>
                      <td className="px-2 py-2"><Input type="number" min="1" value={it.qty} onChange={(e) => setItem(it.id, { qty: e.target.value })} className="h-9 py-1" /></td>
                      <td className="px-2 py-2"><Input type="number" min="0" value={it.rate} onChange={(e) => setItem(it.id, { rate: e.target.value })} className="h-9 py-1" /></td>
                      <td className="px-3 text-right text-sm font-semibold tabular-nums">{inr((Number(it.qty) || 0) * (Number(it.rate) || 0))}</td>
                      <td className="px-2">
                        <div className="flex">
                          <button title="Duplicate" onClick={() => set({ items: [...d.items.slice(0, idx + 1), { ...it, id: uid("i") }, ...d.items.slice(idx + 1)] })} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Copy className="h-3.5 w-3.5" /></button>
                          <button title="Remove" disabled={d.items.length === 1} onClick={() => set({ items: d.items.filter((x) => x.id !== it.id) })} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="svc-catalog">{SERVICE_CATALOG.map((s) => <option key={s.name} value={s.name}>{`SAC ${s.hsn}`}</option>)}</datalist>
            </div>
            {errors.items && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.items}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="py-1 text-xs font-semibold text-slate-400">Service catalog:</span>
              {SERVICE_CATALOG.filter((s) => s.name !== "Custom item").map((s) => (
                <button key={s.name} onClick={() => quickAdd(s)} title={`SAC ${s.hsn}`} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-brand-500/10">+ {s.name}</button>
              ))}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={isQuote ? "Notes (visible to client)" : "Notes"}><Textarea value={d.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
            {isQuote
              ? <Field label="Terms & conditions"><Textarea rows={4} value={d.terms || ""} onChange={(e) => set({ terms: e.target.value })} /></Field>
              : d.type === "Proforma"
                ? <div className="grid gap-3"><Field label="Delivery date"><Input type="date" value={d.deliveryDate || ""} onChange={(e) => set({ deliveryDate: e.target.value })} /></Field><Field label="Payment terms"><Input value={d.paymentTerms || "50% advance, 50% on delivery"} onChange={(e) => set({ paymentTerms: e.target.value })} /></Field></div>
                : <div />}
          </div>
        </div>

        {/* Totals */}
        <aside className="h-fit space-y-4 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50 lg:sticky lg:top-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Summary</h3>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label mb-0">Discount</span>
              <div className="flex rounded-md bg-slate-200/70 p-0.5 text-[11px] font-semibold dark:bg-slate-700">
                {[["pct", "%"], ["amt", "₹"]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => { set({ discountMode: k }); if (k === "pct") setDiscAmt(""); else setDiscAmt(String(Math.round(totals.discount))); }} className={cx("rounded px-2 py-0.5", d.discountMode === k ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-500")}>{l}</button>
                ))}
              </div>
            </div>
            {d.discountMode === "amt"
              ? <Input type="number" min="0" value={discAmt} onChange={(e) => setDiscAmt(e.target.value)} placeholder="₹ amount" />
              : <Input type="number" min="0" max="100" value={d.discountPct} onChange={(e) => set({ discountPct: e.target.value })} />}
          </div>
          <Field label="GST %"><Select options={["0", "5", "12", "18", "28"]} value={String(d.gstPct)} onChange={(e) => set({ gstPct: Number(e.target.value) })} /></Field>
          <div className="rounded-lg bg-white p-1 text-xs font-semibold dark:bg-slate-900">
            <div className="grid grid-cols-2 gap-1">
              {[[false, "CGST + SGST"], [true, "IGST (inter-state)"]].map(([v, l]) => (
                <button key={l} type="button" onClick={() => set({ interState: v })} className={cx("rounded-md px-2 py-1.5", d.interState === v ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}>{l}</button>
              ))}
            </div>
          </div>
          <dl className="space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
            <Row k="Subtotal" v={inr(totals.subtotal)} />
            {totals.discount > 0 && <Row k={`Discount (${discountShown})`} v={`− ${inr(totals.discount)}`} className="text-emerald-600" />}
            <Row k="Taxable amount" v={inr(totals.taxable)} />
            {d.interState ? <Row k={`IGST (${d.gstPct}%)`} v={inr(totals.igst)} /> : <>
              <Row k={`CGST (${d.gstPct / 2}%)`} v={inr(totals.cgst)} />
              <Row k={`SGST (${d.gstPct / 2}%)`} v={inr(totals.sgst)} />
            </>}
          </dl>
          <div className="rounded-xl bg-brand-600 p-4 text-white">
            <p className="text-xs font-medium text-brand-100">Grand total</p>
            <p className="text-2xl font-extrabold tabular-nums">{inr(totals.total)}</p>
            <p className="mt-1 text-[11px] leading-snug text-brand-100">{amountInWords(totals.total)}</p>
          </div>
          {initial?.quotedAmount ? <p className="text-xs text-slate-500">Original proforma: <b>{inr(initial.quotedAmount)}</b> · Difference: <b className={totals.total - initial.quotedAmount < 0 ? "text-rose-600" : "text-emerald-600"}>{inr(totals.total - initial.quotedAmount)}</b></p> : null}
        </aside>
      </div>
    </Modal>
  );
}

const Row = ({ k, v, className }) => (
  <div className={cx("flex justify-between gap-2", className)}><dt className="text-slate-500 dark:text-slate-400">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
);
