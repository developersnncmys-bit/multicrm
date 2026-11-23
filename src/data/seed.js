// Realistic demo data, generated relative to today so the dashboard always looks "live".
import { BRANCHES, LEAD_SOURCES, SERVICES, LEAD_STAGES, PROJECT_STAGES, EXPENSE_CATEGORIES, PAYMENT_MODES } from "../config/constants";
import { BRAND } from "../config/brand";
import { applyWorkspace, defaultWorkspace, industry, milestoneTitles, flavor } from "../config/workspace";
import seedCrm from "./seed_crm";
import { addDays, todayISO, toISO } from "../utils/format";
import seedSales from "./seed_sales";
import seedDelivery from "./seed_delivery";
import seedFinance from "./seed_finance";
import seedOwner from "./seed_owner";
import seedTeam from "./seed_team";
import seedAdmin from "./seed_admin";

let seed = 42;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
const round = (n, to = 500) => Math.round(n / to) * to;
const isoAgo = (days, hour = 10) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, int(0, 59), 0, 0); return d.toISOString(); };

const FIRST = ["Rahul", "Priya", "Arjun", "Sneha", "Vikram", "Ananya", "Karthik", "Divya", "Rohan", "Meera", "Suresh", "Kavya", "Aditya", "Pooja", "Nikhil", "Lakshmi", "Manoj", "Shreya", "Ganesh", "Ishita", "Harish", "Neha", "Varun", "Deepa", "Sanjay", "Ritu", "Abhishek", "Swathi", "Prakash", "Aishwarya"];
const LAST = ["Sharma", "Reddy", "Nair", "Iyer", "Gowda", "Patel", "Rao", "Menon", "Kumar", "Shetty", "Hegde", "Joshi", "Pillai", "Desai", "Kulkarni"];
const COMPANIES = ["Sri Sai Interiors", "GreenLeaf Organics", "Urban Nest Realty", "Apex Dental Clinic", "Bloom Florist", "TechNova Solutions", "Royal Caterers", "Zenith Academy", "Spice Route Restaurant", "Aura Wellness Spa", "Metro Motors", "Silverline Jewellers", "BrightPath Tutors", "Harvest Foods", "Skyline Builders", "PureAqua Systems", "Vogue Boutique", "Nimbus Travels", "CarePlus Hospital", "FitZone Gym", "Elite Events", "Kaveri Textiles", "Prime Logistics", "Lotus Yoga Studio", "SmartHome Automation", "Golden Crust Bakery", "Swift Couriers", "Nova Pharma", "Heritage Resorts", "Pixel Studios", "Om Sai Traders", "BlueOcean Exports", "Sunrise Hospitals", "Matrix Infotech", "Chai Point Cafe", "Trident Engineering"];
const CITIES = ["Bangalore", "Mysore", "Mumbai", "Chennai", "Hyderabad", "Pune", "Mangalore", "Hubli"];
const AGENCY_NOTES = [
  "Wants a modern website with booking option.", "Asked for portfolio and pricing for e-commerce.", "Interested in SEO + Google Ads combo package.",
  "Needs mobile app for customers, Android first.", "Budget is flexible, decision by end of month.", "Comparing with 2 other agencies.",
  "Existing site is slow, wants redesign.", "Referred by an existing client.", "Requested a call back after 5 PM.",
];

