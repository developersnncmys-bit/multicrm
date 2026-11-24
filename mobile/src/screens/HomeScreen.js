import { useMemo, useCallback } from "react";
import { Linking, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "../components/Text";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { setStatusBarStyle } from "expo-status-bar";
import { Avatar, Badge, Card, IconBtn, Press, Row, SectionTitle, T } from "../components/ui";
import { TaskRow } from "../components/rows";
import { useSheets } from "../components/forms";
import { STAGE_COLOR, radius, shadow, soft, useTheme } from "../theme";
import { useStore } from "../store";
import { OPEN_STAGES, cleanPhone, greeting, inrShort, invoiceBalance, invoiceTotal, isTaxInvoice, relDay, today } from "../utils";


// White status-bar icons while this screen (purple header) is in focus
function useLightStatusBar() {
  const { isDark } = useTheme();
  useFocusEffect(useCallback(() => { setStatusBarStyle("light"); return () => setStatusBarStyle(isDark ? "light" : "dark"); }, [isDark]));
}

export default function HomeScreen({ navigation }) {
  const { c } = useTheme();
  useLightStatusBar();
  const insets = useSafeAreaInsets();
  const { user, db, can, refreshing, refresh } = useStore();
  const { open } = useSheets();
  const t = today();
  const month = t.slice(0, 7);

  const s = useMemo(() => {
    const open = db.leads.filter((l) => OPEN_STAGES.includes(l.stage));
    const inv = db.invoices.filter(isTaxInvoice);
    const collectedMonth = inv.flatMap((i) => i.payments || []).filter((p) => (p.date || "").startsWith(month)).reduce((a, p) => a + Number(p.amount || 0), 0);
    const pending = inv.reduce((a, i) => a + invoiceBalance(i), 0);
    const overdueInv = inv.filter((i) => invoiceBalance(i) > 0 && i.dueDate && i.dueDate < t);
    const mine = db.tasks.filter((x) => !x.done && x.status !== "Cancelled" && (user.role === "Admin" || x.assigneeId === user.id));
    return {
      openLeads: open.length,
      pipeline: open.reduce((a, l) => a + (Number(l.value) || 0), 0),
      wonMonth: db.leads.filter((l) => l.stage === "Won" && (l.wonAt || l.updatedAt || l.createdAt || "").startsWith(month)).length,
      followUps: open.filter((l) => l.nextFollowUp && l.nextFollowUp <= t).sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp)),
      todayTasks: mine.filter((x) => x.date === t).sort((a, b) => (a.time || "99").localeCompare(b.time || "99")),
      lateTasks: mine.filter((x) => x.date < t).length,
      collectedMonth, pending, overdueInv,
      billed: inv.reduce((a, i) => a + invoiceTotal(i), 0),
      openTickets: db.tickets.filter((k) => !["Resolved", "Closed"].includes(k.status)).length,
      liveProjects: db.projects.filter((p) => !["Completed", "On Hold", "Cancelled"].includes(p.stage)).length,
    };
  }, [db, t, month, user]);

  const unread = db.notifications.filter((n) => !n.read).length;
  const showMoney = can("invoices");

  const actions = [
    can("leads", true) && { icon: "person-add", label: "Lead", color: "#6366F1", onPress: () => open("lead") },
    can("calendar", true) && { icon: "call", label: "Call", color: "#10B981", onPress: () => open("task", { type: "Call" }) },
    can("calendar", true) && { icon: "videocam", label: "Meeting", color: "#0EA5E9", onPress: () => open("task", { type: "Meeting" }) },
    can("invoices", true) && { icon: "wallet", label: "Payment", color: "#F59E0B", onPress: () => open("payment") },
    can("expenses", true) && { icon: "receipt", label: "Expense", color: "#EC4899", onPress: () => open("expense") },
  ].filter(Boolean).slice(0, 4);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" colors={[c.brand]} progressViewOffset={insets.top} />}>
        {/* Hero */}
        <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 74, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden" }}>
          <View style={{ position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.07)", top: -60, right: -60 }} />
          <Row style={{ justifyContent: "space-between" }}>
            <Press onPress={() => navigation.navigate("Profile")}>
              <Row gap={12}>
                <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>{user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</Text>
                </View>
                <View>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13.5, fontWeight: "600" }}>{greeting()} 👋</Text>
                  <Text style={{ color: "#fff", fontSize: 19, fontWeight: "800" }}>{user.name.split(" ")[0]}</Text>
                </View>
              </Row>
            </Press>
            <Row gap={10}>
              <IconBtn icon="grid-outline" color="#fff" bg="rgba(255,255,255,0.18)" onPress={() => navigation.navigate("AllModules")} />
              <IconBtn icon="notifications-outline" color="#fff" bg="rgba(255,255,255,0.18)" badge={unread} onPress={() => navigation.navigate("Notifications")} />
            </Row>
          </Row>

          {showMoney ? (
            <View style={{ marginTop: 26 }}>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13.5, fontWeight: "600" }}>Collected this month</Text>
              <Text style={{ color: "#fff", fontSize: 38, fontWeight: "800", letterSpacing: -1, marginTop: 2 }}>{inrShort(s.collectedMonth)}</Text>
              <Row gap={8} style={{ marginTop: 8 }}>
                <Pill icon="time-outline" text={`${inrShort(s.pending)} to collect`} />
                {s.overdueInv.length > 0 && <Pill icon="alert-circle-outline" text={`${s.overdueInv.length} overdue`} warn />}
              </Row>
            </View>
          ) : (
            <View style={{ marginTop: 26 }}>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13.5, fontWeight: "600" }}>Today</Text>
              <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.6, marginTop: 2 }}>{s.todayTasks.length} {s.todayTasks.length === 1 ? "thing" : "things"} on your plate</Text>
              <Row gap={8} style={{ marginTop: 8 }}>
                <Pill icon="call-outline" text={`${s.followUps.length} follow-ups due`} />
                {s.lateTasks > 0 && <Pill icon="alert-circle-outline" text={`${s.lateTasks} late`} warn />}
              </Row>
            </View>
          )}
        </LinearGradient>

        {/* Quick actions */}
        {actions.length > 0 && (
          <Row style={[{ marginHorizontal: 20, marginTop: -44, backgroundColor: c.card, borderRadius: radius.lg, paddingVertical: 16, justifyContent: "space-around" }, shadow(c, 2)]}>
            {actions.map((a) => (
              <Press key={a.label} onPress={a.onPress} style={{ alignItems: "center", width: 70 }}>
                <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: soft(a.color, 0.13), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <T v="sub" style={{ marginTop: 7, fontWeight: "700", fontSize: 12.5 }}>{a.label}</T>
              </Press>
            ))}
          </Row>
        )}

        {/* Stats */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20, marginTop: 20 }}>
          {can("leads") && <Stat icon="people" color="#6366F1" label="Open leads" value={s.openLeads} sub={`${inrShort(s.pipeline)} pipeline`} onPress={() => navigation.navigate("Leads")} />}
          {can("leads") && <Stat icon="call" color="#F43F5E" label="Follow-ups due" value={s.followUps.length} sub="today or earlier" onPress={() => navigation.navigate("Leads", { filter: "due", at: Date.now() })} />}
          {can("calendar") && <Stat icon="calendar" color="#0EA5E9" label="Today's schedule" value={s.todayTasks.length} sub={s.lateTasks ? `${s.lateTasks} late from before` : "nothing late"} onPress={() => navigation.navigate("Schedule")} />}
          {can("projects") && <Stat icon="rocket" color="#8B5CF6" label="Live projects" value={s.liveProjects} sub="in progress" onPress={() => navigation.navigate("Projects")} />}
          {can("invoices") && <Stat icon="document-text" color="#10B981" label="Billed so far" value={inrShort(s.billed)} sub="all invoices" onPress={() => navigation.navigate("Money")} />}
          {can("tickets") && <Stat icon="chatbubbles" color="#F59E0B" label="Open tickets" value={s.openTickets} sub="need a reply" onPress={() => navigation.navigate("Tickets")} />}
        </View>

        {/* All modules */}
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <Card onPress={() => navigation.navigate("AllModules")}>
            <Row gap={14}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="apps" size={23} color={c.brand} /></View>
              <View style={{ flex: 1 }}><T v="h3">All modules</T><T v="sub" muted>Contacts, quotations, invoices, team, reports, settings…</T></View>
              <Ionicons name="chevron-forward" size={20} color={c.faint} />
            </Row>
          </Card>
        </View>

        {/* Today */}
        {can("calendar") && (
          <View style={{ paddingHorizontal: 20, marginTop: 26 }}>
            <SectionTitle title="Today's schedule" action="See all" onAction={() => navigation.navigate("Schedule")} />
            {s.todayTasks.length === 0 ? (
              <Card><Row gap={12}><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="sunny" size={22} color={c.brand} /></View>
                <View style={{ flex: 1 }}><T v="h3">A clear day</T><T v="sub" muted>Nothing booked. Tap + to schedule a call.</T></View></Row></Card>
            ) : (
              <Card pad={6}>{s.todayTasks.slice(0, 5).map((x, i) => <TaskRow key={x.id} task={x} last={i === Math.min(4, s.todayTasks.length - 1)} />)}</Card>
            )}
          </View>
        )}

        {/* Follow-ups */}
        {can("leads") && s.followUps.length > 0 && (
          <View style={{ marginTop: 26 }}>
            <SectionTitle title="Call these people" action="All" onAction={() => navigation.navigate("Leads", { filter: "due", at: Date.now() })} style={{ paddingHorizontal: 20 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 6 }}>
              {s.followUps.slice(0, 10).map((l) => (
                <Card key={l.id} style={{ width: 220 }} onPress={() => navigation.navigate("Lead", { id: l.id })}>
                  <Row gap={10}>
                    <Avatar name={l.name} size={40} />
                    <View style={{ flex: 1 }}><T v="h3" numberOfLines={1}>{l.name}</T><T v="sub" muted numberOfLines={1}>{l.company || l.service}</T></View>
                  </Row>
                  <Row style={{ justifyContent: "space-between", marginTop: 14 }}>
                    <Badge label={relDay(l.nextFollowUp)} color={l.nextFollowUp < t ? c.danger : c.warning} />
                    <Badge label={l.stage} color={STAGE_COLOR[l.stage]} dot />
                  </Row>
                  <Row gap={8} style={{ marginTop: 14 }}>
                    <Press onPress={() => Linking.openURL(`tel:${l.phone}`)} style={{ flex: 1, height: 38, borderRadius: 12, backgroundColor: soft("#10B981", 0.13), alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                      <Ionicons name="call" size={15} color="#10B981" /><Text style={{ color: "#10B981", fontWeight: "700" }}>Call</Text>
                    </Press>
                    <Press onPress={() => Linking.openURL(`https://wa.me/${cleanPhone(l.phone)}`)} style={{ flex: 1, height: 38, borderRadius: 12, backgroundColor: soft("#22C55E", 0.13), alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                      <Ionicons name="logo-whatsapp" size={15} color="#16A34A" /><Text style={{ color: "#16A34A", fontWeight: "700" }}>Chat</Text>
                    </Press>
                  </Row>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Overdue invoices */}
        {showMoney && s.overdueInv.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 26 }}>
            <SectionTitle title="Payments overdue" action="Money" onAction={() => navigation.navigate("Money")} />
            <Card pad={6}>
              {s.overdueInv.slice(0, 4).map((i, idx) => (
                <Press key={i.id} onPress={() => open("payment", { invoice: i })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderBottomWidth: idx < Math.min(3, s.overdueInv.length - 1) ? 1 : 0, borderColor: c.line }}>
                  <Avatar name={i.client?.company || i.client?.name} size={40} />
                  <View style={{ flex: 1 }}><T v="body" style={{ fontWeight: "700" }} numberOfLines={1}>{i.client?.company || i.client?.name}</T><T v="sub" color={c.danger}>Due {relDay(i.dueDate)}</T></View>
                  <T v="h3">{inrShort(invoiceBalance(i))}</T>
                </Press>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Pill({ icon, text, warn }) {
  return (
    <Row gap={5} style={{ backgroundColor: warn ? "rgba(254,205,211,0.25)" : "rgba(255,255,255,0.16)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 }}>
      <Ionicons name={icon} size={13} color="#fff" />
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12.5 }}>{text}</Text>
    </Row>
  );
}

function Stat({ icon, color, label, value, sub, onPress }) {
  return (
    <Card style={{ width: "47.8%" }} onPress={onPress}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: soft(color, 0.13), alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </Row>
      <T v="h1" style={{ marginTop: 14 }}>{value}</T>
      <T v="sub" style={{ fontWeight: "700", marginTop: 1 }}>{label}</T>
      <T v="sub" faint style={{ fontSize: 12, marginTop: 2 }} numberOfLines={1}>{sub}</T>
    </Card>
  );
}
