import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu as MenuIcon, Moon, Sun, Search, Plus, LogOut, X, ChevronsLeft, Users, FileText, Receipt, CalendarPlus, Wallet, CornerDownLeft, User, Contact, LifeBuoy, Package } from "lucide-react";
import { useStore } from "../store/store";
import { ROLES } from "../config/constants";
import { BRAND } from "../config/brand";
import { isModuleOn } from "../config/workspace";
import { NAV, navLabel } from "./nav";
import TeamChat from "../components/TeamChat";

// Active when pathname matches and (for ?tab= links) the tab matches too
function isNavActive(path, loc) {
  const [p, q] = path.split("?");
  if (p !== loc.pathname) return false;
  const tab = new URLSearchParams(loc.search).get("tab");
  if (q) return new URLSearchParams(q).get("tab") === tab;
  return !tab || !NAV.some((s) => s.items.some((i) => i.path.startsWith(`${p}?tab=${tab}`)));
}
import { Avatar, cx } from "../components/ui";
import { timeAgo, todayISO } from "../utils/format";

// A module must be switched on for the workspace AND allowed for the user
export const canAccess = (user, module) => {
  if (!user || !isModuleOn(module)) return false;
  if (user.modules && typeof user.modules === "object") return !!user.modules[module];
  return (ROLES[user.role] || []).includes(module);
};
export const canEdit = (user, module) => {
  if (!user || !isModuleOn(module)) return false;
  if (user.modules && typeof user.modules === "object") return user.modules[module] === "edit";
  return (ROLES[user.role] || []).includes(module);
};

function Logo({ collapsed }) {
  const { db } = useStore();
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-600/30">
        <svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M9 23V9l14 14V9" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">{BRAND.productName}</p>
          <p className="truncate text-[11px] text-slate-500">{db.settings.company.name}</p>
        </div>
      )}
    </div>
  );
}

