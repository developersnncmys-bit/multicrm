// Generic screens that render any section described in src/modules.js:
// All-modules menu → list (search + filter chips) → detail (with actions) → add/edit sheet.
import { useMemo, useState } from "react";
import { Alert, FlatList, Linking, RefreshControl, ScrollView, Switch, View } from "react-native";
import { Text } from "../components/Text";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge, Button, Card, Chip, ChipScroll, Empty, IconBtn, Input, Press, Row, SearchBar, Sheet, T, Choice } from "../components/ui";
import { useSheets } from "../components/forms";
import { radius, shadow, soft, useTheme } from "../theme";
import { useStore } from "../store";
import { GROUP_ORDER, MODULES, SPECIAL, modByKey } from "../modules";
import { addDays, cleanPhone, fmtDate, inr, invoiceTotal, today, uid } from "../utils";

export function StackHeader({ title, subtitle, navigation, right }) {
  const insets = useSafeAreaInsets();
  return (
    <Row style={{ paddingTop: insets.top + 6, paddingHorizontal: 20, paddingBottom: 14 }} gap={12}>
      <IconBtn icon="chevron-back" onPress={() => navigation.goBack()} />
      <View style={{ flex: 1 }}><T v="h2" numberOfLines={1}>{title}</T>{!!subtitle && <T v="sub" muted numberOfLines={1}>{subtitle}</T>}</View>
      {right}
    </Row>
  );
}

const useCanWrite = () => {
  const { can, user } = useStore();
  return (m) => !m.readOnly && (m.adminOnly ? user.role === "Admin" : !m.module || can(m.module, true));
};

// ── All modules menu ──
export function AllModulesScreen({ navigation }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { can, db } = useStore();
  const [q, setQ] = useState("");
  const entries = [
    ...SPECIAL.filter((s) => can(s.module)).map((s) => ({ ...s, kind: "special", count: null })),
    ...MODULES.filter((m) => !m.module || can(m.module)).map((m) => ({ ...m, kind: "module", count: (db[m.col] || []).length })),
  ].filter((e) => !q || e.title.toLowerCase().includes(q.toLowerCase()));
  const groups = GROUP_ORDER.map((g) => ({ g, items: entries.filter((e) => e.group === g) })).filter((x) => x.items.length);
  const go = (e) => (e.kind === "special" ? (e.tab ? navigation.navigate("Tabs", { screen: e.key }) : navigation.navigate(e.key)) : navigation.navigate("ModuleList", { key: e.key }));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title="All modules" subtitle="Everything from the admin panel" navigation={navigation} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <SearchBar value={q} onChangeText={setQ} placeholder="Find a module" style={{ marginBottom: 18 }} />
        {groups.map(({ g, items }) => (
          <View key={g} style={{ marginBottom: 20 }}>
            <T v="cap" faint style={{ marginBottom: 10, marginLeft: 2 }}>{g}</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {items.map((e) => (
                <Press key={e.key} onPress={() => go(e)} style={[{ width: "31%", flexGrow: 1, maxWidth: "32%", backgroundColor: c.card, borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 10, alignItems: "center" }, shadow(c)]}>
                  <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: soft(e.color, 0.14), alignItems: "center", justifyContent: "center", marginBottom: 9 }}>
                    <Ionicons name={e.icon} size={22} color={e.color} />
                  </View>
                  <T v="sub" style={{ fontWeight: "700", textAlign: "center", fontSize: 12.5, lineHeight: 16 }} numberOfLines={2}>{e.title}</T>
                  {e.count != null && <T v="sub" faint style={{ fontSize: 11, marginTop: 2 }}>{e.count}</T>}
                </Press>
              ))}
            </View>
          </View>
        ))}
        {!groups.length && <Empty icon="search" title="No module found" />}
      </ScrollView>
    </View>
  );
}

