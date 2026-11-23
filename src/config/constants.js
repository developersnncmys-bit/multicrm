export const BRANCHES = ["Bangalore", "Mysore", "Mumbai"];
export const LEAD_SOURCES = ["Website", "Google Ads", "Meta Ads", "Instagram", "WhatsApp", "Referral", "Walk-In", "Phone Call", "JustDial", "IndiaMART"];
// SERVICES, LEAD_SOURCES and PROJECT_STAGES are replaced in place by the industry preset (config/workspace.js)
export const SERVICES = ["Website Development", "E-commerce Website", "Mobile App", "SEO", "Google Ads", "Social Media Marketing", "Branding & Logo", "CRM / Custom Software", "Hosting & Maintenance"];

// Sales pipeline (lead stages) — order matters for the Kanban board
export const LEAD_STAGES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];
export const STAGE_STYLE = {
  New: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  Contacted: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
  Qualified: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
  "Proposal Sent": "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  Negotiation: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30",
  Won: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  Lost: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
};
export const STAGE_DOT = { New: "bg-sky-500", Contacted: "bg-indigo-500", Qualified: "bg-violet-500", "Proposal Sent": "bg-amber-500", Negotiation: "bg-orange-500", Won: "bg-emerald-500", Lost: "bg-rose-500" };
export const STAGE_HEX = { New: "#0ea5e9", Contacted: "#6366f1", Qualified: "#8b5cf6", "Proposal Sent": "#f59e0b", Negotiation: "#f97316", Won: "#10b981", Lost: "#f43f5e" };

export const PRIORITIES = ["Hot", "Warm", "Cold"];
export const PRIORITY_STYLE = {
  Hot: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Warm: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Cold: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
};

// Project delivery stages
export const PROJECT_STAGES = ["Onboarded", "Requirement Gathering", "Design", "Development", "Testing / Review", "Live", "Completed", "On Hold"];
export const PROJECT_STAGE_STYLE = {
  Onboarded: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  "Requirement Gathering": "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
  Design: "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300",
  Development: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  "Testing / Review": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Live: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "On Hold": "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

export const QUOTE_STATUSES = ["Draft", "Sent", "Negotiation", "Approved", "Rejected", "Expired"];
export const INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"];
export const DOC_STATUS_STYLE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  Sent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Negotiation: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Rejected: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Expired: "bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-300",
  "Partially Paid": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-300",
  Pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

export const EXPENSE_CATEGORIES = ["Rent", "Salary", "Electricity", "Internet", "Software & Tools", "Marketing", "Travel", "Office Supplies", "Maintenance", "Other"];
export const PAYMENT_MODES = ["UPI", "Bank Transfer", "Cash", "Cheque", "Card", "Auto Debit"];
export const DEPARTMENTS = ["Sales", "Development", "Design", "SEO & Ads", "Accounts", "HR", "Management"];
export const CRED_CATEGORIES = ["Hosting", "Domain", "Email", "Social Media", "Google", "Payment Gateway", "Server / SSH", "Other"];

// Role-based access — each module key maps to a sidebar item
export const MODULES = [
  { key: "dashboard", label: "Dashboard", group: "Overview" }, { key: "owner", label: "Owner Dashboard", group: "Overview" },
  { key: "calendar", label: "Calendar & Tasks", group: "Overview" }, { key: "todays-plan", label: "Today's Plan", group: "Overview" },
  { key: "leads", label: "Leads, Enquiries & Pipeline", group: "Sales" }, { key: "sales-desk", label: "Sales Desk", group: "Sales" },
  { key: "quotations", label: "Quotations", group: "Sales" }, { key: "contacts", label: "Contacts & Companies", group: "Sales" },
  { key: "products", label: "Products & Price List", group: "Sales" }, { key: "campaigns", label: "Campaigns", group: "Sales" },
  { key: "tickets", label: "Support Tickets", group: "Delivery" },
  { key: "projects", label: "Projects & Documents", group: "Delivery" }, { key: "monthly-billing", label: "Monthly & Extras", group: "Delivery" },
  { key: "integrations", label: "Project Credential Vault", group: "Delivery" }, { key: "employee-portal", label: "Employee Portal", group: "Delivery" },
  { key: "seo-team", label: "SEO & Ads Team", group: "Delivery" },
  { key: "invoices", label: "Invoices & Accounting", group: "Finance" }, { key: "payments", label: "Payment Tracker", group: "Finance" },
  { key: "expenses", label: "Expenses", group: "Finance" }, { key: "funds", label: "Reserve Funds", group: "Finance" },
  { key: "reports", label: "Reports, P&L & GST", group: "Analytics" }, { key: "analytics", label: "Business Intelligence", group: "Analytics" },
  { key: "team", label: "Attendance & Salary", group: "HR & Admin" }, { key: "vault", label: "Company Credentials", group: "HR & Admin" },
  { key: "users", label: "Users & Permissions", group: "HR & Admin" }, { key: "settings", label: "Settings", group: "HR & Admin" },
  { key: "automations", label: "Automations", group: "Platform" }, { key: "apps", label: "Apps & Integrations", group: "Platform" }, { key: "audit", label: "Audit Log", group: "Platform" },
];
export const ROLES = {
  Admin: MODULES.map((m) => m.key),
  "Sales Manager": ["dashboard", "calendar", "todays-plan", "leads", "contacts", "products", "campaigns", "sales-desk", "quotations", "projects", "monthly-billing", "payments", "reports", "analytics"],
  "Sales Executive": ["dashboard", "calendar", "todays-plan", "leads", "contacts", "products", "sales-desk", "quotations"],
  Accountant: ["dashboard", "contacts", "products", "invoices", "payments", "expenses", "funds", "monthly-billing", "reports"],
  "Project Manager": ["dashboard", "calendar", "todays-plan", "contacts", "projects", "tickets", "monthly-billing", "integrations", "employee-portal", "seo-team"],
  HR: ["dashboard", "calendar", "team", "employee-portal"],
  "Support Agent": ["dashboard", "calendar", "contacts", "tickets", "products"],
};
// Per-user override: user.modules = { [moduleKey]: "view" | "edit" } (missing key = no access)