function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { db, user } = useStore();
  const loc = useLocation();
  const today = todayISO();
  const badges = {
    leads: db.leads.filter((l) => l.stage === "New").length,
    enquiries: db.leads.filter((l) => l.seen === false).length,
    overdue: db.invoices.filter((i) => i.status === "Overdue" || (!["Paid", "Cancelled", "Draft"].includes(i.status) && i.dueDate < today)).length,
    tickets: (db.tickets || []).filter((t) => t.status === "Open").length,
  };
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => canAccess(user, i.module)) })).filter((s) => s.items.length);

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cx(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900",
        collapsed ? "lg:w-[76px]" : "lg:w-64", "w-72",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}>
        <div className="flex h-16 items-center justify-between px-4">
          <Logo collapsed={collapsed} />
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3 ">
          {sections.map((s) => (
            <div key={s.section}>
              {!collapsed ? <p className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">{s.section}</p> : <div className="mx-3 mb-2 border-t border-slate-100 dark:border-slate-800" />}
              <div className="space-y-0.5">
                {s.items.map((it) => (
                  <NavLink key={it.path} to={it.path} end={it.path === "/"} onClick={() => setMobileOpen(false)} title={collapsed ? navLabel(it) : undefined}
                    className={() => { const isActive = isNavActive(it.path, loc); return cx(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13.5px] font-medium transition",
                      collapsed && "lg:justify-center lg:px-0",
                      isActive ? "bg-brand-50 text-brand-700 before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-brand-600 dark:bg-brand-500/10 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                    ); }}>
                    <it.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className={cx("flex-1 truncate", collapsed && "lg:hidden")}>{navLabel(it)}</span>
                    {it.badge && badges[it.badge] > 0 && (
                      <span className={cx("rounded-full px-1.5 py-px text-[10.5px] font-bold", it.badge === "overdue" ? "bg-rose-500 text-white" : "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200",
                        collapsed && "lg:absolute lg:right-1.5 lg:top-1 lg:h-2 lg:w-2 lg:p-0 lg:text-[0px]")}>{badges[it.badge]}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <button onClick={() => setCollapsed((v) => !v)} className={cx("hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white lg:flex", collapsed && "justify-center px-0")}>
            <ChevronsLeft className={cx("h-[18px] w-[18px] transition", collapsed && "rotate-180")} />{!collapsed && "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Ctrl+K command palette: search leads, quotes, invoices, projects + quick actions ── */
function CommandPalette({ open, onClose }) {
  const { db, user } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pages = NAV.flatMap((x) => x.items).filter((i) => canAccess(user, i.module)).map((i) => ({ group: "Pages", label: navLabel(i), icon: i.icon, to: i.path }));
    const qa = [
      ["Add new lead", Users, "/leads?new=1", "leads"], ["Add contact", Contact, "/contacts?new=1", "contacts"], ["Create quotation", FileText, "/quotations?new=1", "quotations"],
      ["Create invoice", Receipt, "/invoices?new=1", "invoices"], ["Raise support ticket", LifeBuoy, "/tickets?new=1", "tickets"], ["Schedule follow-up", CalendarPlus, "/calendar?new=1", "calendar"],
    ].filter((x) => canAccess(user, x[3])).map(([label, icon, to]) => ({ group: "Quick actions", label, icon, to }));
    if (!s) return [...qa, ...pages];
    const has = (...f) => f.some((v) => String(v || "").toLowerCase().includes(s));
    return [
      ...pages.filter((p) => has(p.label)),
      ...db.leads.filter((l) => has(l.name, l.company, l.phone, l.email, l.id)).slice(0, 6).map((l) => ({ group: "Leads", label: `${l.name} · ${l.company}`, sub: l.stage, icon: User, to: `/leads?open=${l.id}` })),
      ...db.quotations.filter((x) => has(x.number, x.client.company, x.client.name)).slice(0, 4).map((x) => ({ group: "Quotations", label: `${x.number} · ${x.client.company}`, sub: x.status, icon: FileText, to: `/quotations?open=${x.id}` })),
      ...db.invoices.filter((x) => has(x.number, x.client.company, x.client.name)).slice(0, 4).map((x) => ({ group: "Invoices", label: `${x.number} · ${x.client.company}`, sub: x.status, icon: Receipt, to: `/invoices?open=${x.id}` })),
      ...(canAccess(user, "contacts") ? (db.contacts || []).filter((c) => has(c.name, c.phone, c.email)).slice(0, 5).map((c) => ({ group: "Contacts", label: c.name, sub: c.type, icon: Contact, to: `/contacts?open=${c.id}` })) : []),
      ...(canAccess(user, "tickets") ? (db.tickets || []).filter((t) => has(t.number, t.subject, t.contactName)).slice(0, 4).map((t) => ({ group: "Tickets", label: `${t.number} · ${t.subject}`, sub: t.status, icon: LifeBuoy, to: `/tickets?open=${t.id}` })) : []),
      ...(canAccess(user, "products") ? (db.products || []).filter((p) => has(p.name, p.sku)).slice(0, 4).map((p) => ({ group: "Products", label: p.name, sub: p.sku, icon: Package, to: `/products?open=${p.id}` })) : []),
      ...db.projects.filter((x) => has(x.name, x.client)).slice(0, 4).map((x) => ({ group: "Projects", label: x.name, sub: x.stage, icon: Wallet, to: `/projects?open=${x.id}` })),
    ];
  }, [q, db, user]);

  const go = (r) => { onClose(); nav(r.to); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((v) => Math.min(v + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((v) => Math.max(v - 1, 0)); }
    if (e.key === "Enter" && results[sel]) go(results[sel]);
    if (e.key === "Escape") onClose();
  };
  if (!open) return null;
  let lastGroup = null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-pop animate-slideUp dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} placeholder="Search leads, contacts, tickets, invoices…" className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400 dark:text-white" />
          <kbd className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700">ESC</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-10 text-center text-sm text-slate-500">No results for “{q}”</p>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? (lastGroup = r.group) : null;
            return (
              <div key={i}>
                {header && <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{header}</p>}
                <button onMouseEnter={() => setSel(i)} onClick={() => go(r)}
                  className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm", sel === i ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200" : "text-slate-700 dark:text-slate-300")}>
                  <r.icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="flex-1 truncate font-medium">{r.label}</span>
                  {r.sub && <span className="text-xs text-slate-400">{r.sub}</span>}
                  {sel === i && <CornerDownLeft className="h-3.5 w-3.5 opacity-60" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function useOutside(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, setOpen]);
  return ref;
}

function Topbar({ onMenu, onSearch }) {
  const { db, user, logout, dark, setDark, markAllRead, update } = useStore();
  const nav = useNavigate();
  const [nOpen, setNOpen] = useState(false);
  const [uOpen, setUOpen] = useState(false);
  const [aOpen, setAOpen] = useState(false);
  const nRef = useOutside(nOpen, setNOpen);
  const uRef = useOutside(uOpen, setUOpen);
  const aRef = useOutside(aOpen, setAOpen);
  const unread = db.notifications.filter((n) => !n.read).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const quick = [
    { label: "New Lead", icon: Users, to: "/leads?new=1", module: "leads" },
    { label: "New Contact", icon: Contact, to: "/contacts?new=1", module: "contacts" },
    { label: "New Quotation", icon: FileText, to: "/quotations?new=1", module: "quotations" },
    { label: "New Invoice", icon: Receipt, to: "/invoices?new=1", module: "invoices" },
    { label: "New Task", icon: CalendarPlus, to: "/calendar?new=1", module: "calendar" },
    { label: "New Ticket", icon: LifeBuoy, to: "/tickets?new=1", module: "tickets" },
    { label: "New Expense", icon: Wallet, to: "/expenses?new=1", module: "expenses" },
  ].filter((q) => canAccess(user, q.module));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"><MenuIcon className="h-5 w-5" /></button>
      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{greet}, {user.name.split(" ")[0]} 👋</p>
        <p className="text-xs text-slate-500">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>
      <button onClick={onSearch} className="ml-auto flex h-10 w-full max-w-xs items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900">
        <Search className="h-4 w-4" /><span className="flex-1 truncate text-left">Search anything…</span>
        <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800 sm:inline">Ctrl K</kbd>
      </button>

      {quick.length > 0 && (
        <div className="relative" ref={aRef}>
          <button onClick={() => setAOpen((v) => !v)} className="flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Create</span>
          </button>
          {aOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-pop animate-fadeIn dark:border-slate-700 dark:bg-slate-800">
              {quick.map((q) => (
                <button key={q.label} onClick={() => { setAOpen(false); nav(q.to); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60">
                  <q.icon className="h-4 w-4 text-slate-400" />{q.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={() => setDark(!dark)} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" title="Toggle theme">
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="relative" ref={nRef}>
        <button onClick={() => setNOpen((v) => !v)} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">{unread}</span>}
        </button>
        {nOpen && (
          <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop animate-fadeIn dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
              <p className="font-bold text-slate-900 dark:text-white">Notifications</p>
              {unread > 0 && <button onClick={markAllRead} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Mark all read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {db.notifications.length === 0 && <p className="py-10 text-center text-sm text-slate-500">You're all caught up</p>}
              {db.notifications.map((n) => (
                <button key={n.id} onClick={() => { update("notifications", n.id, { read: true }); setNOpen(false); nav(n.link); }}
                  className={cx("flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/40", !n.read && "bg-brand-50/50 dark:bg-brand-500/5")}>
                  <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-500")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{n.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{n.text}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.at)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={uRef}>
        <button onClick={() => setUOpen((v) => !v)} className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Avatar name={user.name} size="sm" />
          <span className="hidden text-left leading-tight xl:block">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</span>
            <span className="block text-[11px] text-slate-500">{user.role}</span>
          </span>
        </button>
        {uOpen && (
          <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-pop animate-fadeIn dark:border-slate-700 dark:bg-slate-800">
            <div className="px-3 py-2.5">
              <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <span className="mt-1.5 inline-block rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{user.role} · {user.branch}</span>
            </div>
            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
            {canAccess(user, "settings") && <button onClick={() => { setUOpen(false); nav("/settings"); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60">Settings</button>}
            <button onClick={() => { logout(); nav("/login"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut className="h-4 w-4" />Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}

export default function AppLayout() {
  const { user, syncError, clearSyncError } = useStore();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("nexora_sb") === "1"; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const loc = useLocation();
  useEffect(() => { try { localStorage.setItem("nexora_sb", collapsed ? "1" : "0"); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className={cx("transition-all duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <Topbar onMenu={() => setMobileOpen(true)} onSearch={() => setPalette(true)} />
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {syncError && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <span className="flex-1"><b>Couldn't save your last change:</b> {syncError} The screen has been refreshed from the server.</span>
              <button onClick={clearSyncError} className="rounded p-1 hover:bg-rose-100 dark:hover:bg-rose-500/20"><X className="h-4 w-4" /></button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      {canAccess(user, "employee-portal") && <TeamChat />}
    </div>
  );
}