// ── List ──
export function ModuleListScreen({ route, navigation }) {
  const m = modByKey[route.params.key];
  const { c } = useTheme();
  const { db, refreshing, refresh } = useStore();
  const { open } = useSheets();
  const canWrite = useCanWrite()(m);
  const [q, setQ] = useState("");
  const [f, setF] = useState("");
  const list = useMemo(() => db[m.col] || [], [db, m.col]);
  const filters = useMemo(() => {
    if (!m.filterBy) return [];
    const counts = {};
    for (const r of list) { const v = r[m.filterBy]; if (v != null && v !== "") counts[v] = (counts[v] || 0) + 1; }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [list, m.filterBy]);
  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let out = list.filter((r) => (!f || String(r[m.filterBy]) === f) && (!qq || JSON.stringify(r).toLowerCase().includes(qq)));
    if (m.sortKey) out = out.slice().sort((a, b) => (m.asc ? 1 : -1) * String(a[m.sortKey] || "").localeCompare(String(b[m.sortKey] || "")));
    return out;
  }, [list, q, f, m]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title={m.title} subtitle={`${rows.length} ${rows.length === 1 ? "item" : "items"}`} navigation={navigation}
        right={canWrite && <IconBtn icon="add" bg={m.color} color="#fff" onPress={() => open("record", { modKey: m.key })} />} />
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}><SearchBar value={q} onChangeText={setQ} placeholder={`Search ${m.title.toLowerCase()}`} /></View>
      {filters.length > 1 && (
        <ChipScroll style={{ paddingBottom: 12 }}>
          <Chip label="All" count={list.length} active={!f} onPress={() => setF("")} color={m.color} />
          {filters.map(([v, n]) => <Chip key={v} label={v} count={n} active={f === v} onPress={() => setF(f === v ? "" : v)} color={m.color} />)}
        </ChipScroll>
      )}
      <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.brand} colors={[c.brand]} />}
        ListEmptyComponent={<Empty icon={m.icon} title={q || f ? "Nothing matches" : `No ${m.title.toLowerCase()} yet`} action={canWrite && !q ? "Add the first one" : undefined} onAction={() => open("record", { modKey: m.key })} />}
        renderItem={({ item }) => <ModuleRow m={m} r={item} onPress={() => navigation.navigate("ModuleDetail", { key: m.key, id: item.id })} canWrite={canWrite} />} />
    </View>
  );
}

function ModuleRow({ m, r, onPress, canWrite }) {
  const { c } = useTheme();
  const { db, update } = useStore();
  const it = m.item(r, db);
  const doneKey = m.done || m.fields.find((fl) => fl.quick && fl.type === "bool" && (fl.k === "collected" || fl.k === "done"))?.k;
  return (
    <Press onPress={onPress} style={[{ backgroundColor: c.card, borderRadius: radius.lg, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }, shadow(c)]}>
      {doneKey && canWrite ? (
        <Press onPress={() => update(m.col, r.id, { [doneKey]: !r[doneKey] }, r[doneKey] ? "Marked as not done" : "Done ✓")}
          style={{ width: 26, height: 26, borderRadius: 9, borderWidth: 2, borderColor: r[doneKey] ? c.success : c.line, backgroundColor: r[doneKey] ? c.success : "transparent", alignItems: "center", justifyContent: "center" }}>
          {r[doneKey] && <Ionicons name="checkmark" size={16} color="#fff" />}
        </Press>
      ) : (
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: soft(m.color, 0.13), alignItems: "center", justifyContent: "center" }}><Ionicons name={m.icon} size={19} color={m.color} /></View>
      )}
      <View style={{ flex: 1 }}>
        <T v="body" style={[{ fontWeight: "700" }, doneKey && r[doneKey] && { color: c.faint, textDecorationLine: "line-through" }]} numberOfLines={2}>{it.title || "Untitled"}</T>
        {!!it.sub && <T v="sub" muted numberOfLines={1} style={{ marginTop: 2 }}>{it.sub}</T>}
        {!!it.badge && <Badge label={it.badge.label} color={it.badge.color} style={{ marginTop: 7 }} dot />}
      </View>
      {!!it.right && <T v="h3" style={{ marginLeft: 4 }}>{it.right}</T>}
    </Press>
  );
}

