import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Download, FileText, Clock, Percent, Eye, Pencil, Copy, Send, CheckCircle2, XCircle, Receipt, Trash2, AlertTriangle, Handshake, GitBranch, Flag, CalendarDays, Trophy, MessageSquarePlus } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, Tabs, SearchInput, Select, Badge, Menu, EmptyState, Pagination, usePaged, useConfirm, Avatar, Modal, Field, Input, Textarea } from "../../components/ui";
import { BRANCHES } from "../../config/constants";
import { inr, compactInr, fmtDate, fmtDateTime, todayISO, addDays, downloadCSV, monthKey } from "../../utils/format";
import { canEdit } from "../../layout/AppLayout";
import { docTotal, nextNumber, clientFromLead, QUOTE_FLOW, QUOTE_LABEL, STATUS_STYLE, QUOTE_CATEGORY_NAMES, QUOTE_CATEGORIES } from "./docUtils";
import DocEditor from "./DocEditor";
import DocPreview from "./DocPreview";

const WON = ["Approved", "Final", "Converted"];
const label = (s) => QUOTE_LABEL[s] || s;

/* Negotiation history panel (shown beside the preview) */
function NegotiationPanel({ quote }) {
  const { update, user, userById } = useStore();
  const toast = useToast();
  const [text, setText] = useState("");
  const list = [...(quote.negotiation || [])].sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  const addNote = () => {
    if (!text.trim()) return;
    update("quotations", quote.id, (q) => ({ negotiation: [...(q.negotiation || []), { id: `ng${Date.now()}`, text: text.trim(), at: new Date().toISOString(), by: user?.id }] }));
    setText(""); toast("Note added to negotiation history");
  };
  return (
    <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Handshake className="h-4 w-4 text-amber-500" />Negotiation history</p>
      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Client asked for 10% off on development…" />
      <Button size="sm" className="mt-2 w-full" icon={MessageSquarePlus} onClick={addNote} disabled={!text.trim()}>Add note</Button>
      <ol className="relative mt-4 space-y-4 border-l border-slate-200 pl-4 dark:border-slate-700">
        {list.length === 0 && <li className="text-xs text-slate-500">No notes yet.</li>}
        {list.map((n) => (
          <li key={n.id} className="relative">
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-4 ring-white dark:ring-slate-900" />
            <p className="text-sm text-slate-700 dark:text-slate-200">{n.text}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{fmtDateTime(n.at)}{userById(n.by) ? ` · ${userById(n.by).name}` : ""}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProformaModal({ quote, onClose, onConvert }) {
  const [f, setF] = useState({ deliveryDate: addDays(todayISO(), 30), paymentTerms: "50% advance, 50% on delivery" });
  if (!quote) return null;
  return (
    <Modal open onClose={onClose} title="Convert to proforma invoice" subtitle={`${quote.number} · ${quote.client.company || quote.client.name} · ${inr(docTotal(quote))}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Receipt} onClick={() => onConvert(f)}>Create proforma</Button></>}>
      <div className="space-y-4">
        <Field label="Delivery date"><Input type="date" value={f.deliveryDate} onChange={(e) => setF({ ...f, deliveryDate: e.target.value })} /></Field>
        <Field label="Payment terms"><Input value={f.paymentTerms} onChange={(e) => setF({ ...f, paymentTerms: e.target.value })} /></Field>
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60">Line items, discount and GST are copied as-is. The quotation will be marked <b>Converted to PI</b>.</p>
      </div>
    </Modal>
  );
}

export default function Quotations() {
  const { db, update, remove, add, userById, notify, user } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [cat, setCat] = useState("");
  const [editor, setEditor] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [pfFor, setPfFor] = useState(null);
  const today = todayISO();
  const editable = canEdit(user, "quotations");
  const isAdmin = user?.role === "Admin";
  const quotes = db.quotations || [];

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

  const effStatus = (x) => (["Sent", "Negotiation", "Draft"].includes(x.status) && x.validUntil && x.validUntil < today ? "Expired" : x.status);

  const kpi = useMemo(() => {
    const won = quotes.filter((x) => WON.includes(x.status));
    const sent = quotes.filter((x) => x.status === "Sent");
    const neg = quotes.filter((x) => x.status === "Negotiation");
    const decided = quotes.filter((x) => [...WON, "Rejected"].includes(x.status));
    const m = monthKey(today);
    return {
      total: quotes.length, totalVal: quotes.reduce((s, x) => s + docTotal(x), 0),
      sent: sent.length, sentVal: sent.reduce((s, x) => s + docTotal(x), 0),
      neg: neg.length, negVal: neg.reduce((s, x) => s + docTotal(x), 0),
      won: won.length, wonVal: won.reduce((s, x) => s + docTotal(x), 0),
      conv: decided.length ? Math.round((won.length / decided.length) * 100) : 0,
      month: quotes.filter((x) => monthKey(x.date) === m).length,
      monthVal: quotes.filter((x) => monthKey(x.date) === m).reduce((s, x) => s + docTotal(x), 0),
    };
  }, [quotes, today]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return quotes
      .filter((x) => tab === "All" || effStatus(x) === tab)
      .filter((x) => !branch || x.branch === branch)
      .filter((x) => !cat || x.serviceCategory === cat)
      .filter((x) => !s || [x.number, x.client.name, x.client.company, x.client.phone].some((v) => String(v || "").toLowerCase().includes(s)))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.number.localeCompare(a.number));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, tab, q, branch, cat]);
  const paged = usePaged(rows, 10);

  const log = (x, text) => update("quotations", x.id, (cur) => ({ negotiation: [...(cur.negotiation || []), { id: `ng${Date.now()}`, text, at: new Date().toISOString(), by: user?.id }] }));
  const setStatus = (x, status) => {
    update("quotations", x.id, { status, ...(status === "Approved" ? { approvedAt: new Date().toISOString() } : {}), ...(status === "Rejected" ? { rejectedAt: new Date().toISOString() } : {}) });
    log(x, `Status changed to ${label(status)}.`);
    toast(`${x.number} → ${label(status)}`);
    if (status === "Approved") notify("Quotation approved", `${x.number} for ${x.client.company || x.client.name} was approved.`, "/quotations");
  };
  const sendMail = (x) => {
    if (!x.client.email) { toast("Client email missing — add it first", "error"); setEditor({ initial: x }); return; }
    const body = `Dear ${x.client.name || "Sir/Madam"},\n\nPlease find our quotation ${x.number} for ${x.serviceCategory || "the discussed services"} — ${inr(docTotal(x))} (incl. GST), valid until ${fmtDate(x.validUntil)}.\n\nRegards,\n${user?.name}\n${db.settings.company.name}`;
    window.location.href = `mailto:${x.client.email}?cc=${encodeURIComponent(x.replyEmail || "")}&subject=${encodeURIComponent(`Quotation ${x.number} — ${db.settings.company.name}`)}&body=${encodeURIComponent(body)}`;
    if (x.status === "Draft") update("quotations", x.id, { status: "Sent", sentAt: new Date().toISOString() });
    log(x, `Quotation emailed to ${x.client.email}.`);
    toast(`${x.status === "Draft" ? "Sent" : "Resent"} ${x.number} to ${x.client.email}`);
  };
  const duplicate = (x) => {
    const { id: _id, ...rest } = x;
    const rec = add("quotations", { ...rest, number: nextNumber(db.settings.docs.quotePrefix, quotes), status: "Draft", revision: 1, parentId: "", negotiation: [], proformaId: "", date: today, validUntil: addDays(today, Number(db.settings.docs.quoteValidity) || 15), items: x.items.map((i) => ({ ...i })), createdBy: user?.id }, "Q");
    toast(`Duplicated as ${rec.number}`);
  };
  const revise = (x) => {
    const root = x.number.replace(/-R\d+$/, "");
    const rev = Math.max(1, ...quotes.filter((o) => o.number.replace(/-R\d+$/, "") === root).map((o) => o.revision || 1)) + 1;
    const { id: _id, ...rest } = x;
    const rec = add("quotations", { ...rest, number: `${root}-R${rev}`, revision: rev, parentId: x.id, status: "Draft", proformaId: "", date: today, validUntil: addDays(today, Number(db.settings.docs.quoteValidity) || 15), items: x.items.map((i) => ({ ...i })), negotiation: [{ id: `ng${Date.now()}`, text: `Revision ${rev} created from ${x.number}.`, at: new Date().toISOString(), by: user?.id }], createdBy: user?.id }, "Q");
    if (!["Rejected", "Converted"].includes(x.status)) update("quotations", x.id, { status: "Rejected" });
    log(x, `Superseded by revision ${rec.number}.`);
    toast(`Revision ${rec.number} created`);
    setPreviewId(null);
    setEditor({ initial: rec });
  };
  const toProforma = (x, f) => {
    const year = today.slice(0, 4);
    const prefix = db.settings.invoiceSeries?.proformaPrefix || `PRF-${year}-`;
    const pf = add("invoices", {
      type: "Proforma", number: nextNumber(prefix, db.invoices), leadId: x.leadId, quoteId: x.id, client: { ...x.client }, date: today, dueDate: addDays(today, 15),
      items: x.items.map((i) => ({ ...i })), discountPct: x.discountPct, discountAmt: x.discountAmt || 0, gstPct: x.gstPct, interState: x.interState, branch: x.branch,
      status: "Draft", payments: [], deliveryDate: f.deliveryDate, paymentTerms: f.paymentTerms,
      notes: `Against quotation ${x.number}. Proforma invoice — tax invoice will be raised on receipt of payment.`,
    }, "PF");
    update("quotations", x.id, { status: "Converted", proformaId: pf.id, convertedAt: new Date().toISOString() });
    log(x, `Converted to proforma ${pf.number}.`);
    toast(`Proforma ${pf.number} created`);
    setPfFor(null); setPreviewId(null);
    nav(`/invoices?open=${pf.id}`);
  };
  const del = async (x) => {
    if (await confirm({ title: `Delete ${x.number}?`, message: "This quotation will be permanently removed." })) { remove("quotations", x.id); toast("Quotation deleted"); }
  };
  const exportCSV = () => downloadCSV(`quotations-${today}.csv`, rows, [
    { label: "Number", key: "number" }, { label: "Revision", value: (r) => r.revision || 1 }, { label: "Client", value: (r) => r.client.name }, { label: "Company", value: (r) => r.client.company },
    { label: "Category", key: "serviceCategory" }, { label: "Date", key: "date" }, { label: "Valid Until", key: "validUntil" }, { label: "Branch", key: "branch" },
    { label: "Amount", value: (r) => docTotal(r) }, { label: "Status", value: (r) => label(effStatus(r)) },
  ]);

  // Workflow buttons per status (inventory spec)
  const flow = (x) => {
    const st = x.status;
    const b = [];
    if (st === "Draft") b.push({ k: "send", label: "Send to client", icon: Send, run: () => sendMail(x), primary: true });
    if (st === "Sent") b.push({ k: "neg", label: "Under negotiation", icon: Handshake, run: () => setStatus(x, "Negotiation") });
    if (["Sent", "Negotiation"].includes(st)) b.push({ k: "app", label: "Approve", icon: CheckCircle2, run: () => setStatus(x, "Approved"), primary: true }, { k: "rej", label: "Reject", icon: XCircle, run: () => setStatus(x, "Rejected"), danger: true });
    if (["Sent", "Negotiation", "Rejected"].includes(st)) b.push({ k: "rev", label: "Create revision", icon: GitBranch, run: () => revise(x) });
    if (st === "Approved") b.push({ k: "fin", label: "Mark as final", icon: Flag, run: () => setStatus(x, "Final") });
    if (["Approved", "Final"].includes(st)) b.push({ k: "pf", label: "Convert to proforma", icon: Receipt, run: () => setPfFor(x), primary: true });
    if (st === "Converted" && x.proformaId) b.push({ k: "vpf", label: "View proforma", icon: Eye, run: () => nav(`/invoices?open=${x.proformaId}`), primary: true });
    return b;
  };

  const preview = quotes.find((x) => x.id === previewId);
  const tabs = [{ value: "All", label: "All", count: quotes.length }, ...QUOTE_FLOW.map((s) => ({ value: s, label: label(s), count: quotes.filter((x) => effStatus(x) === s).length }))];

  const actionsFor = (x) => [
    { label: "View / Print", icon: Eye, onClick: () => setPreviewId(x.id) },
    editable && x.status !== "Converted" && { label: "Edit", icon: Pencil, onClick: () => setEditor({ initial: x }) },
    editable && { label: x.status === "Draft" ? "Send to client" : "Resend email", icon: Send, onClick: () => sendMail(x) },
    ...(editable ? flow(x).filter((f) => f.k !== "send").map((f) => ({ label: f.label, icon: f.icon, onClick: f.run, danger: f.danger })) : []),
    editable && { label: "Duplicate", icon: Copy, onClick: () => duplicate(x) },
    isAdmin && { label: "Delete", icon: Trash2, danger: true, onClick: () => del(x) },
  ];

  return (
    <div>
      <PageHeader title="Quotations" subtitle="Branded proposals with revisions, negotiation history and one-click conversion to proforma."
        actions={<>
          <Button variant="secondary" icon={Download} onClick={exportCSV}>Export</Button>
          {editable && <Button icon={Plus} onClick={() => setEditor({ initial: null })}>New quotation</Button>}
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total quotes" value={kpi.total} icon={FileText} tone="brand" sub={compactInr(kpi.totalVal)} onClick={() => setTab("All")} />
        <StatCard label="Sent · awaiting" value={kpi.sent} icon={Clock} tone="sky" sub={compactInr(kpi.sentVal)} onClick={() => setTab("Sent")} />
        <StatCard label="Negotiating" value={kpi.neg} icon={Handshake} tone="amber" sub={compactInr(kpi.negVal)} onClick={() => setTab("Negotiation")} />
        <StatCard label="Won" value={compactInr(kpi.wonVal)} icon={Trophy} tone="emerald" sub={`${kpi.won} approved / final / PI`} />
        <StatCard label="Conversion" value={`${kpi.conv}%`} icon={Percent} tone="violet" sub="won vs decided" />
        <StatCard label="This month" value={kpi.month} icon={CalendarDays} tone="slate" sub={compactInr(kpi.monthVal)} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={q} onChange={setQ} placeholder="Search client, company, quote no…" className="sm:flex-1" />
            <Select value={cat} onChange={(e) => setCat(e.target.value)} options={QUOTE_CATEGORY_NAMES} placeholder="All categories" className="sm:w-56" />
            <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={BRANCHES} placeholder="All branches" className="sm:w-40" />
            {(q || cat || branch || tab !== "All") && <Button variant="ghost" onClick={() => { setQ(""); setCat(""); setBranch(""); setTab("All"); }}>Clear</Button>}
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={FileText} title="No quotations found" text="Try a different filter, or create a new quotation." action={editable && <Button icon={Plus} onClick={() => setEditor({ initial: null })}>New quotation</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="th">Quote #</th><th className="th">Client</th><th className="th">Category</th><th className="th text-right">Total</th><th className="th">Status</th><th className="th">Valid until</th><th className="th">Created</th><th className="th" /></tr></thead>
                <tbody>
                  {paged.slice.map((x) => {
                    const owner = userById(x.createdBy);
                    const st = effStatus(x);
                    const next = flow(x)[0];
                    return (
                      <tr key={x.id} className="tr cursor-pointer" onClick={() => setPreviewId(x.id)}>
                        <td className="td">
                          <p className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">{x.number}{(x.revision || 1) > 1 && <span className="rounded bg-violet-100 px-1.5 py-px text-[10px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">R{x.revision}</span>}</p>
                          <p className="text-xs text-slate-400">{x.branch}</p>
                        </td>
                        <td className="td"><p className="font-medium text-slate-800 dark:text-slate-200">{x.client.company || x.client.name}</p><p className="text-xs text-slate-400">{x.client.name}</p></td>
                        <td className="td text-xs text-slate-500">{x.serviceCategory || "—"}</td>
                        <td className="td text-right font-bold tabular-nums text-slate-900 dark:text-white">{inr(docTotal(x))}</td>
                        <td className="td"><Badge className={STATUS_STYLE[st]}>{label(st)}</Badge>{(x.negotiation || []).length > 0 && <span className="ml-1.5 text-[11px] text-slate-400">{x.negotiation.length} notes</span>}</td>
                        <td className="td">
                          {st === "Expired"
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />{fmtDate(x.validUntil)}</span>
                            : <span className="text-slate-500">{fmtDate(x.validUntil)}</span>}
                        </td>
                        <td className="td">{owner ? <span className="flex items-center gap-2"><Avatar name={owner.name} size="xs" /><span className="text-xs text-slate-500">{fmtDate(x.date)}</span></span> : <span className="text-xs text-slate-500">{fmtDate(x.date)}</span>}</td>
                        <td className="td text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {editable && next && <Button size="sm" variant="soft" className="hidden xl:inline-flex" onClick={next.run}>{next.label}</Button>}
                            <Menu items={actionsFor(x)} />
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

      <DocEditor open={!!editor} kind="quote" initial={editor?.initial} onClose={() => setEditor(null)} />
      {preview && (
        <DocPreview doc={preview} kind="quote" onClose={() => setPreviewId(null)} onEdit={editable && preview.status !== "Converted" ? () => { setPreviewId(null); setEditor({ initial: preview }); } : undefined}
          actions={editable && <>
            {flow(preview).map((f) => (
              <Button key={f.k} size="sm" variant={f.primary ? (f.k === "pf" ? "success" : "primary") : f.danger ? "secondary" : "soft"} icon={f.icon} onClick={f.run} className={f.danger ? "text-rose-600" : ""}>{f.label}</Button>
            ))}
            {preview.status !== "Draft" && <Button size="sm" variant="ghost" icon={Send} onClick={() => sendMail(preview)}>Resend</Button>}
          </>}>
          <NegotiationPanel quote={preview} />
          <div className="rounded-xl bg-white p-4 text-xs shadow-card ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Details</p>
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500">Category</dt><dd className="font-medium">{preview.serviceCategory || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Revision</dt><dd className="font-medium">R{preview.revision || 1}</dd></div>
              {preview.parentId && <div className="flex justify-between"><dt className="text-slate-500">Revised from</dt><dd><button className="font-medium text-brand-600 hover:underline" onClick={() => setPreviewId(preview.parentId)}>{quotes.find((o) => o.id === preview.parentId)?.number || "—"}</button></dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Replies to</dt><dd className="truncate pl-2 font-medium">{preview.replyEmail || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Timeline</dt><dd className="font-medium">{(QUOTE_CATEGORIES[preview.serviceCategory]?.timeline || []).reduce((s, p) => s + p[1], 0) || "—"} days</dd></div>
            </dl>
          </div>
        </DocPreview>
      )}
      {pfFor && <ProformaModal quote={pfFor} onClose={() => setPfFor(null)} onConvert={(f) => toProforma(pfFor, f)} />}
    </div>
  );
}
