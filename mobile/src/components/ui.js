// Reusable building blocks: text, cards, buttons, chips, inputs, sheets, toast…
import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { radius, shadow, soft, useTheme } from "../theme";
import { avatarColor, initials } from "../utils";

export const tap = () => Haptics.selectionAsync().catch(() => {});

// ── Text ──
const VARIANTS = {
  display: { fontSize: 30, fontWeight: "800", letterSpacing: -0.8 },
  h1: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  h2: { fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: "500" },
  sub: { fontSize: 13, fontWeight: "500" },
  cap: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
};
export function T({ v = "body", color, muted, faint, style, ...p }) {
  const { c } = useTheme();
  return <Text {...p} style={[VARIANTS[v], { color: color || (muted ? c.sub : faint ? c.faint : c.text) }, style]} />;
}

// ── Press with a gentle shrink ──
// The style goes on the pressable itself, so width %, flex:1 etc. size correctly inside rows.
const APressable = Animated.createAnimatedComponent(Pressable);
export function Press({ onPress, style, children, disabled, haptic = true, scale = 0.97, ...p }) {
  const [a] = useState(() => new Animated.Value(1));
  const to = (v) => Animated.spring(a, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <APressable {...p} disabled={disabled} onPressIn={() => to(scale)} onPressOut={() => to(1)}
      onPress={(e) => { if (haptic) tap(); onPress?.(e); }}
      style={[style, { transform: [{ scale: a }] }, disabled && { opacity: 0.5 }]}>
      {children}
    </APressable>
  );
}

export function Card({ style, onPress, children, pad = 16 }) {
  const { c } = useTheme();
  const s = [{ backgroundColor: c.card, borderRadius: radius.lg, padding: pad }, shadow(c), style];
  return onPress ? <Press onPress={onPress} style={s}>{children}</Press> : <View style={s}>{children}</View>;
}

export function Row({ style, children, gap = 10, ...p }) {
  return <View {...p} style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

// ── Buttons ──
export function Button({ title, icon, onPress, variant = "primary", loading, disabled, style, small }) {
  const { c } = useTheme();
  const h = small ? 40 : 52;
  const inner = (color) => (
    <Row gap={8} style={{ justifyContent: "center", height: h, paddingHorizontal: small ? 14 : 20 }}>
      {loading ? <ActivityIndicator color={color} /> : icon ? <Ionicons name={icon} size={small ? 16 : 19} color={color} /> : null}
      {!!title && <T v={small ? "sub" : "h3"} color={color} style={{ fontWeight: "700" }}>{title}</T>}
    </Row>
  );
  if (variant === "primary" || variant === "success" || variant === "danger") {
    const colors = variant === "success" ? ["#10B981", "#059669"] : variant === "danger" ? ["#F43F5E", "#E11D48"] : [c.brand, c.brand2];
    return (
      <Press onPress={onPress} disabled={disabled || loading} style={[{ borderRadius: radius.md, overflow: "hidden" }, style]}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{inner("#fff")}</LinearGradient>
      </Press>
    );
  }
  const bg = variant === "soft" ? c.brandSoft : variant === "ghost" ? "transparent" : c.card;
  const fg = variant === "soft" ? c.brand : c.text;
  return (
    <Press onPress={onPress} disabled={disabled || loading}
      style={[{ borderRadius: radius.md, backgroundColor: bg, borderWidth: variant === "secondary" ? 1 : 0, borderColor: c.line }, style]}>
      {inner(fg)}
    </Press>
  );
}

export function IconBtn({ icon, onPress, color, bg, size = 42, badge, style }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} style={[{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: bg || c.card }, !bg && shadow(c), style]}>
      <Ionicons name={icon} size={size * 0.46} color={color || c.text} />
      {!!badge && <View style={[st.dotBadge, { borderColor: bg || c.card }]}><Text style={st.dotBadgeText}>{badge > 9 ? "9+" : badge}</Text></View>}
    </Press>
  );
}

// ── Small pieces ──
export function Badge({ label, color = "#6366F1", dot, style }) {
  return (
    <Row gap={5} style={[{ backgroundColor: soft(color, 0.13), paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" }, style]}>
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />}
      <Text style={{ color, fontSize: 11.5, fontWeight: "700" }}>{label}</Text>
    </Row>
  );
}

export function Chip({ label, active, onPress, color, icon, count }) {
  const { c } = useTheme();
  const col = color || c.brand;
  return (
    <Press onPress={onPress} style={{
      flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.pill,
      backgroundColor: active ? col : c.card, borderWidth: 1, borderColor: active ? col : c.line,
    }}>
      {icon && <Ionicons name={icon} size={14} color={active ? "#fff" : c.sub} />}
      <Text style={{ color: active ? "#fff" : c.text, fontWeight: "600", fontSize: 13 }}>{label}</Text>
      {count != null && <Text style={{ color: active ? "rgba(255,255,255,0.8)" : c.faint, fontWeight: "700", fontSize: 12 }}>{count}</Text>}
    </Press>
  );
}

export function ChipScroll({ children, style }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={[{ gap: 8, paddingHorizontal: 20 }, style]}>{children}</ScrollView>;
}

export function Avatar({ name, size = 44, color }) {
  const col = color || avatarColor(name);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.36, backgroundColor: soft(col, 0.16), alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: col, fontWeight: "800", fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export function Progress({ value, color, height = 6, track }) {
  const { c } = useTheme();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track || c.input, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, height, borderRadius: height, backgroundColor: color || c.brand }} />
    </View>
  );
}