// ── Detail ──
export function ModuleDetailScreen({ route, navigation }) {
  const m = modByKey[route.params.key];
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, update, remove, toast } = useStore();
  const { open } = useSheets();
  const canWrite = useCanWrite()(m);
  const [reveal, setReveal] = useState(false);
  const r = (db[m.col] || []).find((x) => x.id === route.params.id);
  if (!r) return <View style={{ flex: 1, backgroundColor: c.bg }}><StackHeader title={m.title} navigation={navigation} /><Empty icon="trash-outline" title="This item was deleted" /></View>;
  const it = m.item(r, db);
  const phone = m.fields.find((f) => f.type === "phone" && r[f.k]) && r[m.fields.find((f) => f.type === "phone" && r[f.k]).k];
  const email = m.fields.find((f) => f.type === "email" && r[f.k]) && r[m.fields.find((f) => f.type === "email" && r[f.k]).k];
  const url = m.fields.find((f) => f.type === "url" && r[f.k]) && r[m.fields.find((f) => f.type === "url" && r[f.k]).k];
  const del = () => Alert.alert("Delete?", `"${it.title}" will be removed permanently.`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { navigation.goBack(); remove(m.col, r.id); } }]);
  const copy = async (v) => { await Clipboard.setStringAsync(String(v)); toast("Copied"); };
  const total = m.totals ? invoiceTotal(r) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title={m.title} navigation={navigation}
        right={canWrite && <Row gap={8}><IconBtn icon="create-outline" onPress={() => open("record", { modKey: m.key, rec: r })} /><IconBtn icon="trash-outline" color={c.danger} onPress={del} /></Row>} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        <Card style={{ marginBottom: 16 }}>
          <Row gap={14} style={{ alignItems: "flex-start" }}>
            <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: soft(m.color, 0.14), alignItems: "center", justifyContent: "center" }}><Ionicons name={m.icon} size={24} color={m.color} /></View>
            <View style={{ flex: 1 }}>
              <T v="h2">{it.title}</T>
              {!!it.sub && <T v="sub" muted style={{ marginTop: 3 }}>{it.sub}</T>}
              <Row gap={6} style={{ marginTop: 10, flexWrap: "wrap" }}>
                {!!it.badge && <Badge label={it.badge.label} color={it.badge.color} dot />}
                {!!it.right && <Badge label={it.right} color={c.text === "#0F172A" ? "#334155" : "#CBD5E1"} />}
              </Row>
            </View>
          </Row>
          {(phone || email || url) && (
            <Row gap={10} style={{ marginTop: 16 }}>
              {!!phone && <Action icon="call" label="Call" color="#10B981" onPress={() => Linking.openURL(`tel:${phone}`)} />}
              {!!phone && <Action icon="logo-whatsapp" label="WhatsApp" color="#16A34A" onPress={() => Linking.openURL(`https://wa.me/${cleanPhone(phone)}`)} />}
              {!!email && <Action icon="mail" label="Email" color="#0EA5E9" onPress={() => Linking.openURL(`mailto:${email}`)} />}
              {!!url && <Action icon="open-outline" label="Open" color={c.brand} onPress={() => Linking.openURL(/^https?:/.test(url) ? url : `https://${url}`)} />}
            </Row>
          )}
        </Card>

        {/* quick toggles */}
        {canWrite && m.fields.filter((f) => f.quick && f.type === "bool").map((f) => (
          <Card key={f.k} style={{ marginBottom: 12 }} pad={14}>
            <Row style={{ justifyContent: "space-between" }}>
              <T v="body" style={{ fontWeight: "700" }}>{f.label}</T>
              <Switch value={!!r[f.k]} onValueChange={(v) => update(m.col, r.id, { [f.k]: v })} trackColor={{ true: c.success, false: c.line }} thumbColor="#fff" />
            </Row>
          </Card>
        ))}

        {m.extra && <Row gap={10} style={{ marginBottom: 16 }}>{m.extra(r).map((x) => <Fact key={x.label} {...x} />)}</Row>}

        <Card pad={6} style={{ marginBottom: 16 }}>
          {m.fields.filter((f) => !["items", "client"].includes(f.type) && !f.quick && r[f.k] !== undefined && r[f.k] !== "" && r[f.k] !== null).map((f, i, arr) => {
            let v = r[f.k];
            if (f.type === "ref") v = (db[f.source] || []).find((x) => x.id === v) ? f.show(db[f.source].find((x) => x.id === v)) : v;
            else if (f.type === "money") v = inr(v);
            else if (f.type === "date") v = fmtDate(v);
            else if (f.type === "bool") v = v ? "Yes" : "No";
            else if (f.k === "at" || f.k === "createdAt") v = new Date(v).toLocaleString("en-IN");
            const secret = f.type === "password";
            if (!secret && String(v).length > 34) {
              return (
                <View key={f.k} style={{ paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderColor: c.line }}>
                  <T v="sub" muted>{f.label}</T>
                  <T v="body" style={{ marginTop: 4, lineHeight: 21 }} selectable>{String(v)}</T>
                </View>
              );
            }
            return (
              <Row key={f.k} gap={12} style={{ paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderColor: c.line, alignItems: "flex-start" }}>
                <T v="sub" muted style={{ width: 118 }}>{f.label}</T>
                <T v="sub" style={{ flex: 1, fontWeight: "600", textAlign: "right" }} selectable>{secret && !reveal ? "••••••••" : String(v)}</T>
                {secret && <Press onPress={() => setReveal((x) => !x)}><Ionicons name={reveal ? "eye-off-outline" : "eye-outline"} size={18} color={c.sub} /></Press>}
                {(secret || f.k === "username" || f.k === "login" || f.k === "number") && <Press onPress={() => copy(r[f.k])}><Ionicons name="copy-outline" size={18} color={c.sub} /></Press>}
              </Row>
            );
          })}
        </Card>

        {r.client && typeof r.client === "object" && (
          <Card style={{ marginBottom: 16 }}>
            <T v="cap" faint style={{ marginBottom: 8 }}>Client</T>
            <T v="h3">{r.client.company || r.client.name}</T>
            <T v="sub" muted style={{ marginTop: 3 }}>{[r.client.name, r.client.phone, r.client.email].filter(Boolean).join(" · ")}</T>
            {!!r.client.phone && <Row gap={10} style={{ marginTop: 12 }}>
              <Action icon="call" label="Call" color="#10B981" onPress={() => Linking.openURL(`tel:${r.client.phone}`)} />
              <Action icon="logo-whatsapp" label="WhatsApp" color="#16A34A" onPress={() => Linking.openURL(`https://wa.me/${cleanPhone(r.client.phone)}?text=${encodeURIComponent(`Hi ${(r.client.name || "").split(" ")[0]}, sharing ${r.number || "the details"} — total ${inr(total)}.`)}`)} />
            </Row>}
          </Card>
        )}

        {Array.isArray(r.items) && r.items.length > 0 && (
          <Card pad={6} style={{ marginBottom: 16 }}>
            {r.items.map((x, i) => (
              <Row key={x.id || i} style={{ padding: 10, borderBottomWidth: 1, borderColor: c.line, justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: 10 }}><T v="body" style={{ fontWeight: "600" }}>{x.desc}</T><T v="sub" faint>{x.qty} × {inr(x.rate)}</T></View>
                <T v="body" style={{ fontWeight: "700" }}>{inr((Number(x.qty) || 0) * (Number(x.rate) || 0))}</T>
              </Row>
            ))}
            <Row style={{ padding: 10, justifyContent: "space-between" }}><T v="sub" muted>{r.discountPct ? `After ${r.discountPct}% off + ${r.gstPct}% GST` : `Incl. ${r.gstPct ?? 18}% GST`}</T><T v="h3">{inr(total)}</T></Row>
          </Card>
        )}

        {m.payments && (
          <Card pad={6} style={{ marginBottom: 16 }}>
            <Row style={{ padding: 10, justifyContent: "space-between" }}>
              <T v="h3">Payments</T>
              {canWrite && <Press onPress={() => (m.col === "invoices" ? open("payment", { invoice: r }) : open("simplePay", { modKey: m.key, rec: r }))}><Text style={{ color: c.success, fontWeight: "800" }}>+ Record</Text></Press>}
            </Row>
            {(r.payments || []).length === 0 && <T muted style={{ paddingHorizontal: 10, paddingBottom: 10 }}>No payments yet.</T>}
            {(r.payments || []).slice().reverse().map((p, i) => (
              <Row key={p.id || i} style={{ paddingHorizontal: 10, paddingVertical: 9, borderTopWidth: 1, borderColor: c.line, justifyContent: "space-between" }}>
                <T v="sub" muted>{fmtDate(p.date)} · {p.mode}{p.month ? ` · for ${p.month}` : ""}</T>
                <T v="body" color={c.success} style={{ fontWeight: "700" }}>+{inr(p.amount)}</T>
              </Row>
            ))}
          </Card>
        )}

        {m.secrets && (r.secrets || []).length > 0 && (
          <Card pad={6} style={{ marginBottom: 16 }}>
            <Row style={{ padding: 10, justifyContent: "space-between" }}><T v="h3">Keys & secrets</T><Press onPress={() => setReveal((x) => !x)}><Text style={{ color: c.brand, fontWeight: "700" }}>{reveal ? "Hide" : "Show"}</Text></Press></Row>
            {r.secrets.map((s, i) => (
              <Row key={i} gap={10} style={{ paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderColor: c.line }}>
                <T v="sub" muted style={{ width: 110 }}>{s.name}</T>
                <T v="sub" style={{ flex: 1, fontWeight: "600" }} numberOfLines={1}>{reveal ? s.value : "••••••••"}</T>
                <Press onPress={() => copy(s.value)}><Ionicons name="copy-outline" size={18} color={c.sub} /></Press>
              </Row>
            ))}
          </Card>
        )}

        {m.key === "campaigns" && !!r.message && <Card><T v="cap" faint style={{ marginBottom: 6 }}>Message</T><T v="body" style={{ lineHeight: 22 }}>{r.message}</T></Card>}
        {m.key === "templates" && !!r.body && (
          <Card><T v="cap" faint style={{ marginBottom: 6 }}>Message</T><T v="body" style={{ lineHeight: 22 }}>{r.body}</T>
            <Button small variant="soft" icon="copy-outline" title="Copy message" onPress={() => copy(r.body)} style={{ marginTop: 12, alignSelf: "flex-start" }} />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function Action({ icon, label, color, onPress }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} style={{ flex: 1, alignItems: "center", backgroundColor: soft(color, 0.1), paddingVertical: 11, borderRadius: radius.md }}>
      <Ionicons name={icon} size={19} color={color} />
      <T v="sub" style={{ marginTop: 4, fontWeight: "700", fontSize: 12, color: c.text }}>{label}</T>
    </Press>
  );
}
function Fact({ label, value }) {
  const { c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.card, borderRadius: radius.md, padding: 12 }}><T v="sub" faint style={{ fontSize: 11.5 }}>{label}</T><T v="body" style={{ fontWeight: "800", marginTop: 3 }} numberOfLines={1}>{value}</T></View>;
}

