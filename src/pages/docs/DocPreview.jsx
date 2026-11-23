import { createPortal } from "react-dom";
import { Printer, Download, MessageCircle, Mail, Pencil, Check, X } from "lucide-react";
import { useStore, invoicePaid } from "../../store/store";
import { Button, Modal, Badge, cx } from "../../components/ui";
import { calcTotals, amountInWords, inr, fmtDate, daysBetween } from "../../utils/format";
import { invoiceStatus, whatsappLink, officeFor, qrMatrix, QUOTE_CATEGORIES, STATUS_STYLE, QUOTE_LABEL } from "./docUtils";

const Mark = ({ className = "h-6 w-6" }) => <svg viewBox="0 0 32 32" className={className}><path d="M9 23V9l14 14V9" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const H = ({ children }) => <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-brand-600">{children}</p>;

/* UPI "Scan & Pay" — deterministic QR-style pattern of the UPI string (visual placeholder until a real QR lib is wired) */
export function UpiQr({ upi, amount, name, size = 112 }) {
  const n = 25;
  const str = `upi://pay?pa=${upi}&pn=${encodeURIComponent(name || "")}&am=${Math.round(amount || 0)}&cu=INR`;
  const cells = qrMatrix(str, n);
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} width={size} height={size} className="rounded bg-white" shapeRendering="crispEdges" aria-label="UPI QR">
      <rect x="-1" y="-1" width={n + 2} height={n + 2} fill="#fff" />
      {cells.map((v, i) => (v ? <rect key={i} x={i % n} y={Math.floor(i / n)} width="1" height="1" fill="#0f172a" /> : null))}
    </svg>
  );
}

