// Reports & P&L, Attendance, Company settings.
import { useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Text } from "../components/Text";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Badge, Button, Card, Chip, ChipScroll, Input, Press, Progress, Row, Segmented, T } from "../components/ui";
import { DateStrip } from "../components/pickers";
import { StackHeader } from "./ModuleScreens";
import { radius, soft, useTheme } from "../theme";
import { useStore } from "../store";
import { OPEN_STAGES, fmtTime, inr, inrShort, invoiceTotal, isTaxInvoice, today } from "../utils";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthsBack = (n) => { const out = []; const d = new Date(); d.setDate(1); for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`); } return out; };

// ── Reports & P&L ──
export function ReportsScreen({ navigation }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db } = useStore();
  const [tab, setTab] = useState("pl");
  const [range, setRange] = useState(6);

  const data = useMemo(() => {
    const months = monthsBack(range);
    const inv = db.invoices.filter(isTaxInvoice);
    const pays = inv.flatMap((i) => i.payments || []);
    const rows = months.map((m) => {
      const income = pays.filter((p) => (p.date || "").startsWith(m)).reduce((a, p) => a + Number(p.amount || 0), 0);
      const expense = db.expenses.filter((e) => (e.date || "").startsWith(m)).reduce((a, e) => a + Number(e.amount || 0), 0);
      const billed = inv.filter((i) => (i.date || "").startsWith(m)).reduce((a, i) => a + invoiceTotal(i), 0);
      return { m, income, expense, billed, profit: income - expense };
    });
    const tot = rows.reduce((a, r) => ({ income: a.income + r.income, expense: a.expense + r.expense, billed: a.billed + r.billed }), { income: 0, expense: 0, billed: 0 });
    const byCat = {};
    for (const e of db.expenses.filter((x) => months.some((m) => (x.date || "").startsWith(m)))) byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0);
    const team = db.users.filter((u) => u.active !== false).map((u) => {
      const mine = db.leads.filter((l) => l.ownerId === u.id);
      return { u, leads: mine.length, won: mine.filter((l) => l.stage === "Won").length, open: mine.filter((l) => OPEN_STAGES.includes(l.stage)).reduce((a, l) => a + (Number(l.value) || 0), 0), wonValue: mine.filter((l) => l.stage === "Won").reduce((a, l) => a + (Number(l.value) || 0), 0) };
    }).filter((x) => x.leads).sort((a, b) => b.wonValue - a.wonValue || b.won - a.won);
    const branches = {};
    for (const l of db.leads) { const b = l.branch || "Other"; branches[b] ||= { leads: 0, won: 0, value: 0 }; branches[b].leads++; if (l.stage === "Won") { branches[b].won++; branches[b].value += Number(l.value) || 0; } }
    const exByBranch = {};
    for (const e of db.expenses) exByBranch[e.branch || "Other"] = (exByBranch[e.branch || "Other"] || 0) + Number(e.amount || 0);
    return { rows, tot, byCat: Object.entries(byCat).sort((a, b) => b[1] - a[1]), team, branches: Object.entries(branches), exByBranch };
  }, [db, range]);

  const max = Math.max(1, ...data.rows.map((r) => Math.max(r.income, r.expense)));
  const profit = data.tot.income - data.tot.expense;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title="Reports" subtitle="Profit & loss, team and branches" navigation={navigation} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        <Segmented options={[{ value: "pl", label: "P&L" }, { value: "team", label: "Leaderboard" }, { value: "branch", label: "Branches" }]} value={tab} onChange={setTab} style={{ marginBottom: 16 }} />

        {tab === "pl" && (
          <>
            <ChipScroll style={{ paddingHorizontal: 0, paddingBottom: 14 }}>
              {[3, 6, 12].map((n) => <Chip key={n} label={`Last ${n} months`} active={range === n} onPress={() => setRange(n)} />)}
            </ChipScroll>
            <Card style={{ marginBottom: 14 }}>
              <T v="sub" muted style={{ fontWeight: "600" }}>{profit >= 0 ? "Profit" : "Loss"} · last {range} months</T>
              <T v="display" color={profit >= 0 ? c.success : c.danger} style={{ marginTop: 2 }}>{inrShort(Math.abs(profit))}</T>
              <Row gap={10} style={{ marginTop: 14 }}>
                <Mini label="Money in" value={inrShort(data.tot.income)} color={c.success} />
                <Mini label="Money out" value={inrShort(data.tot.expense)} color={c.danger} />
                <Mini label="Billed" value={inrShort(data.tot.billed)} color={c.brand} />
              </Row>
            </Card>
            <Card style={{ marginBottom: 14 }}>
              <Row style={{ justifyContent: "space-between", marginBottom: 14 }}>
                <T v="h3">Month by month</T>
                <Row gap={10}><Legend color={c.success} label="In" /><Legend color={c.danger} label="Out" /></Row>
              </Row>
              <Row style={{ alignItems: "flex-end", height: 150, gap: 6 }}>
                {data.rows.map((r) => (
                  <View key={r.m} style={{ flex: 1, alignItems: "center" }}>
                    <Row gap={2} style={{ alignItems: "flex-end", height: 130 }}>
                      <View style={{ width: range > 6 ? 6 : 11, height: Math.max(2, (r.income / max) * 130), borderRadius: 4, backgroundColor: c.success }} />
                      <View style={{ width: range > 6 ? 6 : 11, height: Math.max(2, (r.expense / max) * 130), borderRadius: 4, backgroundColor: c.danger }} />
                    </Row>
                    <T v="sub" faint style={{ fontSize: 10.5, marginTop: 5 }}>{MON[Number(r.m.slice(5)) - 1]}</T>
                  </View>
                ))}
              </Row>
            </Card>
            <Card pad={6} style={{ marginBottom: 14 }}>
              {data.rows.slice().reverse().map((r, i) => (
                <Row key={r.m} style={{ padding: 10, borderBottomWidth: i < data.rows.length - 1 ? 1 : 0, borderColor: c.line, justifyContent: "space-between" }}>
                  <T v="body" style={{ fontWeight: "700", width: 70 }}>{MON[Number(r.m.slice(5)) - 1]} {r.m.slice(2, 4)}</T>
                  <T v="sub" color={c.success} style={{ flex: 1, textAlign: "right" }}>+{inrShort(r.income)}</T>
                  <T v="sub" color={c.danger} style={{ flex: 1, textAlign: "right" }}>−{inrShort(r.expense)}</T>
                  <T v="body" style={{ flex: 1, textAlign: "right", fontWeight: "800" }} color={r.profit >= 0 ? c.text : c.danger}>{inrShort(r.profit)}</T>
                </Row>
              ))}
            </Card>
            {data.byCat.length > 0 && (
              <Card>
                <T v="h3" style={{ marginBottom: 12 }}>Where the money went</T>
                {data.byCat.map(([cat, v]) => (
                  <View key={cat} style={{ marginBottom: 12 }}>
                    <Row style={{ justifyContent: "space-between", marginBottom: 5 }}><T v="sub" style={{ fontWeight: "600" }}>{cat}</T><T v="sub" style={{ fontWeight: "700" }}>{inr(v)}</T></Row>
                    <Progress value={v / data.byCat[0][1]} color={c.warning} />
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {tab === "team" && data.team.map((x, i) => (
          <Card key={x.u.id} style={{ marginBottom: 10 }}>
            <Row gap={12}>
              <View style={{ width: 28, alignItems: "center" }}><Text style={{ fontSize: i < 3 ? 22 : 15, fontWeight: "800", color: c.sub }}>{["🥇", "🥈", "🥉"][i] || i + 1}</Text></View>
              <Avatar name={x.u.name} size={42} />
              <View style={{ flex: 1 }}><T v="h3">{x.u.name}</T><T v="sub" muted>{x.u.role} · {x.leads} leads · {x.won} won</T></View>
              <View style={{ alignItems: "flex-end" }}><T v="h3" color={c.success}>{inrShort(x.wonValue)}</T><T v="sub" faint style={{ fontSize: 11.5 }}>{inrShort(x.open)} open</T></View>
            </Row>
          </Card>
        ))}
        {tab === "team" && !data.team.length && <Card><T muted>No leads assigned yet.</T></Card>}

        {tab === "branch" && data.branches.map(([b, v]) => (
          <Card key={b} style={{ marginBottom: 10 }}>
            <Row style={{ justifyContent: "space-between" }}><T v="h3">{b}</T><Badge label={`${v.leads ? Math.round((v.won / v.leads) * 100) : 0}% won`} color={c.success} /></Row>
            <Row gap={10} style={{ marginTop: 12 }}>
              <Mini label="Leads" value={String(v.leads)} color={c.brand} />
              <Mini label="Won value" value={inrShort(v.value)} color={c.success} />
              <Mini label="Expenses" value={inrShort(data.exByBranch[b] || 0)} color={c.danger} />
            </Row>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function Mini({ label, value, color }) {
  const { c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.cardAlt, borderRadius: radius.md, padding: 11 }}><T v="sub" faint style={{ fontSize: 11.5 }}>{label}</T><T v="h3" color={color} style={{ marginTop: 3 }}>{value}</T></View>;
}
function Legend({ color, label }) {
  return <Row gap={5}><View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }} /><T v="sub" muted style={{ fontSize: 12 }}>{label}</T></Row>;
}

// ── Attendance ──
const ATT = [
  { s: "Present", color: "#10B981", icon: "checkmark-circle" },
  { s: "Late", color: "#F59E0B", icon: "time" },
  { s: "Half Day", color: "#0EA5E9", icon: "contrast" },
  { s: "Absent", color: "#F43F5E", icon: "close-circle" },
  { s: "Leave", color: "#8B5CF6", icon: "airplane" },
];
export function AttendanceScreen({ navigation }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, can, setAttendance, toast } = useStore();
  const [date, setDate] = useState(today());
  const edit = can("team", true);
  const emps = db.employees.filter((e) => e.status !== "Left");
  const recOf = (e) => db.attendance?.[`${date}|${e.id}`];
  const counts = Object.fromEntries(ATT.map((a) => [a.s, emps.filter((e) => recOf(e)?.status === a.s).length]));
  const marked = emps.filter((e) => recOf(e)).length;
  const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const mark = (e, s) => {
    const cur = recOf(e);
    if (cur?.status === s) { setAttendance(`${date}|${e.id}`, null); return; }
    setAttendance(`${date}|${e.id}`, { status: s, in: ["Present", "Late", "Half Day"].includes(s) ? cur?.in || (date === today() ? now() : "") : "", out: cur?.out || "" });
  };
  const allPresent = () => Alert.alert("Mark everyone present?", `${emps.length - marked} people not marked yet will be marked Present.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Mark present", onPress: () => { emps.filter((e) => !recOf(e)).forEach((e) => setAttendance(`${date}|${e.id}`, { status: "Present", in: date === today() ? now() : "", out: "" })); toast("Everyone else marked present"); } },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title="Attendance" subtitle={`${marked}/${emps.length} marked`} navigation={navigation} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        <DateStrip value={date} onChange={setDate} start={today()} days={14} back />
        <Row gap={8} style={{ marginBottom: 14, flexWrap: "wrap" }}>
          {ATT.map((a) => <Badge key={a.s} label={`${a.s} ${counts[a.s]}`} color={a.color} />)}
        </Row>
        {edit && marked < emps.length && <Button variant="soft" icon="checkmark-done" title="Mark everyone else present" onPress={allPresent} style={{ marginBottom: 14 }} />}
        {emps.map((e) => {
          const r = recOf(e);
          return (
            <Card key={e.id} style={{ marginBottom: 10 }} pad={14}>
              <Row gap={12}>
                <Avatar name={e.name} size={40} />
                <View style={{ flex: 1 }}><T v="h3" numberOfLines={1}>{e.name}</T><T v="sub" muted numberOfLines={1}>{e.designation}{r?.in ? ` · in ${fmtTime(r.in)}` : ""}</T></View>
                {r && <Badge label={r.status} color={ATT.find((a) => a.s === r.status)?.color} />}
              </Row>
              {edit && (
                <Row gap={6} style={{ marginTop: 12 }}>
                  {ATT.map((a) => {
                    const on = r?.status === a.s;
                    return (
                      <Press key={a.s} onPress={() => mark(e, a.s)} style={{ flex: 1, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: on ? a.color : soft(a.color, 0.1) }}>
                        <Ionicons name={a.icon} size={17} color={on ? "#fff" : a.color} />
                      </Press>
                    );
                  })}
                </Row>
              )}
            </Card>
          );
        })}
        <T v="sub" faint style={{ textAlign: "center", marginTop: 6 }}>✓ Present · ⏱ Late · ◐ Half day · ✕ Absent · ✈ Leave — tap again to clear</T>
      </ScrollView>
    </View>
  );
}

