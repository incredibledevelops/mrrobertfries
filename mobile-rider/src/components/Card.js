import { View, StyleSheet } from "react-native";
import { colors, radius, shadow, spacing } from "../theme/theme";

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
});