// SEO & Ads Delivery (agency add-on) — proves monthly retainer work to clients:
//   Clients   : this month's deliverables vs. promised targets (backlinks, blogs, GMB posts, posters)
//   Work log  : every link / blog / post the team made, with live status
//   Ads       : daily Google / Meta ad reports — spend, clicks, conversions, cost per lead
//   Rankings  : Google position for each tracked keyword, week by week
import { useMemo, useState } from "react";
import { SearchCheck, Link2, FileText, MapPin, Image, Plus, ExternalLink, TrendingUp, TrendingDown, Minus, Megaphone, IndianRupee, MousePointerClick, Target, Send, Download } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, Tabs, Badge, Select, SearchInput, Modal, Field, Input, Progress, Avatar, EmptyState, Pagination, usePaged, cx } from "../../components/ui";
import { inr, fmtDate, todayISO, downloadCSV } from "../../utils/format";

const WORK_TYPES = ["Backlink", "Blog", "GMB post", "Poster", "Other"];
const TARGET_KEYS = [["backlinks", "Backlink", Link2], ["blogs", "Blog", FileText], ["gmb", "GMB post", MapPin], ["posters", "Poster", Image]];

function Spark({ history }) {
  if (!history?.length) return null;
  const ys = history.map((h) => h.position); const max = Math.max(...ys), min = Math.min(...ys);
  const pts = ys.map((y, i) => `${(i / (ys.length - 1 || 1)) * 80},${((y - min) / (max - min || 1)) * 22 + 2}`).join(" ");
  return <svg viewBox="0 0 80 26" className="h-6 w-20"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.8" className="text-brand-500" /></svg>;
}

