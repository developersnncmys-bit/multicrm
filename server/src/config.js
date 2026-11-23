// Central server config + the data model shared with the frontend store.
import "dotenv/config";

const required = (k) => {
  if (!process.env[k]) { console.error(`Missing ${k} in server/.env (see .env.example)`); process.exit(1); }
  return process.env[k];
};

export const config = {
  mongoUri: required("MONGODB_URI"),
  dbName: process.env.DB_NAME || "nnc_crm",
  jwtSecret: required("JWT_SECRET"),
  port: Number(process.env.PORT) || 5000,
  origins: (process.env.CLIENT_ORIGIN || "*").split(",").map((s) => s.trim()).filter(Boolean),
  adminEmail: process.env.ADMIN_EMAIL || "admin@nnc.in",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
};

// Every list-type collection the frontend reads/writes (db.<name> is an array of { id, ... }).
// Each maps to the module whose access is needed to change it (null = any signed-in user).
export const COLLECTIONS = {
  users: "users", leads: "leads", tasks: "calendar", quotations: "quotations", invoices: "invoices", projects: "projects",
  recurring: "monthly-billing", expenses: "expenses", employees: "team", credentials: "vault", notifications: null,
  planTasks: null, templates: "leads", monthlyServices: "monthly-billing", extras: "monthly-billing", integrations: "integrations",
  documents: "projects", bankAccounts: "invoices", paymentFollowups: "payments", fundTxns: "funds", ownerNotes: "owner",
  commitments: "owner", salaryRecords: "team", messages: null, dayPlans: null, workLogs: null, bugs: null, blockers: null,
  portalMeetings: null, portalDocs: null, portalTasks: null, seoClients: "seo-team", seoWork: "seo-team", adsReports: "seo-team",
  keywords: "seo-team", companies: "contacts", contacts: "contacts", products: "products", tickets: "tickets",
  campaigns: "campaigns", automations: "automations", auditLog: null,
};

// Object-type stores (not lists) are kept as single documents in the "kv" collection
export const KV = ["settings", "attendance", "appConnections"];

// Settings sections only an Admin may change
export const ADMIN_SETTINGS = ["company", "bank", "docs", "workspace", "invoiceSeries", "offices", "payroll", "portal"];
