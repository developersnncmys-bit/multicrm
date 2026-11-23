// Shared money & health calculations for Owner View, Owner's Desk, BI and Reports.
// Everything reads collections defensively — other areas' data may be missing.
import { invoicePaid } from "../../store/store";
import { liveStage } from "../../config/workspace";
import { calcTotals, todayISO, daysBetween, monthKey, addDays, toISO } from "../../utils/format";

export const sumBy = (arr, f) => (arr || []).reduce((s, x) => s + (Number(typeof f === "function" ? f(x) : x[f]) || 0), 0);
export const withGst = (amount, rate = 18) => Math.round((Number(amount) || 0) * (1 + (Number(rate ?? 18) || 0) / 100));

export const invTotal = (i) => calcTotals(i.items || [], i.discountPct, i.gstPct, i.interState).total;
export const invBalance = (i) => (i.status === "Cancelled" ? 0 : Math.max(0, invTotal(i) - invoicePaid(i)));
export const isInvOpen = (i) => !["Paid", "Cancelled"].includes(i.status) && invBalance(i) > 0;

export const thisMonth = () => todayISO().slice(0, 7);
export const prevMonthKey = (m = thisMonth(), n = 1) => { const d = new Date(`${m}-01T00:00:00`); d.setMonth(d.getMonth() - n); return toISO(d).slice(0, 7); };
export const monthEnd = (m) => { const d = new Date(`${m}-01T00:00:00`); d.setMonth(d.getMonth() + 1); d.setDate(0); return toISO(d); };
export const daysInMonth = (m) => Number(monthEnd(m).slice(8, 10));

export const leadOf = (db, leadId) => (db.leads || []).find((l) => l.id === leadId);
export const projectOf = (db, id) => (db.projects || []).find((p) => p.id === id);

/* Normalised list of recurring services — Monthly & Extras module if present, else legacy recurring list */
export function servicesOf(db) {
  if (Array.isArray(db.monthlyServices) && db.monthlyServices.length) {
    return db.monthlyServices.map((s) => ({ ...s, client: s.client || projectOf(db, s.projectId)?.client || "—", monthly: withGst(s.amount, s.gstRate), cycle: "Monthly" }));
  }
  const per = { Monthly: 1, Quarterly: 3, Yearly: 12 };
  return (db.recurring || []).map((r) => ({
    id: r.id, client: r.client, name: r.service, amount: r.amount, gstRate: 0, monthly: Math.round((Number(r.amount) || 0) / (per[r.cycle] || 1)),
    billDay: Number((r.nextDue || "").slice(8, 10)) || 1, startDate: r.startDate, active: r.status === "Active", cycle: r.cycle, nextDue: r.nextDue, payments: [], legacy: true,
  }));
}

/* Status of a service for a given month: Paid / Partly paid / Skipped / Overdue / Due / Not started / Stopped */
export function serviceMonthStatus(s, month = thisMonth()) {
  if (s.legacy) {
    if (!s.active) return "Stopped";
    if (!s.nextDue) return "Due";
    if (s.nextDue.slice(0, 7) > month) return "Paid";
    return s.nextDue < todayISO() ? "Overdue" : "Due";
  }
  if (s.active === false && (!s.endDate || s.endDate.slice(0, 7) < month)) return "Stopped";
  if (s.startDate && s.startDate.slice(0, 7) > month) return "Not started";
  const pays = (s.payments || []).filter((p) => p.month === month);
  if (pays.some((p) => p.skipped)) return "Skipped";
  const paid = sumBy(pays, "amount");
  if (paid >= withGst(s.amount, s.gstRate) && paid > 0) return "Paid";
  if (paid > 0) return "Partly paid";
  const due = `${month}-${String(Math.min(28, Number(s.billDay) || 1)).padStart(2, "0")}`;
  return due < todayISO() ? "Overdue" : "Due";
}
export const monthsPaid = (s) => (s.legacy ? null : new Set((s.payments || []).filter((p) => !p.skipped && Number(p.amount) > 0).map((p) => p.month)).size);

