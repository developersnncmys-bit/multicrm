// Create / edit sheets: lead, schedule (call/meeting), payment, expense, and the "+" quick-create menu.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Linking, View } from "react-native";
import { Text } from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { Button, Choice, Input, Press, Row, Sheet, T } from "./ui";
import { DateStrip, TimeStrip } from "./pickers";
import { PRIORITY_COLOR, STAGE_COLOR, TYPE_COLOR, radius, shadow, soft, useTheme } from "../theme";
import { useStore } from "../store";
import {
  EXPENSE_CATEGORIES, LEAD_SOURCES, LEAD_STAGES, PAYMENT_MODES, PRIORITIES, TASK_TYPES,
  addDays, inr, invoiceBalance, invoicePaid, invoiceTotal, isTaxInvoice, today, uid,
} from "../utils";

const SheetCtx = createContext(null);
export const useSheets = () => useContext(SheetCtx);

export function SheetsProvider({ children, extra }) {
  const [state, setState] = useState(null); // { kind, props }
  // Android can't show a new Modal while another is closing, so wait for the old one to slide away
  const open = useCallback((kind, props = {}) => {
    setState((cur) => {
      if (cur?.kind) { setTimeout(() => setState({ kind, props, n: Date.now() }), 380); return { ...cur, kind: null }; }
      return { kind, props, n: Date.now() };
    });
  }, []);
  const close = useCallback(() => setState((s) => (s ? { ...s, kind: null } : s)), []);
  const value = useMemo(() => ({ open, close }), [open, close]);
  const p = { onClose: close, ...(state?.props || {}) };
  return (
    <SheetCtx.Provider value={value}>
      {children}
      <QuickCreate visible={state?.kind === "quick"} {...p} />
      {/* key changes each time a sheet opens, so the form starts fresh */}
      <LeadForm key={`lead${state?.n}`} visible={state?.kind === "lead"} {...p} />
      <TaskForm key={`task${state?.n}`} visible={state?.kind === "task"} {...p} />
      <PaymentForm key={`pay${state?.n}`} visible={state?.kind === "payment"} {...p} />
      <ExpenseForm key={`exp${state?.n}`} visible={state?.kind === "expense"} {...p} />
      {extra?.(state, p)}
    </SheetCtx.Provider>
  );
}

// ── "+" menu ──
function QuickCreate({ visible, onClose }) {
  const { c } = useTheme();
  const { can } = useStore();
  const { open } = useSheets();
  const items = [
    can("leads", true) && { kind: "lead", icon: "person-add", label: "New lead", text: "Someone enquired? Save them", color: "#6366F1" },
    can("calendar", true) && { kind: "task", icon: "calendar", label: "Schedule", text: "Call, meeting, demo or follow-up", color: "#0EA5E9" },
    can("invoices", true) && { kind: "payment", icon: "wallet", label: "Record payment", text: "Money received against an invoice", color: "#10B981" },
    can("expenses", true) && { kind: "expense", icon: "receipt", label: "Add expense", text: "Rent, salary, travel, tools…", color: "#F59E0B" },
  ].filter(Boolean);
  return (
    <Sheet visible={visible} onClose={onClose} title="Create" subtitle="What would you like to add?">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        {items.map((it) => (
          <Press key={it.kind} onPress={() => open(it.kind)} style={[{ width: "47.5%", backgroundColor: c.card, borderRadius: radius.lg, padding: 16 }, shadow(c)]}>
            <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: soft(it.color, 0.14), alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Ionicons name={it.icon} size={22} color={it.color} />
            </View>
            <T v="h3">{it.label}</T>
            <T v="sub" muted style={{ marginTop: 3, lineHeight: 18 }}>{it.text}</T>
          </Press>
        ))}
        {!items.length && <T muted>{"You don't have permission to add anything."}</T>}
      </View>
    </Sheet>
  );
}

// ── Lead ──
const blankLead = () => ({ name: "", company: "", phone: "", email: "", source: "Phone Call", stage: "New", priority: "Warm", value: "", requirement: "", nextFollowUp: addDays(today(), 1) });

