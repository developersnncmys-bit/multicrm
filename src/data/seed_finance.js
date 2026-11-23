// Finance demo data: bank accounts, proformas, quote revisions/negotiation, payment follow-ups, reserve funds.
import { addDays, todayISO, toISO } from "../utils/format";

let s = 7;
const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;

export const QUOTE_CATEGORY_KEYS = ["Website Development", "Mobile Application", "E-Commerce Website", "SEO & Digital Marketing", "Logo & Branding", "UI/UX Design", "Cloud & Hosting", "CRM / Software Development", "Social Media Management", "Other"];
const SERVICE_TO_CATEGORY = {
  "Website Development": "Website Development", "E-commerce Website": "E-Commerce Website", "Mobile App": "Mobile Application",
  SEO: "SEO & Digital Marketing", "Google Ads": "SEO & Digital Marketing", "Social Media Marketing": "Social Media Management",
  "Branding & Logo": "Logo & Branding", "CRM / Custom Software": "CRM / Software Development", "Hosting & Maintenance": "Cloud & Hosting",
};

export default function seedFinance(db) {
  s = 7;
  const today = todayISO();

  const bankAccounts = [
    { id: "ba1", label: "HDFC Current", bank: "HDFC Bank", number: "50200012345678", ifsc: "HDFC0001234", branch: "Indiranagar, Bangalore" },
    { id: "ba2", label: "ICICI Current", bank: "ICICI Bank", number: "001905004321", ifsc: "ICIC0000019", branch: "Kuvempunagar, Mysore" },
    { id: "ba3", label: "Kotak Savings", bank: "Kotak Mahindra Bank", number: "7811223344", ifsc: "KKBK0000958", branch: "Andheri East, Mumbai" },
  ];
  const accByBranch = { Bangalore: "ba1", Mysore: "ba2", Mumbai: "ba3" };

  // Every recorded payment lands in a bank account
  let invoices = (db.invoices || []).map((inv) => ({
    ...inv,
    payments: (inv.payments || []).map((p, i) => ({ ...p, accountId: p.accountId || (i % 4 === 3 ? "ba1" : accByBranch[inv.branch] || "ba1"), proofName: p.proofName || "" })),
  }));

  // Proforma invoices — a couple open, one converted into a tax invoice with a different final amount
  const quotes = db.quotations || [];
  const approved = quotes.filter((q) => q.status === "Approved");
  const proformas = [];
  const year = today.slice(0, 4);
  approved.slice(0, 3).forEach((q, i) => {
    const date = addDays(today, -int(4, 20));
    const pid = `PF${i + 1}`;
    proformas.push({
      id: pid, number: `PRF-${year}-${String(31 + i).padStart(4, "0")}`, type: "Proforma", leadId: q.leadId, quoteId: q.id,
      client: { ...q.client }, date, dueDate: addDays(date, 15), items: q.items.map((it) => ({ ...it })), discountPct: q.discountPct || 0,
      gstPct: q.gstPct || 18, interState: !!q.interState, branch: q.branch, payments: [],
      status: i === 0 ? "Converted" : i === 1 ? "Sent" : "Draft", deliveryDate: addDays(date, 45), paymentTerms: "50% advance, 50% on delivery",
      notes: "Proforma invoice — not a tax invoice. Tax invoice will be raised on receipt of payment.",
    });
  });
  if (proformas[0]) {
    const pf = proformas[0];
    const quotedSub = pf.items.reduce((a, it) => a + it.qty * it.rate, 0);
    const quotedAmount = Math.round(quotedSub * (1 - (pf.discountPct || 0) / 100) * (1 + pf.gstPct / 100));
    const finalItems = pf.items.map((it, k) => (k === 0 ? { ...it, rate: Math.round(it.rate * 0.92) } : { ...it }));
    invoices = [{
      id: "IPF1", number: `INV-${year}-0199`, type: "Tax", leadId: pf.leadId, proformaId: pf.id, quotedAmount, client: { ...pf.client },
      date: addDays(pf.date, 3), dueDate: addDays(pf.date, 33), items: finalItems, discountPct: pf.discountPct, gstPct: pf.gstPct, interState: pf.interState,
      branch: pf.branch, status: "Partially Paid", notes: "Against proforma " + pf.number,
      payments: [{ id: "pPF1", date: addDays(pf.date, 4), amount: Math.round(quotedAmount * 0.4), mode: "Bank Transfer", ref: "UTR778812", accountId: accByBranch[pf.branch] || "ba1", proofName: "neft-receipt.pdf" }],
    }, ...invoices];
  }
  invoices = [...proformas, ...invoices];

  // Quotations — categories, revisions, negotiation trail
  let quotations = quotes.map((q, i) => {
    const lead = (db.leads || []).find((l) => l.id === q.leadId);
    const cat = SERVICE_TO_CATEGORY[lead?.service] || "Other";
    const negotiation = ["Negotiation", "Approved", "Rejected"].includes(q.status) ? [
      { id: `ng${i}a`, text: "Client asked for 10% discount on development.", at: `${addDays(q.date, 2)}T11:20:00.000Z`, by: q.createdBy },
      { id: `ng${i}b`, text: q.status === "Rejected" ? "Client went with a cheaper option." : "Offered 5% + free 3 months support.", at: `${addDays(q.date, 4)}T16:05:00.000Z`, by: q.createdBy },
    ] : [];
    const conv = proformas.find((p) => p.quoteId === q.id);
    return { ...q, revision: 1, parentId: "", serviceCategory: cat, replyEmail: "sales@company.in", negotiation, status: conv ? "Converted" : q.status, proformaId: conv?.id || "" };
  });
  const toFinal = quotations.find((q) => q.status === "Approved");
  if (toFinal) quotations = quotations.map((q) => (q.id === toFinal.id ? { ...q, status: "Final" } : q));
  const toRevise = quotations.find((q) => q.status === "Negotiation") || quotations.find((q) => q.status === "Sent");
  if (toRevise) {
    quotations = quotations.map((q) => (q.id === toRevise.id ? { ...q, status: "Rejected", negotiation: [...q.negotiation, { id: "ngR", text: "Revised pricing requested — creating revision 2.", at: `${addDays(q.date, 5)}T10:00:00.000Z`, by: q.createdBy }] } : q));
    quotations = [{
      ...toRevise, id: `${toRevise.id}R2`, number: `${toRevise.number}-R2`, revision: 2, parentId: toRevise.id, status: "Sent",
      date: addDays(toRevise.date, 5), validUntil: addDays(toRevise.date, 20), discountPct: 10,
      negotiation: [{ id: "ngR2", text: "Revision sent with 10% discount and phased payment.", at: `${addDays(toRevise.date, 5)}T12:00:00.000Z`, by: toRevise.createdBy }],
    }, ...quotations];
  }

  // Payment follow-up list (HOT / WARM / WATCH / DONE)
  const cats = ["Website", "E-commerce", "Mobile App", "SEO", "Branding", "Software"];
  const statuses = { HOT: ["Pending", "Partial"], WARM: ["Followed Up", "Partial", "Pending"], WATCH: ["Not Finalised", "Followed Up"], DONE: ["Paid", "Declined"] };
  const prios = ["HOT", "HOT", "HOT", "WARM", "WARM", "WARM", "WARM", "WATCH", "WATCH", "WATCH", "DONE", "DONE"];
  const projects = db.projects || [];
  const paymentFollowups = prios.map((priority, i) => {
    const p = projects[i % Math.max(projects.length, 1)] || { client: `Client ${i + 1}`, name: "Website", branch: "Bangalore" };
    const total = Math.round((p.value || int(80, 400) * 1000) * 1.18);
    const status = pick(statuses[priority]);
    const received = status === "Paid" ? total : status === "Partial" ? Math.round(total * pick([0.3, 0.5, 0.6])) : status === "Declined" ? 0 : Math.round(total * pick([0, 0.2]));
    return {
      id: `pf${i + 1}`, client: p.client, project: p.service || p.name, city: p.branch || "Bangalore", category: pick(cats),
      totalValue: total, received, priority, status,
      lastFollowUp: addDays(today, -int(0, 12)), nextAction: pick(["Call accounts team", "Send payment reminder on WhatsApp", "Share revised invoice", "Visit office for cheque", "Confirm UTR with client", "Wait for PO approval"]),
      deadline: priority === "DONE" ? "" : addDays(today, int(-5, 20)), proposalDate: addDays(today, -int(20, 90)),
      notes: priority === "HOT" ? "Promised to clear before month end." : "",
    };
  });

  // Reserve funds — ~20 transactions over the last 12 months
  const FUNDS = ["Operating Buffer", "Emergency Fund", "Tax Reserve", "Growth Fund"];
  const fundTxns = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(); d.setDate(5); d.setMonth(d.getMonth() - m);
    const date = toISO(d);
    fundTxns.push({ id: `ft${m}a`, fund: FUNDS[m % 4], type: "Deposit", amount: int(4, 12) * 25000, date, note: "Monthly allocation" });
    if (m % 2 === 0) fundTxns.push({ id: `ft${m}b`, fund: FUNDS[(m + 1) % 4], type: "Deposit", amount: int(2, 8) * 25000, date: addDays(date, 10), note: "Surplus from collections" });
    if (m === 7) fundTxns.push({ id: "ftw1", fund: "Emergency Fund", type: "Withdrawal", amount: 60000, date: addDays(date, 14), note: "Laptop replacement after water damage" });
    if (m === 3) fundTxns.push({ id: "ftw2", fund: "Tax Reserve", type: "Withdrawal", amount: 125000, date: addDays(date, 9), note: "Advance tax instalment" });
  }

  return {
    bankAccounts, invoices, quotations, paymentFollowups, fundTxns: fundTxns.reverse(),
    settings: {
      financial: { cogsPct: 35, taxPct: 25, opBufferMonths: 3, emergencyPct: 5, growthPct: 20 },
      offices: {
        Bangalore: { name: db.settings?.company?.name || "Company", address: "No. 45, 2nd Floor, 100 Feet Road, Indiranagar", city: "Bangalore", state: "Karnataka", pincode: "560038", gstin: "29AABCN1234F1Z5", phone: "+91 98450 12345", email: "blr@company.in" },
        Mysore: { name: db.settings?.company?.name || "Company", address: "#12, Kalidasa Road, VV Mohalla", city: "Mysore", state: "Karnataka", pincode: "570002", gstin: "29AABCN1234F1Z5", phone: "+91 99001 33445", email: "mys@company.in" },
        Mumbai: { name: db.settings?.company?.name || "Company", address: "Office 702, Andheri Kurla Road, Andheri East", city: "Mumbai", state: "Maharashtra", pincode: "400059", gstin: "27AABCN1234F1Z9", phone: "+91 97400 55667", email: "mum@company.in" },
      },
    },
  };
}
