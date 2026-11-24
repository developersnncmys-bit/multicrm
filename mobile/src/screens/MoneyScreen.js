import { useMemo, useState } from "react";
import { Alert, Linking, RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Badge, Card, Empty, Header, IconBtn, Press, Progress, Row, Segmented, T } from "../components/ui";
import { useSheets } from "../components/forms";
import { radius, soft, useTheme } from "../theme";
import { useStore } from "../store";
import { cleanPhone, fmtDate, inr, inrShort, invoiceBalance, invoicePaid, invoiceTotal, isTaxInvoice, relDay, today } from "../utils";

export default function MoneyScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, can, refreshing, refresh, remove } = useStore();
  const { open } = useSheets();
  const t = today();
  const month = t.slice(0, 7);
  const showInv = can("invoices"); const showExp = can("expenses");
  const [tab, setTab] = useState(showInv ? "due" : "expenses");

  const inv = useMemo(() => db.invoices.filter(isTaxInvoice), [db.invoices]);
  const sum = useMemo(() => {
    const pays = inv.flatMap((i) => (i.payments || []).map((p) => ({ ...p, inv: i })));
    const inMonth = pays.filter((p) => (p.date || "").startsWith(month));
    const exp = db.expenses.filter((e) => (e.date || "").startsWith(month));
    return {
      billed: inv.reduce((a, i) => a + invoiceTotal(i), 0),
      collected: inv.reduce((a, i) => a + invoicePaid(i), 0),
      pending: inv.reduce((a, i) => a + invoiceBalance(i), 0),
      inMonth: inMonth.reduce((a, p) => a + Number(p.amount || 0), 0),
      spentMonth: exp.reduce((a, e) => a + Number(e.amount || 0), 0),
      recent: pays.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 30),
    };
  }, [inv, db.expenses, month]);

  const due = inv.filter((i) => invoiceBalance(i) > 0).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const expenses = db.expenses.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const ratio = sum.billed ? sum.collected / sum.billed : 0;

  const remind = (i) => {
    const phone = i.client?.phone; if (!phone) return Alert.alert("No phone number", "This client has no phone number saved.");
    const msg = `Hi ${(i.client?.name || "").split(" ")[0]}, a gentle reminder that ${inr(invoiceBalance(i))} is pending against invoice ${i.number}${i.dueDate ? ` (due ${fmtDate(i.dueDate)})` : ""}. Thank you!`;
    Linking.openURL(`https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(msg)}`);
  };

  const tabs = [showInv && { value: "due", label: "To collect", count: due.length }, showInv && { value: "received", label: "Received" }, showExp && { value: "expenses", label: "Spent" }].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Header title="Money" subtitle="Collections, payments and expenses"
        right={<>
          {showExp && can("expenses", true) && <IconBtn icon="receipt-outline" onPress={() => open("expense")} />}
          {showInv && can("invoices", true) && <IconBtn icon="add" bg={c.success} color="#fff" onPress={() => open("payment")} />}
        </>} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.brand} colors={[c.brand]} />}>
        {showInv && (
          <Card style={{ marginBottom: 14 }}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <View>
                <T v="sub" muted style={{ fontWeight: "600" }}>Collected overall</T>
                <T v="display" style={{ marginTop: 2 }}>{inrShort(sum.collected)}</T>
              </View>
              <Badge label={`${Math.round(ratio * 100)}% of billed`} color={c.success} />
            </Row>
            <View style={{ marginTop: 14 }}><Progress value={ratio} color={c.success} height={8} /></View>
            <View style={{ height: 14 }} />
            <Row gap={10}>
              <Tile label="Pending" value={inrShort(sum.pending)} color={c.danger} icon="hourglass-outline" />
              <Tile label="This month" value={inrShort(sum.inMonth)} color={c.success} icon="trending-up" />
              {showExp && <Tile label="Spent" value={inrShort(sum.spentMonth)} color={c.warning} icon="trending-down" />}
            </Row>
          </Card>
        )}

        {tabs.length > 1 && <Segmented options={tabs} value={tab} onChange={setTab} style={{ marginBottom: 16 }} />}

        {tab === "due" && (due.length === 0 ? <Card><Empty icon="happy-outline" title="Nothing pending" text="Every invoice is fully paid." /></Card> :
          due.map((i) => {
            const late = i.dueDate && i.dueDate < t; const total = invoiceTotal(i); const paid = invoicePaid(i);
            return (
              <Card key={i.id} style={{ marginBottom: 12 }}>
                <Row gap={12}>
                  <Avatar name={i.client?.company || i.client?.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <T v="h3" numberOfLines={1}>{i.client?.company || i.client?.name}</T>
                    <T v="sub" muted>{i.number}</T>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <T v="h3" color={late ? c.danger : c.text}>{inr(invoiceBalance(i))}</T>
                    <T v="sub" faint style={{ fontSize: 12 }}>of {inrShort(total)}</T>
                  </View>
                </Row>
                <View style={{ marginTop: 12 }}><Progress value={total ? paid / total : 0} color={c.success} /></View>
                <Row style={{ justifyContent: "space-between", marginTop: 12 }}>
                  <Badge label={i.dueDate ? (late ? `Overdue · ${relDay(i.dueDate)}` : `Due ${relDay(i.dueDate).toLowerCase()}`) : i.status} color={late ? c.danger : c.warning} />
                  <Row gap={8}>
                    <Press onPress={() => remind(i)} style={{ height: 34, paddingHorizontal: 12, borderRadius: 11, backgroundColor: soft("#16A34A", 0.12), flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="logo-whatsapp" size={15} color="#16A34A" /><T v="sub" color="#16A34A" style={{ fontWeight: "700" }}>Remind</T>
                    </Press>
                    {can("invoices", true) && (
                      <Press onPress={() => open("payment", { invoice: i })} style={{ height: 34, paddingHorizontal: 12, borderRadius: 11, backgroundColor: c.success, flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="checkmark" size={15} color="#fff" /><T v="sub" color="#fff" style={{ fontWeight: "700" }}>Received</T>
                      </Press>
                    )}
                  </Row>
                </Row>
              </Card>
            );
          }))}

        {tab === "received" && (sum.recent.length === 0 ? <Card><Empty icon="wallet-outline" title="No payments yet" /></Card> : (
          <Card pad={6}>
            {sum.recent.map((p, idx) => (
              <Row key={`${p.inv.id}-${p.id || idx}`} gap={12} style={{ padding: 10, borderBottomWidth: idx < sum.recent.length - 1 ? 1 : 0, borderColor: c.line }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: soft(c.success, 0.13), alignItems: "center", justifyContent: "center" }}><Ionicons name="arrow-down" size={18} color={c.success} /></View>
                <View style={{ flex: 1 }}><T v="body" style={{ fontWeight: "700" }} numberOfLines={1}>{p.inv.client?.company || p.inv.client?.name}</T><T v="sub" muted>{fmtDate(p.date)} · {p.mode}</T></View>
                <T v="h3" color={c.success}>+{inrShort(p.amount)}</T>
              </Row>
            ))}
          </Card>
        ))}

        {tab === "expenses" && (expenses.length === 0 ? <Card><Empty icon="receipt-outline" title="No expenses" action={can("expenses", true) ? "Add expense" : undefined} onAction={() => open("expense")} /></Card> : (
          <Card pad={6}>
            {expenses.slice(0, 60).map((e, idx) => (
              <Press key={e.id} haptic={false} scale={1}
                onLongPress={() => can("expenses", true) && Alert.alert("Delete expense?", `${e.description} · ${inr(e.amount)}`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => remove("expenses", e.id) }])}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderBottomWidth: idx < Math.min(59, expenses.length - 1) ? 1 : 0, borderColor: c.line }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: soft(c.warning, 0.13), alignItems: "center", justifyContent: "center" }}><Ionicons name="arrow-up" size={18} color={c.warning} /></View>
                <View style={{ flex: 1 }}><T v="body" style={{ fontWeight: "700" }} numberOfLines={1}>{e.description}</T><T v="sub" muted>{fmtDate(e.date)} · {e.category}</T></View>
                <T v="h3">−{inrShort(e.amount)}</T>
              </Press>
            ))}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function Tile({ label, value, color, icon }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.cardAlt, borderRadius: radius.md, padding: 12 }}>
      <Ionicons name={icon} size={16} color={color} />
      <T v="h3" style={{ marginTop: 6 }}>{value}</T>
      <T v="sub" faint style={{ fontSize: 11.5 }}>{label}</T>
    </View>
  );
}
