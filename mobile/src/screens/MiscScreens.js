// Stack screens: notifications, projects (+ detail) and support tickets (+ detail).
import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Linking, Platform, RefreshControl, ScrollView, View } from "react-native";
import { Text, TextInput } from "../components/Text";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Badge, Card, Chip, ChipScroll, Empty, IconBtn, Press, Progress, Row, SearchBar, SectionTitle, T } from "../components/ui";
import { PRIORITY_COLOR, radius, shadow, soft, useTheme } from "../theme";
import { useStore } from "../store";
import { cleanPhone, daysBetween, fmtDate, inr, inrShort, timeAgo, today, uid } from "../utils";

function StackHeader({ title, subtitle, navigation, right }) {
  const insets = useSafeAreaInsets();
  return (
    <Row style={{ paddingTop: insets.top + 6, paddingHorizontal: 20, paddingBottom: 14 }} gap={12}>
      <IconBtn icon="chevron-back" onPress={() => navigation.goBack()} />
      <View style={{ flex: 1 }}><T v="h2" numberOfLines={1}>{title}</T>{!!subtitle && <T v="sub" muted numberOfLines={1}>{subtitle}</T>}</View>
      {right}
    </Row>
  );
}

// ── Notifications ──
export function NotificationsScreen({ navigation }) {
  const { c } = useTheme();
  const { db, markAllRead } = useStore();
  const list = db.notifications.slice().sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  const unread = list.filter((n) => !n.read).length;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title="Notifications" subtitle={unread ? `${unread} unread` : "You're all caught up"} navigation={navigation}
        right={unread > 0 && <Press onPress={markAllRead}><Text style={{ color: c.brand, fontWeight: "700" }}>Read all</Text></Press>} />
      <FlatList data={list} keyExtractor={(n) => n.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        ListEmptyComponent={<Empty icon="notifications-off-outline" title="No notifications" />}
        renderItem={({ item: n }) => (
          <Row gap={12} style={[{ backgroundColor: c.card, borderRadius: radius.lg, padding: 14, marginBottom: 10, alignItems: "flex-start" }, shadow(c)]}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: n.read ? c.input : c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="notifications" size={18} color={n.read ? c.faint : c.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Row style={{ justifyContent: "space-between" }}><T v="body" style={{ fontWeight: "700", flex: 1 }}>{n.title}</T>{!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand }} />}</Row>
              <T v="sub" muted style={{ marginTop: 3, lineHeight: 19 }}>{n.text}</T>
              <T v="sub" faint style={{ marginTop: 6, fontSize: 12 }}>{n.at ? timeAgo(n.at) : ""}</T>
            </View>
          </Row>
        )} />
    </View>
  );
}

// ── Projects ──
const DONE = ["Completed", "Cancelled"];
const progressOf = (p) => { const m = p.milestones || []; return m.length ? m.filter((x) => x.done).length / m.length : 0; };

