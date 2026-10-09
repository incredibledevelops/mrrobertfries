import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

export default function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}) {
  const isPrimary = variant === "primary";
  const bg = isPrimary ? colors.gold : "transparent";
  const textColor = isPrimary ? colors.dark : colors.text;
  const borderColor = isPrimary ? colors.gold : colors.border;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor,
          opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});