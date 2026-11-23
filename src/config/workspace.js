// ─── Workspace engine ───────────────────────────────────────────────
// One codebase, many clients. Each client workspace picks an industry
// preset (vocabulary, services, lead sources, delivery stages) and turns
// modules on/off. Stored in db.settings.workspace and applied at runtime.
import { SERVICES, LEAD_SOURCES, PROJECT_STAGES, PROJECT_STAGE_STYLE } from "./constants";

// 8 delivery stages per industry. Slot rules used by the app:
//   [0] = first stage for new work, [5] = "delivered / live", [6] = "Completed", [7] = "On Hold"
export const INDUSTRIES = {
  general: {
    label: "Professional Services", short: "Services", icon: "Briefcase",
    desc: "Consultants, CA / legal firms, training, event and service businesses.",
    services: ["Consultation", "Annual Retainer", "Audit & Compliance", "Training Program", "Implementation", "Support Plan", "Custom Engagement"],
    sources: ["Website", "Google Ads", "Meta Ads", "Referral", "WhatsApp", "Phone Call", "Walk-In", "LinkedIn", "JustDial", "Event"],
    stages: ["Onboarded", "Discovery", "Planning", "In Progress", "Review", "Delivered", "Completed", "On Hold"],
    milestones: ["Kick-off", "Discovery call", "Scope sign-off", "Execution", "Client review", "Delivery"],
    terms: { project: "Engagement", projects: "Engagements", client: "Client", product: "Service" },
    notes: ["Needs a proposal by Friday.", "Decision maker is the MD.", "Comparing with 2 other firms.", "Wants monthly reporting.", "Referred by an existing client.", "Requested a call back after 5 PM.", "Budget approved for this quarter.", "Wants a site visit before signing."],
    modules: ["leads", "contacts", "calendar", "todays-plan", "quotations", "products", "projects", "tickets", "invoices", "payments", "expenses", "reports", "team", "campaigns", "automations", "apps", "audit", "owner", "analytics", "vault", "monthly-billing"],
  },
  agency: {
    label: "Digital / IT Agency", short: "Agency", icon: "MonitorSmartphone",
    desc: "Web, app, SEO and marketing agencies with retainers and client projects.",
    services: ["Website Development", "E-commerce Website", "Mobile App", "SEO", "Google Ads", "Social Media Marketing", "Branding & Logo", "CRM / Custom Software", "Hosting & Maintenance"],
    sources: ["Website", "Google Ads", "Meta Ads", "Instagram", "WhatsApp", "Referral", "Walk-In", "Phone Call", "JustDial", "IndiaMART"],
    stages: ["Onboarded", "Requirement Gathering", "Design", "Development", "Testing / Review", "Live", "Completed", "On Hold"],
    milestones: ["Kick-off call", "Sitemap & content", "UI design approval", "Development", "Client review", "Go live"],
    terms: { project: "Project", projects: "Projects", client: "Client", product: "Service" },
    notes: ["Wants a modern website with booking option.", "Asked for portfolio and pricing for e-commerce.", "Interested in SEO + Google Ads combo package.", "Needs mobile app for customers, Android first.", "Budget is flexible, decision by end of month.", "Comparing with 2 other agencies.", "Existing site is slow, wants redesign.", "Referred by an existing client."],
    modules: "ALL",
  },
  realestate: {
    label: "Real Estate & Builders", short: "Real Estate", icon: "Building",
    desc: "Builders, brokers and property consultants — site visits to registration.",
    services: ["2 BHK Apartment", "3 BHK Apartment", "Villa", "Residential Plot", "Commercial Space", "Rental / Lease", "Resale Property"],
    sources: ["Website", "99acres", "MagicBricks", "Housing.com", "Google Ads", "Meta Ads", "Referral", "Walk-In", "Channel Partner", "Phone Call"],
    stages: ["Site Visit Scheduled", "Site Visit Done", "Unit Blocked", "Booking", "Agreement", "Registration", "Completed", "On Hold"],
    milestones: ["Site visit", "Unit selection", "Booking amount", "Loan approval", "Agreement signed", "Registration"],
    terms: { project: "Booking", projects: "Bookings", client: "Buyer", product: "Unit" },
    notes: ["Looking for east-facing unit, 2nd floor or above.", "Home loan pre-approved with SBI.", "Wants to visit on Sunday with family.", "Budget up to ₹85L, ready to move.", "Comparing with 2 other projects nearby.", "NRI buyer, prefers video walkthrough.", "Wants corner plot near main road.", "Asked for payment plan options."],
    modules: ["leads", "contacts", "calendar", "todays-plan", "sales-desk", "quotations", "products", "projects", "documents", "invoices", "payments", "expenses", "reports", "team", "campaigns", "automations", "apps", "audit", "owner", "analytics", "vault", "monthly-billing"],
  },
  education: {
    label: "Education & Coaching", short: "Education", icon: "GraduationCap",
    desc: "Institutes, coaching centres and ed-tech — enquiry to enrolment.",
    services: ["NEET Coaching", "JEE Coaching", "Spoken English", "Full Stack Course", "Data Science Course", "Digital Marketing Course", "Foundation (8–10th)"],
    sources: ["Website", "Google Ads", "Meta Ads", "Instagram", "Shiksha", "JustDial", "Walk-In", "Referral", "Seminar", "Phone Call"],
    stages: ["Counselling", "Demo Class", "Application", "Documents", "Fee Paid", "Enrolled", "Completed", "On Hold"],
    milestones: ["Counselling session", "Demo class", "Application form", "Documents verified", "First fee instalment", "Batch allotted"],
    terms: { project: "Admission", projects: "Admissions", client: "Student", product: "Course" },
    notes: ["Parent wants to talk to the faculty first.", "Asked about EMI for fees.", "Prefers weekend batch.", "Wants hostel facility details.", "Comparing with another institute nearby.", "Attended free demo, liked it.", "Needs scholarship information.", "Will decide after board results."],
    modules: ["leads", "contacts", "calendar", "todays-plan", "quotations", "products", "projects", "tickets", "invoices", "payments", "expenses", "reports", "team", "campaigns", "automations", "apps", "audit", "owner", "vault", "monthly-billing"],
  },
  healthcare: {
    label: "Clinics & Healthcare", short: "Healthcare", icon: "Stethoscope",
    desc: "Clinics, hospitals, diagnostics and wellness centres.",
    services: ["General Consultation", "Dental Treatment", "Physiotherapy", "Full Body Checkup", "Skin & Hair", "IVF Consultation", "Diagnostics / Lab"],
    sources: ["Website", "Practo", "Google Maps", "Google Ads", "Meta Ads", "Walk-In", "Referral", "Phone Call", "Health Camp", "WhatsApp"],
    stages: ["Appointment Booked", "Consulted", "Treatment Plan", "In Treatment", "Review Visit", "Recovered", "Completed", "On Hold"],
    milestones: ["First consultation", "Diagnosis", "Treatment plan shared", "Treatment sessions", "Review visit", "Discharge / closure"],
    terms: { project: "Treatment", projects: "Treatments", client: "Patient", product: "Service" },
    notes: ["Prefers evening appointment.", "Asked about insurance / cashless.", "Second opinion requested.", "Wants a female doctor.", "Senior citizen — needs home visit option.", "Asked for package price.", "Referred by family doctor.", "Follow-up after reports."],
    modules: ["leads", "contacts", "calendar", "todays-plan", "quotations", "products", "projects", "tickets", "invoices", "payments", "expenses", "reports", "team", "campaigns", "automations", "apps", "audit", "vault", "monthly-billing", "owner"],
  },
  manufacturing: {
    label: "Manufacturing & B2B Trading", short: "B2B / Mfg", icon: "Factory",
    desc: "Manufacturers, distributors and traders — RFQ to dispatch.",
    services: ["Industrial Pumps", "Control Panels", "Steel Fabrication", "Packaging Material", "Spare Parts", "Annual Maintenance", "Custom Order"],
    sources: ["IndiaMART", "TradeIndia", "Website", "Exhibition", "Distributor", "Referral", "Google Ads", "LinkedIn", "Phone Call", "Tender"],
    stages: ["Order Confirmed", "Material Planning", "Production", "Quality Check", "Packing", "Dispatched", "Completed", "On Hold"],
    milestones: ["PO received", "Advance received", "Production start", "QC passed", "Dispatched", "Delivered & installed"],
    terms: { project: "Order", projects: "Orders", client: "Customer", product: "Product" },
    notes: ["Needs price for 500 units, delivery to Pune.", "Asked for technical datasheet.", "Wants 30-day credit terms.", "Tender deadline next week.", "Existing vendor delays — looking to switch.", "Requested sample before PO.", "Needs GST invoice with e-way bill.", "Repeat customer, quarterly order."],
    modules: ["leads", "contacts", "calendar", "todays-plan", "sales-desk", "quotations", "products", "projects", "tickets", "documents", "invoices", "payments", "expenses", "funds", "reports", "team", "campaigns", "automations", "apps", "audit", "owner", "analytics", "vault", "monthly-billing"],
  },
};