// ── Add / edit form for any module ──
export function RecordForm({ visible, onClose, modKey, rec }) {
  const m = modByKey[modKey];
  const { c } = useTheme();
  const { db, add, update, user, toast } = useStore();
  const [f, setF] = useState(() => {
    if (rec) return { ...rec };
    const o = {};
    for (const fl of m?.fields || []) if (fl.def !== undefined) o[fl.k] = typeof fl.def === "function" ? fl.def() : fl.def;
    if (m?.fields.some((fl) => fl.type === "items")) o.items = [{ id: uid("i"), desc: "", qty: 1, rate: "" }];
    return o;
  });
  const [err, setErr] = useState("");
  if (!m) return null;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = () => {
    for (const fl of m.fields) {
      if (!fl.required || (fl.createOnly && rec)) continue;
      const v = f[fl.k];
      if (v === undefined || v === null || v === "" || (fl.type === "client" && !(v?.name || v?.company))) return setErr(`${fl.label.replace(/ ₹.*/, "")} is required`);
    }
    const data = { ...f };
    for (const fl of m.fields) {
      if (["money", "number"].includes(fl.type) && data[fl.k] !== undefined && data[fl.k] !== "") data[fl.k] = Number(data[fl.k]) || 0;
      if (fl.type === "choice" && typeof fl.options[0] === "number") data[fl.k] = Number(data[fl.k]);
      if (fl.readOnly && !rec) delete data[fl.k];
    }
    if (data.items) {
      data.items = data.items.filter((i) => i.desc?.trim()).map((i) => ({ ...i, qty: Number(i.qty) || 1, rate: Number(i.rate) || 0 }));
      if (!data.items.length) return setErr("Add at least one item");
    }
    if (m.key === "users" && !rec && String(data.password || "").length < 6) return setErr("Password must be at least 6 characters");
    if (rec) {
      const patch = {};
      for (const k of Object.keys(data)) if (JSON.stringify(data[k]) !== JSON.stringify(rec[k])) patch[k] = data[k];
      if (m.key === "credentials" || m.key === "integrations") patch.updatedAt = new Date().toISOString();
      if (Object.keys(patch).length) update(m.col, rec.id, patch, `${m.title.replace(/s$/, "")} saved`); else toast("Nothing changed", "info");
    } else {
      const extra = m.create ? m.create(db) : {};
      add(m.col, { ...extra, ...data, createdBy: user.id }, m.prefix, true);
      toast(`${m.title.replace(/s$/, "").replace(/ies$/, "y")} added`);
    }
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={rec ? `Edit ${m.title.toLowerCase().replace(/s$/, "")}` : `New ${m.title.toLowerCase().replace(/s$/, "").replace(/ies$/, "y")}`}
      footer={<>
        {!!err && <Row gap={6} style={{ marginBottom: 10 }}><Ionicons name="alert-circle" size={16} color={c.danger} /><Text style={{ color: c.danger, fontWeight: "600" }}>{err}</Text></Row>}
        <Button title={rec ? "Save changes" : "Save"} icon="checkmark" onPress={save} />
      </>}>
      {m.fields.filter((fl) => !fl.readOnly && !(fl.createOnly && rec)).map((fl) => <Field key={fl.k} fl={fl} value={f[fl.k]} onChange={set(fl.k)} form={f} />)}
      {m.totals && <TotalLine f={f} />}
    </Sheet>
  );
}