export function ProjectsScreen({ navigation }) {
  const { c } = useTheme();
  const { db, refreshing, refresh } = useStore();
  const [q, setQ] = useState("");
  const [f, setF] = useState("active");
  const t = today();
  const list = useMemo(() => db.projects
    .filter((p) => f === "all" ? true : f === "active" ? !DONE.includes(p.stage) && p.stage !== "On Hold" : f === "late" ? !DONE.includes(p.stage) && p.deadline && p.deadline < t : DONE.includes(p.stage))
    .filter((p) => !q || `${p.name} ${p.client} ${p.service}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.deadline || "9").localeCompare(b.deadline || "9")), [db.projects, f, q, t]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title="Projects" subtitle={`${list.length} shown`} navigation={navigation} />
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}><SearchBar value={q} onChangeText={setQ} placeholder="Project or client" /></View>
      <ChipScroll style={{ paddingBottom: 14 }}>
        {[["active", "Running"], ["late", "Running late"], ["done", "Completed"], ["all", "All"]].map(([v, l]) => <Chip key={v} label={l} active={f === v} onPress={() => setF(v)} color={v === "late" ? c.danger : undefined} />)}
      </ChipScroll>
      <FlatList data={list} keyExtractor={(p) => p.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.brand} colors={[c.brand]} />}
        ListEmptyComponent={<Empty icon="rocket-outline" title="No projects here" />}
        renderItem={({ item: p }) => {
          const pr = progressOf(p); const left = p.deadline ? daysBetween(t, p.deadline) : null; const late = left != null && left < 0 && !DONE.includes(p.stage);
          return (
            <Card style={{ marginBottom: 12 }} onPress={() => navigation.navigate("Project", { id: p.id })}>
              <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: 10 }}><T v="h3" numberOfLines={2}>{p.name}</T><T v="sub" muted style={{ marginTop: 2 }}>{p.client}</T></View>
                <Badge label={p.stage} color={DONE.includes(p.stage) ? c.success : p.stage === "On Hold" ? c.danger : c.brand} />
              </Row>
              <Row style={{ marginTop: 14, justifyContent: "space-between" }}><T v="sub" faint>{Math.round(pr * 100)}% done</T>{!!p.value && <T v="sub" style={{ fontWeight: "700" }}>{inrShort(p.value)}</T>}</Row>
              <View style={{ marginTop: 6 }}><Progress value={pr} color={late ? c.danger : c.brand} /></View>
              {left != null && !DONE.includes(p.stage) && (
                <Row gap={6} style={{ marginTop: 12 }}><Ionicons name="flag-outline" size={14} color={late ? c.danger : c.sub} /><T v="sub" color={late ? c.danger : c.sub} style={{ fontWeight: "600" }}>{late ? `${-left} days late` : left === 0 ? "Due today" : `${left} days left`} · {fmtDate(p.deadline)}</T></Row>
              )}
            </Card>
          );
        }} />
    </View>
  );
}

export function ProjectDetailScreen({ route, navigation }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, update, can, userName } = useStore();
  const p = db.projects.find((x) => x.id === route.params.id);
  if (!p) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const pr = progressOf(p);
  const toggle = (m) => update("projects", p.id, { milestones: (p.milestones || []).map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)) }, m.done ? `"${m.title}" reopened` : `"${m.title}" done ✓`);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title={p.client} subtitle={p.service} navigation={navigation} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        <Card style={{ marginBottom: 18 }}>
          <T v="h2">{p.name}</T>
          <Row gap={6} style={{ marginTop: 10 }}><Badge label={p.stage} color={c.brand} dot />{!!p.priority && <Badge label={p.priority} color={PRIORITY_COLOR[p.priority]} />}</Row>
          <Row style={{ marginTop: 18, justifyContent: "space-between" }}><T v="sub" muted>Progress</T><T v="h3">{Math.round(pr * 100)}%</T></Row>
          <View style={{ marginTop: 8 }}><Progress value={pr} height={10} /></View>
          <Row gap={10} style={{ marginTop: 16 }}>
            <Fact label="Value" value={p.value ? inr(p.value) : "—"} />
            <Fact label="Deadline" value={p.deadline ? fmtDate(p.deadline) : "—"} />
            <Fact label="Manager" value={userName(p.managerId).split(" ")[0] || "—"} />
          </Row>
        </Card>
        <SectionTitle title="Milestones" />
        <Card pad={6} style={{ marginBottom: 18 }}>
          {(p.milestones || []).map((m, i, arr) => (
            <Press key={m.id} disabled={!can("projects", true)} onPress={() => toggle(m)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderColor: c.line }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: m.done ? c.success : c.line, backgroundColor: m.done ? c.success : "transparent", alignItems: "center", justifyContent: "center" }}>{m.done && <Ionicons name="checkmark" size={15} color="#fff" />}</View>
              <T v="body" style={[{ flex: 1, fontWeight: "600" }, m.done && { color: c.faint, textDecorationLine: "line-through" }]}>{m.title}</T>
            </Press>
          ))}
          {!(p.milestones || []).length && <T muted style={{ padding: 12 }}>No milestones.</T>}
        </Card>
        {!!(p.contact || p.phone) && (
          <Card style={{ marginBottom: 18 }}>
            <Row gap={12}>
              <Avatar name={p.contact || p.client} />
              <View style={{ flex: 1 }}><T v="h3">{p.contact || p.client}</T><T v="sub" muted>{p.phone}</T></View>
              {!!p.phone && <IconBtn icon="call" color={c.success} bg={soft(c.success, 0.13)} onPress={() => Linking.openURL(`tel:${p.phone}`)} />}
              {!!p.phone && <IconBtn icon="logo-whatsapp" color="#16A34A" bg={soft("#16A34A", 0.13)} onPress={() => Linking.openURL(`https://wa.me/${cleanPhone(p.phone)}`)} />}
            </Row>
          </Card>
        )}
        {!!p.notes && <Card><T v="cap" faint style={{ marginBottom: 6 }}>Notes</T><T v="body" style={{ lineHeight: 22 }}>{p.notes}</T></Card>}
      </ScrollView>
    </View>
  );
}

function Fact({ label, value }) {
  const { c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.cardAlt, borderRadius: radius.md, padding: 12 }}><T v="sub" faint style={{ fontSize: 11.5 }}>{label}</T><T v="body" style={{ fontWeight: "800", marginTop: 3 }} numberOfLines={1}>{value}</T></View>;
}

