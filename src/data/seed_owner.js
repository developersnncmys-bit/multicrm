// Demo data for the owner area: daily notes, payment commitments and payroll settings.
import { addDays, todayISO } from "../utils/format";

export default function seedOwner(db) {
  const today = todayISO();
  const ago = (days, hour = 10) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, 15, 0, 0); return d.toISOString(); };

  const ownerNotes = [
    { id: "on1", text: "Push all project managers to send weekly WhatsApp updates every Friday — 3 clients complained last month.", pinned: true, at: ago(0, 9) },
    { id: "on2", text: "Renew office internet (ACT) before the 25th; ask for the annual plan discount.", pinned: true, at: ago(1, 18) },
    { id: "on3", text: "Mumbai branch: check why Google Ads leads dropped 30% — review keywords with the SEO team.", pinned: false, at: ago(0, 11) },
    { id: "on4", text: "Follow up with CA about GST filing for last quarter.", pinned: false, at: ago(2, 16) },
    { id: "on5", text: "Plan Diwali bonus for the team — budget ₹1.5L.", pinned: false, at: ago(4, 12) },
    { id: "on6", text: "Idea: offer a combined SEO + Ads package at ₹25k/month for small businesses.", pinned: false, at: ago(6, 20) },
  ];

  const labels = ["Advance balance", "Final payment", "Second instalment", "Hosting renewal", "Design milestone", "Go-live payment"];
  const offsets = [-4, -1, 0, 0, 3, 8];
  const commitments = (db.projects || []).slice(0, 6).map((p, i) => ({
    id: `cm${i + 1}`, leadId: p.leadId, projectId: p.id, label: `${labels[i]} — ${p.client}`,
    amount: Math.max(15000, Math.round(((Number(p.value) || 100000) * 0.3) / 1000) * 1000),
    expectedDate: addDays(today, offsets[i]), collected: false,
  }));

  const salaryBill = (db.employees || []).reduce((s, e) => s + (Number(e.salary) || 0), 0) || 380000;

  return { ownerNotes, commitments, settings: { payroll: { salaryBill, payday: 7 } } };
}