function TotalLine({ f }) {
  const { c } = useTheme();
  const t = invoiceTotal({ items: (f.items || []).map((i) => ({ qty: Number(i.qty) || 0, rate: Number(i.rate) || 0 })), discountPct: f.discountPct, gstPct: f.gstPct });
  return <Row style={{ justifyContent: "space-between", backgroundColor: c.brandSoft, borderRadius: radius.md, padding: 14, marginBottom: 8 }}><T v="body" style={{ fontWeight: "700" }}>Total with GST</T><T v="h2" color={c.brand}>{inr(t)}</T></Row>;
}

function Field({ fl, value, onChange }) {
  const { c } = useTheme();
  const t = fl.type || "text";
  if (t === "choice") return <Choice label={fl.label} options={fl.options.map((o) => ({ value: o, label: String(o) + (typeof o === "number" && /%/.test(fl.label) ? "%" : "") }))} value={value} onChange={onChange} />;
  if (t === "bool") return (
    <Row style={{ justifyContent: "space-between", backgroundColor: c.card, borderRadius: radius.md, padding: 14, marginBottom: 14 }}>
      <T v="body" style={{ fontWeight: "600" }}>{fl.label}</T>
      <Switch value={!!value} onValueChange={onChange} trackColor={{ true: c.success, false: c.line }} thumbColor="#fff" />
    </Row>
  );
  if (t === "date") return <DateField label={fl.label} value={value} onChange={onChange} />;
  if (t === "ref") return <RefField fl={fl} value={value} onChange={onChange} />;
  if (t === "client") return <ClientField value={value} onChange={onChange} />;
  if (t === "items") return <ItemsField value={value || []} onChange={onChange} />;
  const kb = t === "money" || t === "number" ? "numeric" : t === "phone" ? "phone-pad" : t === "email" ? "email-address" : "default";
  return (
    <View>
      <Input label={fl.label + (fl.required ? " *" : "")} value={value == null ? "" : String(value)} onChangeText={onChange} multiline={t === "multiline"} keyboardType={kb}
        secureTextEntry={t === "password"} autoCapitalize={["email", "url", "password"].includes(t) ? "none" : "sentences"}
        icon={{ money: "cash-outline", phone: "call-outline", email: "mail-outline", url: "globe-outline", password: "key-outline" }[t]} style={fl.hint ? { marginBottom: 4 } : undefined} />
      {!!fl.hint && <T v="sub" faint style={{ marginBottom: 14, fontSize: 12 }}>{fl.hint}</T>}
    </View>
  );
}

