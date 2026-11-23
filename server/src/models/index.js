// Registry of every collection the CRM stores.
//   model  — Mongoose model (detailed schema for core entities, flexible schema for the rest)
//   module — the module a user needs to read/change it (null = any signed-in user)
//   route  — URL segment under /api (defaults to the collection name)
import User from "./User.js";
import Lead from "./Lead.js";
import Contact from "./Contact.js";
import Company from "./Company.js";
import Project from "./Project.js";
import { Quotation, Invoice } from "./Document.js";
import { Task, Expense, Employee, Ticket, Product, Campaign } from "./Operations.js";
import { defineModel } from "./base.js";

export { default as KeyValue, KV_STORES } from "./KeyValue.js";
export { User };

const flexible = (name) => defineModel(name);

export const RESOURCES = {
  users: { model: User, module: "users" },
  leads: { model: Lead, module: "leads" },
  contacts: { model: Contact, module: "contacts" },
  companies: { model: Company, module: "contacts" },
  quotations: { model: Quotation, module: "quotations" },
  invoices: { model: Invoice, module: "invoices" },
  projects: { model: Project, module: "projects" },
  tasks: { model: Task, module: "calendar" },
  expenses: { model: Expense, module: "expenses" },
  employees: { model: Employee, module: "team" },
  tickets: { model: Ticket, module: "tickets" },
  products: { model: Product, module: "products" },
  campaigns: { model: Campaign, module: "campaigns" },

  // Supporting collections (flexible schema)
  recurring: { model: flexible("recurring"), module: "monthly-billing" },
  monthlyServices: { model: flexible("monthlyServices"), module: "monthly-billing" },
  extras: { model: flexible("extras"), module: "monthly-billing" },
  credentials: { model: flexible("credentials"), module: "vault" },
  integrations: { model: flexible("integrations"), module: "integrations" },
  documents: { model: flexible("documents"), module: "projects" },
  bankAccounts: { model: flexible("bankAccounts"), module: "invoices" },
  paymentFollowups: { model: flexible("paymentFollowups"), module: "payments" },
  fundTxns: { model: flexible("fundTxns"), module: "funds" },
  ownerNotes: { model: flexible("ownerNotes"), module: "owner" },
  commitments: { model: flexible("commitments"), module: "owner" },
  salaryRecords: { model: flexible("salaryRecords"), module: "team" },
  templates: { model: flexible("templates"), module: "leads" },
  seoClients: { model: flexible("seoClients"), module: "seo-team" },
  seoWork: { model: flexible("seoWork"), module: "seo-team" },
  adsReports: { model: flexible("adsReports"), module: "seo-team" },
  keywords: { model: flexible("keywords"), module: "seo-team" },
  automations: { model: flexible("automations"), module: "automations" },
  notifications: { model: flexible("notifications"), module: null },
  planTasks: { model: flexible("planTasks"), module: null },
  messages: { model: flexible("messages"), module: null },
  dayPlans: { model: flexible("dayPlans"), module: null },
  workLogs: { model: flexible("workLogs"), module: null },
  bugs: { model: flexible("bugs"), module: null },
  blockers: { model: flexible("blockers"), module: null },
  portalMeetings: { model: flexible("portalMeetings"), module: null },
  portalDocs: { model: flexible("portalDocs"), module: null },
  portalTasks: { model: flexible("portalTasks"), module: null },
  auditLog: { model: flexible("auditLog"), module: null },
};
