// Formatting + business helpers shared by all screens.
export const uid = (p = "M") => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const pad = (n) => String(n).padStart(2, "0");
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDate();
export const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return isoDate(d); };
export const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const fmtDate = (iso) => { if (!iso) return ""; const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso); return `${d.getDate()} ${MON[d.getMonth()]}`; };
export const fmtDay = (iso) => DAY[new Date(`${iso}T00:00:00`).getDay()];
export const fmtTime = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };
export const relDay = (iso) => {
  const d = daysBetween(today(), iso);
  if (d === 0) return "Today"; if (d === 1) return "Tomorrow"; if (d === -1) return "Yesterday";
  if (d < 0) return `${-d} days ago`; if (d < 7) return fmtDay(iso);
  return fmtDate(iso);
};
export const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`; if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso);
};
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

// ₹ in Indian style: ₹4.8L, ₹1.2Cr, ₹45K
export const inrShort = (n) => {
  n = Number(n) || 0; const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")}L`;
  if (a >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${Math.round(n)}`;
};
export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const AV = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6", "#F97316"];
export const avatarColor = (s = "") => AV[[...s].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV.length];

// Invoices
export const invoiceTotal = (d) => {
  const sub = (d.items || []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const taxable = sub - (sub * (Number(d.discountPct) || 0)) / 100;
  return Math.round(taxable + (taxable * (Number(d.gstPct) || 0)) / 100);
};
export const invoicePaid = (d) => (d.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
export const invoiceBalance = (d) => Math.max(0, invoiceTotal(d) - invoicePaid(d));
export const isTaxInvoice = (d) => d.type !== "Proforma" && d.status !== "Cancelled" && d.status !== "Draft";

export const LEAD_STAGES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];
export const OPEN_STAGES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation"];
export const PRIORITIES = ["Hot", "Warm", "Cold"];
export const LEAD_SOURCES = ["Website", "Google Ads", "Meta Ads", "Instagram", "WhatsApp", "Referral", "Walk-In", "Phone Call", "JustDial", "IndiaMART"];
export const TASK_TYPES = ["Call", "Meeting", "Demo", "Follow-up", "Payment follow-up", "Task"];
export const PAYMENT_MODES = ["UPI", "Bank Transfer", "Cash", "Cheque", "Card"];
export const EXPENSE_CATEGORIES = ["Rent", "Salary", "Electricity", "Internet", "Software & Tools", "Marketing", "Travel", "Office Supplies", "Maintenance", "Other"];

export const cleanPhone = (p = "") => { const d = String(p).replace(/\D/g, ""); return d.length === 10 ? `91${d}` : d; };
