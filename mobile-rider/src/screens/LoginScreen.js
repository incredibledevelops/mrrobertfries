import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Bike, Lock, Mail } from "lucide-react-native";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Button from "../components/Button";
import Screen from "../components/Screen";
import { colors, radius, spacing } from "../theme/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      toast.show("Welcome back!");
    } catch (e) {
      setError(e.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Bike color={colors.dark} size={28} strokeWidth={2.5} />
          </View>
        </View>

        <Text style={styles.title}>Rider Portal</Text>
        <Text style={styles.subtitle}>Sign in to manage your deliveries</Text>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Mail color={colors.textMuted} size={18} />
          <TextInput
            placeholder="rider@mrfries.com"
            placeholderTextColor={colors.textDim}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Lock color={colors.textMuted} size={18} />
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
        </View>

        <Button
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
  brandRow: { alignItems: "center", marginBottom: spacing.xl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: { color: "#FCA5A5", fontSize: 13 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.lg,
  },
});