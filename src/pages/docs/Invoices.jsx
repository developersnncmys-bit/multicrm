import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Download, Receipt, Wallet, Clock, AlertTriangle, Eye, Pencil, Copy, IndianRupee, MessageCircle, Ban, Trash2, Send } from "lucide-react";
import { useStore, invoicePaid } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, Tabs, SearchInput, Select, Badge, Menu, EmptyState, Pagination, usePaged, useConfirm, Progress, cx } from "../../components/ui";
import { INVOICE_STATUSES, DOC_STATUS_STYLE, BRANCHES } from "../../config/constants";
import { inr, compactInr, fmtDate, todayISO, addDays, downloadCSV, daysBetween } from "../../utils/format";
import { docTotal, nextNumber, invoiceStatus, invoiceBalance, clientFromLead, whatsappLink, reminderText } from "./docUtils";
import DocEditor from "./DocEditor";
import DocPreview from "./DocPreview";
import RecordPaymentModal from "./RecordPayment";

export function PaymentHistory({ inv }) {
  const pays = inv.payments || [];
  return (
    <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Payment history</p>
      {pays.length === 0 ? <p className="text-sm text-slate-500">No payments recorded yet.</p> : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {pays.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm">
              <div><p className="font-semibold text-slate-800 dark:text-slate-200">{inr(p.amount)}</p><p className="text-xs text-slate-500">{fmtDate(p.date)} · {p.mode}{p.ref ? ` · ${p.ref}` : ""}</p></div>
              <Badge className={DOC_STATUS_STYLE.Paid}>Received</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Invoices() {
  const { db, update, remove, add } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [editor, setEditor] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [payId, setPayId] = useState(null);
  const today = todayISO();

  useEffect(() => {
    if (params.get("new")) {
      const lead = db.leads.find((l) => l.id === params.get("lead"));
      setEditor({ initial: lead ? { leadId: lead.id, client: clientFromLead(lead), branch: lead.branch, interState: lead.branch === "Mumbai", items: [{ id: "i1", desc: lead.service, hsn: "998314", qty: 1, rate: Math.round((lead.value || 0) / 1.18) }] } : null });
      setParams({}, { replace: true });
    } else if (params.get("open")) {
      setPreviewId(params.get("open"));
      setParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const enriched = useMemo(() => db.invoices.map((inv) => {
    const total = docTotal(inv); const paid = invoicePaid(inv);
    return { inv, total, paid, balance: Math.max(0, total - paid), status: invoiceStatus(inv) };
  }), [db.invoices]);

  const kpi = useMemo(() => {
    const live = enriched.filter((e) => e.status !== "Cancelled");
    const overdue = live.filter((e) => e.status === "Overdue" || (e.status === "Partially Paid" && e.inv.dueDate < today));
    return {
      total: live.reduce((s, e) => s + e.total, 0), collected: live.reduce((s, e) => s + e.paid, 0),
      outstanding: live.filter((e) => e.status !== "Draft").reduce((s, e) => s + e.balance, 0),
      overdueAmt: overdue.reduce((s, e) => s + e.balance, 0), overdueCount: overdue.length, count: live.length,
    };
  }, [enriched, today]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return enriched
      .filter((e) => tab === "All" || e.status === tab)
      .filter((e) => !branch || e.inv.branch === branch)
      .filter((e) => !s || [e.inv.number, e.inv.client.name, e.inv.client.company, e.inv.client.phone].some((v) => String(v || "").toLowerCase().includes(s)))
      .sort((a, b) => (b.inv.date || "").localeCompare(a.inv.date || "") || b.inv.number.localeCompare(a.inv.number));
  }, [enriched, tab, q, branch]);
  const paged = usePaged(rows, 10);

  const duplicate = (inv) => {
    const { id: _id, ...rest } = inv;
    const rec = add("invoices", { ...rest, number: nextNumber(db.settings.docs.invoicePrefix, db.invoices), status: "Draft", payments: [], date: today, dueDate: addDays(today, Number(db.settings.docs.paymentTerms) || 30), items: inv.items.map((i) => ({ ...i })) }, "I");
    toast(`Duplicated as ${rec.number}`);
  };
  const cancel = async (inv) => {
    if (await confirm({ title: `Cancel ${inv.number}?`, message: "The invoice will be marked as cancelled and excluded from totals.", confirmText: "Cancel invoice" })) {
      update("invoices", inv.id, { status: "Cancelled" }); toast(`${inv.number} cancelled`, "info");
    }
  };
  const del = async (inv) => {
    if (await confirm({ title: `Delete ${inv.number}?`, message: "This invoice and its payment records will be permanently removed." })) { remove("invoices", inv.id); toast("Invoice deleted"); }
  };
  const remind = (inv) => { window.open(whatsappLink(inv.client.phone, reminderText(inv, db.settings.company.name)), "_blank"); toast("Reminder opened in WhatsApp", "info"); };
  const markSent = (inv) => { update("invoices", inv.id, { status: "Sent" }); toast(`${inv.number} marked as sent`); };

  const exportCSV = () => downloadCSV(`invoices-${today}.csv`, rows, [
    { label: "Number", value: (r) => r.inv.number }, { label: "Type", value: (r) => r.inv.type }, { label: "Client", value: (r) => r.inv.client.company || r.inv.client.name },
    { label: "Date", value: (r) => r.inv.date }, { label: "Due Date", value: (r) => r.inv.dueDate }, { label: "Total", value: (r) => r.total },
    { label: "Paid", value: (r) => r.paid }, { label: "Balance", value: (r) => r.balance }, { label: "Status", value: (r) => r.status },
  ]);

  const preview = db.invoices.find((x) => x.id === previewId);
  const payInv = db.invoices.find((x) => x.id === payId) || null;
  const tabs = [{ value: "All", label: "All", count: enriched.length }, ...INVOICE_STATUSES.map((s) => ({ value: s, label: s, count: enriched.filter((e) => e.status === s).length }))];

  const actionsFor = ({ inv, status, balance }) => [
    { label: "View / Print", icon: Eye, onClick: () => setPreviewId(inv.id) },
    { label: "Edit", icon: Pencil, onClick: () => setEditor({ initial: inv }) },
    status === "Draft" && { label: "Mark as Sent", icon: Send, onClick: () => markSent(inv) },
    balance > 0 && status !== "Cancelled" && { label: "Record payment", icon: IndianRupee, onClick: () => setPayId(inv.id) },
    balance > 0 && status !== "Cancelled" && status !== "Draft" && { label: "Send reminder", icon: MessageCircle, onClick: () => remind(inv) },
    { label: "Duplicate", icon: Copy, onClick: () => duplicate(inv) },
    status !== "Cancelled" && status !== "Paid" && { label: "Mark cancelled", icon: Ban, onClick: () => cancel(inv) },
    { label: "Delete", icon: Trash2, danger: true, onClick: () => del(inv) },
  ];

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Tax & proforma invoices with GST, payment tracking and reminders."
        actions={<>
          <Button variant="secondary" icon={Download} onClick={exportCSV}>Export</Button>
          <Button icon={Plus} onClick={() => setEditor({ initial: null })}>New invoice</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total invoiced" value={compactInr(kpi.total)} icon={Receipt} tone="brand" sub={`${kpi.count} invoices`} />
        <StatCard label="Collected" value={compactInr(kpi.collected)} icon={Wallet} tone="emerald" sub={kpi.total ? `${Math.round((kpi.collected / kpi.total) * 100)}% of invoiced` : "—"} />
        <StatCard label="Outstanding" value={compactInr(kpi.outstanding)} icon={Clock} tone="amber" sub="yet to be received" />
        <StatCard label="Overdue" value={compactInr(kpi.overdueAmt)} icon={AlertTriangle} tone="rose" sub={`${kpi.overdueCount} invoices past due`} onClick={() => setTab("Overdue")} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <Tabs tabs={tabs} value={tab} onChange={setTab} className="lg:flex-1" />
          <div className="flex gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search number, client…" className="w-full lg:w-64" />
            <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={BRANCHES} placeholder="All branches" className="w-40" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices found" text="Try a different filter, or create a new invoice." action={<Button icon={Plus} onClick={() => setEditor({ initial: null })}>New invoice</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="th">Invoice</th><th className="th">Client</th><th className="th">Date</th><th className="th">Due</th><th className="th text-right">Total</th><th className="th text-right">Paid</th><th className="th w-40">Balance</th><th className="th">Status</th><th className="th" /></tr></thead>
                <tbody>
                  {paged.slice.map((e) => {
                    const { inv, total, paid, balance, status } = e;
                    const late = status === "Overdue" || (balance > 0 && !["Draft", "Cancelled"].includes(status) && inv.dueDate < today);
                    return (
                      <tr key={inv.id} className="tr cursor-pointer" onClick={() => setPreviewId(inv.id)}>
                        <td className="td"><p className="font-semibold text-slate-900 dark:text-white">{inv.number}</p><p className="text-xs text-slate-400">{inv.type === "Proforma" ? "Proforma" : "Tax invoice"} · {inv.branch}</p></td>
                        <td className="td"><p className="font-medium text-slate-800 dark:text-slate-200">{inv.client.company || inv.client.name}</p><p className="text-xs text-slate-400">{inv.client.name}</p></td>
                        <td className="td text-slate-500">{fmtDate(inv.date)}</td>
                        <td className="td">
                          <p className={cx(late ? "font-semibold text-rose-600" : "text-slate-500")}>{fmtDate(inv.dueDate)}</p>
                          {late && <p className="text-[11px] font-medium text-rose-500">{daysBetween(inv.dueDate)} days overdue</p>}
                        </td>
                        <td className="td text-right font-bold tabular-nums text-slate-900 dark:text-white">{inr(total)}</td>
                        <td className="td text-right tabular-nums text-emerald-600">{inr(paid)}</td>
                        <td className="td">
                          <p className="text-sm font-semibold tabular-nums">{inr(balance)}</p>
                          <Progress value={total ? (paid / total) * 100 : 0} className="mt-1" tone={paid >= total ? "bg-emerald-500" : "bg-brand-500"} />
                        </td>
                        <td className="td"><Badge className={DOC_STATUS_STYLE[status]}>{status}</Badge></td>
                        <td className="td text-right" onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {balance > 0 && !["Cancelled", "Draft"].includes(status) && <Button size="sm" variant="soft" onClick={() => setPayId(inv.id)}>Record</Button>}
                            <Menu items={actionsFor(e)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={paged.page} pages={paged.pages} onPage={paged.setPage} total={paged.total} perPage={paged.perPage} />
          </>
        )}
      </Card>

      <DocEditor open={!!editor} kind="invoice" initial={editor?.initial} onClose={() => setEditor(null)} />
      {preview && (
        <DocPreview doc={preview} kind="invoice" onClose={() => setPreviewId(null)} onEdit={() => { setPreviewId(null); setEditor({ initial: preview }); }}
          actions={<>
            {invoiceStatus(preview) === "Draft" && <Button variant="soft" icon={Send} onClick={() => markSent(preview)}>Mark sent</Button>}
            {invoiceBalance(preview) > 0 && invoiceStatus(preview) !== "Cancelled" && <>
              <Button variant="success" icon={IndianRupee} onClick={() => setPayId(preview.id)}>Record payment</Button>
              <Button variant="soft" icon={MessageCircle} onClick={() => remind(preview)}>Reminder</Button>
            </>}
          </>}>
          <PaymentHistory inv={preview} />
        </DocPreview>
      )}
      <RecordPaymentModal invoice={payInv} onClose={() => setPayId(null)} />
    </div>
  );
}