export function SectionTitle({ title, action, onAction, style }) {
  const { c } = useTheme();
  return (
    <Row style={[{ justifyContent: "space-between", marginBottom: 12 }, style]}>
      <T v="h2">{title}</T>
      {!!action && <Press onPress={onAction}><Text style={{ color: c.brand, fontWeight: "700", fontSize: 13.5 }}>{action}</Text></Press>}
    </Row>
  );
}

export function Empty({ icon = "sparkles-outline", title, text, action, onAction }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 30 }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Ionicons name={icon} size={32} color={c.brand} />
      </View>
      <T v="h3" style={{ textAlign: "center" }}>{title}</T>
      {!!text && <T v="sub" muted style={{ textAlign: "center", marginTop: 6, lineHeight: 19 }}>{text}</T>}
      {!!action && <Button small variant="soft" title={action} onPress={onAction} style={{ marginTop: 16 }} />}
    </View>
  );
}

// ── Inputs ──
export function Input({ label, icon, style, inputStyle, multiline, right, ...p }) {
  const { c } = useTheme();
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {!!label && <T v="sub" muted style={{ marginBottom: 7, fontWeight: "600" }}>{label}</T>}
      <Row gap={10} style={{ backgroundColor: c.input, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 50, alignItems: multiline ? "flex-start" : "center" }}>
        {icon && <Ionicons name={icon} size={18} color={c.faint} style={multiline && { marginTop: 15 }} />}
        <TextInput placeholderTextColor={c.faint} multiline={multiline} {...p}
          style={[{ flex: 1, color: c.text, fontSize: 15, fontWeight: "500", paddingVertical: 13, minHeight: multiline ? 90 : undefined, textAlignVertical: multiline ? "top" : "center" }, inputStyle]} />
        {right}
      </Row>
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder = "Search", style }) {
  const { c } = useTheme();
  return (
    <Row gap={10} style={[{ backgroundColor: c.card, borderRadius: radius.md, paddingHorizontal: 14, height: 48 }, shadow(c), style]}>
      <Ionicons name="search" size={18} color={c.faint} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.faint} style={{ flex: 1, color: c.text, fontSize: 15 }} returnKeyType="search" />
      {!!value && <Press onPress={() => onChangeText("")}><Ionicons name="close-circle" size={18} color={c.faint} /></Press>}
    </Row>
  );
}

// Pick one option from chips (used instead of native pickers)
export function Choice({ label, options, value, onChange, colors }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {!!label && <T v="sub" muted style={{ marginBottom: 8, fontWeight: "600" }}>{label}</T>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value; const l = typeof o === "string" ? o : o.label;
          return <Chip key={v} label={l} active={value === v} color={colors?.[v]} onPress={() => onChange(v)} />;
        })}
      </View>
    </View>
  );
}

export function Segmented({ options, value, onChange, style }) {
  const { c } = useTheme();
  return (
    <Row gap={4} style={[{ backgroundColor: c.input, borderRadius: radius.md, padding: 4 }, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Press key={o.value} onPress={() => onChange(o.value)} style={[{ flex: 1, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.card : "transparent" }, on && shadow(c)]}>
            <Text style={{ fontWeight: "700", fontSize: 13, color: on ? c.text : c.sub }}>{o.label}{o.count != null ? `  ${o.count}` : ""}</Text>
          </Press>
        );
      })}
    </Row>
  );
}

// ── Bottom sheet ──
export function Sheet({ visible, onClose, title, subtitle, children, footer }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}><View style={{ flex: 1, backgroundColor: "rgba(8,10,25,0.45)" }} /></Pressable>
        <View style={{ backgroundColor: c.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: "92%", paddingBottom: Math.max(insets.bottom, 16) }}>
          <View style={{ alignItems: "center", paddingTop: 10 }}><View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.line }} /></View>
          <Row style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <T v="h2">{title}</T>
              {!!subtitle && <T v="sub" muted style={{ marginTop: 3 }}>{subtitle}</T>}
            </View>
            <IconBtn icon="close" size={36} bg={c.input} onPress={onClose} />
          </Row>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 }}>{children}</ScrollView>
          {footer && <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Toast (driven by the store) ──
export function Toast({ msg }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-120));
  useEffect(() => {
    if (!msg) return;
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
    const t = setTimeout(() => Animated.timing(y, { toValue: -140, duration: 250, useNativeDriver: true }).start(), 2600);
    return () => clearTimeout(t);
  }, [msg, y]);
  if (!msg) return null;
  const col = msg.type === "error" ? c.danger : msg.type === "info" ? c.info : c.success;
  const icon = msg.type === "error" ? "alert-circle" : msg.type === "info" ? "information-circle" : "checkmark-circle";
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, top: insets.top + 8, transform: [{ translateY: y }], zIndex: 99 }}>
      <Row gap={10} style={[{ backgroundColor: c.dark ? c.cardAlt : "#0F172A", borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14 }, shadow(c, 2)]}>
        <Ionicons name={icon} size={22} color={col} />
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14, flex: 1 }}>{msg.text}</Text>
      </Row>
    </Animated.View>
  );
}

// Screen header used by every tab: big title + optional right buttons
export function Header({ title, subtitle, right, style }) {
  return (
    <Row style={[{ justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }, style]}>
      <View style={{ flex: 1 }}>
        <T v="h1">{title}</T>
        {!!subtitle && <T v="sub" muted style={{ marginTop: 2 }}>{subtitle}</T>}
      </View>
      {right && <Row gap={8}>{right}</Row>}
    </Row>
  );
}

const st = StyleSheet.create({
  dotBadge: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#F43F5E", alignItems: "center", justifyContent: "center", borderWidth: 2, paddingHorizontal: 3 },
  dotBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
});
