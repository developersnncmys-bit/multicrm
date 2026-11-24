// Roles and module keys — the same rules the admin panel uses.
// Keep in sync with src/config/constants.js in the frontend (MODULES and ROLES).

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