// Every module the product ships. `core` modules can't be switched off.
// tier = which plan it is sold in (shown on the Workspace page).
export const MODULE_CATALOG = [
  { key: "dashboard", label: "Dashboard", group: "Core", tier: "Starter", core: true, desc: "KPIs, targets, today's work at a glance." },
  { key: "users", label: "Users & Permissions", group: "Core", tier: "Starter", core: true, desc: "Invite staff, roles and per-module access." },
  { key: "settings", label: "Settings", group: "Core", tier: "Starter", core: true, desc: "Company profile, documents, branding." },

  { key: "leads", label: "Leads, Enquiries & Pipeline", group: "Sales", tier: "Starter", desc: "Capture, assign and move leads through stages." },
  { key: "contacts", label: "Contacts & Companies", group: "Sales", tier: "Starter", desc: "One record per customer with full history." },
  { key: "calendar", label: "Calendar & Tasks", group: "Sales", tier: "Starter", desc: "Meetings, follow-ups and reminders." },
  { key: "todays-plan", label: "Today's Plan", group: "Sales", tier: "Starter", desc: "Daily call & follow-up list per person." },
  { key: "quotations", label: "Quotations", group: "Sales", tier: "Starter", desc: "GST quotations, revisions, convert to invoice." },
  { key: "products", label: "Products & Price List", group: "Sales", tier: "Starter", desc: "Catalogue with HSN/SAC, GST and pricing." },
  { key: "sales-desk", label: "Sales Desk", group: "Sales", tier: "Growth", desc: "Calling desk with scripts and templates." },
  { key: "campaigns", label: "Campaigns", group: "Marketing", tier: "Growth", desc: "WhatsApp, SMS and email broadcasts." },

  { key: "projects", label: "Delivery / Projects & Documents", group: "Operations", tier: "Growth", desc: "Track delivery stages, milestones and files." },
  { key: "tickets", label: "Support Tickets", group: "Operations", tier: "Growth", desc: "Complaints & service requests with SLA." },
  { key: "monthly-billing", label: "Recurring Billing & Extras", group: "Operations", tier: "Growth", desc: "Retainers, AMCs, subscriptions, extra work." },

  { key: "invoices", label: "Invoices & Accounting", group: "Finance", tier: "Starter", desc: "Tax & proforma invoices with GST." },
  { key: "payments", label: "Payment Tracker", group: "Finance", tier: "Starter", desc: "Receivables, ageing and reminders." },
  { key: "expenses", label: "Expenses", group: "Finance", tier: "Growth", desc: "Spend by category and branch." },
  { key: "funds", label: "Reserve Funds", group: "Finance", tier: "Enterprise", desc: "Tax reserve, emergency & growth funds." },

  { key: "reports", label: "Reports, P&L & GST", group: "Insights", tier: "Growth", desc: "P&L, funnel, leaderboard, GST summary." },
  { key: "analytics", label: "Business Intelligence", group: "Insights", tier: "Enterprise", desc: "Trends, forecasts and cohort views." },
  { key: "owner", label: "Owner View & Desk", group: "Insights", tier: "Enterprise", desc: "One-screen business health for the owner." },

  { key: "team", label: "Attendance & Payroll", group: "Team", tier: "Growth", desc: "Attendance, salary and payslips." },
  { key: "employee-portal", label: "Employee Portal & Chat", group: "Team", tier: "Enterprise", desc: "Staff work logs, day plans, team chat." },
  { key: "vault", label: "Company Credentials", group: "Team", tier: "Growth", desc: "PIN-locked password vault." },

  { key: "automations", label: "Automations", group: "Platform", tier: "Enterprise", desc: "When X happens → do Y. No code." },
  { key: "apps", label: "Apps & Integrations", group: "Platform", tier: "Growth", desc: "WhatsApp API, Razorpay, Tally, portals…" },
  { key: "audit", label: "Audit Log", group: "Platform", tier: "Enterprise", desc: "Who changed what, and when." },

  { key: "seo-team", label: "SEO & Ads Delivery", group: "Industry add-ons", tier: "Add-on", addon: "agency", desc: "Agency add-on: backlinks, rankings, ad reports." },
  { key: "integrations", label: "Client Project Vault", group: "Industry add-ons", tier: "Add-on", addon: "agency", desc: "Agency add-on: per-project logins & API keys." },
];
// Extra flavour used only to generate realistic sample data per industry
export const SEED_FLAVOR = {
  general: { items: [["Implementation support (hours)", "998311"], ["Annual support plan", "998313"]], recurring: ["Monthly Retainer", "Compliance Filing", "Support Plan", "Advisory Retainer"],
    staff: [["Sales", "Business Development Exec"], ["Sales", "Sales Manager"], ["Operations", "Senior Consultant"], ["Operations", "Consultant"], ["Operations", "Associate"], ["Operations", "Project Coordinator"], ["Design", "Content Specialist"], ["Other", "Customer Success Exec"], ["Other", "Support Executive"], ["Accounts", "Accountant"], ["HR", "HR Executive"], ["Management", "Operations Head"]] },
  agency: { items: [["Domain + 1 Year Hosting", "998315"], ["Maintenance & Support (months)", "998316"]], recurring: ["SEO Retainer", "Google Ads Management", "Hosting & AMC", "Social Media Management"],
    staff: [["Sales", "Business Development Exec"], ["Sales", "Sales Manager"], ["Development", "Full Stack Developer"], ["Development", "React Developer"], ["Development", "Backend Developer"], ["Design", "UI/UX Designer"], ["Design", "Graphic Designer"], ["SEO & Ads", "SEO Specialist"], ["SEO & Ads", "Performance Marketer"], ["Accounts", "Accountant"], ["HR", "HR Executive"], ["Management", "Operations Head"]] },
  realestate: { items: [["Car parking (covered)", "997212"], ["Club house & amenities", "997212"]], recurring: ["Rental Management", "Maintenance Charges", "Property Management", "Lease Renewal"],
    staff: [["Sales", "Sales Executive"], ["Sales", "Sales Manager"], ["Sales", "Site Executive"], ["Sales", "Channel Partner Manager"], ["Operations", "CRM Executive"], ["Operations", "Loan Coordinator"], ["Operations", "Documentation Officer"], ["Design", "Marketing Executive"], ["Maintenance", "Facility Manager"], ["Accounts", "Accountant"], ["HR", "HR Executive"], ["Management", "Project Head"]] },
  education: { items: [["Study material & test series", "999293"], ["Registration fee", "999293"]], recurring: ["Monthly Tuition Fee", "Hostel Fee", "Transport Fee", "Library Membership"],
    staff: [["Sales", "Admission Counsellor"], ["Sales", "Counselling Head"], ["Operations", "Faculty — Physics"], ["Operations", "Faculty — Chemistry"], ["Operations", "Faculty — Maths"], ["Operations", "Academic Coordinator"], ["Design", "Content Developer"], ["Other", "Student Support Exec"], ["Other", "Front Office"], ["Accounts", "Accountant"], ["HR", "HR Executive"], ["Management", "Centre Head"]] },
  healthcare: { items: [["Lab tests & diagnostics", "999316"], ["Medicines & consumables", "999312"]], recurring: ["Annual Health Plan", "Physio Package (monthly)", "Corporate Wellness", "Home Care Visits"],
    staff: [["Sales", "Patient Coordinator"], ["Sales", "Marketing Manager"], ["Operations", "Consultant Doctor"], ["Operations", "Dentist"], ["Operations", "Physiotherapist"], ["Operations", "Staff Nurse"], ["Operations", "Lab Technician"], ["Other", "Front Desk Executive"], ["Other", "Pharmacist"], ["Accounts", "Billing Executive"], ["HR", "HR Executive"], ["Management", "Clinic Manager"]] },
  manufacturing: { items: [["Freight & packing", "996511"], ["Installation & commissioning", "998719"]], recurring: ["Annual Maintenance Contract", "Spares Supply (monthly)", "Rental Equipment", "Service Contract"],
    staff: [["Sales", "Sales Engineer"], ["Sales", "Regional Sales Manager"], ["Operations", "Production Supervisor"], ["Operations", "Machine Operator"], ["Operations", "Quality Inspector"], ["Operations", "Store Keeper"], ["Design", "Design Engineer"], ["Maintenance", "Service Engineer"], ["Other", "Dispatch Executive"], ["Accounts", "Accountant"], ["HR", "HR Executive"], ["Management", "Plant Head"]] },
};
export const flavor = () => SEED_FLAVOR[active.key] || SEED_FLAVOR.general;

