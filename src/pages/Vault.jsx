import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyRound, Lock, Plus, Eye, EyeOff, Copy, ExternalLink, Pencil, Trash2, RefreshCw, ShieldCheck, Wand2, Search } from "lucide-react";
import { useStore } from "../store/store";
import { useToast } from "../components/ui/Toast";
import { Button, Card, PageHeader, Modal, Field, Input, Select, Textarea, SearchInput, Badge, EmptyState, Tabs, Toggle, useConfirm, cx } from "../components/ui";
import { CRED_CATEGORIES } from "../config/constants";
import { timeAgo } from "../utils/format";

const PIN = "1234";
const AUTO_LOCK_MS = 2 * 60 * 1000;

export function strength(pw = "") {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const lvl = Math.min(4, Math.max(0, s - 1));
  return { score: lvl, label: ["Very weak", "Weak", "Fair", "Strong", "Very strong"][lvl], color: ["bg-rose-500", "bg-orange-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"][lvl], text: ["text-rose-600", "text-orange-600", "text-amber-600", "text-emerald-600", "text-emerald-700"][lvl] };
}
function generate(len, symbols) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", symbols ? "!@#$%^&*-_=+?" : ""].filter(Boolean);
  const all = sets.join("");
  const rand = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const out = sets.map((s) => s[rand(s.length)]);
  while (out.length < len) out.push(all[rand(all.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = rand(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join("");
}
const StrengthBar = ({ pw }) => {
  const s = strength(pw);
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={cx("h-1.5 flex-1 rounded-full", i < s.score || (s.score === 4 && i <= 3) ? s.color : "bg-slate-200 dark:bg-slate-700")} />)}</div>
      <span className={cx("w-20 text-right text-[11px] font-semibold", s.text)}>{s.label}</span>
    </div>
  );
};

const CAT_TONE = {
  Hosting: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", Domain: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  Email: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300", "Social Media": "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300",
  Google: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", "Payment Gateway": "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "Server / SSH": "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300", Other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const submit = (e) => {
    e.preventDefault();
    if (pin === PIN) onUnlock(); else { setErr(true); setPin(""); }
  };
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30"><Lock className="h-7 w-7" /></span>
        <h2 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">Credential Vault is locked</h2>
        <p className="mt-1 text-sm text-slate-500">Enter your vault PIN to view saved passwords.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input ref={ref} type="password" inputMode="numeric" maxLength={8} value={pin} onChange={(e) => { setPin(e.target.value); setErr(false); }}
            className={cx("input h-12 text-center text-2xl tracking-[0.6em]", err && "border-rose-400 ring-4 ring-rose-500/10")} placeholder="••••" />
          {err && <p className="text-sm font-medium text-rose-600">Incorrect PIN. Try again.</p>}
          <Button type="submit" size="lg" className="w-full" icon={KeyRound}>Unlock vault</Button>
        </form>
        <p className="mt-4 rounded-lg bg-slate-50 py-2 text-xs text-slate-500 dark:bg-slate-800">Demo PIN: <b>1234</b></p>
      </Card>
    </div>
  );
}

const emptyCred = () => ({ title: "", category: "Hosting", url: "https://", username: "", password: "", client: "Internal", notes: "" });