function ItemsTable({ doc }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="bg-slate-900 text-left text-[11px] uppercase tracking-wider text-white">
          <th className="rounded-l-lg px-3 py-2.5">#</th><th className="px-3 py-2.5">Description</th><th className="px-3 py-2.5">HSN/SAC</th>
          <th className="px-3 py-2.5 text-right">Qty</th><th className="px-3 py-2.5 text-right">Rate</th><th className="rounded-r-lg px-3 py-2.5 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {doc.items.map((it, i) => (
          <tr key={it.id || i} className="border-b border-slate-100">
            <td className="px-3 py-2.5 text-slate-400">{i + 1}</td>
            <td className="px-3 py-2.5 font-medium text-slate-900">{it.desc}</td>
            <td className="px-3 py-2.5 text-slate-500">{it.hsn}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{it.qty}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{inr(it.rate)}</td>
            <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{inr(it.qty * it.rate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Totals({ doc, t, paid, isQuote }) {
  const disc = doc.discountAmt ? `₹${Number(doc.discountAmt).toLocaleString("en-IN")}` : `${Math.round((doc.discountPct || 0) * 100) / 100}%`;
  return (
    <table className="w-full text-sm sm:w-72">
      <tbody>
        <TR k="Subtotal" v={inr(t.subtotal)} />
        {t.discount > 0 && <TR k={`Discount (${disc})`} v={`− ${inr(t.discount)}`} />}
        <TR k="Taxable value" v={inr(t.taxable)} />
        {doc.interState ? <TR k={`IGST @ ${doc.gstPct}%`} v={inr(t.igst)} /> : <>
          <TR k={`CGST @ ${doc.gstPct / 2}%`} v={inr(t.cgst)} />
          <TR k={`SGST @ ${doc.gstPct / 2}%`} v={inr(t.sgst)} />
        </>}
        <tr className="bg-brand-600 text-white"><td className="rounded-l-lg px-3 py-2.5 font-bold">Total</td><td className="rounded-r-lg px-3 py-2.5 text-right text-base font-extrabold tabular-nums">{inr(t.total)}</td></tr>
        {!isQuote && paid > 0 && <>
          <TR k="Amount paid" v={`− ${inr(paid)}`} />
          <tr><td className="px-3 py-1.5 font-bold text-slate-900">Balance due</td><td className="px-3 py-1.5 text-right font-extrabold tabular-nums text-slate-900">{inr(Math.max(0, t.total - paid))}</td></tr>
        </>}
      </tbody>
    </table>
  );
}

/* Branded proposal (quotations) */
function ProposalSheet({ doc }) {
  const { db } = useStore();
  const company = db.settings.company;
  const office = officeFor(db.settings, doc.branch);
  const cat = QUOTE_CATEGORIES[doc.serviceCategory] || QUOTE_CATEGORIES.Other;
  const t = calcTotals(doc.items, doc.discountPct, doc.gstPct, doc.interState);
  const totalDays = cat.timeline.reduce((s, p) => s + p[1], 0);
  const terms = doc.terms || cat.terms || db.settings.docs?.terms;

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white text-[13px] leading-relaxed text-slate-700">
      {/* Cover */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-slate-900 px-8 py-10 text-white sm:px-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><Mark /></span>
            <div><p className="text-base font-extrabold">{company.name}</p><p className="text-xs text-brand-100">{company.website}</p></div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold tracking-widest text-brand-100">QUOTATION{doc.revision > 1 ? ` · R${doc.revision}` : ""}</p>
            <p className="mt-1 text-lg font-extrabold">{doc.number}</p>
            <p className="text-brand-100">{fmtDate(doc.date)} · valid until {fmtDate(doc.validUntil)}</p>
          </div>
        </div>
        <p className="relative mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">{doc.serviceCategory} proposal</p>
        <h2 className="relative mt-2 max-w-xl text-3xl font-extrabold leading-tight">{cat.tagline}</h2>
        {cat.tech && <p className="relative mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/20">{cat.tech}</p>}
        <div className="relative mt-8 grid gap-4 text-xs sm:grid-cols-2">
          <div><p className="text-brand-200">Prepared for</p><p className="text-sm font-bold">{doc.client.company || doc.client.name}</p><p className="text-brand-100">{doc.client.name}{doc.client.phone ? ` · ${doc.client.phone}` : ""}</p></div>
          <div className="sm:text-right"><p className="text-brand-200">Prepared by</p><p className="text-sm font-bold">{office.name}</p><p className="text-brand-100">{office.city || doc.branch} · {office.phone || company.phone}</p></div>
        </div>
      </div>

      <div className="space-y-8 p-8 sm:p-10">
        {/* Executive summary */}
        <section>
          <H>Executive summary</H>
          <p className="text-[14px] text-slate-700">{cat.summary}</p>
          {cat.stats.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {cat.stats.map(([v, l]) => <div key={l} className="rounded-xl bg-brand-50 p-3 text-center"><p className="text-xl font-extrabold text-brand-700">{v}</p><p className="text-[11px] text-slate-500">{l}</p></div>)}
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-slate-500">
            {[["500+", "Projects delivered"], ["350+", "Happy clients"], ["6+", "Years of experience"]].map(([v, l]) => <div key={l} className="rounded-lg border border-slate-200 py-2"><b className="block text-base text-slate-900">{v}</b>{l}</div>)}
          </div>
        </section>

        {/* Scope */}
        {cat.scope.length > 0 && (
          <section>
            <H>Scope of work</H>
            <ol className="grid gap-2 sm:grid-cols-2">
              {cat.scope.map((s, i) => <li key={s} className="flex gap-3 rounded-lg border border-slate-100 p-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span><span className="pt-0.5 font-medium text-slate-800">{s}</span></li>)}
            </ol>
          </section>
        )}

        {(cat.included.length > 0 || cat.notIncluded.length > 0) && (
          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <H>What's included</H>
              <ul className="space-y-1.5">{cat.included.map((s) => <li key={s} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{s}</li>)}</ul>
            </div>
            <div>
              <H>Not included</H>
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-400"><th className="pb-1">Item</th><th className="pb-1">Status</th></tr></thead>
                <tbody>{cat.notIncluded.map(([it, st]) => <tr key={it} className="border-t border-slate-100"><td className="py-1.5 pr-2"><span className="flex items-center gap-1.5"><X className="h-3.5 w-3.5 text-rose-500" />{it}</span></td><td className="py-1.5 text-slate-500">{st}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        )}

        {/* Pricing */}
        <section>
          <H>Deliverables & investment</H>
          <ItemsTable doc={doc} />
          <div className="mt-5 flex flex-col-reverse justify-between gap-6 sm:flex-row">
            <div className="max-w-sm"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount in words</p><p className="font-semibold text-slate-900">{amountInWords(t.total)}</p></div>
            <Totals doc={doc} t={t} paid={0} isQuote />
          </div>
        </section>

        {/* Timeline */}
        {cat.timeline.length > 0 && (
          <section>
            <H>Project timeline · {totalDays} working days</H>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-2">Phase</th><th className="px-3 py-2">Days</th><th className="px-3 py-2">Activity</th><th className="px-3 py-2">Client deliverable</th></tr></thead>
                <tbody>
                  {cat.timeline.map(([ph, days, act, cl], i) => (
                    <tr key={ph} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold text-slate-900"><span className="mr-2 text-brand-600">{String(i + 1).padStart(2, "0")}</span>{ph}</td><td className="px-3 py-2 tabular-nums">{days}</td><td className="px-3 py-2">{act}</td><td className="px-3 py-2 text-slate-500">{cl}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Notes, terms, sign-off */}
        <section className="grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-[1fr_200px]">
          <div className="space-y-3 text-xs">
            {doc.notes && <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes</p><p>{doc.notes}</p></div>}
            {terms && <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Terms & conditions</p><ol className="list-decimal space-y-0.5 pl-4 text-slate-500">{terms.split("\n").filter(Boolean).map((l) => <li key={l}>{l.replace(/^\d+\.\s*/, "")}</li>)}</ol></div>}
          </div>
          <div className="flex flex-col items-center justify-end text-center text-xs">
            <div className="mb-1 h-12 w-full border-b border-slate-300" />
            <p className="font-semibold text-slate-900">For {company.name}</p>
            <p className="text-slate-500">Authorised signatory</p>
          </div>
        </section>
        <p className="text-center text-[11px] text-slate-400">{office.address}{office.city ? `, ${office.city}` : ""} · {office.phone || company.phone} · {doc.replyEmail || office.email || company.email}{office.gstin ? ` · GSTIN ${office.gstin}` : ""}</p>
      </div>
    </div>
  );
}

/* Tax / proforma invoice */
function InvoiceSheet({ doc }) {
  const { db } = useStore();
  const { company, bank, docs: cfg } = db.settings;
  const office = officeFor(db.settings, doc.branch);
  const t = calcTotals(doc.items, doc.discountPct, doc.gstPct, doc.interState);
  const isPf = doc.type === "Proforma";
  const title = isPf ? "PROFORMA INVOICE" : "TAX INVOICE";
  const paid = invoicePaid(doc);
  const pf = doc.proformaId ? (db.invoices || []).find((x) => x.id === doc.proformaId) : null;
  const c = doc.client;

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white p-8 text-[13px] leading-relaxed text-slate-700 sm:p-10">
      <div className="flex flex-col justify-between gap-6 border-b-2 border-brand-600 pb-6 sm:flex-row">
        <div className="flex gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600"><Mark /></span>
          <div>
            <p className="text-lg font-extrabold text-slate-900">{office.name || company.name}</p>
            <p className="max-w-xs text-xs text-slate-500">{office.address}{office.city ? `, ${office.city}` : ""}{office.pincode ? ` — ${office.pincode}` : ""}{office.state ? `, ${office.state}` : ""}</p>
            <p className="mt-1 text-xs text-slate-500">{office.phone || company.phone} · {office.email || company.email}</p>
            <p className="text-xs font-semibold text-slate-600">{office.gstin && `GSTIN: ${office.gstin}`}{company.pan ? ` · PAN: ${company.pan}` : ""}</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-extrabold tracking-wide text-brand-600">{title}</p>
          <table className="mt-2 text-xs sm:ml-auto">
            <tbody>
              <tr><td className="pr-3 text-slate-500">{isPf ? "Proforma No." : "Invoice No."}</td><td className="font-bold text-slate-900">{doc.number}</td></tr>
              <tr><td className="pr-3 text-slate-500">Date</td><td className="font-semibold">{fmtDate(doc.date)}</td></tr>
              <tr><td className="pr-3 text-slate-500">{isPf ? "Valid until" : "Due date"}</td><td className="font-semibold">{fmtDate(doc.dueDate)}</td></tr>
              {pf && <tr><td className="pr-3 text-slate-500">Against proforma</td><td className="font-semibold">{pf.number}</td></tr>}
              {isPf && doc.deliveryDate && <tr><td className="pr-3 text-slate-500">Delivery</td><td className="font-semibold">{fmtDate(doc.deliveryDate)}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Bill to</p>
          <p className="font-bold text-slate-900">{c.company || c.name}</p>
          {c.company && <p>{c.name}</p>}
          {(c.address || c.city) && <p className="text-slate-500">{[c.address, c.city, c.state, c.pincode].filter(Boolean).join(", ")}</p>}
          <p className="text-slate-500">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
          {(c.gstin || c.pan) && <p className="text-xs font-semibold">{c.gstin && `GSTIN: ${c.gstin}`}{c.pan ? ` · PAN: ${c.pan}` : ""}</p>}
        </div>
        <div className="sm:text-right">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Place of supply</p>
          <p className="font-semibold text-slate-900">{doc.interState ? `${c.state || "Outside " + (office.state || "state")} (IGST)` : `${office.state || company.state || "Within state"} (CGST + SGST)`}</p>
          <p className="text-slate-500">Office: {doc.branch}</p>
          {isPf && doc.paymentTerms && <p className="text-slate-500">Terms: {doc.paymentTerms}</p>}
        </div>
      </div>

      <ItemsTable doc={doc} />

      <div className="mt-5 flex flex-col-reverse justify-between gap-6 sm:flex-row">
        <div className="max-w-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount in words</p>
          <p className="font-semibold text-slate-900">{amountInWords(t.total)}</p>
          {pf && doc.quotedAmount ? <p className="mt-2 text-xs text-slate-500">Original proforma amount {inr(doc.quotedAmount)} · finalised {inr(t.total)}</p> : null}
          {bank && (
            <div className="mt-4 flex gap-4 rounded-xl border border-slate-200 p-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Bank details</p>
                <p><span className="text-slate-500">A/c name:</span> {bank.accountName}</p>
                <p><span className="text-slate-500">Bank:</span> {bank.bankName}, {bank.branch}</p>
                <p><span className="text-slate-500">A/c no:</span> <b>{bank.accountNumber}</b></p>
                <p><span className="text-slate-500">IFSC:</span> <b>{bank.ifsc}</b></p>
                {bank.upi && <p><span className="text-slate-500">UPI:</span> {bank.upi}</p>}
              </div>
              {bank.upi && (
                <div className="flex flex-col items-center">
                  <UpiQr upi={bank.upi} amount={Math.max(0, t.total - paid)} name={company.name} size={96} />
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Scan & Pay</p>
                </div>
              )}
            </div>
          )}
        </div>
        <Totals doc={doc} t={t} paid={paid} />
      </div>

      <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-[1fr_220px]">
        <div className="space-y-3 text-xs">
          {doc.notes && <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes</p><p>{doc.notes}</p></div>}
          {cfg?.terms && <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Terms & conditions</p><p className="whitespace-pre-line text-slate-500">{cfg.terms}</p></div>}
        </div>
        <div className="flex flex-col items-center justify-end text-center text-xs">
          <div className="relative mb-1 flex h-16 w-full items-end justify-center border-b border-slate-300">
            <span className="absolute -top-2 right-2 flex h-16 w-16 rotate-[-14deg] items-center justify-center rounded-full border-2 border-dashed border-brand-400 text-center text-[8px] font-bold uppercase leading-tight text-brand-500/80">{(company.name || "").split(" ").slice(0, 2).join(" ")}<br />Seal</span>
          </div>
          <p className="font-semibold text-slate-900">For {company.name}</p>
          <p className="text-slate-500">Authorised signatory</p>
        </div>
      </div>
      <p className="mt-8 text-center text-[11px] text-slate-400">This is a computer-generated {isPf ? "proforma" : "invoice"}. · {company.website}</p>
    </div>
  );
}

const TR = ({ k, v }) => <tr><td className="px-3 py-1.5 text-slate-500">{k}</td><td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-900">{v}</td></tr>;

/* The printable document itself */
export function DocSheet({ doc, kind }) {
  return kind === "quote" ? <ProposalSheet doc={doc} /> : <InvoiceSheet doc={doc} />;
}

/* Modal wrapper with share / print actions. `children` renders beside the sheet (e.g. payment history, negotiation). */
export default function DocPreview({ doc, kind, onClose, onEdit, actions, children }) {
  const { db } = useStore();
  if (!doc) return null;
  const isQuote = kind === "quote";
  const t = calcTotals(doc.items, doc.discountPct, doc.gstPct, doc.interState);
  const status = isQuote ? doc.status : invoiceStatus(doc);
  const label = isQuote ? "Quotation" : doc.type === "Proforma" ? "Proforma invoice" : "Invoice";
  const summary = `Hi ${doc.client.name || "there"},\n\nPlease find ${label.toLowerCase()} ${doc.number} from ${db.settings.company.name}.\nAmount: ${inr(t.total)} (incl. GST)\n${isQuote ? `Valid until: ${fmtDate(doc.validUntil)}` : `Due date: ${fmtDate(doc.dueDate)}`}\n\nThank you!`;
  const expiring = isQuote && doc.validUntil && ["Sent", "Negotiation"].includes(doc.status) ? daysBetween(new Date().toISOString().slice(0, 10), doc.validUntil) : null;

  return (
    <Modal open onClose={onClose} size="xl"
      title={<span className="flex flex-wrap items-center gap-2">{doc.number}{doc.revision > 1 && <Badge className="bg-violet-50 text-violet-700">R{doc.revision}</Badge>}<Badge className={STATUS_STYLE[status]}>{QUOTE_LABEL[status] && isQuote ? QUOTE_LABEL[status] : status}</Badge></span>}
      subtitle={`${doc.client.company || doc.client.name} · ${inr(t.total)}${expiring !== null ? (expiring < 0 ? " · expired" : ` · expires in ${expiring}d`) : ""}`}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        {actions}
        <div className="ml-auto flex flex-wrap gap-2">
          {onEdit && <Button variant="secondary" icon={Pencil} onClick={onEdit}>Edit</Button>}
          <Button variant="secondary" icon={MessageCircle} onClick={() => window.open(whatsappLink(doc.client.phone, summary), "_blank")}>WhatsApp</Button>
          <Button variant="secondary" icon={Mail} onClick={() => { window.location.href = `mailto:${doc.client.email || ""}${doc.replyEmail ? `?cc=${encodeURIComponent(doc.replyEmail)}&` : "?"}subject=${encodeURIComponent(`${label} ${doc.number} — ${db.settings.company.name}`)}&body=${encodeURIComponent(summary)}`; }}>Email</Button>
          <Button variant="secondary" icon={Download} onClick={() => window.print()}>PDF</Button>
          <Button icon={Printer} onClick={() => window.print()}>Print</Button>
        </div>
      </div>}>
      <div className={cx("-mx-6 -my-5 grid gap-4 bg-slate-100 p-3 dark:bg-slate-950 sm:p-6", children && "xl:grid-cols-[1fr_300px]")}>
        <div className="min-w-0 overflow-hidden rounded-xl shadow-card ring-1 ring-slate-200 dark:ring-slate-800"><DocSheet doc={doc} kind={kind} /></div>
        {children && <div className="space-y-4">{children}</div>}
      </div>
      {createPortal(<div className="print-area hidden bg-white print:block"><DocSheet doc={doc} kind={kind} /></div>, document.body)}
    </Modal>
  );
}
