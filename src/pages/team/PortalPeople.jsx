import { useMemo, useState } from "react";
import { UserCheck, UserX, KeyRound, Pencil, Trash2, Copy, MessageCircle, Plus, Search, ShieldCheck, Clock, Power } from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Menu, Modal, Select, Tabs, Toggle, useConfirm, cx } from "../../components/ui";
import { useToast } from "../../components/ui/Toast";
import { BRANCHES } from "../../config/constants";
import { timeAgo, todayISO } from "../../utils/format";
import { ALL_PORTAL_ROLES, PORTAL_ROLES, roleTeam } from "../../data/seed_team";

const STATUS_STYLE = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Inactive: "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-300",
  Pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};
const tempPassword = () => `Nx${Math.random().toString(36).slice(2, 6)}${Math.floor(100 + Math.random() * 900)}!`;

export default function PortalPeople() {
  const { db, update, remove, add } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [team, setTeam] = useState("Everyone");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [reset, setReset] = useState(null);
  const [setPw, setSetPw] = useState(null);
  const employees = db.employees || [];
  const projects = db.projects || [];
  const pName = (id) => projects.find((p) => p.id === id)?.client || "—";

  const pending = employees.filter((e) => e.portalStatus === "Pending");
  const rows = useMemo(() => employees
    .filter((e) => e.portalStatus !== "Pending")
    .filter((e) => team === "Everyone" || (e.portalRoles || []).some((r) => roleTeam(r) === team))
    .filter((e) => !q || [e.name, e.email, e.phone, ...(e.portalRoles || [])].join(" ").toLowerCase().includes(q.toLowerCase())), [employees, team, q]);

  const toggleActive = (e) => {
    const next = e.portalStatus === "Active" ? "Inactive" : "Active";
    update("employees", e.id, { portalStatus: next });
    toast(next === "Active" ? `${e.name} can sign in again` : `${e.name} can no longer sign in`, next === "Active" ? "success" : "info");
  };
  const del = async (e) => {
    if (await confirm({ title: `Remove ${e.name}?`, message: "They will be removed from the CRM team and can no longer sign in to the portal." })) {
      remove("employees", e.id); toast("Removed from the CRM team");
    }
  };

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5">
          <div className="flex items-center gap-2 px-5 pt-4"><Clock className="h-4 w-4 text-amber-600" /><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Waiting for approval ({pending.length})</h3></div>
          <div className="divide-y divide-amber-100 px-5 pb-2 dark:divide-amber-500/10">
            {pending.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar name={e.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{e.name}</p>
                  <p className="text-xs text-slate-500">{e.email} · {(e.portalRoles || [])[0]} · {e.branch}</p>
                </div>
                <Button size="sm" variant="success" icon={UserCheck} onClick={() => { update("employees", e.id, { portalStatus: "Active", lastSignIn: "" }); toast(`${e.name} approved`); }}>Approve</Button>
                <Button size="sm" variant="secondary" icon={UserX} onClick={async () => { if (await confirm({ title: "Reject sign-up?", message: `${e.name}'s portal sign-up will be removed.`, confirmText: "Reject" })) { remove("employees", e.id); toast("Sign-up rejected", "info"); } }}>Reject</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <Tabs tabs={["Everyone", "Digital Marketing", "Development & design"]} value={team} onChange={setTeam} />
          <div className="relative flex-1 lg:max-w-xs lg:ml-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="input pl-9" />
          </div>
          <Button icon={Plus} onClick={() => setEdit({ name: "", email: "", phone: "", branch: BRANCHES[0], portalRoles: ["Website developer"], projects: [], isPlansLead: false, password: "" })}>Add employee</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th w-12">Sl</th><th className="th">Employee</th><th className="th">Role</th><th className="th">Branch</th><th className="th">Contact</th><th className="th">Works on</th><th className="th">Last sign in</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.id} className="tr">
                  <td className="td text-slate-400">{i + 1}</td>
                  <td className="td"><div className="flex items-center gap-3"><Avatar name={e.name} size="sm" /><div><p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">{e.name}{e.isPlansLead && <span title="Team plans lead" className="rounded bg-brand-50 px-1.5 text-[10px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">LEAD</span>}</p><p className="text-xs text-slate-500">{e.empId}</p></div></div></td>
                  <td className="td"><p className="text-slate-700 dark:text-slate-300">{(e.portalRoles || [])[0] || e.designation}</p>{(e.portalRoles || []).length > 1 && <p className="text-xs text-slate-400">+{e.portalRoles.length - 1} more</p>}</td>
                  <td className="td text-slate-600 dark:text-slate-400">{e.branch}</td>
                  <td className="td"><p className="text-slate-700 dark:text-slate-300">{e.phone}</p><p className="text-xs text-slate-500">{e.email}</p></td>
                  <td className="td max-w-[220px]"><div className="flex flex-wrap gap-1">{(e.projects || []).slice(0, 2).map((p) => <span key={p} className="truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{pName(p)}</span>)}{(e.projects || []).length > 2 && <span className="text-[11px] text-slate-400">+{e.projects.length - 2}</span>}{!(e.projects || []).length && <span className="text-xs text-slate-400">—</span>}</div></td>
                  <td className="td text-xs">{e.lastSignIn ? (e.lastSignIn.slice(0, 10) === todayISO() ? <span className="font-medium text-emerald-600">Signed in today</span> : <span className="text-slate-500">{timeAgo(e.lastSignIn)}</span>) : <span className="text-slate-400">Never</span>}</td>
                  <td className="td"><Badge className={STATUS_STYLE[e.portalStatus || "Active"]}>{e.portalStatus || "Active"}</Badge></td>
                  <td className="td text-right">
                    <Menu items={[
                      { label: "Edit", icon: Pencil, onClick: () => setEdit({ ...e, password: "" }) },
                      { label: e.portalStatus === "Active" ? "Make inactive" : "Make active", icon: Power, onClick: () => toggleActive(e) },
                      { label: "Reset password", icon: KeyRound, onClick: () => setReset({ e, pw: tempPassword() }) },
                      { label: "Set password", icon: ShieldCheck, onClick: () => setSetPw({ e, pw: "", pw2: "" }) },
                      { label: "Delete", icon: Trash2, danger: true, onClick: () => del(e) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState title="No employees match" text="Try another team or search." />}
        </div>
      </Card>

      <EmployeeModal value={edit} onClose={() => setEdit(null)} projects={projects}
        onSave={(v) => {
          const { password, ...rest } = v;
          if (v.id) { update("employees", v.id, rest); toast("Employee updated"); }
          else {
            add("employees", { ...rest, empId: `EMP${100 + employees.length + 1}`, department: roleTeam(rest.portalRoles[0]) === "Digital Marketing" ? "SEO & Ads" : "Development", designation: rest.portalRoles[0], joinDate: todayISO(), salary: 25000, status: "Active", portalStatus: "Active", lastSignIn: "", employmentType: "Probationary", shiftStart: "09:30", shiftEnd: "18:30", grace: 15, salaryParts: { basic: 10000, hra: 5000, da: 2500, special: 7500 }, pf: true, esi: true, pt: true, hikes: [] }, "e");
            toast(`${v.name} added — they can sign in with ${v.email}`);
          }
          setEdit(null);
        }} />

      <Modal open={!!reset} onClose={() => setReset(null)} title="Temporary password" subtitle={reset?.e.name} size="sm"
        footer={<>
          <Button variant="secondary" icon={Copy} onClick={() => { navigator.clipboard?.writeText(reset.pw); toast("Password copied"); }}>Copy</Button>
          <Button variant="success" icon={MessageCircle} onClick={() => window.open(`https://wa.me/91${reset.e.phone}?text=${encodeURIComponent(`Hi ${reset.e.name.split(" ")[0]}, your portal password was reset. Temporary password: ${reset.pw} — please change it after signing in.`)}`, "_blank")}>Send on WhatsApp</Button>
        </>}>
        {reset && <>
          <p className="text-sm text-slate-600 dark:text-slate-300">Share this temporary password with {reset.e.name.split(" ")[0]}. They should change it after signing in.</p>
          <p className="mt-4 rounded-xl border border-dashed border-brand-300 bg-brand-50 py-4 text-center font-mono text-xl font-bold tracking-wider text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200">{reset.pw}</p>
        </>}
      </Modal>

      <Modal open={!!setPw} onClose={() => setSetPw(null)} title="Set password" subtitle={setPw?.e.name} size="sm"
        footer={<><Button variant="secondary" onClick={() => setSetPw(null)}>Cancel</Button><Button onClick={() => {
          const { pw, pw2 } = setPw;
          if (pw.length < 8 || !/\d/.test(pw)) return toast("Use at least 8 characters with a number", "error");
          if (pw !== pw2) return toast("Passwords don't match", "error");
          toast(`Password updated for ${setPw.e.name}`); setSetPw(null);
        }}>Save password</Button></>}>
        {setPw && <div className="space-y-4">
          <Field label="New password" hint="Minimum 8 characters, include a number"><Input type="password" value={setPw.pw} onChange={(ev) => setSetPw({ ...setPw, pw: ev.target.value })} /></Field>
          <Field label="Confirm password"><Input type="password" value={setPw.pw2} onChange={(ev) => setSetPw({ ...setPw, pw2: ev.target.value })} /></Field>
        </div>}
      </Modal>
    </div>
  );
}

function EmployeeModal({ value, onClose, onSave, projects }) {
  const [f, setF] = useState(null);
  const [pq, setPq] = useState("");
  const [err, setErr] = useState({});
  if (value && (!f || f.__src !== value)) { setF({ ...value, __src: value }); setErr({}); setPq(""); }
  if (!value || !f) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const main = f.portalRoles?.[0] || "";
  const extras = (f.portalRoles || []).slice(1);
  const toggleExtra = (r) => set("portalRoles", [main, ...(extras.includes(r) ? extras.filter((x) => x !== r) : [...extras, r])]);
  const toggleProject = (id) => set("projects", (f.projects || []).includes(id) ? f.projects.filter((x) => x !== id) : [...(f.projects || []), id]);
  const isSeo = (f.portalRoles || []).some((r) => r.startsWith("SEO"));
  const save = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(f.email || "")) e.email = "Enter a valid email";
    if (f.phone && !/^\d{10}$/.test(String(f.phone).replace(/\D/g, ""))) e.phone = "10-digit mobile";
    if (!f.id && (f.password.length < 8 || !/\d/.test(f.password))) e.password = "Min 8 characters with a number";
    setErr(e);
    if (Object.keys(e).length) return;
    const { __src, ...out } = f; // eslint-disable-line no-unused-vars
    onSave(out);
  };
  return (
    <Modal open onClose={onClose} title={f.id ? "Edit employee" : "Add employee"} subtitle="Portal access, roles and projects" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{f.id ? "Save changes" : "Add employee"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={err.name}><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Email (portal login)" required error={err.email}><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Mobile" error={err.phone}><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Branch"><Select value={f.branch} onChange={(e) => set("branch", e.target.value)} options={BRANCHES} /></Field>
        {!f.id && <Field label="Password" required error={err.password}><Input type="password" value={f.password} onChange={(e) => set("password", e.target.value)} /></Field>}
        <Field label="Main role">
          <select value={main} onChange={(e) => set("portalRoles", [e.target.value, ...extras.filter((x) => x !== e.target.value)])} className="input">
            {Object.entries(PORTAL_ROLES).map(([g, rs]) => <optgroup key={g} label={g}>{rs.map((r) => <option key={r}>{r}</option>)}</optgroup>)}
          </select>
        </Field>
      </div>
      <div className="mt-5">
        <p className="label">Extra roles <span className="font-normal text-slate-400">— the portal shows the pages of every role ticked</span></p>
        <div className="flex flex-wrap gap-2">
          {ALL_PORTAL_ROLES.filter((r) => r !== main).map((r) => (
            <button key={r} type="button" onClick={() => toggleExtra(r)} className={cx("rounded-full border px-3 py-1 text-xs font-medium transition", extras.includes(r) ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}>{r}</button>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <Toggle checked={!!f.isPlansLead} onChange={(v) => set("isPlansLead", v)} label="Team plans lead — sees everyone's plans and sends the daily report" />
      </div>
      <div className="mt-5">
        <p className="label">Projects ({(f.projects || []).length} selected)</p>
        {isSeo && <p className="mb-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">SEO roles get their clients from the SEO & Ads Team page instead.</p>}
        <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Search projects (includes completed)…" className="input mb-2" />
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
          {projects.filter((p) => !pq || p.name.toLowerCase().includes(pq.toLowerCase())).map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              <input type="checkbox" checked={(f.projects || []).includes(p.id)} onChange={() => toggleProject(p.id)} className="h-4 w-4 accent-brand-600" />
              <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{p.name}</span>
              <span className="text-[11px] text-slate-400">{p.stage}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