function LeadForm({ visible, onClose, lead }) {
  const { add, update, user } = useStore();
  const [f, setF] = useState(() => (lead ? { ...blankLead(), ...lead, value: lead.value ? String(lead.value) : "" } : blankLead()));
  const [err, setErr] = useState("");
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = () => {
    if (!f.name.trim()) return setErr("Enter the person's name");
    if (f.phone && f.phone.replace(/\D/g, "").length < 10) return setErr("Phone number looks too short");
    const data = { ...f, name: f.name.trim(), company: f.company.trim(), phone: f.phone.trim(), email: f.email.trim(), value: Number(f.value) || 0 };
    if (lead) update("leads", lead.id, data);
    else {
      const now = new Date().toISOString();
      add("leads", { ...data, ownerId: user.id, branch: user.branch || "", createdAt: now, lostReason: "", activities: [{ id: uid("a"), type: "created", text: `Lead captured from ${data.source} (mobile)`, at: now, by: user.id }] }, "L");
    }
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={lead ? "Edit lead" : "New lead"} subtitle={lead ? lead.name : "Save an enquiry in a few seconds"}
      footer={<><ErrorLine text={err} /><Button title={lead ? "Save changes" : "Save lead"} icon="checkmark" onPress={save} /></>}>
      <Input label="Name *" icon="person-outline" value={f.name} onChangeText={set("name")} placeholder="Customer name" autoFocus={!lead} />
      <Input label="Company" icon="business-outline" value={f.company} onChangeText={set("company")} placeholder="Business name (optional)" />
      <Row gap={12}>
        <Input style={{ flex: 1 }} label="Phone" icon="call-outline" value={f.phone} onChangeText={set("phone")} placeholder="98xxxxxxxx" keyboardType="phone-pad" />
        <Input style={{ flex: 1 }} label="Deal value ₹" icon="cash-outline" value={f.value} onChangeText={set("value")} placeholder="0" keyboardType="numeric" />
      </Row>
      <Input label="Email" icon="mail-outline" value={f.email} onChangeText={set("email")} placeholder="name@email.com" autoCapitalize="none" keyboardType="email-address" />
      <Choice label="Priority" options={PRIORITIES} value={f.priority} onChange={set("priority")} colors={PRIORITY_COLOR} />
      {lead && <Choice label="Stage" options={LEAD_STAGES} value={f.stage} onChange={set("stage")} colors={STAGE_COLOR} />}
      <Choice label="Source" options={LEAD_SOURCES} value={f.source} onChange={set("source")} />
      <DateStrip label="Next follow-up" value={f.nextFollowUp} onChange={set("nextFollowUp")} />
      <Input label="Requirement / notes" value={f.requirement} onChangeText={set("requirement")} placeholder="What do they need?" multiline />
    </Sheet>
  );
}

// ── Schedule (task) ──
const MODES = [{ value: "Phone", label: "Phone call" }, { value: "Google Meet", label: "Google Meet" }, { value: "Office", label: "Office" }];

