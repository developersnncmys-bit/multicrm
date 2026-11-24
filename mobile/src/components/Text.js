// App-wide font: Poppins. On Android a custom font needs one file per weight,
// so these wrappers turn fontWeight into the matching Poppins family.
import { forwardRef } from "react";
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from "react-native";

export const FONT_FILES = {
  Poppins_400Regular: require("@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf"),
  Poppins_500Medium: require("@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf"),
  Poppins_600SemiBold: require("@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf"),
  Poppins_700Bold: require("@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf"),
};

// Poppins is heavier than the system font, so each weight maps one step lighter
// (keeps the UI clean instead of chunky).
const FAMILY = { 400: "Poppins_400Regular", 500: "Poppins_400Regular", 600: "Poppins_500Medium", 700: "Poppins_600SemiBold", 800: "Poppins_700Bold", 900: "Poppins_700Bold" };
const familyFor = (w) => FAMILY[w === "bold" ? 700 : w === "normal" || !w ? 400 : Math.min(900, Math.max(400, Number(w)))] || FAMILY[400];

function withFont(style) {
  const s = StyleSheet.flatten(style) || {};
  if (s.fontFamily) return s;
  const { fontWeight, ...rest } = s;
  return { ...rest, fontFamily: familyFor(fontWeight) };
}

export const Text = forwardRef(function Text({ style, ...p }, ref) {
  return <RNText ref={ref} {...p} style={withFont(style)} />;
});

export const TextInput = forwardRef(function TextInput({ style, ...p }, ref) {
  return <RNTextInput ref={ref} {...p} style={withFont(style)} />;
});