export const CORE_MODULES = MODULE_CATALOG.filter((m) => m.core).map((m) => m.key);
export const PLANS = [
  { key: "Starter", price: "₹999", per: "/user/mo", desc: "Leads, contacts, quotes & invoices for small teams." },
  { key: "Growth", price: "₹1,999", per: "/user/mo", desc: "Adds delivery, support, campaigns, payroll & reports." },
  { key: "Enterprise", price: "Custom", per: "", desc: "Automations, BI, owner desk, audit and add-ons." },
];
const TIER_RANK = { Starter: 1, Growth: 2, Enterprise: 3, "Add-on": 4 };
export const modulesForPlan = (plan, industry) => MODULE_CATALOG.filter((m) => !m.core && (m.addon ? m.addon === industry && plan === "Enterprise" : TIER_RANK[m.tier] <= TIER_RANK[plan])).map((m) => m.key);
// "documents" lives under the projects module key
const presetModules = (key) => {
  const p = INDUSTRIES[key] || INDUSTRIES.general;
  return p.modules === "ALL" ? MODULE_CATALOG.filter((m) => !m.core).map((m) => m.key) : p.modules.filter((k) => MODULE_CATALOG.some((m) => m.key === k));
};

export const defaultWorkspace = (industry = "general") => {
  const p = INDUSTRIES[industry] || INDUSTRIES.general;
  return { industry, plan: "Enterprise", enabled: presetModules(industry), services: [...p.services], sources: [...p.sources], setupDone: false };
};

