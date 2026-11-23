// Sales area demo data: enquiry fields on leads, Today's Plan tasks, WhatsApp/email templates, automation rules.
import { todayISO } from "../utils/format";
import { SERVICES } from "../config/constants";

export const LANDING_PAGES = ["Home", "Website Development", "E-commerce", "Mobile App", "SEO Services", "Google Ads", "Social Media", "Branding", "Contact Us", "Pricing", "Portfolio", "Blog", "CRM Software", "Hosting", "Offer Page"];

export const TEMPLATE_DEFAULTS = [
  // Lead WhatsApp templates (used in the lead drawer)
  { id: "tp1", name: "New enquiry greeting", channel: "WhatsApp", subject: "", body: "Hi {name}, thank you for reaching out about {service}! I'm {owner} from our team. Could you share a few details about what you have in mind so we can suggest the best plan?" },
  { id: "tp2", name: "Missed call", channel: "WhatsApp", subject: "", body: "Hi {name}, I just tried calling you regarding your {service} enquiry. When is a good time to talk? — {owner}" },
  { id: "tp3", name: "Share portfolio", channel: "WhatsApp", subject: "", body: "Hi {name}, here is our portfolio of recent {service} projects: https://company.in/portfolio. Happy to walk you through any of them." },
  { id: "tp4", name: "Quotation follow-up", channel: "WhatsApp", subject: "", body: "Hi {name}, just following up on the quotation for {service} ({amount}). Do you have any questions, or shall we go ahead?" },
  { id: "tp5", name: "Gentle follow-up", channel: "WhatsApp", subject: "", body: "Hi {name}, hope you're doing well! Just checking if you're still planning the {service} project. We'd love to help." },
  { id: "tp6", name: "Reactivate old lead", channel: "WhatsApp", subject: "", body: "Hi {name}, it's been a while! We've launched new packages for {service} this month. Would you like a quick call to revisit your plans?" },
  // Sales Desk templates
  { id: "tp7", name: "New lead: ask requirements", channel: "WhatsApp", subject: "", body: "Hi {name}, thanks for your interest in {service}. Please share your requirements — pages/features, reference sites and timeline — and we'll send a proposal." },
  { id: "tp8", name: "Advance reminder", channel: "WhatsApp", subject: "", body: "Hi {name}, to kick off your {service} project please transfer the advance of {amount}. We'll start right after confirmation." },
  { id: "tp9", name: "Balance payment request", channel: "Email", subject: "Balance payment for {service}", body: "Dear {name},\n\nYour {service} project is ready for the final stage. The pending balance is {amount}. Kindly arrange the payment so we can complete the handover.\n\nRegards,\n{owner}" },
  { id: "tp10", name: "Payment follow-up", channel: "WhatsApp", subject: "", body: "Hi {name}, a gentle reminder that {amount} is pending for {service}. Please let us know once it's done. Thank you!" },
  { id: "tp11", name: "Monthly payment reminder", channel: "WhatsApp", subject: "", body: "Hi {name}, this month's fee of {amount} for {service} is due. Thank you for continuing with us!" },
  { id: "tp12", name: "Project update", channel: "Email", subject: "Update on your {service} project", body: "Dear {name},\n\nHere's a quick update on {service}: we've completed the current milestone and are moving to the next phase. Feedback is welcome.\n\nRegards,\n{owner}" },
  { id: "tp13", name: "Checking in", channel: "WhatsApp", subject: "", body: "Hi {name}, just checking in — is everything working well with your {service}? Let us know if you need anything." },
  { id: "tp14", name: "Gentle reminder", channel: "WhatsApp", subject: "", body: "Hi {name}, a gentle reminder about our pending discussion on {service}. When can we connect?" },
  { id: "tp15", name: "Final payment & clearance", channel: "Email", subject: "Final payment & account clearance", body: "Dear {name},\n\nThank you for working with us on {service}. Please clear the final payment of {amount} so we can close the account.\n\nRegards,\n{owner}" },
  { id: "tp16", name: "Google review request", channel: "WhatsApp", subject: "", body: "Hi {name}, it was a pleasure working on your {service}! Could you spare a minute to leave us a Google review? https://g.page/r/review" },
  { id: "tp17", name: "Meeting confirmation", channel: "WhatsApp", subject: "", body: "Hi {name}, confirming our meeting about {service}. Looking forward to it! — {owner}" },
  { id: "tp18", name: "Thank you after payment", channel: "WhatsApp", subject: "", body: "Hi {name}, we've received {amount}. Thank you! We'll keep you posted on {service}." },
];