export default function Vault() {
  const { db, add, update, remove } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [unlocked, setUnlocked] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [client, setClient] = useState("");
  const [revealed, setRevealed] = useState({});
  const [form, setForm] = useState(null);
  const [err, setErr] = useState({});
  const [genLen, setGenLen] = useState(16);
  const [genSym, setGenSym] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const timer = useRef(null);

  const lock = useCallback(() => { setUnlocked(false); setRevealed({}); setForm(null); }, []);
  // Auto-lock after inactivity
  useEffect(() => {
    if (!unlocked) return;
    const reset = () => { clearTimeout(timer.current); timer.current = setTimeout(lock, AUTO_LOCK_MS); };
    const evs = ["mousemove", "keydown", "click", "scroll"];
    evs.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer.current); evs.forEach((e) => window.removeEventListener(e, reset)); };
  }, [unlocked, lock]);

  const clients = useMemo(() => [...new Set(db.credentials.map((c) => c.client).filter(Boolean))].sort(), [db.credentials]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.credentials.filter((c) => (cat === "All" || c.category === cat) && (!client || c.client === client) && (!s || [c.title, c.username, c.url, c.client].some((v) => String(v || "").toLowerCase().includes(s))));
  }, [db.credentials, q, cat, client]);
  const weak = db.credentials.filter((c) => strength(c.password).score < 2).length;

  if (!unlocked) return <LockScreen onUnlock={() => { setUnlocked(true); toast("Vault unlocked — auto-locks after 2 min idle", "info"); }} />;

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); toast(`${what} copied to clipboard`); } catch { toast("Copy failed — clipboard blocked", "error"); }
  };
  const save = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.password) e.password = "Password is required";
    setErr(e);
    if (Object.keys(e).length) return;
    const rec = { ...form, updatedAt: new Date().toISOString() };
    if (form.id) { update("credentials", form.id, rec); toast("Credential updated"); } else { add("credentials", rec, "c"); toast("Credential saved securely"); }
    setForm(null);
  };
  const del = async (c) => { if (await confirm({ title: "Delete credential?", message: `“${c.title}” will be permanently removed from the vault.` })) { remove("credentials", c.id); toast("Credential deleted"); } };
  const open = (c) => { setErr({}); setShowPw(!c); setForm(c ? { ...c } : emptyCred()); };
  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  const catTabs = [{ value: "All", label: "All", count: db.credentials.length }, ...CRED_CATEGORIES.map((c) => ({ value: c, label: c, count: db.credentials.filter((x) => x.category === c).length })).filter((t) => t.count > 0)];

  return (
    <div>
      <PageHeader title="Credential Vault" subtitle="Client logins, hosting, domains and API keys — encrypted in the backend phase."
        actions={<>
          <Button variant="secondary" icon={Lock} onClick={lock}>Lock now</Button>
          <Button icon={Plus} onClick={() => open(null)}>Add Credential</Button>
        </>} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><KeyRound className="h-5 w-5" /></span><div><p className="text-2xl font-extrabold text-slate-900 dark:text-white">{db.credentials.length}</p><p className="text-xs text-slate-500">Saved credentials</p></div></Card>
        <Card className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-2xl font-extrabold text-slate-900 dark:text-white">{clients.length}</p><p className="text-xs text-slate-500">Clients covered</p></div></Card>
        <Card className="flex items-center gap-3 p-4"><span className={cx("flex h-10 w-10 items-center justify-center rounded-xl", weak ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10")}><Lock className="h-5 w-5" /></span><div><p className="text-2xl font-extrabold text-slate-900 dark:text-white">{weak}</p><p className="text-xs text-slate-500">Weak passwords to fix</p></div></Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search title, username, URL…" className="lg:w-80" />
        <Select value={client} onChange={(e) => setClient(e.target.value)} options={clients} placeholder="All clients" className="lg:w-56" />
        <Tabs tabs={catTabs} value={cat} onChange={setCat} className="lg:ml-auto" />
      </div>

      {rows.length === 0 ? <Card><EmptyState icon={Search} title="No credentials found" text="Try another search or add a new credential." action={<Button icon={Plus} onClick={() => open(null)}>Add Credential</Button>} /></Card> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((c) => {
            const show = revealed[c.id];
            return (
              <Card key={c.id} className="flex flex-col p-5 transition hover:shadow-pop">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{(c.title || "?").slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900 dark:text-white">{c.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge className={CAT_TONE[c.category] || CAT_TONE.Other}>{c.category}</Badge>
                      <span className="text-xs text-slate-500">{c.client}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button title="Edit" onClick={() => open(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                    <button title="Delete" onClick={() => del(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {c.url && c.url !== "https://" && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"><ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.url.replace(/^https?:\/\//, "")}</span></a>
                  )}
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <span className="w-16 shrink-0 text-[11px] font-semibold uppercase text-slate-400">User</span>
                    <span className="flex-1 truncate font-mono text-sm text-slate-700 dark:text-slate-200">{c.username}</span>
                    <button title="Copy username" onClick={() => copy(c.username, "Username")} className="p-1 text-slate-400 hover:text-brand-600"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <span className="w-16 shrink-0 text-[11px] font-semibold uppercase text-slate-400">Pass</span>
                    <span className="flex-1 truncate font-mono text-sm text-slate-700 dark:text-slate-200">{show ? c.password : "•".repeat(Math.min(14, (c.password || "").length || 8))}</span>
                    <button title={show ? "Hide" : "Reveal"} onClick={() => setRevealed((r) => ({ ...r, [c.id]: !r[c.id] }))} className="p-1 text-slate-400 hover:text-brand-600">{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                    <button title="Copy password" onClick={() => copy(c.password, "Password")} className="p-1 text-slate-400 hover:text-brand-600"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {c.notes && <p className="mt-3 line-clamp-2 text-xs text-slate-500">{c.notes}</p>}
                <div className="mt-auto pt-4">
                  <StrengthBar pw={c.password} />
                  <p className="mt-2 text-[11px] text-slate-400">Updated {timeAgo(c.updatedAt)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit credential" : "Add credential"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>{form?.id ? "Save changes" : "Save credential"}</Button></>}>
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title" required error={err.title} className="sm:col-span-2"><Input value={form.title} onChange={set("title")} placeholder="e.g. Apex Dental — cPanel" autoFocus /></Field>
            <Field label="Category"><Select value={form.category} onChange={set("category")} options={CRED_CATEGORIES} /></Field>
            <Field label="Client / Owner">
              <Input list="vault-clients" value={form.client} onChange={set("client")} />
              <datalist id="vault-clients">{["Internal", ...db.projects.map((p) => p.client)].filter((v, i, a) => a.indexOf(v) === i).map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Login URL" className="sm:col-span-2"><Input value={form.url} onChange={set("url")} /></Field>
            <Field label="Username / Email" required error={err.username}><Input value={form.username} onChange={set("username")} /></Field>
            <Field label="Password" required error={err.password}>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} className="pr-10 font-mono" />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </Field>
            <div className="rounded-xl border border-dashed border-slate-200 p-4 dark:border-slate-700 sm:col-span-2">
              <div className="flex flex-wrap items-center gap-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Wand2 className="h-4 w-4 text-brand-500" />Password generator</p>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">Length <input type="range" min="8" max="32" value={genLen} onChange={(e) => setGenLen(Number(e.target.value))} className="accent-brand-600" /><b className="w-6">{genLen}</b></label>
                <Toggle checked={genSym} onChange={setGenSym} label="Symbols" />
                <Button size="sm" variant="soft" icon={RefreshCw} className="ml-auto" onClick={() => { setForm((f) => ({ ...f, password: generate(genLen, genSym) })); setShowPw(true); }}>Generate</Button>
              </div>
              <div className="mt-3"><StrengthBar pw={form.password} /></div>
            </div>
            <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes} onChange={set("notes")} placeholder="2FA details, security questions, renewal date…" /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