// ─── Runtime state (mutated in place so existing imports see new values) ───
const STAGE_PALETTE = [
  "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
  "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300", "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
];
export const STAGE_BAR_PALETTE = ["bg-sky-500", "bg-cyan-500", "bg-pink-500", "bg-violet-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500"];
const replace = (arr, next) => arr.splice(0, arr.length, ...next);

let active = { key: "general", preset: INDUSTRIES.general, enabled: null, sig: "" };

export function applyWorkspace(ws) {
  const w = ws || defaultWorkspace();
  const preset = INDUSTRIES[w.industry] || INDUSTRIES.general;
  const sig = JSON.stringify([w.industry, w.enabled, w.services, w.sources]);
  if (sig === active.sig) return;
  replace(SERVICES, w.services?.length ? w.services : preset.services);
  replace(LEAD_SOURCES, w.sources?.length ? w.sources : preset.sources);
  replace(PROJECT_STAGES, preset.stages);
  Object.keys(PROJECT_STAGE_STYLE).forEach((k) => delete PROJECT_STAGE_STYLE[k]);
  preset.stages.forEach((s, i) => { PROJECT_STAGE_STYLE[s] = STAGE_PALETTE[i]; });
  active = { key: w.industry, preset, enabled: Array.isArray(w.enabled) ? new Set(w.enabled) : null, sig };
}

export const industry = () => active.preset;
export const industryKey = () => active.key;
export const term = (k) => active.preset.terms[k] || k;
export const stageAt = (i) => PROJECT_STAGES[i];
export const firstStage = () => PROJECT_STAGES[0];
export const liveStage = () => PROJECT_STAGES[5];
export const milestoneTitles = () => active.preset.milestones;
export const isModuleOn = (key) => CORE_MODULES.includes(key) || !active.enabled || active.enabled.has(key);

applyWorkspace(defaultWorkspace());
