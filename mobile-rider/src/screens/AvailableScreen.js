import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ClipboardList, MapPin, Package } from "lucide-react-native";
import * as api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Button from "../components/Button";
import Card from "../components/Card";
import Screen from "../components/Screen";
import { colors, spacing } from "../theme/theme";

export default function AvailableScreen({ onClaimed }) {
  const { token, signOut } = useAuth();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getAssignable(token);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.status === 401) {
        toast.show("Session expired.", "error");
        signOut();
      } else {
        toast.show(e.message || "Could not load orders", "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, signOut, toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  function claim(order) {
    Alert.alert(
      "Claim this order?",
      `${order.reference} → ${order.delivery_zone_name}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Claim",
          onPress: async () => {
            setClaimingId(order.id);
            try {
              await api.claimOrder(token, order.id);
              toast.show("Order claimed!");
              onClaimed?.();
            } catch (e) {
              toast.show(e.message || "Could not claim", "error");
            } finally {
              setClaimingId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Available</Text>
        <Text style={styles.sub}>
          {orders.length} {orders.length === 1 ? "order" : "orders"} waiting
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <ClipboardList color={colors.textDim} size={48} />
              <Text style={styles.emptyTitle}>No orders available</Text>
              <Text style={styles.emptySub}>Check back in a moment.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.ref}>{item.reference}</Text>
              <Text style={styles.total}>GH₵ {item.total.toFixed(2)}</Text>
            </View>

            <View style={styles.line}>
              <MapPin color={colors.textMuted} size={14} />
              <Text style={styles.lineText}>{item.delivery_zone_name}</Text>
            </View>

            <View style={styles.line}>
              <Package color={colors.textMuted} size={14} />
              <Text style={styles.lineText}>{item.items_count} items</Text>
            </View>

            <Button
              label="Claim Order"
              onPress={() => claim(item)}
              loading={claimingId === item.id}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: { fontSize: 28, fontWeight: "900", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  ref: { color: colors.gold, fontWeight: "800", fontSize: 13 },
  total: { color: colors.text, fontWeight: "800", fontSize: 14 },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  lineText: { color: colors.text, fontSize: 14, flex: 1 },
  empty: { alignItems: "center", paddingTop: 80, gap: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  emptySub: { color: colors.textMuted, fontSize: 13 },
});