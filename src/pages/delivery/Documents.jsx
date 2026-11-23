import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Upload, Eye, Download, Trash2, FolderOpen, Sparkles, Paperclip } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Badge, Button, Card, EmptyState, Field, IconBox, Input, Modal, PageHeader, Pagination, SearchInput, Select, Tabs, Textarea, useConfirm, usePaged } from "../../components/ui";
import { canEdit } from "../../layout/AppLayout";
import { fmtDate, todayISO } from "../../utils/format";
import { ProjectPicker } from "./Common";
import { DOC_TYPES, DOC_TYPE_META, downloadDoc, fmtSize, openDoc, readFile } from "./deliveryUtils";
import { docTotal } from "../docs/docUtils";

const TABS = [["All", ""], ["Invoices", "Invoice"], ["Quotations", "Quotation"], ["MoM", "MoM"], ["Client Inputs", "Client Input"], ["Project Documents", "Project Document"]];

export function UploadDocModal({ open, onClose, defaultProjectId = "", defaultType = "Project Document" }) {
  const { db, add } = useStore();
  const toast = useToast();
  const fileRef = useRef(null);
  const [f, setF] = useState(null);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [was, setWas] = useState(false);
  if (open !== was) { setWas(open); setErr({}); setF(open ? { projectId: defaultProjectId, name: "", type: defaultType, date: todayISO(), notes: "", file: null } : null); }
  const save = async () => {
    const e = {};
    if (!f.name.trim() && !f.file) e.name = "Give the document a name or pick a file";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const meta = await readFile(f.file);
    const p = (db.projects || []).find((x) => x.id === f.projectId);
    add("documents", { name: f.name.trim() || meta?.fileName?.replace(/\.[^.]+$/, "") || "Document", type: f.type, projectId: f.projectId, leadId: p?.leadId || "", date: f.date, notes: f.notes, size: meta?.size || 0, fileName: meta?.fileName || "", ...(meta?.dataUrl ? { dataUrl: meta.dataUrl } : {}) }, "DC");
    setBusy(false);
    toast(meta && !meta.dataUrl ? "Document saved (large file kept as metadata until backend is connected)" : "Document uploaded");
    onClose();
  };
  return (
    <Modal open={open && !!f} onClose={onClose} title="Upload document" subtitle="Proposals, MoMs, client inputs, invoices…" size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button></>}>
      {f && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Linked project" className="sm:col-span-2"><ProjectPicker value={f.projectId} onChange={(v) => setF({ ...f, projectId: v })} allowEmpty placeholder="Not linked to a project" /></Field>
          <div className="sm:col-span-2">
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setF({ ...f, file, name: f.name || file.name.replace(/\.[^.]+$/, "") }); }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:hover:bg-brand-500/5">
              <Upload className="h-6 w-6 text-slate-400" />
              {f.file ? <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{f.file.name} <span className="font-normal text-slate-400">· {fmtSize(f.file.size)}</span></span> : <span className="text-sm text-slate-500"><b className="text-brand-600">Choose a file</b> — PDF, image, doc, sheet</span>}
            </button>
          </div>
          <Field label="Document name" required error={err.name} className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Type"><Select options={DOC_TYPES} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} /></Field>
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
      )}
    </Modal>
  );
}

