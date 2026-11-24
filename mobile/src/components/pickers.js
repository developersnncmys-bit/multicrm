// Date and time pickers built from tappable chips — no native picker needed, works in Expo Go.
import { ScrollView, Text, View } from "react-native";
import { Press, T } from "./ui";
import { radius, useTheme } from "../theme";
import { addDays, fmtDay, fmtTime, today } from "../utils";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function DateStrip({ label, value, onChange, days = 30, start, back }) {
  const { c } = useTheme();
  const first = start || today();
  const list = Array.from({ length: days }, (_, i) => addDays(first, back ? -i : i)); // back: newest first
  return (
    <View style={{ marginBottom: 16 }}>
      {!!label && <T v="sub" muted style={{ marginBottom: 8, fontWeight: "600" }}>{label}</T>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {list.map((d) => {
          const on = d === value; const dt = new Date(`${d}T00:00:00`);
          return (
            <Press key={d} onPress={() => onChange(d)} style={{ width: 58, paddingVertical: 10, borderRadius: radius.md, alignItems: "center", backgroundColor: on ? c.brand : c.card, borderWidth: 1, borderColor: on ? c.brand : c.line }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: on ? "rgba(255,255,255,0.8)" : c.faint }}>{d === today() ? "TODAY" : fmtDay(d).toUpperCase()}</Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: on ? "#fff" : c.text, marginVertical: 1 }}>{dt.getDate()}</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: on ? "rgba(255,255,255,0.8)" : c.sub }}>{MON[dt.getMonth()]}</Text>
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );
}

const SLOTS = [];
for (let h = 8; h <= 20; h++) for (const m of ["00", "30"]) SLOTS.push(`${String(h).padStart(2, "0")}:${m}`);

export function TimeStrip({ label, value, onChange, allowNone }) {
  const { c } = useTheme();
  const opts = allowNone ? ["", ...SLOTS] : SLOTS;
  return (
    <View style={{ marginBottom: 16 }}>
      {!!label && <T v="sub" muted style={{ marginBottom: 8, fontWeight: "600" }}>{label}</T>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {opts.map((t) => {
          const on = t === value;
          return (
            <Press key={t || "none"} onPress={() => onChange(t)} style={{ paddingHorizontal: 14, height: 40, justifyContent: "center", borderRadius: radius.pill, backgroundColor: on ? c.brand : c.card, borderWidth: 1, borderColor: on ? c.brand : c.line }}>
              <Text style={{ fontWeight: "700", fontSize: 13, color: on ? "#fff" : c.text }}>{t ? fmtTime(t) : "Any time"}</Text>
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );
}
