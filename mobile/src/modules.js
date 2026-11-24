// Every admin-panel section the app shows, described once.
// The generic list / detail / form screens (screens/ModuleScreens.js) render these.
//   col     – backend collection (same as the web admin panel)
//   module  – access key (role permissions); null = everyone signed in
//   fields  – what the form edits and the detail page shows
//   item(r) – how a row looks in the list: { title, sub, right, badge: {label, color} }
import { fmtDate, inr, inrShort, invoiceBalance, invoicePaid, invoiceTotal, today } from "./utils";

const C = { green: "#10B981", red: "#F43F5E", amber: "#F59E0B", blue: "#0EA5E9", indigo: "#6366F1", violet: "#8B5CF6", slate: "#94A3B8", pink: "#EC4899", teal: "#14B8A6" };
const statusColor = (s = "") => {
  const v = s.toLowerCase();
  if (/(paid|active|live|won|approved|done|complete|resolved|present|running|collected|fixed|deposit)/.test(v)) return C.green;
  if (/(overdue|lost|rejected|cancel|inactive|absent|hot|high|urgent|critical|withdraw)/.test(v)) return C.red;
  if (/(pending|partial|sent|warm|medium|progress|late|negotiation|paused|half)/.test(v)) return C.amber;
  if (/(draft|cold|low|expired|closed|on hold)/.test(v)) return C.slate;
  return C.indigo;
};
export const badge = (label) => (label ? { label: String(label), color: statusColor(String(label)) } : null);