function TaskForm({ visible, onClose, lead, type }) {
  const { c } = useTheme();
  const { add, update, user, db, toast } = useStore();
  const [f, setF] = useState(() => {
    const t = type || "Call";
    return { type: t, title: "", date: today(), time: "11:00", duration: 30, mode: t === "Call" || t === "Follow-up" ? "Phone" : "Google Meet", meetLink: "", notes: "", leadId: lead?.id || "", clientName: "" };
  });
  const [err, setErr] = useState("");
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const theLead = db.leads.find((l) => l.id === f.leadId);
  const client = theLead ? theLead.company || theLead.name : f.clientName;

  const save = () => {
    if (!theLead && !f.clientName?.trim() && !f.title?.trim()) return setErr("Add a client name or a title");
    if (f.mode === "Google Meet" && f.meetLink && !/^https:\/\/meet\.google\.com\//.test(f.meetLink.trim())) return setErr("That's not a Google Meet link");
    const rec = {
      title: f.title.trim() || `${f.type} — ${client || "Client"}`, type: f.type, date: f.date, time: f.time, duration: Number(f.duration) || 30,
      mode: f.mode, meetLink: f.mode === "Google Meet" ? f.meetLink.trim() : "", leadId: f.leadId, clientName: theLead ? "" : f.clientName.trim(),
      clientPhone: theLead?.phone || "", assigneeId: user.id, notes: f.notes, status: "Upcoming", done: false, outcome: "", summary: "",
    };
    add("tasks", rec, "T", true);
    if (theLead) update("leads", theLead.id, (l) => ({ nextFollowUp: f.date, activities: [{ id: uid("a"), type: "note", text: `Scheduled ${f.type.toLowerCase()} on ${f.date}${f.time ? ` at ${f.time}` : ""}`, at: new Date().toISOString(), by: user.id }, ...(l.activities || [])] }), false);
    toast(`${f.type} scheduled`);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Schedule" subtitle={theLead ? `With ${client}` : "Book a call, meeting or follow-up"}
      footer={<><ErrorLine text={err} /><Button title="Schedule" icon="calendar" onPress={save} /></>}>
      <Choice label="Type" options={TASK_TYPES} value={f.type} onChange={(v) => setF((s) => ({ ...s, type: v, mode: v === "Call" || v === "Follow-up" || v === "Payment follow-up" ? "Phone" : s.mode }))} colors={TYPE_COLOR} />
      {!lead && (
        <>
          <T v="sub" muted style={{ marginBottom: 8, fontWeight: "600" }}>Client</T>
          <LeadPicker value={f.leadId} onChange={set("leadId")} />
          {!f.leadId && <Input icon="person-outline" value={f.clientName} onChangeText={set("clientName")} placeholder="…or type a name (not in CRM)" />}
        </>
      )}
      <Input label="Title (optional)" value={f.title} onChangeText={set("title")} placeholder={`${f.type} — ${client || "Client"}`} />
      <DateStrip label="Date" value={f.date} onChange={set("date")} />
      <TimeStrip label="Time" value={f.time} onChange={set("time")} allowNone />
      <Choice label="Duration" options={[{ value: 15, label: "15 min" }, { value: 30, label: "30 min" }, { value: 45, label: "45 min" }, { value: 60, label: "1 hour" }]} value={f.duration} onChange={set("duration")} />
      <Choice label="Mode" options={MODES} value={f.mode} onChange={set("mode")} />
      {f.mode === "Google Meet" && (
        <View style={{ marginBottom: 6 }}>
          <Input label="Google Meet link" icon="videocam-outline" value={f.meetLink} onChangeText={set("meetLink")} placeholder="https://meet.google.com/abc-defg-hij" autoCapitalize="none" style={{ marginBottom: 8 }} />
          <Press onPress={() => Linking.openURL("https://meet.google.com/new")} style={{ alignSelf: "flex-start", marginBottom: 14 }}>
            <Row gap={6}><Ionicons name="open-outline" size={15} color={c.brand} /><Text style={{ color: c.brand, fontWeight: "700" }}>Create a meeting in Google Meet, then paste the link</Text></Row>
          </Press>
        </View>
      )}
      <Input label="Agenda / notes" value={f.notes} onChangeText={set("notes")} placeholder="What will you discuss?" multiline />
    </Sheet>
  );
}

function LeadPicker({ value, onChange }) {
  const { c } = useTheme();
  const { db } = useStore();
  const [q, setQ] = useState("");
  const sel = db.leads.find((l) => l.id === value);
  if (sel) {
    return (
      <Row style={{ backgroundColor: c.brandSoft, borderRadius: radius.md, padding: 12, marginBottom: 14, justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}><T v="h3">{sel.name}</T><T v="sub" muted>{sel.company || sel.phone}</T></View>
        <Press onPress={() => onChange("")}><Text style={{ color: c.brand, fontWeight: "700" }}>Change</Text></Press>
      </Row>
    );
  }
  const found = q.trim() ? db.leads.filter((l) => `${l.name} ${l.company} ${l.phone}`.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];
  return (
    <View>
      <Input icon="search" value={q} onChangeText={setQ} placeholder="Search a lead by name, company or phone" style={{ marginBottom: found.length ? 6 : 10 }} />
      {found.map((l) => (
        <Press key={l.id} onPress={() => { onChange(l.id); setQ(""); }} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: c.card, marginBottom: 6 }}>
          <T v="body" style={{ fontWeight: "700" }}>{l.name}</T><T v="sub" muted>{[l.company, l.phone].filter(Boolean).join(" · ")}</T>
        </Press>
      ))}
    </View>
  );
}

