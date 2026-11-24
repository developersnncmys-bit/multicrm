import { useState } from "react";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Badge, Card, IconBtn, Input, Press, Row, SectionTitle, T } from "../components/ui";
import { TaskRow } from "../components/rows";
import { useSheets } from "../components/forms";
import { PRIORITY_COLOR, STAGE_COLOR, radius, soft, useTheme } from "../theme";
import { useStore } from "../store";
import { LEAD_STAGES, cleanPhone, fmtDate, inr, relDay, timeAgo, uid } from "../utils";

const ACT_ICON = { call: "call", whatsapp: "logo-whatsapp", email: "mail", note: "document-text", stage: "git-commit", created: "sparkles", meeting: "videocam" };

export default function LeadDetailScreen({ route, navigation }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, update, remove, can, user, userName } = useStore();
  const { open } = useSheets();
  const [note, setNote] = useState("");
  const lead = db.leads.find((l) => l.id === route.params.id);
  if (!lead) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const edit = can("leads", true);
  const tasks = db.tasks.filter((t) => t.leadId === lead.id).sort((a, b) => b.date.localeCompare(a.date));
  const color = STAGE_COLOR[lead.stage] || c.brand;

  const logAct = (type, text, extra = {}, message = false) =>
    update("leads", lead.id, (l) => ({ ...extra, activities: [{ id: uid("a"), type, text, at: new Date().toISOString(), by: user.id }, ...(l.activities || [])] }), message);

  const setStage = (s) => {
    if (s === lead.stage) return;
    const go = (lostReason = "") => logAct("stage", `Stage moved from ${lead.stage} to ${s}`, { stage: s, ...(s === "Won" ? { wonAt: new Date().toISOString() } : {}), ...(s === "Lost" ? { lostReason } : {}) }, `Moved to ${s}`);
    if (s === "Lost") Alert.alert("Mark as lost?", "This lead will move out of your open list.", [{ text: "Cancel", style: "cancel" }, { text: "Mark lost", style: "destructive", onPress: () => go("Marked from mobile") }]);
    else go();
  };
  const contact = (kind) => {
    if (kind === "call") { Linking.openURL(`tel:${lead.phone}`); logAct("call", "Called from mobile"); }
    if (kind === "wa") { Linking.openURL(`https://wa.me/${cleanPhone(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name.split(" ")[0]}, `)}`); logAct("whatsapp", "Messaged on WhatsApp"); }
    if (kind === "mail") { Linking.openURL(`mailto:${lead.email}`); logAct("email", "Emailed from mobile"); }
  };
  const addNote = () => { if (!note.trim()) return; logAct("note", note.trim(), {}, "Note added"); setNote(""); };
  const del = () => Alert.alert("Delete lead?", `${lead.name} will be removed permanently.`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { navigation.goBack(); remove("leads", lead.id); } }]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: soft(color, c.dark ? 0.18 : 0.1), paddingTop: insets.top + 6, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <IconBtn icon="chevron-back" onPress={() => navigation.goBack()} />
            {edit && <Row gap={8}><IconBtn icon="create-outline" onPress={() => open("lead", { lead })} /><IconBtn icon="trash-outline" color={c.danger} onPress={del} /></Row>}
          </Row>
          <View style={{ alignItems: "center", marginTop: 14 }}>
            <Avatar name={lead.name} size={76} color={color} />
            <T v="h1" style={{ marginTop: 12, textAlign: "center" }}>{lead.name}</T>
            <T muted style={{ marginTop: 3, textAlign: "center" }}>{[lead.company, lead.city].filter(Boolean).join(" · ")}</T>
            <Row gap={6} style={{ marginTop: 12 }}>
              <Badge label={lead.stage} color={color} dot />
              {!!lead.priority && <Badge label={lead.priority} color={PRIORITY_COLOR[lead.priority]} />}
              {!!lead.value && <Badge label={inr(lead.value)} color={c.success} />}
            </Row>
          </View>
          <Row gap={10} style={{ marginTop: 20 }}>
            <Contact icon="call" label="Call" color="#10B981" onPress={() => contact("call")} disabled={!lead.phone} />
            <Contact icon="logo-whatsapp" label="WhatsApp" color="#16A34A" onPress={() => contact("wa")} disabled={!lead.phone} />
            <Contact icon="mail" label="Email" color="#0EA5E9" onPress={() => contact("mail")} disabled={!lead.email} />
            {can("calendar", true) && <Contact icon="calendar" label="Schedule" color={c.brand} onPress={() => open("task", { lead })} />}
          </Row>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          {edit && (
            <>
              <SectionTitle title="Stage" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginBottom: 22, marginHorizontal: -20 }}>
                <View style={{ width: 14 }} />
                {LEAD_STAGES.map((s, i) => {
                  const idx = LEAD_STAGES.indexOf(lead.stage); const done = i <= idx && lead.stage !== "Lost" && s !== "Lost"; const on = s === lead.stage;
                  const col = STAGE_COLOR[s];
                  return (
                    <Press key={s} onPress={() => setStage(s)} style={{ paddingHorizontal: 14, height: 38, borderRadius: 99, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? col : done ? soft(col, 0.14) : c.card, borderWidth: 1, borderColor: on || done ? "transparent" : c.line }}>
                      {done && !on && <Ionicons name="checkmark" size={14} color={col} />}
                      <Text style={{ fontWeight: "700", fontSize: 13, color: on ? "#fff" : done ? col : c.sub }}>{s}</Text>
                    </Press>
                  );
                })}
                <View style={{ width: 14 }} />
              </ScrollView>
            </>
          )}

          <Card style={{ marginBottom: 22 }}>
            <Info icon="call-outline" label="Phone" value={lead.phone} />
            <Info icon="mail-outline" label="Email" value={lead.email} />
            <Info icon="briefcase-outline" label="Service" value={lead.service} />
            <Info icon="megaphone-outline" label="Source" value={lead.source} />
            <Info icon="alarm-outline" label="Next follow-up" value={lead.nextFollowUp ? `${relDay(lead.nextFollowUp)} · ${fmtDate(lead.nextFollowUp)}` : ""} />
            <Info icon="person-circle-outline" label="Owner" value={userName(lead.ownerId)} />
            <Info icon="document-text-outline" label="Requirement" value={lead.requirement} last />
          </Card>

          {tasks.length > 0 && (
            <>
              <SectionTitle title="Schedule" />
              <Card pad={6} style={{ marginBottom: 22 }}>{tasks.slice(0, 6).map((t, i) => <TaskRow key={t.id} task={t} showDate last={i === Math.min(5, tasks.length - 1)} />)}</Card>
            </>
          )}

          <SectionTitle title="Activity" />
          {edit && (
            <Input value={note} onChangeText={setNote} placeholder="Add a note — what did they say?" icon="create-outline" onSubmitEditing={addNote} returnKeyType="send"
              right={!!note.trim() && <Press onPress={addNote}><Ionicons name="send" size={20} color={c.brand} /></Press>} />
          )}
          <View>
            {(lead.activities || []).slice(0, 25).map((a, i, arr) => (
              <Row key={a.id || i} gap={12} style={{ alignItems: "flex-start" }}>
                <View style={{ alignItems: "center" }}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: c.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.line }}>
                    <Ionicons name={ACT_ICON[a.type] || "ellipse"} size={15} color={c.brand} />
                  </View>
                  {i < arr.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: c.line, marginVertical: 3 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 16 }}>
                  <T v="body" style={{ lineHeight: 21 }}>{a.text}</T>
                  <T v="sub" faint style={{ marginTop: 2, fontSize: 12 }}>{timeAgo(a.at)}{a.by ? ` · ${userName(a.by)}` : ""}</T>
                </View>
              </Row>
            ))}
            {!(lead.activities || []).length && <T muted>No activity yet.</T>}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Contact({ icon, label, color, onPress, disabled }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} disabled={disabled} style={{ flex: 1, alignItems: "center", backgroundColor: c.card, paddingVertical: 12, borderRadius: radius.md }}>
      <Ionicons name={icon} size={21} color={color} />
      <T v="sub" style={{ marginTop: 5, fontWeight: "700", fontSize: 12 }}>{label}</T>
    </Press>
  );
}
function Info({ icon, label, value, last }) {
  const { c } = useTheme();
  if (!value) return null;
  return (
    <Row gap={12} style={{ paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderColor: c.line, alignItems: "flex-start" }}>
      <Ionicons name={icon} size={18} color={c.faint} style={{ marginTop: 1 }} />
      <T v="sub" muted style={{ width: 105 }}>{label}</T>
      <T v="sub" style={{ flex: 1, fontWeight: "600", textAlign: "right" }}>{value}</T>
    </Row>
  );
}
