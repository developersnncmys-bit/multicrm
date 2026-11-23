import { calcTotals, todayISO, inr, fmtDate } from "../../utils/format";
import { invoicePaid } from "../../store/store";

/* ─── Totals ─────────────────────────────────────────── */
export const docTotal = (d) => calcTotals(d.items || [], d.discountPct, d.gstPct, d.interState).total;

// Next running number for a prefix, e.g. "QT-2026-" → "QT-2026-0119" (revision suffixes like -R2 are ignored)
export function nextNumber(prefix, docs) {
  let max = 0;
  (docs || []).forEach((d) => {
    if (d.number?.startsWith(prefix)) {
      const n = parseInt(d.number.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  });
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/* ─── Statuses ───────────────────────────────────────── */
export const QUOTE_FLOW = ["Draft", "Sent", "Negotiation", "Approved", "Final", "Converted", "Rejected", "Expired"];
export const QUOTE_LABEL = { Negotiation: "Negotiating", Converted: "Converted to PI" };
export const INVOICE_FLOW = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Converted", "Cancelled"];
export const STATUS_STYLE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  Sent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Negotiation: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Final: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  Converted: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Rejected: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Expired: "bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-300",
  "Partially Paid": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-300",
  Unpaid: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Partial: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

// Effective invoice status (derived from payments + due date)
export function invoiceStatus(inv) {
  if (inv.status === "Cancelled") return "Cancelled";
  if (inv.status === "Converted") return "Converted";
  const total = docTotal(inv);
  const paid = invoicePaid(inv);
  if (total > 0 && paid >= total) return "Paid";
  if (paid > 0) return "Partially Paid";
  if (inv.status === "Draft") return "Draft";
  if (inv.dueDate && inv.dueDate < todayISO()) return "Overdue";
  return "Sent";
}
export const invoiceBalance = (inv) => Math.max(0, docTotal(inv) - invoicePaid(inv));
export const isRevenueInvoice = (inv) => inv.type !== "Proforma" && inv.status !== "Cancelled";

export const clientFromLead = (l) => (l ? {
  name: l.name || "", company: l.company || "", email: l.email || "", phone: l.phone || "",
  address: "", city: l.city || "", state: "", pincode: "", gstin: l.gstin || "", pan: "",
} : { name: "", company: "", email: "", phone: "", address: "", city: "", state: "", pincode: "", gstin: "", pan: "" });

/* ─── WhatsApp ───────────────────────────────────────── */
const cleanPhone = (p = "") => {
  const d = String(p).replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};
export const whatsappLink = (phone, text) => `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(text)}`;
export function reminderText(inv, companyName) {
  const bal = invoiceBalance(inv);
  return `Hi ${inv.client.name || "there"},\n\nThis is a friendly reminder that invoice ${inv.number} for ${inr(docTotal(inv))} ` +
    `(balance ${inr(bal)}) was due on ${fmtDate(inv.dueDate)}.\n\nPlease let us know once the payment is done. Thank you!\n— ${companyName}`;
}

/* ─── Service catalog with HSN/SAC (16) ──────────────── */
export const SERVICE_CATALOG = [
  { name: "Website Development", hsn: "998314", rate: 45000 },
  { name: "E-commerce Website", hsn: "998314", rate: 85000 },
  { name: "Mobile App Development", hsn: "998314", rate: 150000 },
  { name: "CRM / Custom Software", hsn: "998314", rate: 175000 },
  { name: "UI/UX Design", hsn: "998391", rate: 35000 },
  { name: "Logo & Branding", hsn: "998383", rate: 20000 },
  { name: "SEO (monthly)", hsn: "998361", rate: 15000 },
  { name: "Google Ads Management", hsn: "998361", rate: 12000 },
  { name: "Meta Ads Management", hsn: "998361", rate: 12000 },
  { name: "Social Media Management", hsn: "998361", rate: 18000 },
  { name: "Content Writing", hsn: "998395", rate: 8000 },
  { name: "Domain Registration", hsn: "998315", rate: 1200 },
  { name: "Web Hosting (1 year)", hsn: "998315", rate: 6000 },
  { name: "Annual Maintenance (AMC)", hsn: "998316", rate: 24000 },
  { name: "Photography / Video", hsn: "999612", rate: 25000 },
  { name: "Custom item", hsn: "998314", rate: 0 },
];

/* ─── GSTIN helpers (mock "Verify & Fill") ───────────── */
export const STATE_CODES = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", 10: "Bihar", 19: "West Bengal", 20: "Jharkhand", 21: "Odisha", 22: "Chhattisgarh", 23: "Madhya Pradesh", 24: "Gujarat",
  27: "Maharashtra", 29: "Karnataka", 30: "Goa", 32: "Kerala", 33: "Tamil Nadu", 34: "Puducherry", 36: "Telangana", 37: "Andhra Pradesh",
};
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export function verifyGstin(g) {
  const v = String(g || "").trim().toUpperCase();
  if (!GSTIN_RE.test(v)) return { ok: false, error: "Invalid GSTIN format (15 characters, e.g. 29ABCDE1234F1Z5)" };
  const code = v.slice(0, 2);
  const state = STATE_CODES[code] || STATE_CODES[String(Number(code))];
  if (!state) return { ok: false, error: `Unknown state code ${code}` };
  return { ok: true, gstin: v, state, pan: v.slice(2, 12) };
}

/* ─── Offices (per branch) ───────────────────────────── */
export const officeFor = (settings, branch) => {
  const o = settings?.offices?.[branch];
  if (o) return o;
  const c = settings?.company || {};
  return { name: c.name, address: c.address, city: "", state: c.state, pincode: "", gstin: c.gstin, phone: c.phone, email: c.email };
};

/* ─── Deterministic QR-style SVG (visual placeholder for UPI) ─ */
export function qrMatrix(text, n = 25) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  const cells = [];
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  const finder = (r, c) => {
    for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      const y = r - fr; const x = c - fc;
      if (y >= 0 && y < 7 && x >= 0 && x < 7) return y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4) ? 1 : 0;
      if (y >= -1 && y <= 7 && x >= -1 && x <= 7) return 0;
    }
    return null;
  };
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const f = finder(r, c); cells.push(f === null ? (rand() > 0.52 ? 1 : 0) : f); }
  return cells;
}

