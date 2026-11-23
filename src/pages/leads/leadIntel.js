// Lead intelligence shared by All Leads, Enquiries, Sales Desk, Today's Plan and the lead drawer:
// lead score (1–99) with breakdown, "next step" text, repeat numbers, last activity, balances.
import { useMemo } from "react";
import { calcTotals, daysBetween, fmtDate, inr, todayISO } from "../../utils/format";
import { invoicePaid } from "../../store/store";

// Where a lead came in from (website forms are configured per workspace)
export const SITES = { web: "Main website", landing: "Landing page / Ads", crm: "Added in CRM" };
export const MEETING_TYPES = ["Meeting", "Demo", "Call"];
export const OPEN = (l) => !["Won", "Lost"].includes(l.stage);
export const QUOTED_STAGES = ["Proposal Sent", "Negotiation"];

export const bandOf = (score) => (score >= 70 ? "Hot" : score >= 45 ? "Warm" : "Cold");
export const BAND_STYLE = {
  Hot: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
  Warm: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  Cold: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

export const phoneKey = (p) => String(p || "").replace(/\D/g, "").slice(-10);
export const lastActivityOf = (l) => (l.activities || []).reduce((m, a) => (a.at > m ? a.at : m), l.createdAt || "");
export const wonDateOf = (l) => ((l.activities || []).find((a) => a.type === "stage" && /Won/.test(a.text)) || { at: l.createdAt }).at;
export const replyLabel = (m) => (m == null ? "—" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);

export function fillTemplate(body = "", lead = {}, { owner = "", amount = "" } = {}) {
  return body
    .replace(/\{name\}/g, (lead.name || "").split(" ")[0] || "there")
    .replace(/\{company\}/g, lead.company || lead.name || "")
    .replace(/\{service\}/g, (lead.services && lead.services[0]) || lead.service || "your project")
    .replace(/\{owner\}/g, owner || "our team")
    .replace(/\{amount\}/g, amount || inr(lead.value || 0));
}
export const waText = (phone, text) => `https://wa.me/91${phoneKey(phone)}?text=${encodeURIComponent(text)}`;

/** Score a single lead. ctx = { sourceRate, avgRate, repeat, meetings, balance } */
export function scoreLead(l, ctx = {}) {
  const parts = [{ label: "Base score", pts: 30 }];
  const today = todayISO();
  const rate = ctx.sourceRate?.[l.source];
  if (rate != null) {
    const pts = Math.max(-10, Math.min(10, Math.round((rate - (ctx.avgRate || 0)) * 40)));
    if (pts) parts.push({ label: `${l.source} converts ${Math.round(rate * 100)}% of leads`, pts });
  }
  const budget = Math.max(Number(l.value) || 0, Number(l.budgetMax) || 0);
  if (budget >= 200000) parts.push({ label: "Budget ₹2L or more", pts: 12 });
  else if (budget >= 50000) parts.push({ label: "Budget ₹50k or more", pts: 7 });
  else if (budget > 0) parts.push({ label: "Budget shared", pts: 3 });
  const stagePts = { Contacted: 8, Qualified: 12, "Proposal Sent": 22, Negotiation: 22, Won: 22 }[l.stage];
  if (stagePts) parts.push({ label: l.stage === "Qualified" ? "In follow-up / qualified" : QUOTED_STAGES.includes(l.stage) || l.stage === "Won" ? "Quotation shared" : "Already contacted", pts: stagePts });
  if (ctx.meetings?.[l.id]) parts.push({ label: "Meeting held or booked", pts: 10 });
  if (l.firstReplyMins != null && l.firstReplyMins <= 15) parts.push({ label: "Replied within 15 minutes", pts: 5 });
  const age = daysBetween((l.createdAt || "").slice(0, 10) || today, today);
  if (age <= 2) parts.push({ label: "Enquired in the last 2 days", pts: 10 });
  if (OPEN(l)) {
    const idle = daysBetween(lastActivityOf(l).slice(0, 10) || today, today);
    if (idle > 30) parts.push({ label: `No activity for ${idle} days`, pts: -25 });
    else if (idle > 14) parts.push({ label: `No activity for ${idle} days`, pts: -12 });
  }
  if (ctx.repeat?.has(phoneKey(l.phone))) parts.push({ label: "Enquired again (repeat number)", pts: 5 });
  const raw = parts.reduce((s, p) => s + p.pts, 0);
  const score = Math.max(1, Math.min(99, raw));
  return { score, band: bandOf(score), parts };
}

/** Human "next step" for a lead. */
export function nextStepOf(l, ctx = {}) {
  const today = todayISO();
  if (l.stage === "Won") {
    const bal = ctx.balance?.[l.id];
    return bal > 0 ? { text: `Won · ${inr(bal)} balance due`, tone: "amber" } : { text: "Won · fully paid", tone: "emerald" };
  }
  if (l.stage === "Lost") return { text: `Lost: ${l.lostReason || "no reason"}`, tone: "slate" };
  const meet = ctx.meetingToday?.[l.id];
  if (meet) return { text: `Meeting today at ${meet}`, tone: "violet" };
  if (l.stage === "New" && l.firstReplyMins == null) {
    const mins = Math.max(0, Math.round((Date.now() - new Date(l.createdAt)) / 60000));
    const t = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} days`;
    return { text: `Waiting ${t} for first reply`, tone: mins > 60 ? "rose" : "amber" };
  }
  if (QUOTED_STAGES.includes(l.stage)) {
    const q = ctx.lastQuote?.[l.id];
    if (q) { const d = daysBetween(q, today); return { text: d === 0 ? "Quotation sent today" : `Quotation sent ${d} days ago`, tone: d >= 3 ? "amber" : "slate" }; }
  }
  if (!l.nextFollowUp) return { text: "No follow-up date", tone: "rose" };
  const d = daysBetween(today, l.nextFollowUp);
  if (d < 0) return { text: `Follow-up was due ${fmtDate(l.nextFollowUp)}`, tone: "rose" };
  if (d === 0) return { text: "Follow up today", tone: "amber" };
  return { text: `Follow up ${d === 1 ? "tomorrow" : fmtDate(l.nextFollowUp)}`, tone: "slate" };
}
export const TONE_TEXT = { rose: "text-rose-600 dark:text-rose-400", amber: "text-amber-600 dark:text-amber-400", emerald: "text-emerald-600 dark:text-emerald-400", violet: "text-violet-600 dark:text-violet-400", slate: "text-slate-500 dark:text-slate-400" };

/** Compute every derived map once per db change. */
export function useLeadIntel(db) {
  return useMemo(() => {
    const leads = db.leads || [];
    const today = todayISO();
    const bySource = {};
    leads.forEach((l) => {
      const s = (bySource[l.source] ||= { won: 0, lost: 0 });
      if (l.stage === "Won") s.won++; if (l.stage === "Lost") s.lost++;
    });
    const sourceRate = {}; let wSum = 0, cSum = 0;
    Object.entries(bySource).forEach(([k, v]) => { const c = v.won + v.lost; if (c) { sourceRate[k] = v.won / c; wSum += v.won; cSum += c; } });
    const avgRate = cSum ? wSum / cSum : 0;

    const phoneCount = {};
    leads.forEach((l) => { const k = phoneKey(l.phone); if (k) phoneCount[k] = (phoneCount[k] || 0) + 1; });
    const repeat = new Set(Object.keys(phoneCount).filter((k) => phoneCount[k] > 1));

    const meetings = {}, meetingToday = {}, meetingsList = {};
    (db.tasks || []).forEach((t) => {
      if (!t.leadId || !MEETING_TYPES.includes(t.type)) return;
      meetings[t.leadId] = (meetings[t.leadId] || 0) + 1;
      (meetingsList[t.leadId] ||= []).push(t);
      if (t.date === today && !t.done && t.status !== "Cancelled") meetingToday[t.leadId] = t.time || "today";
    });

    const lastQuote = {}, quoteCount = {}, quoteWaiting = {};
    (db.quotations || []).forEach((q) => {
      if (!q.leadId) return;
      quoteCount[q.leadId] = (quoteCount[q.leadId] || 0) + 1;
      if (!lastQuote[q.leadId] || q.date > lastQuote[q.leadId]) lastQuote[q.leadId] = q.date;
      if (["Sent", "Negotiation"].includes(q.status)) quoteWaiting[q.leadId] = (quoteWaiting[q.leadId] || 0) + calcTotals(q.items, q.discountPct, q.gstPct, q.interState).total;
    });

    const total = {}, received = {}, balance = {};
    (db.invoices || []).forEach((inv) => {
      if (!inv.leadId || inv.status === "Cancelled" || inv.type === "Proforma") return;
      const t = calcTotals(inv.items, inv.discountPct, inv.gstPct, inv.interState).total;
      total[inv.leadId] = (total[inv.leadId] || 0) + t;
      received[inv.leadId] = (received[inv.leadId] || 0) + invoicePaid(inv);
    });
    const projectByLead = {};
    (db.projects || []).forEach((p) => { if (p.leadId) projectByLead[p.leadId] = p; });
    leads.forEach((l) => {
      if (l.stage !== "Won") return;
      if (total[l.id] == null) {
        const p = projectByLead[l.id];
        const gross = Math.round((Number(p?.value ?? l.value) || 0) * (1 + (Number(p?.gstRate ?? 18) || 0) / 100));
        total[l.id] = gross; received[l.id] = Number(p?.advanceReceived) || 0;
      }
      balance[l.id] = Math.max(0, (total[l.id] || 0) - (received[l.id] || 0));
    });

    const ctx = { sourceRate, avgRate, repeat, meetings, meetingToday, lastQuote, balance };
    const score = {}, next = {}, last = {};
    leads.forEach((l) => { score[l.id] = scoreLead(l, ctx); next[l.id] = nextStepOf(l, ctx); last[l.id] = lastActivityOf(l); });
    return { ...ctx, score, next, last, quoteCount, quoteWaiting, total, received, meetingsList, projectByLead, phoneCount };
  }, [db.leads, db.tasks, db.quotations, db.invoices, db.projects]);
}

/** Priority used for "your list for today": score + urgency + value */
export function priorityOf(l, intel) {
  const today = todayISO();
  let p = intel.score[l.id]?.score || 0;
  if (l.stage === "New" && l.firstReplyMins == null) p += 25;
  if (l.nextFollowUp && l.nextFollowUp <= today) p += 15 + Math.min(20, daysBetween(l.nextFollowUp, today) * 2);
  if (intel.meetingToday[l.id]) p += 30;
  p += Math.min(20, (Number(l.value) || 0) / 50000);
  return p;
}