function DateField({ label, value, onChange }) {
  const { c } = useTheme();
  const t = today();
  const quick = [["Today", t], ["Tomorrow", addDays(t, 1)], ["+7 days", addDays(t, 7)], ["+15 days", addDays(t, 15)], ["+30 days", addDays(t, 30)]];
  return (
    <View style={{ marginBottom: 14 }}>
      <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <T v="sub" muted style={{ fontWeight: "600" }}>{label}</T>
        {!!value && <T v="sub" style={{ fontWeight: "700", color: c.brand }}>{fmtDate(value)} {value.slice(0, 4)}</T>}
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 8, flexGrow: 0 }}>
        {quick.map(([l, d]) => <Chip key={l} label={l} active={value === d} onPress={() => onChange(d)} />)}
        {!!value && <Chip label="Clear" icon="close" onPress={() => onChange("")} />}
      </ScrollView>
      <Input value={value || ""} onChangeText={onChange} placeholder="YYYY-MM-DD" icon="calendar-outline" style={{ marginBottom: 0 }} keyboardType="numbers-and-punctuation" />
    </View>
  );
}

function RefField({ fl, value, onChange }) {
  const { c } = useTheme();
  const { db } = useStore();
  const [q, setQ] = useState("");
  const list = db[fl.source] || [];
  const sel = list.find((x) => x.id === value);
  return (
    <View style={{ marginBottom: 14 }}>
      <T v="sub" muted style={{ marginBottom: 8, fontWeight: "600" }}>{fl.label}{fl.required ? " *" : ""}</T>
      {sel ? (
        <Row style={{ backgroundColor: c.brandSoft, borderRadius: radius.md, padding: 12, justifyContent: "space-between" }}>
          <T v="body" style={{ fontWeight: "700", flex: 1 }} numberOfLines={1}>{fl.show(sel)}</T>
          <Press onPress={() => onChange("")}><Text style={{ color: c.brand, fontWeight: "700" }}>Change</Text></Press>
        </Row>
      ) : (
        <>
          <Input value={q} onChangeText={setQ} placeholder="Search…" icon="search" style={{ marginBottom: 6 }} />
          {list.filter((x) => !q || fl.show(x).toLowerCase().includes(q.toLowerCase())).slice(0, 6).map((x) => (
            <Press key={x.id} onPress={() => { onChange(x.id); setQ(""); }} style={{ padding: 12, borderRadius: radius.sm, backgroundColor: c.card, marginBottom: 6 }}>
              <T v="body" style={{ fontWeight: "600" }} numberOfLines={1}>{fl.show(x)}</T>
            </Press>
          ))}
        </>
      )}
    </View>
  );
}

