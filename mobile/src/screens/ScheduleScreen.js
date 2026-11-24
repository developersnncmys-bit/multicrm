import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Text } from "../components/Text";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Empty, Header, IconBtn, Press, Row, Segmented, T } from "../components/ui";
import { TaskRow } from "../components/rows";
import { useSheets } from "../components/forms";
import { TYPE_COLOR, radius, shadow, useTheme } from "../theme";
import { useStore } from "../store";
import { addDays, fmtTime, isoDate, today } from "../utils";

const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WD = ["M", "T", "W", "T", "F", "S", "S"];

const monday = (iso) => { const d = new Date(`${iso}T00:00:00`); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return isoDate(d); };

export default function ScheduleScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, user, can, refreshing, refresh } = useStore();
  const { open } = useSheets();
  const t = today();
  const [sel, setSel] = useState(t);
  const [scope, setScope] = useState(user.role === "Admin" ? "all" : "mine");
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday(sel), i)), [sel]);

  const tasks = useMemo(() => db.tasks.filter((x) => x.status !== "Cancelled" && (scope === "all" || x.assigneeId === user.id)), [db.tasks, scope, user.id]);
  const byDay = useMemo(() => { const m = {}; for (const x of tasks) (m[x.date] ||= []).push(x); return m; }, [tasks]);
  const day = (byDay[sel] || []).slice().sort((a, b) => Number(a.done) - Number(b.done) || (a.time || "99").localeCompare(b.time || "99"));
  const late = sel === t ? tasks.filter((x) => !x.done && x.date < t).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const timed = day.filter((x) => x.time); const untimed = day.filter((x) => !x.time);
  const doneCount = day.filter((x) => x.done).length;
  const d = new Date(`${sel}T00:00:00`);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Header title="Schedule" subtitle={`${MON[d.getMonth()]} ${d.getFullYear()}`}
        right={<>
          {sel !== t && <Press onPress={() => setSel(t)} style={{ paddingHorizontal: 12, height: 36, borderRadius: 12, backgroundColor: c.brandSoft, justifyContent: "center" }}><Text style={{ color: c.brand, fontWeight: "700" }}>Today</Text></Press>}
          {can("calendar", true) && <IconBtn icon="add" bg={c.brand} color="#fff" onPress={() => open("task")} />}
        </>} />

      {/* Week strip */}
      <View style={[{ marginHorizontal: 20, backgroundColor: c.card, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 6 }, shadow(c)]}>
        <Row gap={0}>
          <Press onPress={() => setSel(addDays(sel, -7))} style={{ width: 28, alignItems: "center" }}><Ionicons name="chevron-back" size={18} color={c.sub} /></Press>
          {week.map((w, i) => {
            const on = w === sel; const isT = w === t; const items = byDay[w] || [];
            const dt = new Date(`${w}T00:00:00`);
            return (
              <Press key={w} onPress={() => setSel(w)} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 14, backgroundColor: on ? c.brand : "transparent" }}>
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: on ? "rgba(255,255,255,0.8)" : c.faint }}>{WD[i]}</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", marginTop: 3, color: on ? "#fff" : isT ? c.brand : c.text }}>{dt.getDate()}</Text>
                <Row gap={2} style={{ height: 6, marginTop: 4 }}>
                  {items.slice(0, 3).map((x) => <View key={x.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: on ? "#fff" : TYPE_COLOR[x.type] || c.brand, opacity: x.done ? 0.35 : 1 }} />)}
                </Row>
              </Press>
            );
          })}
          <Press onPress={() => setSel(addDays(sel, 7))} style={{ width: 28, alignItems: "center" }}><Ionicons name="chevron-forward" size={18} color={c.sub} /></Press>
        </Row>
      </View>

      {user.role === "Admin" && <Segmented style={{ marginHorizontal: 20, marginTop: 14 }} value={scope} onChange={setScope} options={[{ value: "all", label: "Everyone" }, { value: "mine", label: "Only mine" }]} />}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.brand} colors={[c.brand]} />}>
        {late.length > 0 && (
          <>
            <Row gap={8} style={{ marginBottom: 10 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.danger }} /><T v="h3">Late — still not done</T><T v="sub" faint>{late.length}</T></Row>
            <Card pad={6} style={{ marginBottom: 22 }}>{late.slice(0, 8).map((x, i) => <TaskRow key={x.id} task={x} last={i === Math.min(7, late.length - 1)} />)}</Card>
          </>
        )}

        <Row style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <T v="h3">{sel === t ? "Today" : `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)}`}</T>
          {day.length > 0 && <T v="sub" faint>{doneCount}/{day.length} done</T>}
        </Row>

        {day.length === 0 ? (
          <Card><Empty icon="calendar-clear-outline" title="Nothing scheduled" text="Enjoy the free time — or book a call." action={can("calendar", true) ? "Schedule something" : undefined} onAction={() => open("task")} /></Card>
        ) : (
          <>
            {timed.map((x) => (
              <Row key={x.id} gap={12} style={{ alignItems: "stretch", marginBottom: 12 }}>
                <View style={{ width: 54, paddingTop: 16 }}>
                  <T v="sub" style={{ fontWeight: "800" }}>{fmtTime(x.time).replace(/ (AM|PM)/, "")}</T>
                  <T v="sub" faint style={{ fontSize: 11 }}>{fmtTime(x.time).slice(-2)}</T>
                </View>
                <View style={[{ flex: 1, backgroundColor: c.card, borderRadius: radius.lg, borderLeftWidth: 4, borderLeftColor: TYPE_COLOR[x.type] || c.brand, paddingHorizontal: 2 }, shadow(c)]}>
                  <TaskRow task={x} last />
                  {(x.duration > 0 || x.mode) && <T v="sub" faint style={{ paddingHorizontal: 48, paddingBottom: 10, marginTop: -6, fontSize: 12 }}>{[x.duration ? `${x.duration} min` : "", x.mode].filter(Boolean).join(" · ")}</T>}
                </View>
              </Row>
            ))}
            {untimed.length > 0 && (
              <>
                <T v="cap" faint style={{ marginTop: 8, marginBottom: 8 }}>Any time today</T>
                <Card pad={6}>{untimed.map((x, i) => <TaskRow key={x.id} task={x} last={i === untimed.length - 1} />)}</Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