const nextNumber = (prefix, list, key = "number") => {
  const nums = (list || []).map((r) => parseInt(String(r[key] || "").replace(/\D/g, "").slice(-4), 10)).filter((n) => !isNaN(n));
  return `${prefix}${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
};
const docTotal = (r) => invoiceTotal(r);

export const MODULES = [
  // ── Sales ──
  {
    key: "contacts", col: "contacts", module: "contacts", group: "Sales", title: "Contacts", icon: "person-circle", color: C.indigo, prefix: "CT",
    item: (r, db) => ({ title: r.name, sub: [r.designation, db.companies.find((c) => c.id === r.companyId)?.name, r.city].filter(Boolean).join(" · "), badge: badge(r.type) }),
    filterBy: "type",
    fields: [
      { k: "name", label: "Name", required: true },
      { k: "phone", label: "Phone", type: "phone" },
      { k: "email", label: "Email", type: "email" },
      { k: "companyId", label: "Company", type: "ref", source: "companies", show: (c) => c.name },
      { k: "designation", label: "Designation" },
      { k: "city", label: "City" },
      { k: "type", label: "Type", type: "choice", options: ["Customer", "Prospect", "Partner", "Vendor"], def: "Prospect" },
    ],
    create: () => ({ createdAt: new Date().toISOString(), tags: [], leadIds: [] }),
  },
  {
    key: "companies", col: "companies", module: "contacts", group: "Sales", title: "Companies", icon: "business", color: C.blue, prefix: "CO",
    item: (r) => ({ title: r.name, sub: [r.city, r.size && `${r.size} people`].filter(Boolean).join(" · "), badge: badge(r.type) }),
    filterBy: "type",
    fields: [
      { k: "name", label: "Company name", required: true },
      { k: "phone", label: "Phone", type: "phone" },
      { k: "email", label: "Email", type: "email" },
      { k: "website", label: "Website", type: "url" },
      { k: "city", label: "City" },
      { k: "gstin", label: "GSTIN" },
      { k: "type", label: "Type", type: "choice", options: ["Customer", "Prospect", "Partner", "Vendor"], def: "Customer" },
      { k: "size", label: "Size", type: "choice", options: ["1–10", "11–50", "51–200", "200+"] },
    ],
    create: () => ({ createdAt: new Date().toISOString(), tags: [] }),
  },
  {
    key: "quotations", col: "quotations", module: "quotations", group: "Sales", title: "Quotations", icon: "document-text", color: C.violet, prefix: "Q",
    item: (r) => ({ title: r.client?.company || r.client?.name, sub: `${r.number} · ${fmtDate(r.date)}`, right: inrShort(docTotal(r)), badge: badge(r.status) }),
    filterBy: "status",
    fields: [
      { k: "client", label: "Client", type: "client", required: true },
      { k: "items", label: "Items", type: "items" },
      { k: "discountPct", label: "Discount %", type: "number", def: 0 },
      { k: "gstPct", label: "GST %", type: "choice", options: [0, 5, 12, 18, 28], def: 18 },
      { k: "validUntil", label: "Valid until", type: "date", def: () => new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10) },
      { k: "status", label: "Status", type: "choice", options: ["Draft", "Sent", "Negotiation", "Approved", "Rejected", "Expired"], def: "Draft" },
      { k: "notes", label: "Notes", type: "multiline" },
    ],
    totals: true,
    create: (db) => ({ number: nextNumber(db.settings?.docs?.quotePrefix || "QT-", db.quotations), date: today(), interState: false, payments: [] }),
  },
  {
    key: "products", col: "products", module: "products", group: "Sales", title: "Services & price list", icon: "pricetags", color: C.teal, prefix: "PR",
    item: (r) => ({ title: r.name, sub: [r.category, r.unit && `per ${r.unit}`].filter(Boolean).join(" · "), right: inr(r.price), badge: r.active === false ? badge("Inactive") : null }),
    filterBy: "category",
    fields: [
      { k: "name", label: "Name", required: true },
      { k: "price", label: "Price ₹", type: "money" },
      { k: "category", label: "Category" },
      { k: "type", label: "Type", type: "choice", options: ["Service", "Product"], def: "Service" },
      { k: "unit", label: "Unit", def: "Project" },
      { k: "gst", label: "GST %", type: "choice", options: [0, 5, 12, 18, 28], def: 18 },
      { k: "hsn", label: "HSN / SAC" },
      { k: "sku", label: "Code / SKU" },
      { k: "active", label: "Active", type: "bool", def: true },
      { k: "desc", label: "Description", type: "multiline" },
    ],
  },
  {
    key: "campaigns", col: "campaigns", module: "campaigns", group: "Sales", title: "Campaigns", icon: "megaphone", color: C.pink, prefix: "CM",
    item: (r) => ({ title: r.name, sub: `${r.channel} · ${r.audience || ""}`, right: r.leads ? `${r.leads} leads` : "", badge: badge(r.status) }),
    filterBy: "status",
    fields: [
      { k: "name", label: "Campaign name", required: true },
      { k: "channel", label: "Channel", type: "choice", options: ["WhatsApp", "Email", "SMS"], def: "WhatsApp" },
      { k: "status", label: "Status", type: "choice", options: ["Draft", "Scheduled", "Running", "Completed", "Paused"], def: "Draft" },
      { k: "audience", label: "Audience" },
      { k: "scheduledAt", label: "Send on", type: "date" },
      { k: "message", label: "Message", type: "multiline", hint: "Use {name} and {company} for personal touches" },
      { k: "sent", label: "Sent", type: "number", readOnly: true }, { k: "delivered", label: "Delivered", type: "number", readOnly: true },
      { k: "read", label: "Read", type: "number", readOnly: true }, { k: "replied", label: "Replied", type: "number", readOnly: true }, { k: "leads", label: "Leads", type: "number", readOnly: true },
    ],
    create: () => ({ sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, leads: 0, cost: 0 }),
  },
  {
    key: "templates", col: "templates", module: "leads", group: "Sales", title: "Message templates", icon: "chatbox-ellipses", color: C.green, prefix: "tp",
    item: (r) => ({ title: r.name, sub: r.body?.slice(0, 70), badge: badge(r.channel) }),
    filterBy: "channel",
    fields: [
      { k: "name", label: "Name", required: true },
      { k: "channel", label: "Channel", type: "choice", options: ["WhatsApp", "Email", "SMS"], def: "WhatsApp" },
      { k: "subject", label: "Subject (email)" },
      { k: "body", label: "Message", type: "multiline", hint: "Placeholders: {name} {company} {service} {owner}" },
    ],
  },

  // ── Finance ──
  {
    key: "invoices", col: "invoices", module: "invoices", group: "Finance", title: "Invoices", icon: "receipt", color: C.green, prefix: "I",
    item: (r) => ({ title: r.client?.company || r.client?.name, sub: `${r.number} · ${r.type === "Proforma" ? "Proforma" : "Tax"} · ${fmtDate(r.date)}`, right: inrShort(docTotal(r)), badge: badge(r.status) }),
    filterBy: "status",
    fields: [
      { k: "client", label: "Client", type: "client", required: true },
      { k: "type", label: "Invoice type", type: "choice", options: ["Tax", "Proforma"], def: "Tax" },
      { k: "items", label: "Items", type: "items" },
      { k: "discountPct", label: "Discount %", type: "number", def: 0 },
      { k: "gstPct", label: "GST %", type: "choice", options: [0, 5, 12, 18, 28], def: 18 },
      { k: "dueDate", label: "Due date", type: "date", def: () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) },
      { k: "status", label: "Status", type: "choice", options: ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"], def: "Sent" },
      { k: "notes", label: "Notes", type: "multiline" },
    ],
    totals: true, payments: true,
    create: (db) => ({ number: nextNumber(db.settings?.docs?.invoicePrefix || "INV-", db.invoices), date: today(), interState: false, payments: [] }),
    extra: (r) => [{ label: "Total", value: inr(invoiceTotal(r)) }, { label: "Paid", value: inr(invoicePaid(r)) }, { label: "Balance", value: inr(invoiceBalance(r)) }],
  },
  {
    key: "expenses", col: "expenses", module: "expenses", group: "Finance", title: "Expenses", icon: "wallet", color: C.amber, prefix: "X",
    item: (r) => ({ title: r.description, sub: `${fmtDate(r.date)} · ${r.category}${r.vendor ? ` · ${r.vendor}` : ""}`, right: inrShort(r.amount), badge: r.status !== "Paid" ? badge(r.status) : null }),
    filterBy: "category", sortKey: "date",
    fields: [
      { k: "amount", label: "Amount ₹", type: "money", required: true },
      { k: "description", label: "What was it for?", required: true },
      { k: "category", label: "Category", type: "choice", options: ["Rent", "Salary", "Electricity", "Internet", "Software & Tools", "Marketing", "Travel", "Office Supplies", "Maintenance", "Other"], def: "Other" },
      { k: "vendor", label: "Paid to" },
      { k: "date", label: "Date", type: "date", def: today },
      { k: "mode", label: "Paid by", type: "choice", options: ["UPI", "Bank Transfer", "Cash", "Cheque", "Card", "Auto Debit"], def: "UPI" },
      { k: "status", label: "Status", type: "choice", options: ["Paid", "Pending"], def: "Paid" },
    ],
  },
  {
    key: "paymentFollowups", col: "paymentFollowups", module: "payments", group: "Finance", title: "Payment tracker", icon: "cash", color: C.red, prefix: "pf",
    item: (r) => ({ title: r.client, sub: `${r.project || ""}${r.nextAction ? ` · ${r.nextAction}` : ""}`, right: inrShort((r.totalValue || 0) - (r.received || 0)), badge: badge(r.priority) }),
    filterBy: "status",
    fields: [
      { k: "client", label: "Client", required: true },
      { k: "project", label: "Project" },
      { k: "totalValue", label: "Total value ₹", type: "money" },
      { k: "received", label: "Received ₹", type: "money" },
      { k: "priority", label: "Priority", type: "choice", options: ["HOT", "WARM", "COLD"], def: "WARM" },
      { k: "status", label: "Status", type: "choice", options: ["Pending", "Partially Paid", "Paid", "Disputed"], def: "Pending" },
      { k: "nextAction", label: "Next action" },
      { k: "lastFollowUp", label: "Last follow-up", type: "date" },
      { k: "deadline", label: "Deadline", type: "date" },
      { k: "notes", label: "Notes", type: "multiline" },
    ],
  },
  {
    key: "recurring", col: "recurring", module: "monthly-billing", group: "Finance", title: "Recurring billing", icon: "repeat", color: C.indigo, prefix: "R",
    item: (r) => ({ title: r.client, sub: `${r.service} · ${r.cycle} · next ${fmtDate(r.nextDue)}`, right: inrShort(r.amount), badge: badge(r.status) }),
    filterBy: "status",
    fields: [
      { k: "client", label: "Client", required: true },
      { k: "service", label: "Service" },
      { k: "amount", label: "Amount ₹", type: "money" },
      { k: "cycle", label: "Billing cycle", type: "choice", options: ["Monthly", "Quarterly", "Half-yearly", "Yearly"], def: "Monthly" },
      { k: "nextDue", label: "Next due", type: "date" },
      { k: "startDate", label: "Started on", type: "date", def: today },
      { k: "status", label: "Status", type: "choice", options: ["Active", "Paused", "Cancelled"], def: "Active" },
    ],
  },
  {
    key: "monthlyServices", col: "monthlyServices", module: "monthly-billing", group: "Finance", title: "AMC & monthly", icon: "calendar-number", color: C.teal, prefix: "MS",
    item: (r) => ({ title: r.client, sub: `${r.name} · bills on day ${r.billDay}`, right: inrShort(r.amount), badge: badge(r.active === false ? "Inactive" : "Active") }),
    fields: [
      { k: "client", label: "Client", required: true },
      { k: "name", label: "Service" },
      { k: "amount", label: "Amount ₹ (before GST)", type: "money" },
      { k: "gstRate", label: "GST %", type: "choice", options: [0, 18], def: 18 },
      { k: "billDay", label: "Bill on day", type: "number", def: 1 },
      { k: "startDate", label: "Start date", type: "date", def: today },
      { k: "active", label: "Active", type: "bool", def: true },
      { k: "notes", label: "Notes", type: "multiline" },
    ],
    payments: true, create: () => ({ types: [], payments: [] }),
  },
  {
    key: "extras", col: "extras", module: "monthly-billing", group: "Finance", title: "Extra work", icon: "add-circle", color: C.violet, prefix: "EX",
    item: (r) => ({ title: r.title, sub: r.client, right: inrShort(r.amount), badge: badge(r.status) }),
    filterBy: "status",
    fields: [
      { k: "title", label: "Work", required: true },
      { k: "client", label: "Client" },
      { k: "amount", label: "Amount ₹", type: "money" },
      { k: "gstRate", label: "GST %", type: "choice", options: [0, 18], def: 18 },
      { k: "requestedOn", label: "Requested on", type: "date", def: today },
      { k: "status", label: "Status", type: "choice", options: ["Quoted", "Approved", "In Progress", "Done", "Paid"], def: "Quoted" },
      { k: "description", label: "Details", type: "multiline" },
    ],
    payments: true, create: () => ({ payments: [] }),
  },
  {
    key: "fundTxns", col: "fundTxns", module: "funds", group: "Finance", title: "Reserve funds", icon: "shield-checkmark", color: C.green, prefix: "ft",
    item: (r) => ({ title: r.fund, sub: `${fmtDate(r.date)}${r.note ? ` · ${r.note}` : ""}`, right: `${r.type === "Withdrawal" ? "−" : "+"}${inrShort(r.amount)}`, badge: badge(r.type) }),
    filterBy: "fund", sortKey: "date",
    fields: [
      { k: "fund", label: "Fund", type: "choice", options: ["Emergency Fund", "Tax Reserve", "Salary Reserve", "Growth Fund"], def: "Emergency Fund" },
      { k: "type", label: "Type", type: "choice", options: ["Deposit", "Withdrawal"], def: "Deposit" },
      { k: "amount", label: "Amount ₹", type: "money", required: true },
      { k: "date", label: "Date", type: "date", def: today },
      { k: "note", label: "Note" },
    ],
  },
  {
    key: "bankAccounts", col: "bankAccounts", module: "invoices", group: "Finance", title: "Bank accounts", icon: "card", color: C.blue, prefix: "ba",
    item: (r) => ({ title: r.label, sub: `${r.bank} · ••••${String(r.number || "").slice(-4)}` }),
    fields: [
      { k: "label", label: "Name", required: true }, { k: "bank", label: "Bank" }, { k: "number", label: "Account number" },
      { k: "ifsc", label: "IFSC" }, { k: "branch", label: "Branch" },
    ],
  },

  // ── Delivery ──
  {
    key: "documents", col: "documents", module: "projects", group: "Delivery", title: "Documents", icon: "folder-open", color: C.amber, prefix: "DC",
    item: (r, db) => ({ title: r.name, sub: [r.type, db.projects.find((p) => p.id === r.projectId)?.client, fmtDate(r.date)].filter(Boolean).join(" · ") }),
    filterBy: "type",
    fields: [
      { k: "name", label: "Name", required: true },
      { k: "type", label: "Type", type: "choice", options: ["Project Document", "Agreement", "Proposal", "Invoice", "Other"], def: "Project Document" },
      { k: "projectId", label: "Project", type: "ref", source: "projects", show: (p) => p.name },
      { k: "date", label: "Date", type: "date", def: today },
      { k: "notes", label: "Notes", type: "multiline" },
    ],
  },
  {
    key: "integrations", col: "integrations", module: "integrations", group: "Delivery", title: "Project credentials", icon: "key", color: C.slate, prefix: "IG",
    item: (r, db) => ({ title: r.service, sub: [r.category, db.projects.find((p) => p.id === r.projectId)?.client].filter(Boolean).join(" · "), badge: badge(r.status) }),
    filterBy: "category",
    fields: [
      { k: "service", label: "Service", required: true },
      { k: "projectId", label: "Project", type: "ref", source: "projects", show: (p) => p.name },
      { k: "category", label: "Category", type: "choice", options: ["Payment", "Hosting", "Domain", "Email", "Analytics", "Social", "Other"], def: "Other" },
      { k: "status", label: "Status", type: "choice", options: ["Live", "Test", "Pending", "Expired"], def: "Live" },
      { k: "url", label: "Login URL", type: "url" },
      { k: "login", label: "Username / email" },
      { k: "renewal", label: "Renewal date", type: "date" },
      { k: "notes", label: "Notes", type: "multiline" },
    ],
    secrets: true, create: () => ({ secrets: [], updatedAt: new Date().toISOString() }),
  },

  // ── HR & Admin ──
  {
    key: "employees", col: "employees", module: "team", group: "HR & Admin", title: "Employees", icon: "people", color: C.indigo, prefix: "e",
    item: (r) => ({ title: r.name, sub: `${r.designation || ""} · ${r.department || ""}`, right: inrShort(r.salary), badge: r.status !== "Active" ? badge(r.status) : null }),
    filterBy: "department",
    fields: [
      { k: "name", label: "Name", required: true },
      { k: "empId", label: "Employee ID" },
      { k: "phone", label: "Phone", type: "phone" },
      { k: "email", label: "Email", type: "email" },
      { k: "department", label: "Department", type: "choice", options: ["Sales", "Development", "Design", "SEO & Ads", "Accounts", "HR", "Management"], def: "Sales" },
      { k: "designation", label: "Designation" },
      { k: "branch", label: "Branch" },
      { k: "joinDate", label: "Joined on", type: "date", def: today },
      { k: "salary", label: "Monthly salary ₹", type: "money" },
      { k: "status", label: "Status", type: "choice", options: ["Active", "On Leave", "Left"], def: "Active" },
    ],
  },
  {
    key: "salaryRecords", col: "salaryRecords", module: "team", group: "HR & Admin", title: "Salaries", icon: "cash-outline", color: C.green, prefix: "sr",
    item: (r, db) => ({ title: db.employees.find((e) => e.id === r.empId)?.name || "Employee", sub: `${r.month} · paid ${fmtDate(r.paidOn) || "—"}`, right: inrShort(r.net), badge: badge(r.status) }),
    filterBy: "month", sortKey: "month",
    fields: [
      { k: "empId", label: "Employee", type: "ref", source: "employees", show: (e) => e.name, required: true },
      { k: "month", label: "Month (YYYY-MM)", def: () => today().slice(0, 7) },
      { k: "gross", label: "Gross ₹", type: "money" },
      { k: "deductions", label: "Deductions ₹", type: "money", def: 0 },
      { k: "net", label: "Net pay ₹", type: "money" },
      { k: "status", label: "Status", type: "choice", options: ["Paid", "Pending"], def: "Pending" },
      { k: "paidOn", label: "Paid on", type: "date" },
    ],
  },
  {
    key: "users", col: "users", module: "users", group: "HR & Admin", title: "Users & logins", icon: "person-add", color: C.violet, prefix: "u", adminOnly: true,
    item: (r) => ({ title: r.name, sub: `${r.email} · ${r.branch || ""}`, badge: r.active === false ? badge("Inactive") : { label: r.role, color: C.indigo } }),
    filterBy: "role",
    fields: [
      { k: "name", label: "Name", required: true },
      { k: "email", label: "Email (login)", type: "email", required: true },
      { k: "password", label: "Password (min 6)", type: "password", createOnly: true, required: true },
      { k: "role", label: "Role", type: "choice", options: ["Admin", "Sales Manager", "Sales Executive", "Accountant", "Project Manager", "HR", "Support Agent"], def: "Sales Executive" },
      { k: "branch", label: "Branch" },
      { k: "phone", label: "Phone", type: "phone" },
      { k: "active", label: "Can sign in", type: "bool", def: true },
    ],
  },
  {
    key: "credentials", col: "credentials", module: "vault", group: "HR & Admin", title: "Company passwords", icon: "lock-closed", color: C.red, prefix: "c",
    item: (r) => ({ title: r.title, sub: `${r.category || ""} · ${r.username || ""}` }),
    filterBy: "category",
    fields: [
      { k: "title", label: "Title", required: true },
      { k: "category", label: "Category", type: "choice", options: ["Hosting", "Domain", "Email", "Social Media", "Google", "Payment Gateway", "Server / SSH", "Other"], def: "Other" },
      { k: "url", label: "Website", type: "url" },
      { k: "username", label: "Username" },
      { k: "password", label: "Password", type: "password" },
      { k: "notes", label: "Notes", type: "multiline" },
    ],
    create: () => ({ updatedAt: new Date().toISOString(), tags: [] }),
  },

  // ── Owner & planning ──
  {
    key: "commitments", col: "commitments", module: "owner", group: "Owner", title: "Payment promises", icon: "hand-left", color: C.amber, prefix: "cm",
    item: (r) => ({ title: r.label, sub: `Promised ${fmtDate(r.expectedDate)}`, right: inrShort(r.amount), badge: r.collected ? badge("Collected") : r.expectedDate < today() ? badge("Overdue") : badge("Pending") }),
    sortKey: "expectedDate", asc: true,
    fields: [
      { k: "label", label: "What / who", required: true },
      { k: "amount", label: "Amount ₹", type: "money", required: true },
      { k: "expectedDate", label: "Promised date", type: "date", def: today },
      { k: "collected", label: "Collected", type: "bool", def: false, quick: true },
    ],
  },
  {
    key: "ownerNotes", col: "ownerNotes", module: "owner", group: "Owner", title: "Owner notes", icon: "bookmark", color: C.indigo, prefix: "on",
    item: (r) => ({ title: r.text, sub: fmtDate(r.at), badge: r.pinned ? { label: "Pinned", color: C.amber } : null }),
    fields: [{ k: "text", label: "Note", type: "multiline", required: true }, { k: "pinned", label: "Pin to top", type: "bool", def: false, quick: true }],
    create: () => ({ at: new Date().toISOString() }),
  },
  {
    key: "planTasks", col: "planTasks", module: "todays-plan", group: "Owner", title: "Today's plan", icon: "checkbox", color: C.green, prefix: "PT",
    item: (r) => ({ title: r.title, sub: `${r.type || ""} · ${fmtDate(r.date)}`, badge: r.done ? badge("Done") : badge(r.priority) }),
    sortKey: "date", done: "done",
    fields: [
      { k: "title", label: "Task", required: true },
      { k: "date", label: "Date", type: "date", def: today },
      { k: "type", label: "Type", type: "choice", options: ["New Call", "Follow-up", "Meeting", "Payment", "Work"], def: "Follow-up" },
      { k: "priority", label: "Priority", type: "choice", options: ["High", "Medium", "Low"], def: "Medium" },
      { k: "phone", label: "Phone", type: "phone" },
      { k: "done", label: "Done", type: "bool", def: false, quick: true },
      { k: "notes", label: "Notes", type: "multiline" },
    ],
    create: () => ({ createdAt: new Date().toISOString() }),
  },

  // ── Team work ──
  {
    key: "workLogs", col: "workLogs", module: "employee-portal", group: "Team work", title: "Work logs", icon: "time", color: C.blue, prefix: "w",
    item: (r, db) => ({ title: r.summary, sub: `${db.employees.find((e) => e.id === r.empId)?.name || ""} · ${fmtDate(r.date)}`, right: r.hours ? `${r.hours}h` : "" }),
    sortKey: "date",
    fields: [
      { k: "summary", label: "What was done", required: true },
      { k: "empId", label: "Employee", type: "ref", source: "employees", show: (e) => e.name },
      { k: "projectId", label: "Project", type: "ref", source: "projects", show: (p) => p.name },
      { k: "date", label: "Date", type: "date", def: today },
      { k: "hours", label: "Hours", type: "number" },
      { k: "link", label: "Link", type: "url" },
    ],
  },
  {
    key: "bugs", col: "bugs", module: "employee-portal", group: "Team work", title: "Bugs", icon: "bug", color: C.red, prefix: "b",
    item: (r, db) => ({ title: r.title, sub: db.projects.find((p) => p.id === r.projectId)?.client || "", badge: badge(r.status) }),
    filterBy: "status",
    fields: [
      { k: "title", label: "Problem", required: true },
      { k: "projectId", label: "Project", type: "ref", source: "projects", show: (p) => p.name },
      { k: "severity", label: "Severity", type: "choice", options: ["Critical", "High", "Medium", "Low"], def: "Medium" },
      { k: "status", label: "Status", type: "choice", options: ["Open", "In Progress", "Fixed to verify", "Closed"], def: "Open" },
      { k: "assignedTo", label: "Assigned to", type: "ref", source: "employees", show: (e) => e.name },
    ],
    create: () => ({ at: new Date().toISOString() }),
  },

  // ── Platform ──
  {
    key: "automations", col: "automations", module: "automations", group: "Platform", title: "Automations", icon: "flash", color: C.amber, prefix: "AU",
    item: (r) => ({ title: r.name, sub: `When: ${r.trigger}`, right: r.runs ? `${r.runs} runs` : "", badge: badge(r.active ? "Active" : "Paused") }),
    fields: [
      { k: "name", label: "Name", required: true },
      { k: "trigger", label: "When this happens" },
      { k: "category", label: "Category", type: "choice", options: ["Sales", "Finance", "Delivery", "Support"], def: "Sales" },
      { k: "active", label: "Active", type: "bool", def: true, quick: true },
    ],
    create: () => ({ actions: [], runs: 0 }),
  },
  {
    key: "auditLog", col: "auditLog", module: "audit", group: "Platform", title: "Audit log", icon: "list", color: C.slate, readOnly: true,
    item: (r, db) => ({ title: `${r.entity}: ${r.action}`, sub: `${r.detail || ""} · ${db.users.find((u) => u.id === r.by)?.name || ""}`, right: fmtDate(r.at) }),
    sortKey: "at",
    fields: [{ k: "action", label: "Action" }, { k: "entity", label: "Item" }, { k: "detail", label: "Detail" }, { k: "at", label: "When" }, { k: "ip", label: "IP" }],
  },
];

export const modByKey = Object.fromEntries(MODULES.map((m) => [m.key, m]));

// Built screens (not generic) shown in the same "All modules" menu
export const SPECIAL = [
  { key: "Leads", title: "Leads & pipeline", icon: "people", color: C.indigo, module: "leads", group: "Sales", tab: true },
  { key: "Schedule", title: "Calendar & tasks", icon: "calendar", color: C.blue, module: "calendar", group: "Overview", tab: true },
  { key: "Money", title: "Money overview", icon: "stats-chart", color: C.green, module: "invoices", group: "Finance", tab: true },
  { key: "Projects", title: "Projects", icon: "rocket", color: C.violet, module: "projects", group: "Delivery" },
  { key: "Tickets", title: "Support tickets", icon: "chatbubbles", color: C.amber, module: "tickets", group: "Delivery" },
  { key: "Reports", title: "Reports & P&L", icon: "bar-chart", color: C.teal, module: "reports", group: "Finance" },
  { key: "Attendance", title: "Attendance", icon: "finger-print", color: C.pink, module: "team", group: "HR & Admin" },
  { key: "CompanySettings", title: "Company settings", icon: "settings", color: C.slate, module: "settings", group: "HR & Admin" },
];

export const GROUP_ORDER = ["Overview", "Owner", "Sales", "Finance", "Delivery", "Team work", "HR & Admin", "Platform"];
