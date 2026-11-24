import { useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip, ChipScroll, Empty, Header, IconBtn, SearchBar } from "../components/ui";
import { LeadCard } from "../components/rows";
import { useSheets } from "../components/forms";
import { STAGE_COLOR, useTheme } from "../theme";
import { useStore } from "../store";
import { LEAD_STAGES, OPEN_STAGES, inrShort, today } from "../utils";

export default function LeadsScreen({ navigation, route }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, user, can, refreshing, refresh } = useStore();
  const { open } = useSheets();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("open");
  const [mine, setMine] = useState(false);

  const [seen, setSeen] = useState(null);
  if (route.params?.at && route.params.at !== seen) { setSeen(route.params.at); setFilter(route.params.filter); }

  const base = useMemo(() => db.leads.filter((l) => !mine || l.ownerId === user.id), [db.leads, mine, user.id]);
  const counts = useMemo(() => {
    const o = { open: 0, due: 0, all: base.length };
    for (const s of LEAD_STAGES) o[s] = 0;
    for (const l of base) {
      o[l.stage] = (o[l.stage] || 0) + 1;
      if (OPEN_STAGES.includes(l.stage)) { o.open++; if (l.nextFollowUp && l.nextFollowUp <= today()) o.due++; }
    }
    return o;
  }, [base]);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return base
      .filter((l) => filter === "all" ? true : filter === "open" ? OPEN_STAGES.includes(l.stage) : filter === "due" ? OPEN_STAGES.includes(l.stage) && l.nextFollowUp && l.nextFollowUp <= today() : l.stage === filter)
      .filter((l) => !qq || `${l.name} ${l.company} ${l.phone} ${l.email} ${l.service} ${l.city}`.toLowerCase().includes(qq))
      .sort((a, b) => filter === "due" ? (a.nextFollowUp || "").localeCompare(b.nextFollowUp || "") : (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [base, filter, q]);
  const total = list.reduce((s, l) => s + (Number(l.value) || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Header title="Leads" subtitle={`${list.length} ${list.length === 1 ? "lead" : "leads"} · ${inrShort(total)}`}
        right={can("leads", true) && <IconBtn icon="add" bg={c.brand} color="#fff" onPress={() => open("lead")} />} />
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}><SearchBar value={q} onChangeText={setQ} placeholder="Name, company, phone…" /></View>
      <ChipScroll style={{ paddingBottom: 14 }}>
        <Chip label="Mine" icon="person" active={mine} onPress={() => setMine((v) => !v)} color="#0F172A" />
        <Chip label="Open" count={counts.open} active={filter === "open"} onPress={() => setFilter("open")} />
        <Chip label="Follow up now" count={counts.due} active={filter === "due"} onPress={() => setFilter("due")} color={c.danger} />
        {LEAD_STAGES.map((s) => <Chip key={s} label={s} count={counts[s]} active={filter === s} color={STAGE_COLOR[s]} onPress={() => setFilter(s)} />)}
        <Chip label="All" count={counts.all} active={filter === "all"} onPress={() => setFilter("all")} />
      </ChipScroll>
      <FlatList
        data={list}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <LeadCard lead={item} onPress={() => navigation.navigate("Lead", { id: item.id })} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.brand} colors={[c.brand]} />}
        ListEmptyComponent={<Empty icon="people-outline" title={q ? "No matches" : "No leads here"} text={q ? "Try another name or number." : "New enquiries will show up here."} action={can("leads", true) ? "Add a lead" : undefined} onAction={() => open("lead")} />}
        initialNumToRender={12}
        windowSize={9}
      />
    </View>
  );
}
