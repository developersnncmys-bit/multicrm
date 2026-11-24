// Demo data for the admin area: calendar enrichment, SEO & Ads team, company vault, branches, series, targets.
import { addDays, todayISO, toISO } from "../utils/format";

let s = 7;
const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;

export const REPORT_SECTIONS = ["Cover", "Executive Summary", "P&L", "Month-on-Month", "YTD", "Revenue by Source", "Expense Breakdown", "Unit Economics", "Reserve Funds", "Team Performance", "Alerts", "Recommendations"];

const OUTCOMES = ["Interested, send proposal", "Proposal agreed", "Go-live agreed", "Payment promised", "Follow-up needed", "Not interested"];

export default function seedAdmin(db) {
  s = 7;
  const today = todayISO();
  const won = db.leads.filter((l) => l.stage === "Won");
  const openLeads = db.leads.filter((l) => !["Won", "Lost"].includes(l.stage));

  // ── Calendar enrichment ──
  const tasks = db.tasks.map((t) => {
    const timed = ["Call", "Meeting", "Demo"].includes(t.type);
    const mode = t.type === "Call" ? "Phone" : t.type === "Meeting" ? pick(["Google Meet", "Office", "Google Meet"]) : t.type === "Demo" ? "Google Meet" : "Phone";
    let status = t.done ? "Done" : "Upcoming";
    if (!t.done && t.date < today && timed && rnd() > 0.6) status = "No-show";
    const rec = { ...t, mode, duration: timed ? pick([30, 30, 45, 60]) : 30, status, meetLink: "", outcome: "", summary: "" };
    if (status === "Done" && timed) { rec.outcome = pick(OUTCOMES); rec.summary = pick(["Walked through the sitemap and pricing. Client wants a mobile-first design.", "Discussed timelines; client will share content by next week.", "Demo went well — decision maker joined. Asked for revised quote with SEO add-on.", "Reviewed staging site, 3 minor changes requested."]); }
    return rec;
  });
  const extra = [];
  [[0, "11:00", 90, "Focus time — proposals"], [2, "15:00", 60, "Team review"]].forEach(([d, time, duration, title], i) => {
    extra.push({ id: `TB${i}`, title, type: "Blocked", date: addDays(today, d), time, duration, mode: "", status: "Upcoming", leadId: "", assigneeId: "u1", done: false, notes: "Only you see this", outcome: "", summary: "", meetLink: "" });
  });
  won.slice(0, 3).forEach((l, i) => {
    extra.push({ id: `TP${i}`, title: `Collect balance — ${l.company}`, type: "Payment follow-up", date: addDays(today, [-1, 0, 3][i]), time: "", duration: 0, mode: "Phone", status: "Upcoming", leadId: l.id, assigneeId: l.ownerId, done: false, amount: Math.round(l.value * 0.5), notes: "Balance due after go-live", outcome: "", summary: "", meetLink: "" });
  });
  if (openLeads[3]) extra.push({ id: "TR1", title: `Awaiting reply — ${openLeads[3].company}`, type: "Client response", date: addDays(today, 1), time: "", duration: 0, mode: "", status: "Upcoming", leadId: openLeads[3].id, assigneeId: openLeads[3].ownerId, done: false, notes: "Client said they'd confirm scope", outcome: "", summary: "", meetLink: "" });

  // ── SEO & Ads ──
  const seoEmp = db.employees.filter((e) => e.department === "SEO & Ads").map((e) => e.id);
  const designEmp = db.employees.filter((e) => e.department === "Design").map((e) => e.id);
  const seoLeads = [...won.filter((l) => ["SEO", "Google Ads", "Social Media Marketing"].includes(l.service)), ...won].filter((l, i, a) => a.indexOf(l) === i).slice(0, 5);
  const seoClients = seoLeads.map((l, i) => ({
    id: `sc${i + 1}`, name: l.company, leadId: l.id, contact: l.name, phone: l.phone, whatsapp: l.phone, email: l.email,
    website: `www.${l.company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14)}.in`, startDate: addDays(today, -int(60, 240)),
    targets: { backlinks: pick([30, 40, 50]), blogs: pick([4, 6, 8]), gmb: pick([8, 12]), posters: pick([4, 8, 10]) },
    googleBudget: i === 4 ? 0 : pick([30000, 45000, 60000]), metaBudget: i % 2 === 0 ? pick([15000, 25000]) : 0,
    team: [...seoEmp, designEmp[i % Math.max(1, designEmp.length)]].filter(Boolean), active: true,
  }));

  const KINDS = ["Profile", "Guest post", "Business listing", "Article", "Social bookmark", "Classified", "PDF submission", "Image share"];
  const KW = ["best interior designers", "dental clinic near me", "website development company", "organic store online", "real estate agents", "wedding caterers", "spa and wellness", "car service center", "jewellery shop", "tuition classes"];
  const seoWork = [];
  for (let i = 0; i < 92; i++) {
    const c = pick(seoClients); if (!c) break;
    const type = pick(["Backlink", "Backlink", "Backlink", "Backlink", "Blog", "GMB post", "GMB post", "Poster", "Other"]);
    const date = addDays(today, -int(0, 44));
    const emp = type === "Poster" ? (designEmp[0] || seoEmp[0]) : pick(seoEmp.length ? seoEmp : ["e8"]);
    const kw = `${pick(KW)} ${pick(["bangalore", "mysore", "mumbai"])}`;
    seoWork.push({
      id: `sw${i}`, clientId: c.id, empId: emp, date, type,
      kind: type === "Backlink" ? pick(KINDS) : "",
      title: { Backlink: `${pick(KINDS)} on ${pick(["sulekha.com", "medium.com", "justdial.com", "issuu.com", "pinterest.com", "reddit.com"])}`, Blog: `Blog: ${kw} — a complete guide`, "GMB post": `GMB update — ${pick(["offer", "new service", "festival greeting", "project photos"])}`, Poster: `${pick(["Diwali", "Weekend offer", "New launch", "Testimonial"])} poster`, Other: pick(["On-page fixes", "Schema markup", "Speed optimisation"]) }[type],
      link: `https://${pick(["sulekha.com", "medium.com", "issuu.com", "g.page"])}/${Math.random().toString(36).slice(2, 8)}`,
      keyword: type === "Backlink" || type === "Blog" ? kw : "", da: type === "Backlink" ? int(20, 85) : "",
      status: rnd() > 0.15 ? "Live" : "Pending",
    });
  }
  seoWork.sort((a, b) => b.date.localeCompare(a.date));

  const adsReports = [];
  const workDays = [];
  for (let d = 0; workDays.length < 10; d++) { const iso = addDays(today, -d); if (new Date(`${iso}T00:00:00`).getDay() !== 0) workDays.push(iso); }
  seoClients.forEach((c) => {
    if (c.googleBudget) workDays.slice(0, 6).forEach((date, k) => {
      const spend = Math.round((c.googleBudget / 26) * (0.8 + rnd() * 0.5)); const clicks = int(40, 160); const conv = int(0, 7);
      adsReports.push({ id: `ar_${c.id}_g${k}`, clientId: c.id, platform: "Google", date, spend, clicks, impressions: clicks * int(14, 30), conversions: conv, wasted: [`${pick(["free", "jobs", "course", "diy"])} ${pick(KW)}`, `${pick(KW)} ${pick(["salary", "pdf", "meaning"])}`], negatives: int(0, 6), action: pick(["Paused 2 broad keywords", "Raised bids on top converting term", "Added 4 negatives", "No change — stable"]), sent: k > 0 || rnd() > 0.5, empId: seoEmp[1] || seoEmp[0] });
    });
    if (c.metaBudget) workDays.slice(0, 4).forEach((date, k) => {
      const spend = Math.round((c.metaBudget / 26) * (0.7 + rnd() * 0.6));
      adsReports.push({ id: `ar_${c.id}_m${k}`, clientId: c.id, platform: "Meta", date, spend, clicks: int(60, 240), impressions: int(4000, 12000), conversions: int(1, 9), wasted: [], negatives: 0, action: pick(["Refreshed creative", "Narrowed audience to 25–45", "No change"]), sent: true, empId: seoEmp[1] || seoEmp[0] });
    });
  });

  const keywords = [];
  seoClients.forEach((c, ci) => {
    for (let k = 0; k < 5; k++) {
      const n = int(8, 12); let pos = int(28, 70);
      const target = int(1, 14);
      const history = Array.from({ length: n }, (_, h) => {
        const date = addDays(today, -(n - 1 - h) * 7);
        pos = Math.max(target, Math.round(pos - (pos - target) * (0.18 + rnd() * 0.2) + int(-2, 2)));
        return { date, position: pos };
      });
      keywords.push({ id: `kw${ci}_${k}`, clientId: c.id, keyword: `${KW[(ci * 2 + k) % KW.length]} ${pick(["bangalore", "mysore", "mumbai", "near me"])}`, url: `https://${c.website}/${pick(["", "services", "contact", "blog"])}`, history, active: true });
    }
  });

  // ── Company vault ──
  const CAT_MAP = { Domain: "Domain/Hosting", Hosting: "Domain/Hosting", "Server / SSH": "Server", Google: "API Key", "Payment Gateway": "API Key", "Social Media": "Social Media", Email: "Email" };
  const credentials = [
    ...db.credentials.map((c, i) => ({ ...c, category: c.client && c.client !== "Internal" ? "Client" : CAT_MAP[c.category] || "Other", pinned: i < 2, tags: c.client && c.client !== "Internal" ? ["client", c.category.toLowerCase()] : ["internal", "billing"].slice(0, i % 2 + 1) })),
    { id: "cg1", title: "GitHub — organisation owner", category: "GitHub", url: "https://github.com", username: "agency-dev", password: "ghp_K29xQvL8mN3pR7tY", client: "Internal", notes: "Personal access token for CI deploys.", pinned: false, tags: ["dev", "ci"], updatedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: "cg2", title: "MongoDB Atlas — production", category: "Database", url: "https://cloud.mongodb.com", username: "atlas-admin", password: "Mdb#Pr0d!2026x", client: "Internal", notes: "IP allow-list: office + VPS.", pinned: false, tags: ["database", "prod"], updatedAt: new Date(Date.now() - 86400000 * 11).toISOString() },
    { id: "cg3", title: "Google Workspace admin", category: "Email", url: "https://admin.google.com", username: "admin@company.in", password: "Gw$Adm1n-26", client: "Internal", notes: "", pinned: false, tags: ["email"], updatedAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  ];

  // ── Settings ──
  const monthlyTargets = {};
  for (let m = -6; m <= 3; m++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + m);
    const key = toISO(d).slice(0, 7);
    monthlyTargets[key] = { revenue: 1200000 + (m + 6) * 25000, leads: 60 + Math.max(0, m) * 5, deals: 8 + (m > 0 ? 1 : 0), advance: 500000 };
  }

  return {
    tasks: [...tasks, ...extra],
    seoClients, seoWork, adsReports, keywords, credentials,
    ...(db.bankAccounts ? {} : { bankAccounts: [{ id: "ba1", label: "HDFC Current", bank: "HDFC Bank", number: "50200012345678", ifsc: "HDFC0001234", branch: "Indiranagar" }] }),
    ...(db.messages ? {} : { messages: [] }),
    settings: {
      branches: [
        { name: "Bangalore", rent: 45000, dueDay: 5, notes: "Indiranagar office — lease till Mar 2028" },
        { name: "Mysore", rent: 22000, dueDay: 5, notes: "Kuvempunagar" },
        { name: "Mumbai", rent: 60000, dueDay: 7, notes: "Andheri East co-working" },
      ],
      invoiceSeries: { proformaPrefix: "NNC/PRF", taxPrefix: "NNC/TAX", fiscalYear: true, digits: 4 },
      reports: { enabled: true, schedule: "1st & 16th of every month at 8:00 AM IST", sections: [...REPORT_SECTIONS], email: "owner@company.in" },
      monthlyTargets,
      calendar: { workFrom: "09:30", workTo: "19:00", workDays: [1, 2, 3, 4, 5, 6], gapMins: 15, alertMins: 10, officeAddress: db.settings.company?.address || "" },
      ...(db.settings.financial ? {} : { financial: { cogsPct: 35, taxPct: 25, opBufferMonths: 3, emergencyPct: 5, growthPct: 20 } }),
    },
  };
}