// Client for quotations / invoices: pick a lead (fills details) or type them
function ClientField({ value, onChange }) {
  const { c } = useTheme();
  const { db } = useStore();
  const [q, setQ] = useState("");
  const v = value || {};
  const set = (k) => (x) => onChange({ ...v, [k]: x });
  const found = q.trim() ? db.leads.filter((l) => `${l.name} ${l.company} ${l.phone}`.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];
  return (
    <View style={{ marginBottom: 6 }}>
      <T v="sub" muted style={{ marginBottom: 8, fontWeight: "600" }}>Client *</T>
      <Input value={q} onChangeText={setQ} placeholder="Fill from a lead — search name or phone" icon="search" style={{ marginBottom: 6 }} />
      {found.map((l) => (
        <Press key={l.id} onPress={() => { onChange({ name: l.name, company: l.company || "", phone: l.phone || "", email: l.email || "", address: l.city || "", gstin: "" }); setQ(""); }}
          style={{ padding: 12, borderRadius: radius.sm, backgroundColor: c.card, marginBottom: 6 }}>
          <T v="body" style={{ fontWeight: "700" }}>{l.name}</T><T v="sub" muted>{[l.company, l.phone].filter(Boolean).join(" · ")}</T>
        </Press>
      ))}
      <Row gap={10}><Input style={{ flex: 1 }} label="Contact name" value={v.name || ""} onChangeText={set("name")} /><Input style={{ flex: 1 }} label="Company" value={v.company || ""} onChangeText={set("company")} /></Row>
      <Row gap={10}><Input style={{ flex: 1 }} label="Phone" value={v.phone || ""} onChangeText={set("phone")} keyboardType="phone-pad" /><Input style={{ flex: 1 }} label="GSTIN" value={v.gstin || ""} onChangeText={set("gstin")} autoCapitalize="characters" /></Row>
      <Input label="Email" value={v.email || ""} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
    </View>
  );
}

