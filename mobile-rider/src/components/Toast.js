import React, { createContext, useCallback, useContext, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <View pointerEvents="none" style={styles.wrap}>
          <View
            style={[
              styles.toast,
              toast.type === "error" ? styles.error : styles.success,
            ]}
          >
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
  },
  toast: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxWidth: "90%",
  },
  success: {
    backgroundColor: "rgba(6,78,59,0.95)",
    borderColor: colors.success,
  },
  error: {
    backgroundColor: "rgba(69,10,10,0.95)",
    borderColor: colors.danger,
  },
  text: { color: "#fff", fontWeight: "600", fontSize: 14 },
});