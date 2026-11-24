import { useCallback } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { setStatusBarStyle } from "expo-status-bar";
import { Card, IconBtn, Press, Row, T } from "../components/ui";
import { radius, soft, useTheme } from "../theme";
import { useStore } from "../store";
import { getServer } from "../api";


// White status-bar icons while this screen (purple header) is in focus
function useLightStatusBar() {
  const { isDark } = useTheme();
  useFocusEffect(useCallback(() => { setStatusBarStyle("light"); return () => setStatusBarStyle(isDark ? "light" : "dark"); }, [isDark]));
}

export default function ProfileScreen({ navigation }) {
  const { c, isDark, toggle } = useTheme();
  useLightStatusBar();
  const insets = useSafeAreaInsets();
  const { user, can, db, logout } = useStore();
  const company = db.settings?.company?.name || "Your company";

  const links = [
    { icon: "apps-outline", color: "#4F46E5", label: "All modules", sub: "Everything from the admin panel", to: "AllModules" },
    can("reports") && { icon: "bar-chart-outline", color: "#14B8A6", label: "Reports & P&L", sub: "Profit, leaderboard, branches", to: "Reports" },
    can("team") && { icon: "finger-print-outline", color: "#EC4899", label: "Attendance", sub: "Mark today's attendance", to: "Attendance" },
    can("settings") && { icon: "settings-outline", color: "#64748B", label: "Company settings", sub: "Profile, invoice settings, targets", to: "CompanySettings" },
    can("projects") && { icon: "rocket-outline", color: "#8B5CF6", label: "Projects", sub: `${db.projects.length} projects`, to: "Projects" },
    can("tickets") && { icon: "chatbubbles-outline", color: "#F59E0B", label: "Support tickets", sub: `${db.tickets.filter((t) => !["Resolved", "Closed"].includes(t.status)).length} open`, to: "Tickets" },
    { icon: "notifications-outline", color: "#0EA5E9", label: "Notifications", sub: `${db.notifications.filter((n) => !n.read).length} unread`, to: "Notifications" },
  ].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 6, paddingHorizontal: 20, paddingBottom: 60, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }}>
          <IconBtn icon="chevron-back" color="#fff" bg="rgba(255,255,255,0.18)" onPress={() => navigation.goBack()} />
          <View style={{ alignItems: "center", marginTop: 6 }}>
            <View style={{ width: 84, height: 84, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.35)" }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 30 }}>{user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</Text>
            </View>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 22, marginTop: 12 }}>{user.name}</Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 3, fontWeight: "500" }}>{user.email}</Text>
            <View style={{ backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, marginTop: 10 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12.5 }}>{user.role}{user.branch ? ` · ${user.branch}` : ""}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: -34 }}>
          <Card pad={6} style={{ marginBottom: 18 }}>
            {links.map((l, i) => (
              <Press key={l.to} onPress={() => navigation.navigate(l.to)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: i < links.length - 1 ? 1 : 0, borderColor: c.line }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: soft(l.color, 0.13), alignItems: "center", justifyContent: "center" }}><Ionicons name={l.icon} size={19} color={l.color} /></View>
                <View style={{ flex: 1 }}><T v="body" style={{ fontWeight: "700" }}>{l.label}</T><T v="sub" muted>{l.sub}</T></View>
                <Ionicons name="chevron-forward" size={18} color={c.faint} />
              </Press>
            ))}
          </Card>

          <T v="cap" faint style={{ marginBottom: 8, marginLeft: 4 }}>App</T>
          <Card pad={6} style={{ marginBottom: 18 }}>
            <Row gap={12} style={{ padding: 12, borderBottomWidth: 1, borderColor: c.line }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: soft("#6366F1", 0.13), alignItems: "center", justifyContent: "center" }}><Ionicons name="moon-outline" size={19} color="#6366F1" /></View>
              <T v="body" style={{ flex: 1, fontWeight: "700" }}>Dark mode</T>
              <Switch value={isDark} onValueChange={toggle} trackColor={{ true: c.brand, false: c.line }} thumbColor="#fff" />
            </Row>
            <Row gap={12} style={{ padding: 12, borderBottomWidth: 1, borderColor: c.line }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: soft("#10B981", 0.13), alignItems: "center", justifyContent: "center" }}><Ionicons name="business-outline" size={19} color="#10B981" /></View>
              <View style={{ flex: 1 }}><T v="body" style={{ fontWeight: "700" }}>Company</T><T v="sub" muted numberOfLines={1}>{company}</T></View>
            </Row>
            <Row gap={12} style={{ padding: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: soft("#64748B", 0.13), alignItems: "center", justifyContent: "center" }}><Ionicons name="server-outline" size={19} color="#64748B" /></View>
              <View style={{ flex: 1 }}><T v="body" style={{ fontWeight: "700" }}>Connected to</T><T v="sub" muted numberOfLines={1}>{getServer()}</T></View>
            </Row>
          </Card>

          <Press onPress={() => Alert.alert("Sign out?", "You'll need your password to sign in again.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: logout }])}
            style={{ height: 54, borderRadius: radius.md, backgroundColor: soft(c.danger, 0.1), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Ionicons name="log-out-outline" size={20} color={c.danger} /><Text style={{ color: c.danger, fontWeight: "800", fontSize: 15 }}>Sign out</Text>
          </Press>
          <T v="sub" faint style={{ textAlign: "center", marginTop: 18 }}>NNC CRM · v1.0</T>
        </View>
      </ScrollView>
    </View>
  );
}
