// Design tokens for the NNC CRM mobile app (light + dark).
import { createContext, useContext } from "react";
import { Platform } from "react-native";

const base = {
  brand: "#4F46E5",
  brand2: "#7C3AED",
  brandSoft: "#EEF0FF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#F43F5E",
  info: "#0EA5E9",
};

export const light = {
  ...base,
  dark: false,
  bg: "#F5F6FB",
  card: "#FFFFFF",
  cardAlt: "#F8F9FD",
  text: "#0F172A",
  sub: "#64748B",
  faint: "#94A3B8",
  line: "#E9ECF3",
  input: "#F1F3F9",
  tabBar: "#FFFFFF",
  heroA: "#4F46E5",
  heroB: "#7C3AED",
};

export const dark = {
  ...base,
  dark: true,
  brandSoft: "rgba(99,102,241,0.16)",
  bg: "#0B0F1A",
  card: "#141A29",
  cardAlt: "#1A2133",
  text: "#F1F5F9",
  sub: "#94A3B8",
  faint: "#64748B",
  line: "#222B3D",
  input: "#1A2133",
  tabBar: "#111624",
  heroA: "#3730A3",
  heroB: "#6D28D9",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const space = (n) => n * 4;

export const shadow = (c, level = 1) =>
  c.dark
    ? { borderWidth: 1, borderColor: c.line }
    : Platform.select({
        ios: { shadowColor: "#1E1B4B", shadowOpacity: 0.06 * level, shadowRadius: 10 * level, shadowOffset: { width: 0, height: 4 * level } },
        android: { elevation: 2 * level },
        default: { boxShadow: `0 ${4 * level}px ${14 * level}px rgba(30,27,75,${0.06 * level})` },
      });

// Colour per lead stage / status (hex so it works for text, dots and soft backgrounds)
export const STAGE_COLOR = {
  New: "#0EA5E9", Contacted: "#6366F1", Qualified: "#8B5CF6", "Proposal Sent": "#F59E0B",
  Negotiation: "#F97316", Won: "#10B981", Lost: "#F43F5E",
};
export const PRIORITY_COLOR = { Hot: "#F43F5E", Warm: "#F59E0B", Cold: "#94A3B8", High: "#F43F5E", Medium: "#F59E0B", Low: "#94A3B8", Urgent: "#E11D48" };
export const TYPE_COLOR = {
  Call: "#10B981", Meeting: "#6366F1", Demo: "#F59E0B", Blocked: "#94A3B8", "Follow-up": "#4F46E5",
  "Payment follow-up": "#F43F5E", "Client response": "#06B6D4", Task: "#64748B",
};
export const soft = (hex, a = 0.12) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const ThemeCtx = createContext({ c: light, isDark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);
