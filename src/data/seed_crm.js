// Demo data for the product-wide CRM modules: contacts & companies, products,
// support tickets, campaigns, automations, app connections and audit log.
import { addDays, todayISO } from "../utils/format";
import { SERVICES } from "../config/constants";
import { flavor, industryKey, term } from "../config/workspace";

let s = 313;
const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

const TICKET_TOPICS = {
  general: ["Report not received", "Need revised invoice", "Change meeting slot", "Document upload failing", "Query on GST filing", "Request for extension", "Billing address update", "Portal login issue"],
  agency: ["Website down", "Contact form not working", "Need content update", "SSL certificate expired", "Email not receiving", "Speed issue on mobile", "Ads not showing", "Add new product to store"],
  realestate: ["Payment receipt not received", "Change in unit allotment", "Loan disbursement delay", "Possession date query", "Maintenance issue in flat", "Name correction in agreement", "Parking allotment", "Document copy request"],
  education: ["Fee receipt not received", "Change of batch", "Study material not received", "Refund request", "Login issue on student app", "Certificate request", "Class timing clash", "Faculty feedback"],
  healthcare: ["Report not received", "Reschedule appointment", "Insurance claim help", "Billing discrepancy", "Prescription copy needed", "Feedback on consultation", "Home sample collection", "Refund for cancelled test"],
  manufacturing: ["Delivery delayed", "Damaged goods received", "Invoice mismatch", "Warranty claim", "Installation pending", "Spare part required", "Need test certificate", "Machine breakdown — service visit"],
};
const TICKET_CATS = ["Billing", "Service", "Technical", "Delivery", "General"];
const AGENT_REPLIES = ["Thanks for reaching out — we're checking this right away.", "We've escalated this to the concerned team. You'll get an update by evening.", "Could you please share a screenshot / reference number?", "This has been fixed from our side. Please confirm on your end.", "Sorry for the inconvenience. We've scheduled a visit for tomorrow."];

