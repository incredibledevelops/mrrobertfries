import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { MapPin, User } from "lucide-react-native";
import * as api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Button from "../components/Button";
import Card from "../components/Card";
import Screen from "../components/Screen";
import StatusBadge from "../components/StatusBadge";
import { colors, spacing } from "../theme/theme";

export default function DeliveryDetailScreen() {
  const route = useRoute();
  const { token, signOut } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState(route.params.order);
  const [busy, setBusy] = useState(false);

  const advance = useCallback(
    async (status) => {
      setBusy(true);
      try {
        const updated = await api.updateOrderStatus(token, order.id, status);
        setOrder(updated);
        toast.show(
          status === "delivered"
            ? "Marked as delivered"
            : "Out for delivery"
        );
      } catch (e) {
        if (e.status === 401) {
          toast.show("Session expired.", "error");
          signOut();
        } else {
          toast.show(e.message || "Could not update", "error");
        }
      } finally {
        setBusy(false);
      }
    },
    [order.id, token, signOut, toast]
  );

  function confirmDelivered() {
    Alert.alert(
      "Confirm delivery",
      `Mark ${order.reference} as delivered?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, delivered", onPress: () => advance("delivered") },
      ]
    );
  }

  function call() {
    Linking.openURL(`tel:${order.customer_phone}`);
  }

  function openMaps() {
    const q = encodeURIComponent(order.delivery_address || "");
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${q}`
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.ref}>{order.reference}</Text>
            <StatusBadge status={order.status} />
          </View>
          <Text style={styles.total}>GH₵ {order.total.toFixed(2)}</Text>
          <Text style={styles.meta}>{order.items_count} items</Text>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.sectionRow}>
            <User color={colors.textMuted} size={16} />
            <Text style={styles.sectionTitle}>Customer</Text>
          </View>
          <Text style={styles.name}>{order.customer_name}</Text>

          <View style={styles.actionRow}>
            <Button
              label="Call Customer"
              variant="ghost"
              onPress={call}
              style={styles.actionBtn}
            />
          </View>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.sectionRow}>
            <MapPin color={colors.textMuted} size={16} />
            <Text style={styles.sectionTitle}>Deliver to</Text>
          </View>
          <Text style={styles.address}>
            {order.delivery_address || order.delivery_zone_name}
          </Text>
          <Text style={styles.meta}>{order.delivery_zone_name}</Text>

          <View style={styles.actionRow}>
            <Button
              label="Open in Maps"
              variant="ghost"
              onPress={openMaps}
              style={styles.actionBtn}
            />
          </View>
        </Card>

        <View style={{ marginTop: spacing.xl }}>
          {order.status === "ready" && (
            <Button
              label="Start Delivery"
              loading={busy}
              onPress={() => advance("out_for_delivery")}
            />
          )}
          {order.status === "out_for_delivery" && (
            <Button
              label="Mark Delivered"
              loading={busy}
              onPress={confirmDelivered}
            />
          )}
          {(order.status === "paid" || order.status === "preparing") && (
            <Text style={styles.waiting}>
              Waiting for kitchen to mark ready.
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ref: { color: colors.gold, fontWeight: "800", fontSize: 14 },
  total: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 22,
    marginTop: spacing.sm,
  },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  address: {
    color: colors.text,
    fontSize: 15,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  actionRow: { marginTop: spacing.md },
  actionBtn: { width: "100%" },
  waiting: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.lg,
  },
});