export default function seedSales(db) {
  let s = 91;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const today = todayISO();
  const SERVICES_ALL = [...SERVICES];

  // The 8 most recent "New" leads become unseen website enquiries from the last ~2 days
  const fresh = new Set([...db.leads].filter((l) => l.stage === "New").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map((l) => l.id));

  const leads = db.leads.map((l, i) => {
    const isFresh = fresh.has(l.id);
    const createdAt = isFresh ? new Date(Date.now() - (i % 8) * 4.5 * 3600000 - 20 * 60000).toISOString() : l.createdAt;
    const web = ["Website", "Google Ads", "Meta Ads", "Instagram"].includes(l.source) || isFresh;
    const site = web ? (rnd() > 0.35 ? "web" : "landing") : "crm";
    const services = rnd() > 0.6 ? [l.service, pick(SERVICES_ALL.filter((x) => x !== l.service))] : [l.service];
    const hasBudget = rnd() > 0.25;
    const proposalStatus = { Qualified: rnd() > 0.5 ? "Preparing" : "", "Proposal Sent": "Sent", Negotiation: "Negotiation", Won: "Accepted", Lost: rnd() > 0.5 ? "Rejected" : "" }[l.stage] || "";
    const base = new Date(createdAt).getTime();
    const proposalLog = proposalStatus ? [
      ...(proposalStatus !== "Preparing" ? [{ id: `pl${i}a`, status: "Preparing", comment: "Collecting requirements for the proposal.", at: new Date(base + 86400000).toISOString(), by: l.ownerId }] : []),
      { id: `pl${i}b`, status: proposalStatus, comment: { Preparing: "Drafting scope & pricing.", Sent: "Proposal emailed to client.", Negotiation: "Client asked for a revised price.", Accepted: "Client accepted — advance on the way.", Rejected: "Client chose another option." }[proposalStatus], at: new Date(base + 3 * 86400000).toISOString(), by: l.ownerId },
    ] : [];
    const firstReplyMins = l.stage === "New" ? (isFresh || rnd() > 0.5 ? null : pick([9, 35, 240])) : pick([4, 8, 12, 14, 25, 45, 90, 180, 600, 1500]);
    const activities = isFresh ? (l.activities || []).filter((a) => a.type === "created").map((a) => ({ ...a, at: createdAt })) : l.activities;
    return {
      ...l, createdAt, activities,
      site, landingPage: site === "crm" ? "" : pick(LANDING_PAGES),
      seen: !isFresh, services,
      budgetMin: hasBudget ? Math.round((l.value * 0.7) / 1000) * 1000 : 0,
      budgetMax: hasBudget ? Math.round((l.value * 1.15) / 1000) * 1000 : 0,
      proposalStatus, proposalLog, firstReplyMins,
      nextFollowUp: isFresh ? "" : l.nextFollowUp,
      gstApplicable: rnd() > 0.5, gstin: "",
    };
  });
  // Make one repeat enquiry (same mobile number) so the "Repeat" badge shows
  const open = leads.filter((l) => !["Won", "Lost"].includes(l.stage));
  if (open.length > 5) { const a = open[1], b = open[open.length - 2]; b.phone = a.phone; }

  // Today's Plan — manual tasks for today
  const titles = [
    ["Call back about website revamp", "New Call", "High"], ["Send portfolio link", "Follow-up", "Medium"], ["Collect balance payment", "Payment", "Urgent"],
    ["Share revised quotation", "Proposal", "High"], ["Kick-off meeting prep", "Onboarding", "Medium"], ["Confirm demo slot", "Meeting", "Medium"],
    ["Follow up on advance", "Payment", "High"], ["Ask for Google review", "Other", "Low"], ["Discovery call", "New Call", "High"],
    ["Send MOM from yesterday's meeting", "Other", "Medium"], ["Remind about pending content", "Follow-up", "Low"], ["Proposal walkthrough call", "Proposal", "Urgent"],
    ["Verify GST details for invoice", "Payment", "Medium"], ["Plan next week's follow-ups", "Other", "Low"],
  ];
  const planTasks = titles.map(([t, type, priority], i) => {
    const l = leads[(i * 7) % leads.length];
    return {
      id: `PT${i + 1}`, date: today, title: `${t} — ${l.company}`, type, priority, phone: l.phone, leadId: l.id, projectId: "",
      notes: "", done: i % 4 === 0, createdAt: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    };
  });

  const automation = {
    maxReminders: 3, bigAmount: 100000, quietDays: 5, daysAfterSend: 2, reviewDays: 90, pauseOnHold: true,
    upiId: "company@hdfcbank", reviewLink: "https://g.page/r/review", bankAccountId: "",
    team: { leads: "u2", payments: "u5", delivery: "u6", reviews: "u3" }, snoozed: {}, done: {},
  };

  return { leads, planTasks, templates: TEMPLATE_DEFAULTS.map((t) => ({ ...t })), settings: { automation } };
}