// ── Company settings ──
const COMPANY_FIELDS = [["name", "Company name"], ["phone", "Phone"], ["email", "Email"], ["website", "Website"], ["address", "Address"], ["gstin", "GSTIN"], ["pan", "PAN"], ["state", "State"]];
export function CompanySettingsScreen({ navigation }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, user, setSettings } = useStore();
  const admin = user.role === "Admin";
  const [co, setCo] = useState(() => ({ ...(db.settings?.company || {}) }));
  const [docs, setDocs] = useState(() => ({ ...(db.settings?.docs || {}) }));
  const [tg, setTg] = useState(() => ({ ...(db.settings?.targets || {}) }));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title="Company settings" subtitle={admin ? "Shown on quotations & invoices" : "Only an Admin can change these"} navigation={navigation} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <T v="cap" faint style={{ marginBottom: 10 }}>Company profile</T>
        <Card style={{ marginBottom: 18 }}>
          {COMPANY_FIELDS.map(([k, l]) => <Input key={k} label={l} value={co[k] || ""} onChangeText={(v) => setCo((s) => ({ ...s, [k]: v }))} editable={admin} multiline={k === "address"} autoCapitalize={k === "email" || k === "website" ? "none" : "sentences"} />)}
          {admin && <Button title="Save profile" icon="checkmark" onPress={() => setSettings("company", co)} />}
        </Card>
        <T v="cap" faint style={{ marginBottom: 10 }}>Quotations & invoices</T>
        <Card style={{ marginBottom: 18 }}>
          <Row gap={10}>
            <Input style={{ flex: 1 }} label="Quote prefix" value={docs.quotePrefix || ""} onChangeText={(v) => setDocs((s) => ({ ...s, quotePrefix: v }))} editable={admin} autoCapitalize="characters" />
            <Input style={{ flex: 1 }} label="Invoice prefix" value={docs.invoicePrefix || ""} onChangeText={(v) => setDocs((s) => ({ ...s, invoicePrefix: v }))} editable={admin} autoCapitalize="characters" />
          </Row>
          <Row gap={10}>
            <Input style={{ flex: 1 }} label="Default GST %" value={String(docs.defaultGst ?? "")} onChangeText={(v) => setDocs((s) => ({ ...s, defaultGst: Number(v) || 0 }))} keyboardType="numeric" editable={admin} />
            <Input style={{ flex: 1 }} label="Payment days" value={String(docs.paymentTerms ?? "")} onChangeText={(v) => setDocs((s) => ({ ...s, paymentTerms: Number(v) || 0 }))} keyboardType="numeric" editable={admin} />
          </Row>
          <Input label="Terms & conditions" value={docs.terms || ""} onChangeText={(v) => setDocs((s) => ({ ...s, terms: v }))} multiline editable={admin} />
          {admin && <Button title="Save document settings" icon="checkmark" onPress={() => setSettings("docs", docs)} />}
        </Card>
        <T v="cap" faint style={{ marginBottom: 10 }}>Monthly targets</T>
        <Card>
          {Object.keys(tg).length === 0 && <T muted style={{ marginBottom: 10 }}>No targets set yet.</T>}
          {Object.entries(tg).filter(([, v]) => typeof v !== "object").map(([k, v]) => (
            <Input key={k} label={k.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase())} value={String(v ?? "")} onChangeText={(x) => setTg((s) => ({ ...s, [k]: isNaN(Number(x)) ? x : Number(x) }))} keyboardType="numeric" editable={admin} />
          ))}
          {admin && Object.keys(tg).length > 0 && <Button title="Save targets" icon="checkmark" onPress={() => setSettings("targets", tg)} />}
        </Card>
      </ScrollView>
    </View>
  );
}