// ── Support tickets ──
const T_STATUS_COLOR = { Open: "#0EA5E9", "In Progress": "#6366F1", Waiting: "#F59E0B", Resolved: "#10B981", Closed: "#94A3B8" };

export function TicketsScreen({ navigation }) {
  const { c } = useTheme();
  const { db, refreshing, refresh } = useStore();
  const [f, setF] = useState("open");
  const list = db.tickets.filter((t) => f === "all" || (f === "open" ? !["Resolved", "Closed"].includes(t.status) : ["Resolved", "Closed"].includes(t.status)))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title="Support tickets" subtitle={`${list.length} shown`} navigation={navigation} />
      <ChipScroll style={{ paddingBottom: 14 }}>
        {[["open", "Open"], ["closed", "Resolved"], ["all", "All"]].map(([v, l]) => <Chip key={v} label={l} active={f === v} onPress={() => setF(v)} />)}
      </ChipScroll>
      <FlatList data={list} keyExtractor={(t) => t.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.brand} colors={[c.brand]} />}
        ListEmptyComponent={<Empty icon="happy-outline" title="No tickets" text="Nothing waiting for a reply." />}
        renderItem={({ item: t }) => (
          <Card style={{ marginBottom: 12 }} onPress={() => navigation.navigate("Ticket", { id: t.id })}>
            <Row style={{ justifyContent: "space-between" }}><T v="sub" faint style={{ fontWeight: "700" }}>{t.number}</T><Badge label={t.status} color={T_STATUS_COLOR[t.status] || c.brand} dot /></Row>
            <T v="h3" style={{ marginTop: 6 }} numberOfLines={2}>{t.subject}</T>
            <Row style={{ justifyContent: "space-between", marginTop: 10 }}>
              <T v="sub" muted numberOfLines={1} style={{ flex: 1 }}>{t.company || t.contactName}</T>
              <Row gap={6}>{!!t.priority && <Badge label={t.priority} color={PRIORITY_COLOR[t.priority] || c.sub} />}<T v="sub" faint style={{ fontSize: 12 }}>{t.createdAt ? timeAgo(t.createdAt) : ""}</T></Row>
            </Row>
          </Card>
        )} />
    </View>
  );
}

export function TicketDetailScreen({ route, navigation }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, update, can, user } = useStore();
  const [msg, setMsg] = useState("");
  const t = db.tickets.find((x) => x.id === route.params.id);
  if (!t) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const edit = can("tickets", true);
  const send = () => {
    if (!msg.trim()) return;
    update("tickets", t.id, (x) => ({ thread: [...(x.thread || []), { id: uid("tm"), from: "agent", by: user.id, text: msg.trim(), at: new Date().toISOString() }], status: x.status === "Open" ? "In Progress" : x.status }), "Reply sent");
    setMsg("");
  };
  const setStatus = (s) => update("tickets", t.id, { status: s, ...(s === "Resolved" ? { resolvedAt: new Date().toISOString() } : {}) }, `Ticket ${s.toLowerCase()}`);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StackHeader title={t.subject} subtitle={`${t.number} · ${t.company || t.contactName}`} navigation={navigation} />
      {edit && (
        <ChipScroll style={{ paddingBottom: 12 }}>
          {["Open", "In Progress", "Waiting", "Resolved", "Closed"].map((s) => <Chip key={s} label={s} active={t.status === s} color={T_STATUS_COLOR[s]} onPress={() => setStatus(s)} />)}
        </ChipScroll>
      )}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {(t.thread || []).map((m) => {
          const mine = m.from !== "customer";
          return (
            <View key={m.id} style={{ alignItems: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <View style={{ maxWidth: "82%", backgroundColor: mine ? c.brand : c.card, padding: 12, borderRadius: 18, borderBottomRightRadius: mine ? 6 : 18, borderBottomLeftRadius: mine ? 18 : 6 }}>
                <Text style={{ color: mine ? "#fff" : c.text, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
              </View>
              <T v="sub" faint style={{ fontSize: 11, marginTop: 4 }}>{m.at ? timeAgo(m.at) : ""}</T>
            </View>
          );
        })}
      </ScrollView>
      {edit && (
        <Row gap={10} style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, backgroundColor: c.card, borderTopWidth: 1, borderColor: c.line }}>
          <TextInput value={msg} onChangeText={setMsg} placeholder="Write a reply…" placeholderTextColor={c.faint} multiline
            style={{ flex: 1, backgroundColor: c.input, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, color: c.text, fontSize: 15, maxHeight: 120 }} />
          <IconBtn icon="send" bg={msg.trim() ? c.brand : c.input} color={msg.trim() ? "#fff" : c.faint} onPress={send} size={44} />
        </Row>
      )}
    </KeyboardAvoidingView>
  );
}
