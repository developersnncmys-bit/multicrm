// Demo data for the Delivery area: richer projects, monthly services, extra work,
// per-project credentials (integrations) and documents. Shapes: see DATA_CONTRACTS.md.
import { addDays, todayISO, toISO } from "../utils/format";
import { PROJECT_STAGES } from "../config/constants";

let s = 7;
const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
const isoAt = (date, h = 11) => `${date}T${String(h).padStart(2, "0")}:${String(int(0, 59)).padStart(2, "0")}:00.000Z`;
const ymAdd = (ym, n) => { const d = new Date(`${ym}-01T00:00:00`); d.setMonth(d.getMonth() + n); return toISO(d).slice(0, 7); };


export default function seedDelivery(db) {
  s = 7;
  const STAGES = PROJECT_STAGES.slice(0, 7);
  const today = todayISO();
  const devsDept = (db.employees || []).filter((e) => ["Development", "Design"].includes(e.department)).map((e) => e.id);
  const devs = devsDept.length ? devsDept : (db.employees || []).filter((e) => e.department === "Operations").map((e) => e.id);
  const leadById = Object.fromEntries((db.leads || []).map((l) => [l.id, l]));

  // ── Projects: financials, BANT, cadence, logs, timestamps ──
  const projects = (db.projects || []).map((p, i) => {
    const lead = leadById[p.leadId] || {};
    const invs = (db.invoices || []).filter((x) => x.leadId === p.leadId && x.status !== "Cancelled");
    const pays = invs.flatMap((x) => x.payments || []).sort((a, b) => a.date.localeCompare(b.date));
    const advanceReceived = pays.reduce((a, x) => a + Number(x.amount || 0), 0);
    const gstRate = i % 5 === 3 ? 0 : 18;
    const onboardedDate = p.stage === "On Hold" && i % 2 ? "" : p.startDate;
    const idx = STAGES.indexOf(p.stage);
    const stageTimestamps = {};
    STAGES.forEach((st, k) => { if (k <= idx) stageTimestamps[st] = isoAt(addDays(p.startDate, k * int(4, 9)) > today ? today : addDays(p.startDate, k * int(4, 9))); });
    if (p.stage === "On Hold") stageTimestamps["On Hold"] = isoAt(addDays(today, -int(3, 20)));
    const by = lead.ownerId || "u2";
    const team = devs.length ? [...new Set([pick(devs), pick(devs)])] : p.team || [];
    const cadence = [1, 2, 3, 5, 7, 10].map((day, k) => {
      const due = addDays(p.startDate, day);
      const done = due < today && rnd() > 0.25;
      return { id: `cd${i}${k}`, day, title: ["Welcome call & kick-off", "Collect content & assets", "Share sitemap / wireframe", "Design review call", "Progress update on WhatsApp", "Payment & timeline check-in"][k], channel: ["Call", "WhatsApp", "Email", "Meeting", "WhatsApp", "Call"][k], status: done ? "Closed" : due < today && k % 2 ? "Rescheduled" : "Pending", due, done };
    });
    const commLogs = [
      { id: `cl${i}a`, type: "Outbound Call", summary: "Kick-off call done. Client shared reference websites and brand colours.", at: isoAt(addDays(p.startDate, 1), 11), by },
      { id: `cl${i}b`, type: "WhatsApp", summary: "Shared progress screenshots; client happy with homepage direction.", at: isoAt(addDays(p.startDate, int(6, 14)) > today ? today : addDays(p.startDate, int(6, 14)), 16), by },
      ...(i % 3 === 0 ? [{ id: `cl${i}c`, type: "Proposal Sent", summary: "Sent revised proposal for additional landing pages.", at: isoAt(addDays(today, -int(1, 9)), 13), by }] : []),
    ];
    const emailLogs = [
      { id: `em${i}a`, type: "Project Initiation", to: lead.email || "", subject: `Project kick-off — ${p.name}`, body: `Dear ${p.contact},\n\nThank you for choosing us. Your project has been initiated…`, at: isoAt(p.startDate, 10), response: i % 2 ? "Thanks! Looking forward to it." : "" },
      ...(advanceReceived ? [{ id: `em${i}b`, type: "Payment Receipt", to: lead.email || "", subject: "Payment received — thank you!", body: `Dear ${p.contact},\n\nWe've received your payment of ₹${advanceReceived.toLocaleString("en-IN")}.`, at: isoAt(pays[0]?.date || p.startDate, 15), response: "" }] : []),
      ...(p.stage === "Completed" ? [{ id: `em${i}c`, type: "Project Completion", to: lead.email || "", subject: `Your project is complete — ${p.name}`, body: `Dear ${p.contact},\n\nYour project is now live!`, at: isoAt(addDays(today, -int(2, 30)), 12), response: "Great work team, thank you!" }] : []),
    ];
    const notesList = [
      { id: `nt${i}a`, text: p.notes || "Client prefers WhatsApp updates every Friday.", at: isoAt(p.startDate, 18), by },
      ...(i % 2 ? [{ id: `nt${i}b`, text: "Client wants a blog section added in phase 2.", at: isoAt(addDays(today, -int(1, 12)), 17), by }] : []),
    ];
    const timeline = int(25, 75);
    return {
      ...p,
      priority: lead.priority || "Warm", source: lead.source || "Referral", ownerId: by, email: lead.email || "", industry: lead.service ? "" : "",
      location: lead.city || "", requirements: lead.requirement || "",
      gstRate, gstin: gstRate ? lead.gstin || (i % 2 ? `29AAB${"CFPK"[i % 4]}${1000 + i * 37}K1Z${(i % 9) + 1}` : "") : "",
      advanceReceived, advanceDate: pays[0]?.date || "", agreedTimelineDays: timeline,
      onboardedDate, completionDate: p.stage === "Completed" ? addDays(today, -int(2, 30)) : "",
      developers: team, team,
      bant: { budgetMin: Math.round(p.value * 0.8 / 1000) * 1000, budgetMax: Math.round(p.value * 1.2 / 1000) * 1000, authorityName: p.contact, authorityRole: pick(["Founder", "Owner", "Director", "Marketing Head", "Partner"]), need: lead.requirement || "New website with lead capture", timeline: `${timeline} days` },
      cadence, commLogs, emailLogs, notesList, stageTimestamps,
    };
  });

  // ── Monthly services ──
  const live = projects.filter((p) => [STAGES[5], STAGES[6], STAGES[3], STAGES[4]].includes(p.stage));
  const recurring = db.recurring || [];
  const svcDefs = [
    [["SEO"], "SEO — Monthly", 15000], [["Google Ads"], "Google Ads Management", 12000], [["AMC / Maintenance", "Hosting"], "AMC + Hosting", 4500],
    [["Social Media"], "Social Media Management", 18000], [["Meta Ads"], "Meta Ads Management", 10000], [["Content / Blogs"], "Blog Writing (4/month)", 8000],
    [["SEO", "Google Ads"], "SEO + Google Ads", 25000], [["Hosting"], "Cloud Hosting", 2500], [["Social Media", "Meta Ads"], "Social + Meta Ads", 22000], [["AMC / Maintenance"], "Website AMC", 3500],
  ];
  const curYm = today.slice(0, 7);
  const monthlyServices = svcDefs.map(([types, name, amount], i) => {
    const p = live[i % Math.max(1, live.length)] || projects[i] || {};
    const months = int(3, 7);
    const startYm = ymAdd(curYm, -months);
    const billDay = pick([1, 5, 7, 10, 15]);
    const gstRate = 18;
    const full = Math.round(amount * 1.18);
    const payments = [];
    for (let k = 0; k <= months; k++) {
      const ym = ymAdd(startYm, k);
      const isCur = ym === curYm;
      const kind = isCur ? (i % 3 === 0 ? "paid" : "none") : k === months - 1 && i % 4 === 1 ? "none" : k === months - 2 && i % 5 === 2 ? "partial" : k === 1 && i === 6 ? "skip" : "paid";
      const date = `${ym}-${String(Math.min(28, billDay + int(0, 6))).padStart(2, "0")}`;
      if (kind === "paid") payments.push({ id: `mp${i}${k}`, month: ym, amount: full, date: date > today ? today : date, mode: pick(["UPI", "NEFT", "IMPS"]), ref: `UTR${int(100000, 999999)}`, note: "" });
      if (kind === "partial") payments.push({ id: `mp${i}${k}`, month: ym, amount: Math.round(full / 2), date, mode: "UPI", ref: `UTR${int(100000, 999999)}`, note: "Balance next week" });
      if (kind === "skip") payments.push({ id: `mp${i}${k}`, month: ym, amount: 0, date, mode: "", ref: "", note: "Service paused for festival", skipped: true });
    }
    const stopped = i === 9;
    return {
      id: `MS${i + 1}`, projectId: p.id || "", client: p.client || recurring[i]?.client || "Client", types, name, amount, gstRate, billDay,
      startDate: `${startYm}-${String(billDay).padStart(2, "0")}`, endDate: stopped ? addDays(today, -20) : "", notes: i === 0 ? "Includes monthly ranking report." : "", active: !stopped, payments,
    };
  });

  // ── Additional work ──
  const extraDefs = [["Extra landing pages (3)", 18000, "Done"], ["Payment gateway integration", 12000, "In Progress"], ["Blog module", 9000, "Approved"], ["Logo redesign", 7500, "Done"], ["WhatsApp chat widget", 3000, "Done"], ["Product photography (20 SKUs)", 15000, "Quoted"], ["Multi-language (Kannada)", 22000, "Approved"], ["Speed optimisation", 6000, "Cancelled"]];
  const extras = extraDefs.map(([title, amount, status], i) => {
    const p = projects[(i * 3) % Math.max(1, projects.length)] || {};
    const total = Math.round(amount * 1.18);
    const requestedOn = addDays(today, -int(5, 70));
    const paid = status === "Done" ? (i % 2 ? total : Math.round(total / 2)) : status === "In Progress" ? Math.round(total / 2) : 0;
    return {
      id: `EX${i + 1}`, projectId: p.id || "", client: p.client || "", title, description: `${title} as requested by the client.`, amount, gstRate: 18, requestedOn, status,
      payments: paid ? [{ id: `xp${i}`, amount: paid, date: addDays(requestedOn, int(2, 12)) > today ? today : addDays(requestedOn, int(2, 12)), mode: pick(["UPI", "NEFT"]), ref: `UTR${int(100000, 999999)}`, note: "" }] : [],
    };
  });

  // ── Integrations (per-project credential vault) ──
  const intDefs = [
    ["Payment", "Razorpay", ["Key ID", "Key Secret", "Webhook Secret"]], ["Hosting / Server", "Hostinger", ["Panel Password"]], ["Domain", "GoDaddy", ["Account Password"]],
    ["Email", "Google Workspace", ["SMTP Password"]], ["Analytics / Ads", "Google Analytics 4", ["Measurement ID"]], ["SMS / OTP", "MSG91", ["Auth Key", "Sender ID"]],
    ["WhatsApp", "Interakt", ["Access Token"]], ["Maps", "Google Maps", ["API Key"]], ["Database", "MongoDB Atlas", ["Connection String"]],
    ["Login / Auth", "Google Sign-In", ["Client ID", "Client Secret"]], ["Shipping", "Shiprocket", ["API Email", "API Password"]], ["Play Store", "Google Play Console", ["Account Password", "Keystore Password"]],
    ["App Store", "App Store Connect", ["Apple ID Password"]], ["Analytics / Ads", "Meta Pixel", ["Pixel ID"]], ["Payment", "PhonePe", ["Merchant ID", "Salt Key"]],
    ["Hosting / Server", "AWS EC2", ["SSH Key", "Root Password"]], ["Domain", "Cloudflare", ["Account Password"]], ["Email", "SendGrid", ["API Key"]],
    ["Other", "Tawk.to", ["Password"]], ["Analytics / Ads", "Google Tag Manager", ["Container ID"]], ["Payment", "Cashfree", ["App ID", "Secret Key"]],
  ];
  const statuses = ["Live", "Live", "Live", "In Progress", "Pending", "Live", "Issue", "Live", "Inactive"];
  const integrations = intDefs.map(([category, service, secretNames], i) => {
    const p = projects[i % Math.max(1, projects.length)] || {};
    const yearly = ["Domain", "Hosting / Server", "Play Store", "App Store", "Email"].includes(category);
    const renewal = yearly || i % 4 === 0 ? addDays(today, pick([-6, -2, 5, 12, 21, 45, 90, 160, 240])) : "";
    const slug = (p.client || "client").toLowerCase().replace(/[^a-z]/g, "").slice(0, 10);
    return {
      id: `IG${i + 1}`, projectId: p.id || "", category, service, mode: i % 6 === 4 ? "Test" : "Live", status: statuses[i % statuses.length], owner: i % 3 === 0 ? "Agency" : "Client",
      url: { Razorpay: "https://dashboard.razorpay.com", Hostinger: "https://hpanel.hostinger.com", GoDaddy: "https://sso.godaddy.com", "Google Workspace": "https://admin.google.com" }[service] || "https://",
      login: `admin@${slug}.com`,
      secrets: secretNames.map((n, k) => ({ name: n, value: `${n.replace(/\W/g, "").slice(0, 4).toLowerCase()}_${(i * 7919 + k * 104729).toString(36)}${slug.slice(0, 3)}X${k}` })),
      cost: category === "Domain" ? 999 : category === "Hosting / Server" ? 4999 : category === "Play Store" ? 2100 : category === "Email" ? 1500 : 0,
      billing: category === "Play Store" ? "One-time" : yearly ? "Yearly" : category === "Payment" ? "Free" : pick(["Monthly", "Free"]),
      renewal, notes: i === 6 ? "Template messages rejected — re-submitting for approval." : "", updatedAt: isoAt(addDays(today, -int(1, 60)), 12),
    };
  });

  // ── Documents ──
  const docDefs = [["Signed proposal.pdf", "Project Document"], ["Requirement document.docx", "Client Input"], ["Kick-off meeting MOM.pdf", "MoM"], ["Brand guidelines.pdf", "Client Input"], ["Homepage wireframe.png", "Project Document"], ["Advance payment receipt.pdf", "Invoice"], ["Revised quotation.pdf", "Quotation"], ["Content sheet.xlsx", "Client Input"], ["Design review MOM.pdf", "MoM"], ["Logo files.zip", "Client Input"], ["Sitemap.pdf", "Project Document"], ["Final invoice.pdf", "Invoice"], ["Go-live checklist.pdf", "Project Document"], ["Product catalogue.pdf", "Client Input"], ["Weekly sync MOM.pdf", "MoM"], ["AMC agreement.pdf", "Project Document"], ["Domain transfer request.pdf", "Client Input"], ["Phase 2 quotation.pdf", "Quotation"]];
  const documents = docDefs.map(([name, type], i) => {
    const p = projects[(i * 2) % Math.max(1, projects.length)] || {};
    return { id: `DC${i + 1}`, name: name.replace(/\.[a-z]+$/, ""), type, projectId: p.id || "", leadId: p.leadId || "", date: addDays(today, -int(1, 90)), notes: i % 4 === 0 ? "Shared by client over email." : "", size: int(40, 3200) * 1024, fileName: name };
  });

  return { projects, monthlyServices, extras, integrations, documents };
}
