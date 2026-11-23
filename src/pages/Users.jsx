import { useState } from "react";
import { UserPlus, Pencil, Trash2, Check, Minus, ShieldCheck, Eye, EyeOff, Info, Crown } from "lucide-react";
import { useStore } from "../store/store";
import { useToast } from "../components/ui/Toast";
import { Button, Card, PageHeader, Modal, Field, Input, Select, SearchInput, Tabs, Avatar, Badge, Toggle, EmptyState, useConfirm, cx } from "../components/ui";
import { BRANCHES, MODULES, ROLES } from "../config/constants";
import { timeAgo } from "../utils/format";

const ROLE_TONE = {
  Admin: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
  "Sales Manager": "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  "Sales Executive": "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Accountant: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "Project Manager": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  HR: "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300",
  "Support Agent": "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
};
const ROLE_DESC = {
  Admin: "Full access to every module and settings.",
  "Sales Manager": "Leads, quotations, projects and sales reports.",
  "Sales Executive": "Own leads, calendar and quotations.",
  Accountant: "Invoices, payments, expenses and P&L.",
  "Project Manager": "Projects, tasks and client credentials.",
  HR: "Team, attendance and payroll.",
  "Support Agent": "Support tickets, contacts and price list.",
};
// Stable pseudo "last active" so the demo looks alive
const lastSeen = (u) => new Date(Date.now() - ((u.id.charCodeAt(u.id.length - 1) * 7919) % 72) * 3600000).toISOString();

const empty = () => ({ name: "", email: "", phone: "", role: "Sales Executive", branch: BRANCHES[0], password: "", active: true });