export default function seedCrm(db) {
  s = 313;
  const today = todayISO();
  const ind = industryKey();
  const FL = flavor();
  const users = db.users || [];
  const owners = users.filter((u) => u.role.startsWith("Sales") || u.role === "Admin").map((u) => u.id);
  const leads = db.leads || [];

  // ── Companies & contacts (built from leads so history links up) ──
  const byCompany = new Map();
  leads.forEach((l) => { if (!byCompany.has(l.company)) byCompany.set(l.company, []); byCompany.get(l.company).push(l); });
  const companies = [];
  const contacts = [];
  [...byCompany.entries()].forEach(([name, ls], i) => {
    const won = ls.some((l) => l.stage === "Won");
    const cid = `CO${101 + i}`;
    companies.push({
      id: cid, name, city: ls[0].city, phone: ls[0].phone, email: `info@${name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14)}.in`,
      website: `www.${name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14)}.in`, gstin: rnd() > 0.45 ? `29AAB${pick(["C", "F", "P"])}${int(1000, 9999)}K1Z${int(1, 9)}` : "",
      type: won ? "Customer" : "Prospect", size: pick(["1–10", "11–50", "51–200", "200+"]), ownerId: ls[0].ownerId,
      tags: [won ? "Active" : "Pipeline", ...(rnd() > 0.7 ? ["Key account"] : [])], createdAt: ls.map((l) => l.createdAt).sort()[0],
    });
    ls.forEach((l) => {
      if (contacts.some((c) => c.phone === l.phone)) return;
      contacts.push({
        id: `CT${1001 + contacts.length}`, name: l.name, companyId: cid, designation: pick(["Owner", "Founder", "Director", "Manager", "Purchase Head", "Admin", "Partner"]),
        phone: l.phone, email: l.email, city: l.city, ownerId: l.ownerId, type: l.stage === "Won" ? "Customer" : "Prospect",
        tags: [l.priority, ...(rnd() > 0.8 ? ["VIP"] : [])], leadIds: [l.id], createdAt: l.createdAt,
        lastContact: (l.activities || [])[0]?.at || l.createdAt, whatsappOptIn: rnd() > 0.2, emailOptIn: rnd() > 0.35,
      });
    });
  });
  // A few partners / vendors so the type filter has meaning
  ["Partner", "Vendor", "Vendor", "Partner"].forEach((type, k) => contacts.push({
    id: `CT${1001 + contacts.length}`, name: pick(["Mahesh Bhat", "Farah Khan", "Joseph D'Souza", "Ravi Teja"]), companyId: "", designation: type === "Vendor" ? "Supplier" : "Channel Partner",
    phone: `9${int(100000000, 999999999)}`, email: `partner${k}@mail.com`, city: pick(["Bangalore", "Mumbai", "Pune"]), ownerId: pick(owners), type, tags: [], leadIds: [], createdAt: hoursAgo(int(200, 3000)), lastContact: hoursAgo(int(10, 900)), whatsappOptIn: true, emailOptIn: true,
  }));

  // ── Products & price list ──
  const isGoods = ind === "manufacturing" || ind === "realestate";
  const products = [...SERVICES, ...FL.items.map((x) => x[0])].map((name, i) => {
    const price = ind === "realestate" && i < SERVICES.length ? int(45, 220) * 100000 : int(3, 160) * 1000;
    return {
      id: `PR${101 + i}`, name, sku: `${(ind.slice(0, 3)).toUpperCase()}-${String(101 + i)}`, category: i < SERVICES.length ? term("product") + "s" : "Add-ons",
      type: isGoods && i < SERVICES.length ? "Product" : "Service", unit: ind === "realestate" ? "Unit" : isGoods ? pick(["Nos", "Set", "Kg"]) : pick(["Job", "Month", "Session", "Hour"]),
      price, cost: Math.round(price * (0.45 + rnd() * 0.25)), gst: ind === "healthcare" && i < 3 ? 0 : ind === "realestate" ? 5 : 18,
      hsn: FL.items[0][1], stock: isGoods && ind !== "realestate" ? int(0, 240) : null, reorder: 20, active: rnd() > 0.08,
      sold: leads.filter((l) => l.service === name && l.stage === "Won").length, desc: "",
    };
  });

  // ── Support tickets ──
  const custContacts = contacts.filter((c) => c.type === "Customer");
  const agents = users.filter((u) => ["Project Manager", "Admin", "Sales Manager"].includes(u.role)).map((u) => u.id);
  const topics = TICKET_TOPICS[ind] || TICKET_TOPICS.general;
  const SLA_H = { Urgent: 4, High: 8, Medium: 24, Low: 48 };
  const tickets = Array.from({ length: 26 }, (_, i) => {
    const c = pick(custContacts.length ? custContacts : contacts);
    const priority = pick(["Urgent", "High", "High", "Medium", "Medium", "Medium", "Low"]);
    const status = i < 4 ? "Open" : pick(["Open", "In Progress", "In Progress", "Waiting on Customer", "Resolved", "Resolved", "Closed", "Closed"]);
    const age = i < 4 ? int(1, 5) : int(3, 400);
    const createdAt = hoursAgo(age);
    const by = pick(agents.length ? agents : owners);
    const thread = [{ id: `tm${i}a`, from: "customer", text: `Hi, ${pick(topics).toLowerCase()} — please help at the earliest.`, at: createdAt }];
    if (status !== "Open") thread.push({ id: `tm${i}b`, from: "agent", by, text: pick(AGENT_REPLIES), at: hoursAgo(Math.max(age - int(1, 6), 0)) });
    if (["Resolved", "Closed"].includes(status)) thread.push({ id: `tm${i}c`, from: "customer", text: "Thank you, this is sorted now.", at: hoursAgo(Math.max(age - int(7, 30), 0)) });
    return {
      id: `TK${i + 1}`, number: `TKT-${String(1201 + i)}`, subject: pick(topics), contactId: c.id, contactName: c.name,
      company: companies.find((x) => x.id === c.companyId)?.name || "", phone: c.phone,
      channel: pick(["WhatsApp", "WhatsApp", "Phone", "Email", "Customer Portal"]), category: pick(TICKET_CATS), priority, status,
      assigneeId: i % 7 === 0 ? "" : by, createdAt, dueAt: new Date(new Date(createdAt).getTime() + SLA_H[priority] * 3600000).toISOString(),
      resolvedAt: ["Resolved", "Closed"].includes(status) ? hoursAgo(Math.max(age - int(7, 30), 0)) : "", rating: status === "Closed" ? pick([5, 5, 4, 4, 3]) : null, thread: thread.reverse(),
    };
  });

  // ── Campaigns ──
  const svc = SERVICES;
  const campaigns = [
    { name: `Festive offer — ${svc[0]}`, channel: "WhatsApp", status: "Completed", audience: "All customers", size: 420, days: -18 },
    { name: "Re-engage cold leads", channel: "WhatsApp", status: "Completed", audience: "Leads · Lost / Cold", size: 186, days: -9 },
    { name: `New launch: ${svc[1] || svc[0]}`, channel: "Email", status: "Running", audience: "Prospects · Bangalore", size: 940, days: -1 },
    { name: "Payment reminder — overdue", channel: "SMS", status: "Completed", audience: "Invoices overdue", size: 38, days: -4 },
    { name: "Google review request", channel: "WhatsApp", status: "Scheduled", audience: "Won in last 30 days", size: 64, days: 2 },
    { name: "Monthly newsletter", channel: "Email", status: "Draft", audience: "All contacts · opted-in", size: 1310, days: 6 },
  ].map((c, i) => {
    const done = ["Completed", "Running"].includes(c.status);
    const sent = done ? Math.round(c.size * (c.status === "Running" ? 0.6 : 0.98)) : 0;
    const delivered = Math.round(sent * (c.channel === "Email" ? 0.93 : 0.97));
    const read = Math.round(delivered * (c.channel === "WhatsApp" ? 0.78 : c.channel === "Email" ? 0.34 : 0.5));
    return {
      id: `CM${i + 1}`, name: c.name, channel: c.channel, status: c.status, audience: c.audience, audienceSize: c.size,
      sent, delivered, read, clicked: Math.round(read * 0.22), replied: Math.round(read * (c.channel === "WhatsApp" ? 0.14 : 0.03)), leads: Math.round(read * 0.05),
      scheduledAt: addDays(today, c.days), createdBy: pick(owners), cost: c.channel === "Email" ? 0 : Math.round(c.size * (c.channel === "SMS" ? 0.25 : 0.8)),
      message: `Hi {name}, ${c.name.toLowerCase()} from {company}. Reply YES to know more!`,
    };
  });

  // ── Automations (no-code rules) ──
  const automations = [
    ["New website lead", "Lead created · source is Website", ["Assign round-robin to Sales team", "Send WhatsApp: New enquiry greeting", "Create follow-up task in 30 min"], "Sales", 312],
    ["Untouched lead alert", "Lead in New stage for 2 hours", ["Notify Sales Manager", "Mark priority Hot"], "Sales", 58],
    ["Quotation follow-up", "Quotation Sent · no reply in 3 days", ["Send WhatsApp: Quotation follow-up", "Create task for owner"], "Sales", 91],
    ["Deal won → onboarding", `Lead stage changes to Won`, [`Create ${term("project")}`, "Raise proforma invoice for advance", "Send welcome email"], "Delivery", 44],
    ["Invoice overdue reminder", "Invoice is 1 / 7 / 15 days overdue", ["Send WhatsApp payment reminder with UPI link", "Notify Accountant on day 15"], "Finance", 127],
    ["Payment received thank-you", "Payment recorded on invoice", ["Send WhatsApp thank-you + receipt PDF"], "Finance", 203],
    ["Ticket SLA breach", "Ticket open past SLA due time", ["Escalate to Admin", "Change priority to Urgent"], "Support", 17],
    ["Review request after closure", `${term("project")} marked Completed`, ["Wait 2 days", "Send WhatsApp: Google review request"], "Delivery", 36],
    ["Birthday wishes", "Contact birthday is today", ["Send WhatsApp greeting"], "Marketing", 9],
  ].map(([name, trigger, actions, category, runs], i) => ({
    id: `AU${i + 1}`, name, trigger, actions, category, runs, active: i !== 8, lastRun: runs ? hoursAgo(int(1, 60)) : "", createdBy: "u1",
  }));

  // ── App connections ──
  const appConnections = {
    whatsapp: { connected: true, account: "+91 98450 12345 (Business API)", at: hoursAgo(900) },
    gmail: { connected: true, account: "hello@company.in", at: hoursAgo(1500) },
    gcal: { connected: true, account: "hello@company.in", at: hoursAgo(1500) },
    razorpay: { connected: true, account: "Live mode", at: hoursAgo(700) },
    webforms: { connected: true, account: "2 forms live", at: hoursAgo(1200) },
    ...(ind === "manufacturing" || ind === "agency" ? { indiamart: { connected: true, account: "Seller ID 48xx21", at: hoursAgo(400) } } : {}),
    ...(ind === "realestate" ? { "99acres": { connected: true, account: "Builder account", at: hoursAgo(400) } } : {}),
    meta: { connected: rnd() > 0.4, account: "Meta Business Suite", at: hoursAgo(300) },
  };

  // ── Audit log ──
  const ACTIONS = [
    ["created", "Lead", (l) => `${l.name} · ${l.company}`], ["updated", "Lead", (l) => `Stage → ${l.stage} · ${l.name}`], ["exported", "Leads", () => "CSV export (110 rows)"],
    ["created", "Quotation", () => `QT-2026-01${int(10, 30)}`], ["sent", "Invoice", () => `INV-2026-02${int(10, 40)} via WhatsApp`], ["recorded", "Payment", () => `₹${int(5, 90)},000 received`],
    ["deleted", "Task", () => "Follow-up call (duplicate)"], ["updated", "Settings", () => "Invoice terms changed"], ["login", "Session", () => "Signed in from Chrome · Windows"],
    ["updated", "User", () => "Permissions changed for Sales Executive"], ["revealed", "Credential", () => "Password viewed: Hosting panel"],
  ];
  const auditLog = Array.from({ length: 60 }, (_, i) => {
    const [action, entity, fn] = pick(ACTIONS);
    return { id: `al${i}`, action, entity, detail: fn(pick(leads)), by: pick(users).id, at: hoursAgo(i * int(2, 9) + int(0, 2)), ip: `49.37.${int(10, 250)}.${int(2, 250)}` };
  }).sort((a, b) => b.at.localeCompare(a.at));

  return { companies, contacts, products, tickets, campaigns, automations, appConnections, auditLog };
}
