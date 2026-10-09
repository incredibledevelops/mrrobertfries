import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

const STATUS = {
  ready: { label: "Ready", color: colors.success, bg: colors.successSoft },
  out_for_delivery: {
    label: "On the way",
    color: colors.warning,
    bg: colors.warningSoft,
  },
  delivered: {
    label: "Delivered",
    color: colors.success,
    bg: colors.successSoft,
  },
  paid: { label: "Paid", color: colors.info, bg: "rgba(59,130,246,0.15)" },
  preparing: {
    label: "Preparing",
    color: colors.warning,
    bg: colors.warningSoft,
  },
  pending: {
    label: "Pending",
    color: colors.textMuted,
    bg: colors.mutedSoft,
  },
  cancelled: { label: "Cancelled", color: colors.danger, bg: colors.dangerSoft },
  failed: { label: "Failed", color: colors.danger, bg: colors.dangerSoft },
};

export default function StatusBadge({ status }) {
  const meta = STATUS[status] || {
    label: status,
    color: colors.textMuted,
    bg: colors.mutedSoft,
  };
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  text: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
});