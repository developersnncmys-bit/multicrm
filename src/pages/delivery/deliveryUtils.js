// Shared helpers for the Delivery area: projects money, monthly services, extras, integrations, documents.
import { CreditCard, MessageSquareText, MessageCircle, Mail, MapPin, LogIn, Server, Globe, Database, BarChart3, Truck, Smartphone, Apple, Puzzle, FileText, Receipt, ClipboardList, Inbox, FolderOpen } from "lucide-react";
import { todayISO, toISO } from "../../utils/format";

export const GST_RATES = [5, 12, 18, 28];
export const PAY_MODES = ["UPI", "NEFT", "RTGS", "IMPS", "Cash", "Cheque", "Card", "Other"];
export const SERVICE_TYPES = ["Google Ads", "Meta Ads", "SEO", "Social Media", "AMC / Maintenance", "Hosting", "Content / Blogs", "Other"];
export const EXTRA_STATUSES = ["Quoted", "Approved", "In Progress", "Done", "Cancelled"];
export const EXTRA_STYLE = {
  Quoted: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  Approved: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  "In Progress": "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Done: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-300",
};
export const MONTH_STATUS_STYLE = {
  paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  partial: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  due: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  skipped: "bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-300",
  upcoming: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
export const MONTH_STATUS_LABEL = { paid: "Paid", partial: "Partly paid", due: "Due", overdue: "Overdue", skipped: "Skipped", upcoming: "Upcoming" };

export const withGst = (amount, rate) => Math.round((Number(amount) || 0) * (1 + (Number(rate) || 0) / 100));
export const sumPay = (payments = []) => payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
export const monthName = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
export const ymOf = (iso) => (iso || "").slice(0, 7);
const nextYm = (ym) => { const d = new Date(`${ym}-01T00:00:00`); d.setMonth(d.getMonth() + 1); return toISO(d).slice(0, 7); };

/* ── Project money ─────────────────────────────────── */
export function projectMoney(p, db) {
  const base = Number(p.value) || 0;
  const rate = Number(p.gstRate) || 0;
  const total = withGst(base, rate);
  const extras = (db?.extras || []).filter((x) => x.projectId === p.id && x.status !== "Cancelled");
  const extrasTotal = extras.reduce((s, x) => s + withGst(x.amount, x.gstRate), 0);
  const extrasPaid = extras.reduce((s, x) => s + sumPay(x.payments), 0);
  const received = Number(p.advanceReceived) || 0;
  return { base, rate, gst: total - base, total, received, remaining: Math.max(0, total - received), extrasTotal, extrasPaid, extras, grand: total + extrasTotal, grandReceived: received + extrasPaid };
}

/* ── Monthly service schedule ──────────────────────── */
// One row per month from start → current month (or end). Adds next month as "upcoming" for active services.
export function serviceSchedule(s, today = todayISO()) {
  if (!s?.startDate) return [];
  const amount = withGst(s.amount, s.gstRate);
  const curYm = ymOf(today);
  const endYm = s.endDate ? ymOf(s.endDate) : null;
  const last = endYm && endYm < curYm ? endYm : curYm;
  const rows = [];
  let ym = ymOf(s.startDate);
  let guard = 0;
  while (ym <= last && guard++ < 120) {
    rows.push(monthRow(s, ym, amount, today));
    ym = nextYm(ym);
  }
  if (s.active !== false && (!endYm || endYm > curYm)) rows.push({ ...monthRow(s, nextYm(curYm), amount, today), status: "upcoming" });
  return rows;
}
function monthRow(s, ym, amount, today) {
  const day = String(Math.min(28, Math.max(1, Number(s.billDay) || 1))).padStart(2, "0");
  const due = `${ym}-${day}`;
  const pays = (s.payments || []).filter((p) => p.month === ym);
  const paid = sumPay(pays.filter((p) => !p.skipped));
  const skipped = pays.some((p) => p.skipped);
  let status = "due";
  if (skipped) status = "skipped";
  else if (paid >= amount && amount > 0) status = "paid";
  else if (paid > 0) status = due < today ? "partial" : "partial";
  else if (due < today) status = "overdue";
  return { ym, due, amount, paid, balance: skipped ? 0 : Math.max(0, amount - paid), status, payments: pays };
}
export function serviceSummary(s, today = todayISO()) {
  const rows = serviceSchedule(s, today).filter((r) => r.status !== "upcoming");
  const billed = rows.filter((r) => r.status !== "skipped").reduce((a, r) => a + r.amount, 0);
  const collected = rows.reduce((a, r) => a + r.paid, 0);
  const overdueRows = rows.filter((r) => (r.status === "overdue" || r.status === "partial") && r.due < today);
  const cur = rows.find((r) => r.ym === ymOf(today));
  const oldestDue = rows.find((r) => ["overdue", "partial", "due"].includes(r.status) && r.balance > 0);
  return { rows, billed, collected, overdue: overdueRows.reduce((a, r) => a + r.balance, 0), overdueMonths: overdueRows.length, cur, oldestDue, monthsPaid: rows.filter((r) => r.status === "paid").length };
}

/* ── Integrations ──────────────────────────────────── */
export const INTEGRATION_CATEGORIES = {
  Payment: { icon: CreditCard, tone: "emerald", services: ["Razorpay", "PhonePe", "Paytm", "Stripe", "CCAvenue", "Cashfree"], secrets: ["Key ID", "Key Secret", "Webhook Secret"] },
  "SMS / OTP": { icon: MessageSquareText, tone: "sky", services: ["MSG91", "Twilio", "Fast2SMS", "TextLocal", "Firebase Auth"], secrets: ["Auth Key", "Sender ID", "Template ID"] },
  WhatsApp: { icon: MessageCircle, tone: "emerald", services: ["WhatsApp Cloud API", "Interakt", "WATI", "Gupshup", "AiSensy"], secrets: ["Access Token", "Phone Number ID", "Business Account ID"] },
  Email: { icon: Mail, tone: "brand", services: ["Google Workspace", "Zoho Mail", "SendGrid", "Amazon SES", "Mailgun", "SMTP"], secrets: ["SMTP Host", "SMTP Password", "API Key"] },
  Maps: { icon: MapPin, tone: "rose", services: ["Google Maps", "Mapbox", "OpenStreetMap"], secrets: ["API Key"] },
  "Login / Auth": { icon: LogIn, tone: "violet", services: ["Google Sign-In", "Facebook Login", "Apple Sign-In", "Firebase Auth", "Auth0"], secrets: ["Client ID", "Client Secret"] },
  "Hosting / Server": { icon: Server, tone: "slate", services: ["Hostinger", "AWS EC2", "DigitalOcean", "GoDaddy cPanel", "Vercel", "Netlify"], secrets: ["Panel Password", "SSH Key", "Root Password"] },
  Domain: { icon: Globe, tone: "sky", services: ["GoDaddy", "Namecheap", "BigRock", "Hostinger Domains", "Cloudflare"], secrets: ["Account Password", "EPP Code"] },
  Database: { icon: Database, tone: "amber", services: ["MongoDB Atlas", "MySQL", "PostgreSQL", "Firebase Firestore", "Supabase"], secrets: ["Connection String", "DB Password"] },
  "Analytics / Ads": { icon: BarChart3, tone: "amber", services: ["Google Analytics 4", "Google Tag Manager", "Search Console", "Meta Pixel", "Google Ads"], secrets: ["Measurement ID", "Pixel ID", "Account Password"] },
  Shipping: { icon: Truck, tone: "brand", services: ["Shiprocket", "Delhivery", "Blue Dart", "Dunzo"], secrets: ["API Email", "API Password", "Token"] },
  "Play Store": { icon: Smartphone, tone: "emerald", services: ["Google Play Console"], secrets: ["Account Password", "Keystore Password", "Key Alias"] },
  "App Store": { icon: Apple, tone: "slate", services: ["App Store Connect", "Apple Developer"], secrets: ["Apple ID Password", "App-specific Password", ".p8 Key"] },
  Other: { icon: Puzzle, tone: "slate", services: ["Other"], secrets: ["Password", "API Key"] },
};
export const INTEGRATION_STATUSES = ["Pending", "In Progress", "Live", "Issue", "Inactive"];
export const INTEGRATION_STATUS_STYLE = {
  Pending: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  "In Progress": "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Live: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Issue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Inactive: "bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-300",
};

/* ── Documents ─────────────────────────────────────── */
export const DOC_TYPES = ["Project Document", "Invoice", "Quotation", "MoM", "Client Input"];
export const DOC_TYPE_META = {
  "Project Document": { icon: FolderOpen, tone: "brand" },
  Invoice: { icon: Receipt, tone: "emerald" },
  Quotation: { icon: FileText, tone: "amber" },
  MoM: { icon: ClipboardList, tone: "violet" },
  "Client Input": { icon: Inbox, tone: "sky" },
};
export const fmtSize = (b) => (!b ? "—" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Reads a picked file; keeps a data URL only for small files so localStorage stays light
export function readFile(file, maxInline = 300 * 1024) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const meta = { fileName: file.name, size: file.size };
    if (file.size > maxInline) return resolve(meta);
    const r = new FileReader();
    r.onload = () => resolve({ ...meta, dataUrl: r.result });
    r.onerror = () => resolve(meta);
    r.readAsDataURL(file);
  });
}
export function openDoc(doc, toast) {
  if (doc.dataUrl) {
    const w = window.open();
    if (w) w.document.write(`<title>${doc.name}</title><iframe src="${doc.dataUrl}" style="border:0;width:100%;height:100%;position:fixed;inset:0"></iframe>`);
  } else toast?.("Preview available after the backend is connected (file stored as metadata only)", "info");
}
export function downloadDoc(doc, toast) {
  if (!doc.dataUrl) return toast?.("Download available after the backend is connected", "info");
  const a = document.createElement("a");
  a.href = doc.dataUrl; a.download = doc.fileName || doc.name; a.click();
}