/* Every rupee received: invoice payments + monthly-service payments + additional-work payments */
export function allPayments(db) {
  const out = [];
  (db.invoices || []).forEach((i) => {
    if (i.status === "Cancelled") return;
    (i.payments || []).forEach((p) => out.push({ ...p, source: "Invoice", invoiceId: i.id, number: i.number, client: i.client?.company || i.client?.name || "—", contact: i.client?.name, branch: i.branch, leadId: i.leadId, gstPct: Number(i.gstPct) || 0, invoiceTotal: invTotal(i), invType: i.type }));
  });
  (db.monthlyServices || []).forEach((s) => {
    const p0 = projectOf(db, s.projectId);
    (s.payments || []).forEach((p) => { if (!p.skipped && Number(p.amount) > 0) out.push({ ...p, source: "Monthly service", client: s.client || p0?.client || "—", branch: p0?.branch, leadId: p0?.leadId, gstPct: Number(s.gstRate ?? 18) || 0, invoiceTotal: withGst(s.amount, s.gstRate), number: s.name }); });
  });
  (db.extras || []).forEach((x) => {
    const p0 = projectOf(db, x.projectId);
    (x.payments || []).forEach((p) => out.push({ ...p, source: "Additional work", client: x.client || p0?.client || "—", branch: p0?.branch, leadId: p0?.leadId, gstPct: Number(x.gstRate ?? 18) || 0, invoiceTotal: withGst(x.amount, x.gstRate), number: x.title }));
  });
  return out.filter((p) => p.date);
}

/* Money position of one project */
export function projectMoney(p, db) {
  const extras = (db.extras || []).filter((x) => x.projectId === p.id && x.status !== "Cancelled");
  const extrasTotal = sumBy(extras, (x) => withGst(x.amount, x.gstRate));
  const extrasPaid = sumBy(extras.flatMap((x) => x.payments || []), "amount");
  const base = withGst(p.value, p.gstRate ?? 18);
  const invs = (db.invoices || []).filter((i) => p.leadId && i.leadId === p.leadId && i.status !== "Cancelled");
  const pays = invs.flatMap((i) => i.payments || []).filter((x) => x.date).sort((a, b) => a.date.localeCompare(b.date));
  const invPaid = sumBy(pays, "amount");
  const received = Math.max(invPaid, Number(p.advanceReceived) || 0) + extrasPaid;
  const total = base + extrasTotal;
  const balance = Math.max(0, total - received);
  const advanceDate = p.advanceDate || pays[0]?.date || null;
  const lastPayment = pays.length ? pays[pays.length - 1].date : null;
  const lead = leadOf(db, p.leadId);
  const comm = [...(p.commLogs || []).map((c) => c.at), ...(lead?.activities || []).map((a) => a.at)].filter(Boolean).sort();
  return {
    base, total, received, balance, extrasTotal, advanceDate, lastPayment, pctPaid: total ? Math.round((received / total) * 100) : 0,
    ownerId: lead?.ownerId, phone: p.phone || lead?.phone, lastFollowUp: comm.length ? comm[comm.length - 1].slice(0, 10) : null, invoices: invs,
    done: ["Completed", liveStage()].includes(p.stage), pastEnd: p.deadline && p.deadline < todayISO() && p.stage !== "Completed",
  };
}

export const leadLastActivity = (l) => {
  const ts = (l.activities || []).map((a) => a.at).filter(Boolean).sort();
  return (ts[ts.length - 1] || l.createdAt || "").slice(0, 10);
};
export const isOpenLead = (l) => !["Won", "Lost"].includes(l.stage);

export function waLink(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "").slice(-10);
  return `https://wa.me/${digits ? `91${digits}` : ""}?text=${encodeURIComponent(text)}`;
}
export const telLink = (phone) => `tel:${String(phone || "").replace(/\s/g, "")}`;

export function revenueTarget(db, month = thisMonth()) {
  return Number(db.settings?.monthlyTargets?.[month]?.revenue) || Number(db.settings?.targets?.monthlyRevenue) || 0;
}

export function salaryBillOf(db) {
  const set = Number(db.settings?.payroll?.salaryBill);
  if (set) return set;
  const last = prevMonthKey();
  const exp = sumBy((db.expenses || []).filter((e) => e.category === "Salary" && monthKey(e.date) === last), "amount");
  if (exp) return exp;
  const recs = (db.salaryRecords || []).filter((r) => r.month === last);
  if (recs.length) return sumBy(recs, "net");
  return sumBy((db.employees || []).filter((e) => e.status !== "Inactive"), "salary");
}

export function nextPayday(day = 7) {
  const t = new Date(); const d = Math.min(28, Math.max(1, Number(day) || 7));
  const cand = new Date(t.getFullYear(), t.getMonth(), d);
  if (toISO(cand) < todayISO()) cand.setMonth(cand.getMonth() + 1);
  return toISO(cand);
}

export { daysBetween, addDays, todayISO, monthKey };
