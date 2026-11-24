// List rows reused across screens.
import { Linking, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Avatar, Badge, Press, Row, T } from "./ui";
import { PRIORITY_COLOR, STAGE_COLOR, TYPE_COLOR, shadow, soft, useTheme, radius } from "../theme";
import { useStore } from "../store";
import { fmtTime, inrShort, relDay, today } from "../utils";

export function TaskRow({ task, last, showDate }) {
  const { c } = useTheme();
  const { update, db } = useStore();
  const nav = useNavigation();
  const col = TYPE_COLOR[task.type] || c.brand;
  const lead = db.leads.find((l) => l.id === task.leadId);
  const late = !task.done && task.date < today();
  const toggle = () => update("tasks", task.id, { done: !task.done, status: task.done ? "Upcoming" : "Completed" }, task.done ? "Moved back to pending" : "Marked as done ✓");
  return (
    <Row gap={12} style={{ paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: last ? 0 : 1, borderColor: c.line }}>
      <Press onPress={toggle} style={{ width: 26, height: 26, borderRadius: 9, borderWidth: 2, borderColor: task.done ? c.success : c.line, backgroundColor: task.done ? c.success : "transparent", alignItems: "center", justifyContent: "center" }}>
        {task.done && <Ionicons name="checkmark" size={16} color="#fff" />}
      </Press>
      <Press style={{ flex: 1 }} onPress={() => lead && nav.navigate("Lead", { id: lead.id })} haptic={!!lead} scale={lead ? 0.98 : 1}>
        <T v="body" style={[{ fontWeight: "700" }, task.done && { textDecorationLine: "line-through", color: c.faint }]} numberOfLines={1}>{task.title}</T>
        <Row gap={6} style={{ marginTop: 4 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: col }} />
          <T v="sub" muted numberOfLines={1} style={{ flexShrink: 1 }}>
            {task.type}{task.time ? ` · ${fmtTime(task.time)}` : ""}{showDate || late ? ` · ${relDay(task.date)}` : ""}
          </T>
          {late && <Badge label="Late" color={c.danger} style={{ paddingVertical: 2 }} />}
        </Row>
      </Press>
      {!task.done && !!task.meetLink && (
        <Press onPress={() => Linking.openURL(task.meetLink)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 11, backgroundColor: soft(c.success, 0.14), alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 }}>
          <Ionicons name="videocam" size={14} color={c.success} /><Text style={{ color: c.success, fontWeight: "700", fontSize: 12.5 }}>Join</Text>
        </Press>
      )}
      {!task.done && !task.meetLink && !!(lead?.phone || task.clientPhone) && (
        <Press onPress={() => Linking.openURL(`tel:${lead?.phone || task.clientPhone}`)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: soft(col, 0.13), alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="call" size={16} color={col} />
        </Press>
      )}
    </Row>
  );
}

export function LeadCard({ lead, onPress }) {
  const { c } = useTheme();
  const { userName } = useStore();
  const due = lead.nextFollowUp && lead.nextFollowUp <= today() && !["Won", "Lost"].includes(lead.stage);
  return (
    <Press onPress={onPress} style={[{ backgroundColor: c.card, borderRadius: radius.lg, padding: 14, marginBottom: 12 }, shadow(c)]}>
      <Row gap={12} style={{ alignItems: "flex-start" }}>
        <Avatar name={lead.name} size={46} />
        <View style={{ flex: 1 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <T v="h3" numberOfLines={1} style={{ flex: 1 }}>{lead.name}</T>
            {!!lead.value && <T v="h3" color={c.text}>{inrShort(lead.value)}</T>}
          </Row>
          <T v="sub" muted numberOfLines={1} style={{ marginTop: 2 }}>{[lead.company, lead.service].filter(Boolean).join(" · ") || lead.phone}</T>
          <Row gap={6} style={{ marginTop: 10, flexWrap: "wrap" }}>
            <Badge label={lead.stage} color={STAGE_COLOR[lead.stage] || c.brand} dot />
            {!!lead.priority && <Badge label={lead.priority} color={PRIORITY_COLOR[lead.priority]} />}
            {due && <Badge label={`Follow up ${relDay(lead.nextFollowUp).toLowerCase()}`} color={lead.nextFollowUp < today() ? c.danger : c.warning} />}
          </Row>
        </View>
      </Row>
      {!!lead.ownerId && <Text style={{ position: "absolute", right: 14, bottom: 12, color: c.faint, fontSize: 11.5, fontWeight: "600" }}>{userName(lead.ownerId).split(" ")[0]}</Text>}
    </Press>
  );
}