// ── Payment against an invoice ──
function PaymentForm({ visible, onClose, invoice }) {
  const { c } = useTheme();
  const { db, update } = useStore();
  const [invId, setInvId] = useState(invoice?.id || "");
  const [amount, setAmount] = useState(invoice ? String(invoiceBalance(invoice)) : "");
  const [mode, setMode] = useState("UPI");
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const open = db.invoices.filter((i) => isTaxInvoice(i) && invoiceBalance(i) > 0);
  const inv = db.invoices.find((i) => i.id === invId);

  const save = () => {
    if (!inv) return setErr("Choose an invoice");
    const amt = Math.round(Number(amount));
    const bal = invoiceBalance(inv);
    if (!amt || amt <= 0) return setErr("Enter a valid amount");
    if (amt > bal) return setErr(`Can't be more than the balance of ${inr(bal)}`);
    const payments = [...(inv.payments || []), { id: uid("p"), date: today(), amount: amt, mode, ref: ref.trim(), note: "Recorded from mobile" }];
    const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    update("invoices", inv.id, { payments, status: paid >= invoiceTotal(inv) ? "Paid" : "Partially Paid" }, `${inr(amt)} received from ${inv.client?.company || inv.client?.name}`);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Record payment" subtitle="Money received from a client"
      footer={<><ErrorLine text={err} /><Button variant="success" title="Save payment" icon="checkmark" onPress={save} /></>}>
      {!invoice && (
        <>
          <T v="sub" muted style={{ marginBottom: 8, fontWeight: "600" }}>Invoice</T>
          {open.length === 0 && <T muted style={{ marginBottom: 14 }}>No unpaid invoices 🎉</T>}
          {open.slice(0, 8).map((i) => {
            const on = i.id === invId;
            return (
              <Press key={i.id} onPress={() => { setInvId(i.id); setAmount(String(invoiceBalance(i))); }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: radius.md, marginBottom: 8, backgroundColor: on ? c.brandSoft : c.card, borderWidth: 1.5, borderColor: on ? c.brand : c.line }}>
                <View style={{ flex: 1 }}><T v="body" style={{ fontWeight: "700" }} numberOfLines={1}>{i.client?.company || i.client?.name}</T><T v="sub" muted>{i.number}</T></View>
                <T v="h3" color={c.danger}>{inr(invoiceBalance(i))}</T>
              </Press>
            );
          })}
        </>
      )}
      {inv && (
        <Row style={{ backgroundColor: c.card, borderRadius: radius.md, padding: 14, marginVertical: 8, justifyContent: "space-around" }}>
          <Mini label="Total" value={inr(invoiceTotal(inv))} />
          <Mini label="Paid" value={inr(invoicePaid(inv))} color={c.success} />
          <Mini label="Balance" value={inr(invoiceBalance(inv))} color={c.danger} />
        </Row>
      )}
      <Input label="Amount received ₹" icon="cash-outline" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <Choice label="Paid by" options={PAYMENT_MODES} value={mode} onChange={setMode} />
      <Input label="Reference (UTR / cheque no.)" value={ref} onChangeText={setRef} placeholder="Optional" />
    </Sheet>
  );
}

function ExpenseForm({ visible, onClose }) {
  const { add, user } = useStore();
  const [f, setF] = useState(() => ({ category: "Travel", description: "", vendor: "", amount: "", mode: "UPI", date: today() }));
  const [err, setErr] = useState("");
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const save = () => {
    const amt = Math.round(Number(f.amount));
    if (!amt || amt <= 0) return setErr("Enter the amount");
    if (!f.description.trim()) return setErr("What was it for?");
    add("expenses", { ...f, amount: amt, description: f.description.trim(), vendor: f.vendor.trim(), branch: user.branch || "", status: "Paid" }, "X");
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Add expense" subtitle="Money the business spent"
      footer={<><ErrorLine text={err} /><Button title="Save expense" icon="checkmark" onPress={save} /></>}>
      <Input label="Amount ₹" icon="cash-outline" value={f.amount} onChangeText={set("amount")} keyboardType="numeric" placeholder="0" autoFocus />
      <Input label="What was it for?" value={f.description} onChangeText={set("description")} placeholder="e.g. Client visit — cab" />
      <Choice label="Category" options={EXPENSE_CATEGORIES} value={f.category} onChange={set("category")} />
      <Input label="Paid to" value={f.vendor} onChangeText={set("vendor")} placeholder="Vendor / person (optional)" />
      <Choice label="Paid by" options={PAYMENT_MODES} value={f.mode} onChange={set("mode")} />
      <DateStrip label="Date" value={f.date} onChange={set("date")} start={today()} days={15} back />
    </Sheet>
  );
}

function Mini({ label, value, color }) {
  return <View style={{ alignItems: "center" }}><T v="sub" muted>{label}</T><T v="h3" color={color} style={{ marginTop: 2 }}>{value}</T></View>;
}
function ErrorLine({ text }) {
  const { c } = useTheme();
  if (!text) return null;
  return <Row gap={6} style={{ marginBottom: 10 }}><Ionicons name="alert-circle" size={16} color={c.danger} /><Text style={{ color: c.danger, fontWeight: "600" }}>{text}</Text></Row>;
}