function ItemsField({ value, onChange }) {
  const { c } = useTheme();
  const { db } = useStore();
  const [pick, setPick] = useState(false);
  const setRow = (i, k) => (x) => onChange(value.map((r, j) => (j === i ? { ...r, [k]: x } : r)));
  return (
    <View style={{ marginBottom: 14 }}>
      <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <T v="sub" muted style={{ fontWeight: "600" }}>Items</T>
        {(db.products || []).length > 0 && <Press onPress={() => setPick((p) => !p)}><Text style={{ color: c.brand, fontWeight: "700" }}>{pick ? "Close price list" : "From price list"}</Text></Press>}
      </Row>
      {pick && (db.products || []).filter((p) => p.active !== false).slice(0, 12).map((p) => (
        <Press key={p.id} onPress={() => { onChange([...value.filter((r) => r.desc?.trim()), { id: uid("i"), desc: p.name, hsn: p.hsn || "", qty: 1, rate: String(p.price || 0) }]); setPick(false); }}
          style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: radius.sm, backgroundColor: c.card, marginBottom: 6 }}>
          <T v="body" style={{ fontWeight: "600", flex: 1 }} numberOfLines={1}>{p.name}</T><T v="body" style={{ fontWeight: "700" }}>{inr(p.price)}</T>
        </Press>
      ))}
      {value.map((r, i) => (
        <View key={r.id || i} style={{ backgroundColor: c.card, borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
          <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <T v="sub" faint style={{ fontWeight: "700" }}>Item {i + 1}</T>
            {value.length > 1 && <Press onPress={() => onChange(value.filter((_, j) => j !== i))}><Ionicons name="trash-outline" size={17} color={c.danger} /></Press>}
          </Row>
          <Input value={r.desc} onChangeText={setRow(i, "desc")} placeholder="Description" style={{ marginBottom: 8 }} />
          <Row gap={8}>
            <Input style={{ width: 90, marginBottom: 0 }} value={String(r.qty ?? "")} onChangeText={setRow(i, "qty")} placeholder="Qty" keyboardType="numeric" />
            <Input style={{ flex: 1, marginBottom: 0 }} value={String(r.rate ?? "")} onChangeText={setRow(i, "rate")} placeholder="Rate ₹" keyboardType="numeric" icon="cash-outline" />
          </Row>
        </View>
      ))}
      <Button small variant="soft" icon="add" title="Add item" onPress={() => onChange([...value, { id: uid("i"), desc: "", qty: 1, rate: "" }])} style={{ alignSelf: "flex-start" }} />
    </View>
  );
}

// Record a payment on monthly services / extra work
export function SimplePaymentForm({ visible, onClose, modKey, rec }) {
  const m = modByKey[modKey];
  const { update } = useStore();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("UPI");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [err, setErr] = useState("");
  if (!m || !rec) return null;
  const save = () => {
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) return setErr("Enter the amount");
    const p = { id: uid("p"), amount: amt, date: today(), mode, ref: "", note: "Recorded from mobile", ...(m.key === "monthlyServices" ? { month } : {}) };
    update(m.col, rec.id, (r) => ({ payments: [...(r.payments || []), p] }), `${inr(amt)} recorded`);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Record payment" subtitle={rec.client || rec.title}
      footer={<><T v="sub" color="#F43F5E" style={{ marginBottom: err ? 8 : 0 }}>{err}</T><Button variant="success" title="Save payment" icon="checkmark" onPress={save} /></>}>
      <Input label="Amount ₹" icon="cash-outline" value={amount} onChangeText={setAmount} keyboardType="numeric" autoFocus />
      {m.key === "monthlyServices" && <Input label="For month (YYYY-MM)" value={month} onChangeText={setMonth} />}
      <Choice label="Paid by" options={["UPI", "NEFT", "Cash", "Cheque", "Card"]} value={mode} onChange={setMode} />
    </Sheet>
  );
}