/* ── Email templates (project drawer) ──────────────── */
export const EMAIL_TYPES = ["Project Initiation", "Project Completion", "Meeting MOM", "Follow-up 1/3", "Follow-up 2/3", "Follow-up 3/3", "Payment Reminder (Stage 1)", "Payment Reminder (Stage 2)", "Payment Reminder (Stage 3)", "Payment Receipt", "Document Request", "Custom Email"];
export function emailTemplate(type, p, m, company) {
  const name = p.contact || p.client;
  const sign = `\n\nWarm regards,\n${company}`;
  const T = {
    "Project Initiation": [`Project kick-off — ${p.name}`, `Dear ${name},\n\nThank you for choosing us for your ${p.service}. We're excited to get started!\n\nNext steps:\n1. Kick-off call to confirm requirements\n2. Sharing of content & brand assets\n3. Design draft within the agreed timeline\n\nYour project manager will be in touch shortly.`],
    "Project Completion": [`Your project is complete — ${p.name}`, `Dear ${name},\n\nWe're happy to share that your ${p.service} is now complete and live.\n\nPlease review and share your feedback. We'd also love a quick Google review if you're happy with our work!`],
    "Meeting MOM": [`Minutes of meeting — ${p.client}`, `Dear ${name},\n\nThank you for your time today. Summary of what we discussed:\n\n• \n• \n• \n\nAction items:\n• Client: \n• Our team: `],
    "Follow-up 1/3": [`Following up — ${p.name}`, `Dear ${name},\n\nJust checking in on the pending inputs for your project so we can keep things on schedule.`],
    "Follow-up 2/3": [`Gentle reminder — ${p.name}`, `Dear ${name},\n\nA gentle reminder about the pending items for your project. Please let us know if you need any help from our side.`],
    "Follow-up 3/3": [`Final follow-up — ${p.name}`, `Dear ${name},\n\nWe haven't heard back yet. To avoid delays in delivery, please share the pending inputs at the earliest.`],
    "Payment Reminder (Stage 1)": [`Payment reminder — ${p.client}`, `Dear ${name},\n\nThis is a friendly reminder that a balance of ₹${m.remaining.toLocaleString("en-IN")} is pending for ${p.name}.\n\nKindly arrange the payment at your convenience.`],
    "Payment Reminder (Stage 2)": [`Second reminder: pending payment — ${p.client}`, `Dear ${name},\n\nThe balance of ₹${m.remaining.toLocaleString("en-IN")} for ${p.name} is still pending. Please process it this week so we can continue without interruption.`],
    "Payment Reminder (Stage 3)": [`Final notice: payment overdue — ${p.client}`, `Dear ${name},\n\nDespite earlier reminders, ₹${m.remaining.toLocaleString("en-IN")} remains unpaid. Please clear the dues within 3 working days to avoid a pause in services.`],
    "Payment Receipt": [`Payment received — thank you!`, `Dear ${name},\n\nWe've received your payment towards ${p.name}. Total received so far: ₹${m.received.toLocaleString("en-IN")}. Balance: ₹${m.remaining.toLocaleString("en-IN")}.\n\nThank you for the prompt payment!`],
    "Document Request": [`Documents needed — ${p.name}`, `Dear ${name},\n\nTo proceed, please share the following:\n• Logo (high resolution)\n• Website content / product details\n• Photos\n• Login access (if any)`],
    "Custom Email": [`${p.client} — update`, `Dear ${name},\n\n`],
  };
  const [subject, body] = T[type] || T["Custom Email"];
  return { subject, body: body + sign };
}