export default function UsersPage() {
  const { db, add, update, remove, user } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("users");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState(null);
  const [err, setErr] = useState({});
  const [showPw, setShowPw] = useState(false);

  const rows = db.users.filter((u) => (!role || u.role === role) && (!q || [u.name, u.email, u.phone].some((v) => String(v || "").toLowerCase().includes(q.toLowerCase()))));
  const roleNames = Object.keys(ROLES);

  const save = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    else if (db.users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== form.id)) e.email = "This email is already in use";
    if (!form.id && form.password.length < 6) e.password = "At least 6 characters";
    if (form.id && form.password && form.password.length < 6) e.password = "At least 6 characters";
    if (form.id === user.id && form.role !== "Admin" && user.role === "Admin") e.role = "You can't remove your own admin role";
    setErr(e);
    if (Object.keys(e).length) return;
    const rec = { ...form, email: form.email.trim() };
    if (form.id) {
      if (!rec.password) delete rec.password;
      update("users", form.id, rec); toast("User updated");
    } else { add("users", rec, "u"); toast(`Invite sent to ${rec.email} (demo)`); }
    setForm(null);
  };
  const del = async (u) => {
    if (await confirm({ title: "Remove user?", message: `${u.name} will lose access immediately. Their leads stay in the system.` })) { remove("users", u.id); toast("User removed"); }
  };
  const toggleActive = (u) => {
    if (u.id === user.id) return toast("You can't deactivate your own account", "error");
    update("users", u.id, { active: !u.active });
    toast(`${u.name} ${u.active ? "deactivated" : "activated"}`);
  };
  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Control who can sign in and what each person can see."
        actions={<Button icon={UserPlus} onClick={() => { setErr({}); setShowPw(false); setForm(empty()); }}>Add User</Button>} />
      <Tabs className="mb-6 w-fit" value={tab} onChange={setTab} tabs={[{ value: "users", label: "Users", count: db.users.length }, { value: "roles", label: "Roles & Permissions" }]} />

      {tab === "users" && (
        <Card>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row">
            <SearchInput value={q} onChange={setQ} placeholder="Search users…" className="sm:w-72" />
            <Select value={role} onChange={(e) => setRole(e.target.value)} options={roleNames} placeholder="All roles" className="sm:w-48" />
          </div>
          {rows.length === 0 ? <EmptyState title="No users match" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="th">User</th><th className="th">Role</th><th className="th">Branch</th><th className="th">Phone</th><th className="th">Last active</th><th className="th">Status</th><th className="th" /></tr></thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className={cx("tr", !u.active && "opacity-60")}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <div>
                            <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">{u.name}{u.id === user.id && <Badge className="bg-slate-100 text-[10px] text-slate-500 dark:bg-slate-800">You</Badge>}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td"><Badge className={ROLE_TONE[u.role] || ROLE_TONE.HR}>{u.role === "Admin" && <Crown className="h-3 w-3" />}{u.role}</Badge></td>
                      <td className="td text-slate-600 dark:text-slate-300">{u.branch}</td>
                      <td className="td text-slate-600 dark:text-slate-300">{u.phone || "—"}</td>
                      <td className="td text-slate-500">{u.id === user.id ? <span className="flex items-center gap-1.5 text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Online now</span> : timeAgo(lastSeen(u))}</td>
                      <td className="td"><Toggle checked={u.active} onChange={() => toggleActive(u)} label={u.active ? "Active" : "Inactive"} /></td>
                      <td className="td text-right">
                        <div className="flex justify-end gap-1">
                          <button title="Edit" onClick={() => { setErr({}); setShowPw(false); setForm({ ...u, password: "" }); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                          {u.id !== user.id && <button title="Remove" onClick={() => del(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "roles" && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {roleNames.map((r) => {
              const n = db.users.filter((u) => u.role === r).length;
              return (
                <Card key={r} className="p-5">
                  <div className="flex items-center justify-between">
                    <Badge className={ROLE_TONE[r]}>{r === "Admin" ? <Crown className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}{r}</Badge>
                    <span className="text-xs text-slate-500">{ROLES[r].length}/{MODULES.length} modules</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{ROLE_DESC[r]}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">{db.users.filter((u) => u.role === r).slice(0, 5).map((u) => <Avatar key={u.id} name={u.name} size="sm" className="ring-2 ring-white dark:ring-slate-900" />)}</div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{n} user{n === 1 ? "" : "s"}</span>
                  </div>
                </Card>
              );
            })}
          </div>
          <Card>
            <div className="flex items-start gap-2 border-b border-slate-100 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              Permission matrix for built-in roles. Custom roles with per-module view/edit rights will be available in the backend phase.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="th sticky left-0 bg-white dark:bg-slate-900">Module</th>{roleNames.map((r) => <th key={r} className="th text-center">{r}</th>)}</tr></thead>
                <tbody>
                  {MODULES.map((m) => (
                    <tr key={m.key} className="tr">
                      <td className="td sticky left-0 bg-white font-medium text-slate-800 dark:bg-slate-900 dark:text-slate-100">{m.label}</td>
                      {roleNames.map((r) => (
                        <td key={r} className="td text-center">
                          {ROLES[r].includes(m.key)
                            ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><Check className="h-3.5 w-3.5" /></span>
                            : <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-300 dark:text-slate-600"><Minus className="h-3.5 w-3.5" /></span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit user" : "Add user"} subtitle={form?.id ? undefined : "They'll be able to sign in with these details."}
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>{form?.id ? "Save changes" : "Create user"}</Button></>}>
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={err.name}><Input value={form.name} onChange={set("name")} autoFocus /></Field>
            <Field label="Email" required error={err.email}><Input type="email" value={form.email} onChange={set("email")} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Branch"><Select value={form.branch} onChange={set("branch")} options={BRANCHES} /></Field>
            <Field label="Role" error={err.role} hint={ROLE_DESC[form.role]} className="sm:col-span-2">
              <Select value={form.role} onChange={set("role")} options={roleNames} />
            </Field>
            <Field label={form.id ? "New password" : "Password"} required={!form.id} error={err.password} hint={form.id ? "Leave blank to keep the current password" : undefined} className="sm:col-span-2">
              <div className="relative">
                <Input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} className="pr-10" />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