/* ─── Proposal content per service category ─────────── */
const T_BASE = "Prices are exclusive of GST (18%).\nThis quotation is valid for 15 days from the date of issue.\nAny work outside the listed scope will be quoted separately.";
export const QUOTE_CATEGORIES = {
  "Website Development": {
    tagline: "A fast, modern website that turns visitors into enquiries", tech: "React · Next.js · Tailwind · Node",
    summary: "We will design and build a responsive, SEO-ready business website that showcases your services, builds trust and generates leads — with an easy admin panel so your team can update content without a developer.",
    stats: [["5–8", "pages designed"], ["90+", "Lighthouse score"], ["30", "days delivery"]],
    scope: ["Discovery call & sitemap", "Custom UI design (desktop + mobile)", "Up to 8 pages development", "Contact / enquiry forms with email alerts", "On-page SEO setup & Google Analytics", "Speed optimisation & SSL", "Admin panel for content updates", "Training & handover"],
    included: ["Responsive design", "Basic on-page SEO", "WhatsApp chat button", "1 month free support", "Google Maps integration"],
    notIncluded: [["Content writing", "Available separately"], ["Paid stock images", "Available separately"], ["Domain & hosting", "Available separately"], ["Payment gateway", "Available separately"]],
    timeline: [["Discovery & sitemap", 3, "Requirement call, sitemap, references", "Logo, brand colours, content"], ["UI design", 7, "Home + inner page designs", "Design feedback (2 rounds)"], ["Development", 14, "Pages, forms, admin panel", "Final content & images"], ["Testing & launch", 6, "QA, speed, SEO, go-live", "Domain access & approval"]],
    terms: "50% advance to start, 50% before go-live.\n2 rounds of design revisions included.\n" + T_BASE,
  },
  "Mobile Application": {
    tagline: "Your business in your customers' pockets", tech: "Flutter · React Native · Firebase · Node",
    summary: "A cross-platform Android & iOS app with a clean, intuitive interface, secure login, push notifications and an admin dashboard to manage users and content.",
    stats: [["2", "platforms"], ["1", "codebase"], ["60", "days delivery"]],
    scope: ["Requirement workshop & user flows", "UI/UX design for all screens", "Android + iOS app development", "Backend APIs & admin dashboard", "Push notifications", "Play Store & App Store submission"],
    included: ["OTP login", "Admin panel", "Analytics", "3 months bug-fix support"],
    notIncluded: [["Developer account fees", "Client to purchase"], ["Third-party paid APIs", "Available separately"], ["Ongoing feature additions", "Available separately"]],
    timeline: [["Workshop & flows", 5, "User journeys, wireframes", "Feature priority list"], ["UI/UX design", 12, "All app screens", "Design approval"], ["Development", 30, "App + backend + admin", "Test data & feedback"], ["Store launch", 8, "Testing, submission, go-live", "Store accounts"]],
    terms: "40% advance, 30% after design approval, 30% before store submission.\n" + T_BASE,
  },
  "E-Commerce Website": {
    tagline: "Sell online 24×7 with a store built to convert", tech: "Shopify / WooCommerce / Custom React",
    summary: "A complete online store with product catalogue, cart, secure payments, order management and shipping integration — optimised for mobile shoppers.",
    stats: [["500+", "products supported"], ["UPI", "& cards accepted"], ["45", "days delivery"]],
    scope: ["Store design & branding", "Product catalogue setup (up to 100 SKUs)", "Cart, checkout & coupons", "Payment gateway integration", "Shipping & order tracking", "Customer accounts & invoices", "Admin order management"],
    included: ["Razorpay / PhonePe integration", "GST invoices", "Abandoned cart emails", "1 month support"],
    notIncluded: [["Product photography", "Available separately"], ["Bulk product upload > 100", "Available separately"], ["Marketplace integration", "Available separately"]],
    timeline: [["Planning", 4, "Catalogue structure, flows", "Product list & images"], ["Design", 8, "Store UI", "Feedback"], ["Build", 22, "Store, payments, shipping", "Gateway KYC"], ["Launch", 6, "Testing & go-live", "Approval"]],
    terms: "50% advance, 50% before go-live.\nPayment gateway charges are billed by the provider.\n" + T_BASE,
  },
  "SEO & Digital Marketing": {
    tagline: "Rank higher, get found, grow every month", tech: "GSC · GA4 · Ahrefs · Google Ads",
    summary: "A monthly SEO and performance-marketing programme focused on your top keywords, local visibility (Google Business Profile) and measurable lead growth, with transparent monthly reports.",
    stats: [["20", "target keywords"], ["Monthly", "reporting"], ["90", "days to traction"]],
    scope: ["Website SEO audit", "Keyword research & mapping", "On-page optimisation", "Monthly backlinks & blogs", "Google Business Profile posts", "Ads campaign setup & optimisation", "Monthly performance report"],
    included: ["20 backlinks / month", "4 blogs / month", "8 GMB posts / month", "Rank tracking"],
    notIncluded: [["Ad spend", "Paid to Google/Meta directly"], ["Website redesign", "Available separately"], ["Video content", "Available separately"]],
    timeline: [["Audit & research", 7, "Audit, keywords, competitor study", "Website access"], ["On-page fixes", 14, "Meta, speed, schema", "Approval on changes"], ["Monthly execution", 30, "Links, blogs, GMB, ads", "Monthly review call"]],
    terms: "Billed monthly in advance; minimum 6-month engagement.\nRankings depend on competition and search engine algorithms.\n" + T_BASE,
  },
  "Logo & Branding": {
    tagline: "A brand identity people remember", tech: "Illustrator · Figma",
    summary: "A distinctive logo and visual identity — colours, typography and stationery — delivered with a brand guide so every touchpoint looks consistent.",
    stats: [["3", "logo concepts"], ["2", "revision rounds"], ["10", "days delivery"]],
    scope: ["Brand questionnaire", "3 logo concepts", "Colour palette & typography", "Visiting card & letterhead", "Brand guidelines PDF", "All source files"],
    included: ["Vector source files", "Social media profile kit", "Favicon"],
    notIncluded: [["Trademark registration", "Available separately"], ["Printing", "Available separately"]],
    timeline: [["Discovery", 2, "Questionnaire & moodboard", "Answers & references"], ["Concepts", 4, "3 logo directions", "Pick one direction"], ["Refinement & kit", 4, "Final logo, stationery, guide", "Final approval"]],
    terms: "100% advance for projects under ₹25,000; otherwise 50/50.\n" + T_BASE,
  },
  "UI/UX Design": {
    tagline: "Interfaces that feel effortless", tech: "Figma · FigJam · Prototyping",
    summary: "Research-led UX and pixel-perfect UI for your web or mobile product, delivered as an interactive Figma prototype and developer-ready design system.",
    stats: [["30+", "screens"], ["1", "design system"], ["21", "days delivery"]],
    scope: ["Stakeholder interviews", "User flows & wireframes", "High-fidelity UI", "Clickable prototype", "Design system & components", "Developer handoff"],
    included: ["Figma source", "2 revision rounds", "Handoff call"],
    notIncluded: [["Development", "Available separately"], ["Usability testing with users", "Available separately"]],
    timeline: [["Research", 4, "Interviews, flows", "Access to stakeholders"], ["Wireframes", 6, "Low-fi layouts", "Feedback"], ["UI & prototype", 11, "Final UI, system", "Approval"]],
    terms: "50% advance, 50% on final delivery.\n" + T_BASE,
  },
  "Cloud & Hosting": {
    tagline: "Fast, secure and always online", tech: "AWS · DigitalOcean · cPanel · Cloudflare",
    summary: "Managed hosting with SSL, daily backups, uptime monitoring and security hardening, plus a maintenance plan so your site stays fast and up to date.",
    stats: [["99.9%", "uptime"], ["Daily", "backups"], ["24h", "response"]],
    scope: ["Server setup & migration", "SSL & Cloudflare CDN", "Daily backups", "Uptime monitoring", "Security patches", "Monthly health report"],
    included: ["Business email setup (5 IDs)", "Malware scan", "Minor content updates"],
    notIncluded: [["New feature development", "Available separately"], ["Third-party licences", "Billed at actuals"]],
    timeline: [["Setup", 2, "Server, SSL, DNS", "Domain access"], ["Migration", 3, "Move site & email", "Old hosting access"], ["Ongoing", 30, "Monitoring & maintenance", "—"]],
    terms: "Billed yearly in advance.\n" + T_BASE,
  },
  "CRM / Software Development": {
    tagline: "Software shaped around how your business works", tech: "React · Node.js · MongoDB · AWS",
    summary: "A custom web application — CRM, ERP or internal tool — that automates your workflows, with role-based access, reports and integrations with WhatsApp, email and payments.",
    stats: [["10+", "modules"], ["Role", "based access"], ["75", "days delivery"]],
    scope: ["Process study & documentation", "Database & architecture design", "UI/UX for all modules", "Development & integrations", "Reports & dashboards", "Deployment & training", "3 months support"],
    included: ["Source code", "Admin & user roles", "Data import", "User training"],
    notIncluded: [["SMS / WhatsApp API charges", "Billed at actuals"], ["Server cost", "Billed at actuals"], ["Change requests after sign-off", "Available separately"]],
    timeline: [["Discovery", 7, "Process study, SRS", "Process walkthrough"], ["Design", 12, "Architecture, UI", "SRS & design sign-off"], ["Development", 45, "Modules, integrations", "UAT feedback"], ["Go-live", 11, "Deploy, training", "Final sign-off"]],
    terms: "30% advance, 40% on UAT, 30% on go-live.\n" + T_BASE,
  },
  "Social Media Management": {
    tagline: "Consistent, scroll-stopping social presence", tech: "Instagram · Facebook · LinkedIn",
    summary: "Monthly content calendar, creatives, reels and community management to grow your followers and drive enquiries from social platforms.",
    stats: [["16", "posts / month"], ["4", "reels / month"], ["Monthly", "report"]],
    scope: ["Content calendar", "Post & story creatives", "Reels editing", "Captions & hashtags", "Community management", "Monthly analytics report"],
    included: ["2 platforms", "16 posts + 4 reels", "Basic boosting setup"],
    notIncluded: [["Ad spend", "Paid to Meta directly"], ["Influencer fees", "Available separately"], ["Video shoots", "Available separately"]],
    timeline: [["Onboarding", 5, "Brand kit, calendar", "Brand assets & access"], ["Monthly cycle", 30, "Create, approve, publish", "Approvals within 48h"]],
    terms: "Billed monthly in advance; minimum 3-month engagement.\n" + T_BASE,
  },
  Other: {
    tagline: "Tailored to your requirement", tech: "",
    summary: "Please find below the scope and commercials for the services discussed.",
    stats: [], scope: [], included: [], notIncluded: [], timeline: [],
    terms: T_BASE,
  },
};
export const QUOTE_CATEGORY_NAMES = Object.keys(QUOTE_CATEGORIES);
