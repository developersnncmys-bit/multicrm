import { useState, useCallback } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { setStatusBarStyle } from "expo-status-bar";
import { Button, Input, Press, Row, T } from "../components/ui";
import { radius, shadow, useTheme } from "../theme";
import { useStore } from "../store";
import { getServer, setServer } from "../api";


// White status-bar icons while this screen (purple header) is in focus
function useLightStatusBar() {
  const { isDark } = useTheme();
  useFocusEffect(useCallback(() => { setStatusBarStyle("light"); return () => setStatusBarStyle(isDark ? "light" : "dark"); }, [isDark]));
}

export default function LoginScreen() {
  const { c } = useTheme();
  useLightStatusBar();
  const { login } = useStore();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [srvOpen, setSrvOpen] = useState(false);
  const [srv, setSrv] = useState(getServer());

  const submit = async () => {
    if (!email.trim() || !password) return setErr("Enter your email and password");
    setBusy(true); setErr("");
    try {
      await setServer(srv);
      await login(email, password);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 40, paddingBottom: 90, paddingHorizontal: 28, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" }}>
          <View style={{ position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.08)", top: -80, right: -70 }} />
          <View style={{ position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.06)", bottom: -40, left: -30 }} />
          <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 26 }}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900" }}>N</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: -0.8 }}>Welcome back</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 15.5, marginTop: 8, lineHeight: 22 }}>Your leads, meetings and money —{"\n"}all in your pocket.</Text>
        </LinearGradient>

        <View style={[{ marginHorizontal: 20, marginTop: -56, backgroundColor: c.card, borderRadius: radius.xl, padding: 22 }, shadow(c, 2)]}>
          <T v="h2" style={{ marginBottom: 4 }}>Sign in to NNC CRM</T>
          <T v="sub" muted style={{ marginBottom: 20 }}>Use the same login as the admin panel.</T>
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@company.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry={!show} onSubmitEditing={submit}
            right={<Press onPress={() => setShow((v) => !v)}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={19} color={c.faint} /></Press>} />
          {!!err && (
            <Row gap={8} style={{ backgroundColor: "rgba(244,63,94,0.1)", padding: 12, borderRadius: radius.md, marginBottom: 14 }}>
              <Ionicons name="alert-circle" size={18} color={c.danger} />
              <Text style={{ color: c.danger, fontWeight: "600", flex: 1 }}>{err}</Text>
            </Row>
          )}
          <Button title="Sign in" icon="arrow-forward" onPress={submit} loading={busy} />
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: insets.bottom + 24 }}>
          <Press onPress={() => setSrvOpen((v) => !v)} style={{ alignSelf: "center" }}>
            <Row gap={6}><Ionicons name="server-outline" size={15} color={c.sub} /><T v="sub" muted>Server settings</T><Ionicons name={srvOpen ? "chevron-up" : "chevron-down"} size={15} color={c.sub} /></Row>
          </Press>
          {srvOpen && (
            <View style={{ marginTop: 14 }}>
              <Input label="Server address" icon="globe-outline" value={srv} onChangeText={setSrv} autoCapitalize="none" autoCorrect={false} placeholder="https://backendnnccrm.vercel.app/api" />
              <T v="sub" faint style={{ lineHeight: 19 }}>{"Leave this as the live server. Only to test a backend running on your computer: use http://<your PC's IP>:5000/api (same Wi-Fi), not localhost."}</T>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
