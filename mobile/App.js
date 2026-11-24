// NNC CRM mobile — entry point: theme, data store, navigation.
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, useColorScheme } from "react-native";
import { FONT_FILES, Text } from "./src/components/Text";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeCtx, dark, light, shadow, useTheme } from "./src/theme";
import { StoreProvider, useStore } from "./src/store";
import { SheetsProvider, useSheets } from "./src/components/forms";
import { Press, Toast } from "./src/components/ui";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LeadsScreen from "./src/screens/LeadsScreen";
import LeadDetailScreen from "./src/screens/LeadDetailScreen";
import ScheduleScreen from "./src/screens/ScheduleScreen";
import MoneyScreen from "./src/screens/MoneyScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import { AllModulesScreen, ModuleDetailScreen, ModuleListScreen, RecordForm, SimplePaymentForm } from "./src/screens/ModuleScreens";
import { AttendanceScreen, CompanySettingsScreen, ReportsScreen } from "./src/screens/SpecialScreens";
import { NotificationsScreen, ProjectDetailScreen, ProjectsScreen, TicketDetailScreen, TicketsScreen } from "./src/screens/MiscScreens";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICON = { Home: "home", Leads: "people", Schedule: "calendar", Money: "wallet", Projects: "rocket", Tickets: "chatbubbles" };

// Floating tab bar with a raised "+" in the middle
function TabBar({ state, navigation }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { open } = useSheets();
  const routes = state.routes;
  const mid = Math.ceil(routes.length / 2);
  const item = (r) => {
    const i = routes.indexOf(r); const on = state.index === i;
    return (
      <Press key={r.key} onPress={() => { if (!on) navigation.navigate(r.name); }} style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}>
        <Ionicons name={on ? TAB_ICON[r.name] : `${TAB_ICON[r.name]}-outline`} size={23} color={on ? c.brand : c.faint} />
        <Text style={{ fontSize: 11, fontWeight: on ? "800" : "600", color: on ? c.brand : c.faint, marginTop: 3 }}>{r.name}</Text>
      </Press>
    );
  };
  return (
    <View style={{ position: "absolute", left: 14, right: 14, bottom: Math.max(insets.bottom, 12) }}>
      <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: c.tabBar, borderRadius: 26, paddingHorizontal: 6, height: 68 }, shadow(c, 3)]}>
        {routes.slice(0, mid).map(item)}
        <View style={{ width: 74, alignItems: "center" }}>
          <Press onPress={() => open("quick")} scale={0.9} style={{ marginTop: -34 }}>
            <LinearGradient colors={[c.brand, c.brand2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[{ width: 62, height: 62, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: c.bg }, shadow(c, 3)]}>
              <Ionicons name="add" size={30} color="#fff" />
            </LinearGradient>
          </Press>
        </View>
        {routes.slice(mid).map(item)}
      </View>
    </View>
  );
}

function Tabs() {
  const { can } = useStore();
  const tabs = [
    { name: "Home", component: HomeScreen, show: true },
    { name: "Leads", component: LeadsScreen, show: can("leads") },
    { name: "Schedule", component: ScheduleScreen, show: can("calendar") },
    { name: "Money", component: MoneyScreen, show: can("invoices") || can("expenses") },
    { name: "Projects", component: ProjectsScreen, show: can("projects") && !(can("invoices") || can("expenses")) },
    { name: "Tickets", component: TicketsScreen, show: can("tickets") && !can("leads") },
  ].filter((t) => t.show).slice(0, 4);
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      {tabs.map((t) => <Tab.Screen key={t.name} name={t.name} component={t.component} />)}
    </Tab.Navigator>
  );
}

function Root() {
  const { c, isDark } = useTheme();
  const { booting, user, toastMsg } = useStore();
  const navTheme = useMemo(() => {
    const b = isDark ? DarkTheme : DefaultTheme;
    return { ...b, colors: { ...b.colors, background: c.bg, card: c.card, text: c.text, border: c.line, primary: c.brand } };
  }, [c, isDark]);

  if (booting) {
    return (
      <LinearGradient colors={[c.heroA, c.heroB]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 76, height: 76, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <Text style={{ color: "#fff", fontSize: 36, fontWeight: "900" }}>N</Text>
        </View>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>NNC CRM</Text>
        <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
      </LinearGradient>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <NavigationContainer theme={navTheme}>
        <SheetsProvider extra={(state, p) => (
          <>
            {state?.props?.modKey && <RecordForm key={`rec${state.n}`} visible={state.kind === "record"} {...p} />}
            {state?.props?.modKey && <SimplePaymentForm key={`sp${state.n}`} visible={state.kind === "simplePay"} {...p} />}
          </>
        )}>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: c.bg } }}>
            {!user ? (
              <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
              <>
                <Stack.Screen name="Tabs" component={Tabs} />
                <Stack.Screen name="Lead" component={LeadDetailScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Projects" component={ProjectsScreen} />
                <Stack.Screen name="Project" component={ProjectDetailScreen} />
                <Stack.Screen name="Tickets" component={TicketsScreen} />
                <Stack.Screen name="Ticket" component={TicketDetailScreen} />
                <Stack.Screen name="AllModules" component={AllModulesScreen} />
                <Stack.Screen name="ModuleList" component={ModuleListScreen} />
                <Stack.Screen name="ModuleDetail" component={ModuleDetailScreen} />
                <Stack.Screen name="Reports" component={ReportsScreen} />
                <Stack.Screen name="Attendance" component={AttendanceScreen} />
                <Stack.Screen name="CompanySettings" component={CompanySettingsScreen} />
              </>
            )}
          </Stack.Navigator>
        </SheetsProvider>
      </NavigationContainer>
      <Toast msg={toastMsg} key={toastMsg?.key} />
    </View>
  );
}

export default function App() {
  const [fontsReady, fontError] = useFonts(FONT_FILES); // Poppins
  const system = useColorScheme();
  const [pref, setPref] = useState(null); // "light" | "dark" | null (follow phone)
  useEffect(() => { AsyncStorage.getItem("nnc_theme").then((v) => v && setPref(v)).catch(() => {}); }, []);
  const isDark = (pref || system) === "dark";
  const theme = useMemo(() => ({
    c: isDark ? dark : light,
    isDark,
    toggle: () => { const next = isDark ? "light" : "dark"; setPref(next); AsyncStorage.setItem("nnc_theme", next).catch(() => {}); },
  }), [isDark]);

  if (!fontsReady && !fontError) return <View style={{ flex: 1, backgroundColor: theme.c.heroA }} />;

  return (
    <SafeAreaProvider>
      <ThemeCtx.Provider value={theme}>
        <StoreProvider>
          <StatusBar style={isDark ? "light" : "auto"} />
          <Root />
        </StoreProvider>
      </ThemeCtx.Provider>
    </SafeAreaProvider>
  );
}
