import { useEffect, useState } from "react";
import { IndianRupee, Paperclip, X } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Field, Input, Modal, Select, Textarea } from "../../components/ui";
import { inr, todayISO, uid } from "../../utils/format";
import { docTotal, invoiceBalance } from "./docUtils";

export const PAY_MODES = ["UPI", "NEFT", "RTGS", "IMPS", "Bank Transfer", "Cash", "Cheque", "Card", "Wire", "Other"];
const ACC_BY_BRANCH = { Bangalore: "ba1", Mysore: "ba2", Mumbai: "ba3" };

// Record a payment against an invoice. `invoice` null → closed.
export default function RecordPaymentModal({ invoice, onClose }) {
  const { db, update, notify } = useStore();
  const toast = useToast();
  const accounts = db.bankAccounts || [];
  const [f, setF] = useState({});
  const [err, setErr] = useState("");
  const balance = invoice ? invoiceBalance(invoice) : 0;
  const invId = invoice?.id;

  useEffect(() => {
    if (!invoice) return;
    const acc = accounts.find((a) => a.id === ACC_BY_BRANCH[invoice.branch]) || accounts[0];
    setF({ amount: String(invoiceBalance(invoice)), date: todayISO(), mode: "UPI", ref: "", accountId: acc?.id || "", proofName: "", note: "" });
    setErr("");
  // only reset when a different invoice is opened
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invId]);

  if (!invoice) return null;

  const save = () => {
    const amt = Math.round(Number(f.amount));
    if (!amt || amt <= 0) return setErr("Enter a valid amount");
    if (amt > balance) return setErr(`Amount can't exceed the balance of ${inr(balance)}`);
    const payments = [...(invoice.payments || []), { id: uid("p"), date: f.date, amount: amt, mode: f.mode, ref: f.ref.trim(), accountId: f.accountId, proofName: f.proofName, note: f.note.trim() }];
    const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const status = paid >= docTotal(invoice) ? "Paid" : "Partially Paid";
    update("invoices", invoice.id, { payments, status: invoice.status === "Converted" ? "Converted" : status });
    notify("Payment received", `${inr(amt)} received from ${invoice.client.company || invoice.client.name} against ${invoice.number}.`, "/payments");
    toast(`Payment of ${inr(amt)} recorded`);
    onClose();
  };

  return (
    <Modal open={!!invoice} onClose={onClose} title="Record payment" subtitle={`${invoice.number} · ${invoice.client.company || invoice.client.name}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="success" icon={IndianRupee} onClick={save}>Save payment</Button></>}>
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
        <div><p className="text-[11px] text-slate-500">Total</p><p className="text-sm font-bold">{inr(docTotal(invoice))}</p></div>
        <div><p className="text-[11px] text-slate-500">Paid</p><p className="text-sm font-bold text-emerald-600">{inr(docTotal(invoice) - balance)}</p></div>
        <div><p className="text-[11px] text-slate-500">Balance</p><p className="text-sm font-bold text-rose-600">{inr(balance)}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount received (₹)" required className="col-span-2" error={err}>
          <Input type="number" min="0" value={f.amount ?? ""} onChange={(e) => { setF({ ...f, amount: e.target.value }); setErr(""); }} autoFocus />
        </Field>
        <Field label="Payment date"><Input type="date" value={f.date || ""} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Mode"><Select options={PAY_MODES} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} /></Field>
        <Field label="Received in account" className="col-span-2">
          <Select value={f.accountId || ""} onChange={(e) => setF({ ...f, accountId: e.target.value })} placeholder="Select bank account" options={accounts.map((a) => ({ value: a.id, label: `${a.label} · ${a.bank} ••${String(a.number).slice(-4)}` }))} />
        </Field>
        <Field label="Transaction ID / UTR" className="col-span-2"><Input value={f.ref || ""} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="e.g. UTR123456" /></Field>
        <Field label="Payment proof" className="col-span-2">
          {f.proofName ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              <span className="flex min-w-0 items-center gap-2"><Paperclip className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{f.proofName}</span></span>
              <button type="button" onClick={() => setF({ ...f, proofName: "" })} className="text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-700 dark:border-slate-600">
              <Paperclip className="h-4 w-4" />Attach screenshot / receipt
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setF({ ...f, proofName: e.target.files?.[0]?.name || "" })} />
            </label>
          )}
        </Field>
        <Field label="Remarks" className="col-span-2"><Textarea rows={2} value={f.note || ""} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      </div>
      <div className="mt-3 flex gap-2">
        {[0.25, 0.5, 1].map((p) => (
          <button key={p} type="button" onClick={() => setF({ ...f, amount: String(Math.round(balance * p)) })} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300">
            {p === 1 ? "Full balance" : `${p * 100}%`}
          </button>
        ))}
      </div>
    </Modal>
  );
}