export function DocCard({ d, onDelete }) {
  const { db } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const meta = DOC_TYPE_META[d.type] || DOC_TYPE_META["Project Document"];
  const project = (db.projects || []).find((p) => p.id === d.projectId);
  const view = () => (d.virtual ? nav(d.link) : openDoc(d, toast));
  return (
    <Card className="flex flex-col p-4 transition hover:shadow-pop">
      <div className="flex items-start gap-3">
        <IconBox icon={meta.icon} tone={meta.tone} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-white" title={d.name}>{d.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{d.type}</Badge>
            {d.virtual && <Badge className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Sparkles className="h-3 w-3" />Generated</Badge>}
          </div>
        </div>
      </div>
      <p className="mt-2.5 truncate text-xs text-slate-500">{project ? project.client : d.client || "Not linked"}</p>
      {d.notes && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{d.notes}</p>}
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800" style={{ marginTop: 12 }}>
        {d.fileName && <span className="flex min-w-0 items-center gap-1 truncate"><Paperclip className="h-3 w-3 shrink-0" />{fmtSize(d.size)}</span>}
        <span>{fmtDate(d.date)}</span>
        <div className="ml-auto flex gap-0.5">
          <button onClick={view} title="View" className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Eye className="h-4 w-4" /></button>
          {!d.virtual && <button onClick={() => downloadDoc(d, toast)} title="Download" className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Download className="h-4 w-4" /></button>}
          {!d.virtual && onDelete && <button onClick={() => onDelete(d)} title="Delete" className="rounded-lg p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>}
        </div>
      </div>
    </Card>
  );
}

export default function Documents() {
  const { db, user, remove } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const writable = canEdit(user, "projects");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [project, setProject] = useState("");
  const [generated, setGenerated] = useState(true);
  const [upload, setUpload] = useState(false);

  useEffect(() => { if (params.get("new")) { setUpload(true); setParams({}, { replace: true }); } }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(() => {
    const projByLead = Object.fromEntries((db.projects || []).filter((p) => p.leadId).map((p) => [p.leadId, p.id]));
    const virtual = generated ? [
      ...(db.quotations || []).map((x) => ({ id: `vq_${x.id}`, virtual: true, name: `${x.number} — ${x.client?.company || x.client?.name || ""}`, type: "Quotation", projectId: projByLead[x.leadId] || "", client: x.client?.company, date: x.date, notes: `${x.status} · ₹${docTotal(x).toLocaleString("en-IN")}`, link: `/quotations?open=${x.id}` })),
      ...(db.invoices || []).map((x) => ({ id: `vi_${x.id}`, virtual: true, name: `${x.number} — ${x.client?.company || x.client?.name || ""}`, type: "Invoice", projectId: projByLead[x.leadId] || "", client: x.client?.company, date: x.date, notes: `${x.type || "Tax"} invoice · ₹${docTotal(x).toLocaleString("en-IN")}`, link: `/invoices?open=${x.id}` })),
    ] : [];
    return [...(db.documents || []), ...virtual];
  }, [db.documents, db.quotations, db.invoices, db.projects, generated]);

  const counts = useMemo(() => Object.fromEntries(TABS.map(([, t]) => [t, t ? all.filter((d) => d.type === t).length : all.length])), [all]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const projects = db.projects || [];
    return all.filter((d) => (!type || d.type === type) && (!project || d.projectId === project) && (!s || [d.name, d.notes, d.fileName, d.client, projects.find((p) => p.id === d.projectId)?.client].some((v) => String(v || "").toLowerCase().includes(s))))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [all, type, project, q, db.projects]);
  const paged = usePaged(rows, 24);

  const del = async (d) => { if (await confirm({ title: "Delete document?", message: `"${d.name}" will be removed.` })) { remove("documents", d.id); toast("Document deleted"); } };

  return (
    <div>
      <PageHeader title="Documents" subtitle="Proposals, minutes of meetings, client inputs, quotations and invoices — organised by project."
        actions={writable && <Button icon={Upload} onClick={() => setUpload(true)}>Upload document</Button>} />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Tabs value={type} onChange={setType} tabs={TABS.map(([label, value]) => ({ label, value, count: counts[value] }))} />
        <div className="flex flex-1 flex-col gap-2 sm:flex-row xl:justify-end">
          <SearchInput value={q} onChange={setQ} placeholder="Search documents…" className="sm:w-60" />
          <Select value={project} onChange={(e) => setProject(e.target.value)} options={(db.projects || []).map((p) => ({ value: p.id, label: p.client }))} placeholder="All projects" className="sm:w-48" />
          <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={generated} onChange={(e) => setGenerated(e.target.checked)} className="h-4 w-4 accent-brand-600" />Include generated</label>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState icon={FolderOpen} title="No documents here" text="Upload proposals, MoMs and client files so the whole team can find them." action={writable && <Button icon={Upload} onClick={() => setUpload(true)}>Upload document</Button>} /></Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{paged.slice.map((d) => <DocCard key={d.id} d={d} onDelete={writable ? del : null} />)}</div>
          {paged.pages > 1 && <Card className="mt-4"><Pagination page={paged.page} pages={paged.pages} onPage={paged.setPage} total={paged.total} perPage={paged.perPage} /></Card>}
        </>
      )}

      <UploadDocModal open={upload} onClose={() => setUpload(false)} defaultProjectId={project} />
    </div>
  );
}
