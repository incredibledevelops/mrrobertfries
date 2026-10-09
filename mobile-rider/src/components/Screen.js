import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/theme";

export default function Screen({ children, style }) {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={["top", "left", "right"]}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.dark },
  inner: { flex: 1, backgroundColor: colors.dark },
});