export function buildSeed(industryKey = "general") {
  seed = 42;
  const workspace = defaultWorkspace(industryKey);
  applyWorkspace(workspace);
  const NOTES = industry().notes || AGENCY_NOTES;
  const FL = flavor();
  const VALUE_MULT = { realestate: 15, manufacturing: 1.6 }[industryKey] || 1;
  const S = PROJECT_STAGES;
  const today = todayISO();

  const users = [
    { id: "u1", name: "Admin User", email: "admin@nexora.in", password: "admin123", role: "Admin", branch: "Bangalore", phone: "98450 12345", active: true },
    { id: "u2", name: "Kiran Kumar", email: "kiran@nexora.in", password: "demo123", role: "Sales Manager", branch: "Bangalore", phone: "98860 22110", active: true },
    { id: "u3", name: "Divya Shetty", email: "divya@nexora.in", password: "demo123", role: "Sales Executive", branch: "Mysore", phone: "99001 33445", active: true },
    { id: "u4", name: "Arun Prakash", email: "arun@nexora.in", password: "demo123", role: "Sales Executive", branch: "Mumbai", phone: "97400 55667", active: true },
    { id: "u5", name: "Sowmya Rao", email: "sowmya@nexora.in", password: "demo123", role: "Accountant", branch: "Bangalore", phone: "96111 77889", active: true },
    { id: "u6", name: "Rakesh Gowda", email: "rakesh@nexora.in", password: "demo123", role: "Project Manager", branch: "Bangalore", phone: "95380 99001", active: true },
    { id: "u7", name: "Meena Iyer", email: "meena@nexora.in", password: "demo123", role: "Support Agent", branch: "Bangalore", phone: "94480 11223", active: true },
  ];
  const salesIds = ["u2", "u3", "u4", "u1"];

  // ── Leads ──
  const stageWeights = ["New", "New", "New", "Contacted", "Contacted", "Contacted", "Qualified", "Qualified", "Proposal Sent", "Proposal Sent", "Negotiation", "Won", "Won", "Won", "Won", "Won", "Won", "Lost", "Lost"];
  const leads = Array.from({ length: 110 }, (_, i) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const stage = pick(stageWeights);
    const age = int(0, 170);
    const service = pick(SERVICES);
    const value = round(int(60, 520) * 1000 * VALUE_MULT, 1000);
    const ownerId = pick(salesIds);
    const createdAt = isoAgo(age, int(9, 19));
    const activities = [{ id: `a${i}0`, type: "created", text: `Lead captured from ${"source"}`, at: createdAt, by: ownerId }];
    if (stage !== "New") activities.push({ id: `a${i}1`, type: "call", text: "Intro call done. " + pick(NOTES), at: isoAgo(Math.max(age - 1, 0), 12), by: ownerId });
    if (["Proposal Sent", "Negotiation", "Won"].includes(stage)) activities.push({ id: `a${i}2`, type: "email", text: "Proposal & quotation shared over email.", at: isoAgo(Math.max(age - 3, 0), 15), by: ownerId });
    if (stage === "Won") activities.push({ id: `a${i}3`, type: "stage", text: "Deal won — advance received.", at: isoAgo(Math.max(age - 6, 0), 17), by: ownerId });
    const source = pick(LEAD_SOURCES);
    activities[0].text = `Lead captured from ${source}`;
    return {
      id: `L${1001 + i}`,
      name, company: pick(COMPANIES),
      phone: `9${int(100000000, 999999999)}`,
      email: `${name.split(" ")[0].toLowerCase()}${int(1, 99)}@gmail.com`,
      source, service, branch: pick(BRANCHES), city: pick(CITIES),
      stage, priority: pick(["Hot", "Warm", "Warm", "Cold"]),
      value, ownerId, createdAt,
      nextFollowUp: ["Won", "Lost"].includes(stage) ? "" : addDays(today, int(-4, 9)),
      lostReason: stage === "Lost" ? pick(["Budget too low", "Went with competitor", "No response", "Project postponed"]) : "",
      requirement: pick(NOTES),
      activities: activities.reverse(),
    };
  });

  // ── Tasks / calendar events ──
  const TYPES = ["Follow-up", "Call", "Meeting", "Demo", "Task"];
  const TASK_TEXT = { "Follow-up": "Follow up on proposal", Call: "Discovery call", Meeting: "Requirement meeting", Demo: "Product demo", Task: "Prepare quotation" };
  const openLeads = leads.filter((l) => !["Won", "Lost"].includes(l.stage));
  const tasks = Array.from({ length: 34 }, (_, i) => {
    const lead = pick(openLeads);
    const type = pick(TYPES);
    const date = addDays(today, int(-6, 16));
    return {
      id: `T${i + 1}`, title: `${TASK_TEXT[type]} — ${lead.company}`, type, date,
      time: `${String(int(10, 18)).padStart(2, "0")}:${pick(["00", "30"])}`,
      leadId: lead.id, assigneeId: lead.ownerId, done: date < today ? rnd() > 0.35 : false, notes: "",
    };
  });

  // ── Quotations ──
  const quoteLeads = leads.filter((l) => ["Proposal Sent", "Negotiation", "Won", "Lost"].includes(l.stage)).slice(0, 18);
  const qStatus = { "Proposal Sent": "Sent", Negotiation: "Negotiation", Won: "Approved", Lost: "Rejected" };
  const itemsFor = (service, value) => {
    const base = round(value * 0.7, 1000);
    const rest = value - base;
    return [
      { id: "i1", desc: service, hsn: "998314", qty: 1, rate: base },
      { id: "i2", desc: FL.items[0][0], hsn: FL.items[0][1], qty: 1, rate: round(rest * 0.4, 500) || 4500 },
      { id: "i3", desc: FL.items[1][0], hsn: FL.items[1][1], qty: 3, rate: round((rest * 0.6) / 3, 500) || 2000 },
    ];
  };
  const clientOf = (l) => ({ name: l.name, company: l.company, email: l.email, phone: l.phone, address: `${int(10, 400)}, ${pick(["MG Road", "Indiranagar", "JP Nagar", "Vijayanagar", "Andheri East", "Kuvempunagar"])}, ${l.city}`, gstin: rnd() > 0.5 ? `29AAB${pick(["C", "F", "P"])}${int(1000, 9999)}${pick(["K", "M", "R"])}1Z${int(1, 9)}` : "" });
  const quotations = quoteLeads.map((l, i) => {
    const date = l.createdAt.slice(0, 10) > addDays(today, -25) ? l.createdAt.slice(0, 10) : addDays(today, -int(2, 25));
    return {
      id: `Q${i + 1}`, number: `QT-2026-${String(101 + i).padStart(4, "0")}`, leadId: l.id, client: clientOf(l),
      date, validUntil: addDays(date, 15), items: itemsFor(l.service, l.value), discountPct: pick([0, 0, 5, 10]), gstPct: 18,
      interState: l.branch === "Mumbai", status: i === 0 ? "Draft" : qStatus[l.stage], branch: l.branch, createdBy: l.ownerId,
      notes: "Thank you for considering us. We look forward to working with you.",
    };
  });

  // ── Invoices (from won deals) ──
  const wonLeads = leads.filter((l) => l.stage === "Won");
  const clamp = (iso) => (iso > today ? today : iso);
  const KINDS = ["paid", "partial", "paid", "unpaid", "paid", "overdue", "partial", "paid"];
  const invoices = wonLeads.map((l, i) => {
    // Spread invoices evenly over the last ~6 months so charts look natural
    const date = addDays(today, -Math.floor((i * 165) / wonLeads.length) - int(1, 5));
    const items = itemsFor(l.service, l.value);
    const sub = items.reduce((s, it) => s + it.qty * it.rate, 0);
    const total = Math.round(sub * 1.18);
    const ageDays = Math.floor((i * 165) / wonLeads.length);
    const kind = i < 2 ? "partial" : ageDays > 40 ? (i % 6 === 0 ? "overdue" : i % 5 === 0 ? "partial" : "paid") : KINDS[i % KINDS.length];
    const payments = [];
    const advance = Math.round(total * 0.5);
    if (kind === "paid") payments.push({ id: `p${i}a`, date: clamp(addDays(date, 1)), amount: advance, mode: pick(PAYMENT_MODES), ref: `UTR${int(100000, 999999)}` }, { id: `p${i}b`, date: clamp(addDays(date, int(8, 25))), amount: total - advance, mode: pick(PAYMENT_MODES), ref: `UTR${int(100000, 999999)}` });
    if (kind === "partial") payments.push({ id: `p${i}a`, date: clamp(addDays(date, 1)), amount: Math.round(total * pick([0.3, 0.5, 0.6])), mode: pick(PAYMENT_MODES), ref: `UTR${int(100000, 999999)}` });
    const dueDate = kind === "overdue" ? addDays(today, -int(3, 20)) : addDays(date, 30);
    const status = kind === "paid" ? "Paid" : kind === "partial" ? "Partially Paid" : dueDate < today ? "Overdue" : "Sent";
    return {
      id: `I${i + 1}`, number: `INV-2026-${String(201 + i).padStart(4, "0")}`, type: "Tax", leadId: l.id, client: clientOf(l),
      date, dueDate, items, discountPct: 0, gstPct: 18, interState: l.branch === "Mumbai", status, payments, branch: l.branch,
      notes: "Payment due within 30 days. Late payments attract 2% monthly interest.",
    };
  });

  // ── Projects (from won deals) ──
  const projects = wonLeads.map((l, i) => {
    // Newest deals are early in delivery, oldest are done
    // Newest deals are early in delivery, oldest are done (positional stages work for every industry)
    const stage = [S[0], S[1], S[2], S[3], S[3], S[4], S[2], S[5], S[3], S[6], S[7], S[6], S[5], S[6]][i % 14];
    const idx = PROJECT_STAGES.indexOf(stage);
    const start = addDays(today, -int(5, 120));
    const milestones = milestoneTitles().map((t, k) => ({ id: `m${k}`, title: t, done: k < Math.min(idx + 1, 6) && stage !== "On Hold" ? true : k < 2 }));
    return {
      id: `P${i + 1}`, name: `${l.company} — ${l.service}`, client: l.company, contact: l.name, phone: l.phone, leadId: l.id, service: l.service,
      stage, startDate: start, deadline: addDays(start, int(30, 90)), value: l.value, managerId: "u6",
      team: [pick(["e3", "e4", "e5"]), pick(["e6", "e7"])], branch: l.branch, milestones,
      notes: "Client prefers WhatsApp updates every Friday.",
    };
  });

  // ── Recurring services (AMC / SEO retainers) ──
  const recurring = Array.from({ length: 9 }, (_, i) => {
    const l = pick(wonLeads);
    return {
      id: `R${i + 1}`, client: l.company, service: pick(FL.recurring),
      amount: round(int(4, 35) * 1000, 500), cycle: pick(["Monthly", "Monthly", "Quarterly", "Yearly"]),
      nextDue: addDays(today, int(-5, 25)), status: rnd() > 0.15 ? "Active" : "Paused", startDate: addDays(today, -int(30, 300)),
    };
  });

  // ── Expenses ──
  const expenses = [];
  for (let m = 0; m < 6; m++) {
    const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() - m);
    const ymd = (day) => { const d = new Date(base); d.setDate(day); return toISO(d); };
    BRANCHES.forEach((b, bi) => {
      expenses.push({ id: `X${m}${bi}r`, date: ymd(3), category: "Rent", description: `Office rent — ${b}`, vendor: "Landlord", amount: [45000, 22000, 60000][bi], mode: "Bank Transfer", branch: b, status: "Paid" });
      expenses.push({ id: `X${m}${bi}s`, date: ymd(1), category: "Salary", description: `Staff salaries — ${b}`, vendor: "Payroll", amount: [160000, 65000, 95000][bi] + int(-10, 10) * 1000, mode: "Bank Transfer", branch: b, status: m === 0 && toISO(new Date()) < ymd(1) ? "Pending" : "Paid" });
      expenses.push({ id: `X${m}${bi}e`, date: ymd(8), category: "Electricity", description: `BESCOM / MSEB bill`, vendor: "Electricity Board", amount: int(4, 12) * 1000, mode: "UPI", branch: b, status: "Paid" });
    });
    for (let k = 0; k < 5; k++) {
      const cat = pick(["Internet", "Software & Tools", "Marketing", "Travel", "Office Supplies", "Maintenance", "Other"]);
      expenses.push({ id: `X${m}m${k}`, date: ymd(int(2, 27)), category: cat, description: { Internet: "ACT Fibernet", "Software & Tools": pick(["Figma", "Google Workspace", "AWS", "Canva Pro"]), Marketing: pick(["Meta Ads", "Google Ads (own)", "Printing flyers"]), Travel: "Client visit", "Office Supplies": "Stationery & pantry", Maintenance: "AC service", Other: "Misc" }[cat], vendor: "", amount: int(2, 45) * 1000, mode: pick(PAYMENT_MODES), branch: pick(BRANCHES), status: m === 0 && rnd() > 0.7 ? "Pending" : "Paid" });
    }
  }

  // ── Employees & attendance ──
  const DES = FL.staff;
  const employees = DES.map(([dept, des], i) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    return {
      id: `e${i + 1}`, empId: `EMP${String(101 + i)}`, name, email: `${name.split(" ")[0].toLowerCase()}@company.in`, phone: `9${int(100000000, 999999999)}`,
      department: dept, designation: des, branch: pick(BRANCHES), joinDate: addDays(today, -int(60, 1200)), salary: round(int(18, 95) * 1000, 1000), status: "Active",
    };
  });
  const attendance = {};
  for (let d = 0; d < 45; d++) {
    const date = addDays(today, -d);
    const dow = new Date(`${date}T00:00:00`).getDay();
    if (dow === 0) continue;
    employees.forEach((e) => {
      if (d === 0 && rnd() > 0.85) return; // some haven't marked yet today
      const r = rnd();
      const status = r > 0.93 ? "Absent" : r > 0.88 ? "Leave" : r > 0.8 ? "WFH" : r > 0.74 ? "Half Day" : "Present";
      const late = rnd() > 0.8;
      attendance[`${date}|${e.id}`] = { status, in: ["Absent", "Leave"].includes(status) ? "" : `${late ? "10" : "09"}:${String(int(0, 45)).padStart(2, "0")}`, out: ["Absent", "Leave"].includes(status) || d === 0 ? "" : `${status === "Half Day" ? "14" : pick(["18", "19"])}:${String(int(0, 59)).padStart(2, "0")}` };
    });
  }

  // ── Credential vault ──
  const credentials = [
    { id: "c1", title: "GoDaddy — main account", category: "Domain", url: "https://godaddy.com", username: "admin@company.in", password: "Gd@2026#secure", client: "Internal", notes: "Auto-renew ON for all client domains." },
    { id: "c2", title: "Hostinger VPS", category: "Hosting", url: "https://hpanel.hostinger.com", username: "ops@company.in", password: "Hx!9vps_Prod", client: "Internal", notes: "" },
    { id: "c3", title: "AWS Root (billing only)", category: "Server / SSH", url: "https://console.aws.amazon.com", username: "billing@company.in", password: "Aws#R00t!26", client: "Internal", notes: "MFA on Rakesh's phone." },
    ...projects.slice(0, 6).map((p, i) => ({ id: `c${i + 4}`, title: `${p.client} — ${pick(["cPanel", "WordPress Admin", "Google Analytics", "Instagram", "Razorpay"])}`, category: pick(["Hosting", "Google", "Social Media", "Payment Gateway"]), url: "https://", username: `admin@${p.client.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10)}.com`, password: `${p.client.slice(0, 3)}@${int(1000, 9999)}!x`, client: p.client, notes: "" })),
  ].map((c) => ({ ...c, updatedAt: isoAgo(int(1, 60)) }));

  // ── Notifications ──
  const notifications = [
    { id: "n1", title: "New lead from Website", text: `${leads[0].name} (${leads[0].company}) enquired about ${leads[0].service}.`, at: isoAgo(0, new Date().getHours()), read: false, link: "/leads" },
    { id: "n2", title: "Payment received", text: `₹45,000 received from ${wonLeads[0]?.company}.`, at: isoAgo(0, 9), read: false, link: "/payments" },
    { id: "n3", title: "Quotation approved", text: `${quotations.find((q) => q.status === "Approved")?.number || "QT-2026-0102"} was approved by the client.`, at: isoAgo(1), read: false, link: "/quotations" },
    { id: "n4", title: "Invoice overdue", text: "2 invoices are past their due date.", at: isoAgo(2), read: true, link: "/invoices" },
    { id: "n5", title: "Project went live", text: `${projects[0]?.name} is now live.`, at: isoAgo(4), read: true, link: "/projects" },
  ];

  const settings = {
    company: {
      name: BRAND.companyName, email: "hello@company.in", phone: "+91 98450 12345", website: "www.company.in",
      address: "No. 45, 2nd Floor, 100 Feet Road, Indiranagar, Bangalore — 560038", gstin: "29AABCN1234F1Z5", pan: "AABCN1234F", state: "Karnataka",
    },
    bank: { accountName: BRAND.companyName, bankName: "HDFC Bank", accountNumber: "50200012345678", ifsc: "HDFC0001234", branch: "Indiranagar", upi: "company@hdfcbank" },
    docs: {
      quotePrefix: "QT-2026-", invoicePrefix: "INV-2026-", defaultGst: 18, quoteValidity: 15, paymentTerms: 30,
      terms: "1. 50% advance to start the project, balance before go-live.\n2. Domain & hosting renewals are billed yearly.\n3. Any additional scope will be quoted separately.\n4. Prices are exclusive of GST unless stated.",
    },
    targets: { monthlyRevenue: 1200000, monthlyLeads: 60 },
    accent: BRAND.defaultAccent,
    workspace,
  };

  // Each area adds its own collections (or enriches existing ones) on top of the base data
  let db = { users, leads, tasks, quotations, invoices, projects, recurring, expenses, employees, attendance, credentials, notifications, settings };
  for (const extend of [seedSales, seedDelivery, seedFinance, seedOwner, seedTeam, seedAdmin, seedCrm]) {
    const patch = extend(db) || {};
    db = { ...db, ...patch, settings: { ...db.settings, ...(patch.settings || {}) } };
  }
  return db;
}