export default function SeoTeam() {
  const { db, add, update, empById } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState("clients");
  const [client, setClient] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const month = todayISO().slice(0, 7);
  const clients = (db.seoClients || []).filter((c) => c.active);
  const nameOf = (id) => clients.find((c) => c.id === id)?.name || "—";
  const work = (db.seoWork || []).filter((w) => !client || w.clientId === client);
  const ads = (db.adsReports || []).filter((a) => !client || a.clientId === client);
  const kws = (db.keywords || []).filter((k) => !client || k.clientId === client);
  const monthWork = (db.seoWork || []).filter((w) => w.date.slice(0, 7) === month);

  const workRows = useMemo(() => work.filter((w) => !q || `${w.title} ${w.keyword}`.toLowerCase().includes(q.toLowerCase())), [work, q]);
  const pg = usePaged(workRows, 15);
  const spend = ads.reduce((a, r) => a + r.spend, 0), clicks = ads.reduce((a, r) => a + r.clicks, 0), conv = ads.reduce((a, r) => a + r.conversions, 0);
  const kwRows = kws.map((k) => { const h = k.history || []; const cur = h.at(-1)?.position; const prev = h.at(-2)?.position; const first = h[0]?.position; return { ...k, cur, change: prev ? prev - cur : 0, since: first ? first - cur : 0, best: Math.min(...h.map((x) => x.position)) }; }).sort((a, b) => a.cur - b.cur);
  const top10 = kwRows.filter((k) => k.cur <= 10).length;

  const saveWork = () => {
    if (!form.clientId || !form.title.trim()) { toast("Pick a client and describe the work", "error"); return; }
    add("seoWork", { ...form, date: form.date || todayISO() }, "sw");
    toast("Work logged"); setForm(null);
  };

  return (
    <div>
      <PageHeader title="SEO & Ads Delivery" subtitle="Show every retainer client exactly what was delivered this month — links, content, ad results and rankings."
        actions={<>
          <Select value={client} onChange={(e) => setClient(e.target.value)} options={clients.map((c) => ({ value: c.id, label: c.name }))} placeholder="All clients" className="sm:w-52" />
          <Button icon={Plus} onClick={() => setForm({ clientId: client || clients[0]?.id || "", type: "Backlink", title: "", link: "", keyword: "", status: "Live", date: todayISO(), empId: "" })}>Log work</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Active retainer clients" value={clients.length} icon={SearchCheck} sub={`${monthWork.length} deliverables this month`} />
        <StatCard label="Ad spend managed" value={inr(spend)} icon={IndianRupee} tone="violet" sub="last 10 working days" />
        <StatCard label="Cost per lead" value={conv ? inr(Math.round(spend / conv)) : "—"} icon={Target} tone="emerald" sub={`${conv} conversions · ${clicks.toLocaleString("en-IN")} clicks`} />
        <StatCard label="Keywords in top 10" value={`${top10}/${kwRows.length}`} icon={TrendingUp} tone="sky" sub="on Google" />
      </div>

      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={[{ value: "clients", label: "Monthly targets" }, { value: "work", label: "Work log", count: work.length }, { value: "ads", label: "Ads reports", count: ads.length }, { value: "rank", label: "Rankings", count: kwRows.length }]} />

      {tab === "clients" && (
        clients.length === 0 ? <Card><EmptyState icon={SearchCheck} title="No retainer clients yet" /></Card> : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {clients.filter((c) => !client || c.id === client).map((c) => {
              const mine = monthWork.filter((w) => w.clientId === c.id);
              const totalT = TARGET_KEYS.reduce((a, [k]) => a + (c.targets?.[k] || 0), 0);
              const totalD = TARGET_KEYS.reduce((a, [k, type]) => a + Math.min(c.targets?.[k] || 0, mine.filter((w) => w.type === type).length), 0);
              const dayPct = Math.round((new Date().getDate() / 30) * 100);
              const pctDone = Math.round((totalD / (totalT || 1)) * 100);
              return (
                <Card key={c.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900 dark:text-white">{c.name}</p><a href={`https://${c.website}`} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">{c.website}</a></div>
                    <Badge className={pctDone >= dayPct ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}>{pctDone >= dayPct ? "On track" : "Behind"} · {pctDone}%</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                    {TARGET_KEYS.map(([k, type, I]) => {
                      const t = c.targets?.[k] || 0; const d = mine.filter((w) => w.type === type).length;
                      return (
                        <div key={k}>
                          <p className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300"><I className="h-3.5 w-3.5" />{type}s</span><span className="font-semibold">{d}/{t}</span></p>
                          <Progress value={t ? (d / t) * 100 : 0} className="mt-1" tone={d >= t ? "bg-emerald-500" : "bg-brand-500"} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                    <span>Ads budget: {c.googleBudget ? `Google ${inr(c.googleBudget)}` : ""}{c.googleBudget && c.metaBudget ? " · " : ""}{c.metaBudget ? `Meta ${inr(c.metaBudget)}` : ""}{!c.googleBudget && !c.metaBudget && "SEO only"}</span>
                    <div className="flex -space-x-1.5">{(c.team || []).map((id) => <Avatar key={id} name={empById(id)?.name || "?"} size="xs" className="ring-2 ring-white dark:ring-slate-900" />)}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {tab === "work" && (
        <Card>
          <div className="flex flex-col gap-2 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:justify-between">
            <SearchInput value={q} onChange={setQ} placeholder="Search title or keyword…" className="sm:w-72" />
            <Button variant="secondary" icon={Download} onClick={() => downloadCSV("seo-work.csv", workRows, [{ label: "Date", key: "date" }, { label: "Client", value: (w) => nameOf(w.clientId) }, { label: "Type", key: "type" }, { label: "Title", key: "title" }, { label: "Keyword", key: "keyword" }, { label: "Link", key: "link" }, { label: "Status", key: "status" }])}>Export for client</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Date</th><th className="th">Client</th><th className="th">Work</th><th className="th">Keyword</th><th className="th">By</th><th className="th">Status</th><th className="th" /></tr></thead>
              <tbody>
                {pg.slice.map((w) => (
                  <tr key={w.id} className="tr">
                    <td className="td text-xs">{fmtDate(w.date)}</td>
                    <td className="td">{nameOf(w.clientId)}</td>
                    <td className="td max-w-[320px]"><p className="truncate font-medium">{w.title}</p><p className="text-xs text-slate-500">{w.type}{w.da ? ` · DA ${w.da}` : ""}</p></td>
                    <td className="td text-xs text-slate-500">{w.keyword || "—"}</td>
                    <td className="td text-xs">{empById(w.empId)?.name || "—"}</td>
                    <td className="td"><button onClick={() => update("seoWork", w.id, { status: w.status === "Live" ? "Pending" : "Live" })}><Badge className={w.status === "Live" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}>{w.status}</Badge></button></td>
                    <td className="td">{w.link && <a href={w.link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand-600"><ExternalLink className="h-4 w-4" /></a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pg} onPage={pg.setPage} />
        </Card>
      )}

      {tab === "ads" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Date</th><th className="th">Client</th><th className="th">Platform</th><th className="th text-right">Spend</th><th className="th text-right">Clicks</th><th className="th text-right">CTR</th><th className="th text-right">Leads</th><th className="th text-right">Cost/lead</th><th className="th">Action taken</th><th className="th">Report</th></tr></thead>
              <tbody>
                {[...ads].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60).map((r) => (
                  <tr key={r.id} className="tr">
                    <td className="td text-xs">{fmtDate(r.date)}</td>
                    <td className="td">{nameOf(r.clientId)}</td>
                    <td className="td"><Badge className={r.platform === "Google" ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" : "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"}><Megaphone className="h-3 w-3" />{r.platform}</Badge></td>
                    <td className="td text-right">{inr(r.spend)}</td>
                    <td className="td text-right"><MousePointerClick className="mr-1 inline h-3 w-3 text-slate-400" />{r.clicks}</td>
                    <td className="td text-right text-xs">{r.impressions ? ((r.clicks / r.impressions) * 100).toFixed(1) : 0}%</td>
                    <td className="td text-right font-semibold">{r.conversions}</td>
                    <td className={cx("td text-right font-semibold", r.conversions && r.spend / r.conversions > 1500 ? "text-rose-600" : "text-emerald-600")}>{r.conversions ? inr(Math.round(r.spend / r.conversions)) : "—"}</td>
                    <td className="td max-w-[220px] truncate text-xs text-slate-600 dark:text-slate-300" title={(r.wasted || []).length ? `Wasted searches: ${r.wasted.join(", ")}` : ""}>{r.action}</td>
                    <td className="td">{r.sent ? <span className="text-xs font-semibold text-emerald-600">Sent ✓</span> : <Button size="sm" variant="soft" icon={Send} onClick={() => { update("adsReports", r.id, { sent: true }); toast("Report sent to client on WhatsApp (demo)"); }}>Send</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ads.length === 0 && <EmptyState icon={Megaphone} title="No ad reports" text="This client has no ad budget." />}
          </div>
        </Card>
      )}

      {tab === "rank" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Keyword</th><th className="th">Client</th><th className="th text-right">Position now</th><th className="th text-right">This week</th><th className="th text-right">Since start</th><th className="th text-right">Best</th><th className="th">Trend</th></tr></thead>
              <tbody>
                {kwRows.map((k) => (
                  <tr key={k.id} className="tr">
                    <td className="td"><p className="font-medium">{k.keyword}</p><p className="max-w-[260px] truncate text-xs text-slate-400">{k.url}</p></td>
                    <td className="td">{nameOf(k.clientId)}</td>
                    <td className="td text-right"><span className={cx("inline-flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-sm font-bold", k.cur <= 3 ? "bg-emerald-500 text-white" : k.cur <= 10 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{k.cur}</span></td>
                    <td className="td text-right">{k.change > 0 ? <span className="text-emerald-600"><TrendingUp className="mr-0.5 inline h-3.5 w-3.5" />{k.change}</span> : k.change < 0 ? <span className="text-rose-600"><TrendingDown className="mr-0.5 inline h-3.5 w-3.5" />{-k.change}</span> : <Minus className="ml-auto h-3.5 w-3.5 text-slate-300" />}</td>
                    <td className="td text-right font-semibold text-emerald-600">{k.since > 0 ? `↑ ${k.since}` : k.since}</td>
                    <td className="td text-right text-xs">{k.best}</td>
                    <td className="td"><Spark history={k.history.map((h) => ({ position: -h.position }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {kwRows.length === 0 && <EmptyState icon={TrendingUp} title="No keywords tracked" />}
          </div>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Log SEO work" footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={saveWork}>Save</Button></>}>
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Client" required><Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} options={clients.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select…" /></Field>
            <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={WORK_TYPES} /></Field>
            <Field label="What was done" required className="sm:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Guest post on medium.com" autoFocus /></Field>
            <Field label="Live link" className="sm:col-span-2"><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://" /></Field>
            <Field label="Target keyword"><Input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} /></Field>
            <Field label="Done by"><Select value={form.empId} onChange={(e) => setForm({ ...form, empId: e.target.value })} placeholder="Select…" options={(db.employees || []).map((e) => ({ value: e.id, label: e.name }))} /></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={["Live", "Pending"]} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
