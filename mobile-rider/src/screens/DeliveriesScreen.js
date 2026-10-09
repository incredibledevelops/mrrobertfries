import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Bike, MapPin, Package, Phone } from "lucide-react-native";
import * as api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Card from "../components/Card";
import Screen from "../components/Screen";
import StatusBadge from "../components/StatusBadge";
import { colors, spacing } from "../theme/theme";

export default function DeliveriesScreen() {
  const navigation = useNavigation();
  const { token, signOut } = useAuth();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getMyDeliveries(token);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.status === 401) {
        toast.show("Session expired. Please sign in again.", "error");
        signOut();
      } else {
        toast.show(e.message || "Could not load deliveries", "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, signOut, toast]);

  // Reload every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>My Deliveries</Text>
        <Text style={styles.sub}>
          {orders.length} active {orders.length === 1 ? "order" : "orders"}
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
              <Bike color={colors.textDim} size={48} />
              <Text style={styles.emptyTitle}>No active deliveries</Text>
              <Text style={styles.emptySub}>
                Claim an order from the Available tab.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("DeliveryDetail", { order: item })
            }
          >
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.ref}>{item.reference}</Text>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.line}>
                <Package color={colors.textMuted} size={14} />
                <Text style={styles.lineText}>
                  {item.items_count} items · GH₵ {item.total.toFixed(2)}
                </Text>
              </View>

              <View style={styles.line}>
                <MapPin color={colors.textMuted} size={14} />
                <Text style={styles.lineText} numberOfLines={1}>
                  {item.delivery_zone_name}
                </Text>
              </View>

              <View style={styles.line}>
                <Phone color={colors.textMuted} size={14} />
                <Text style={styles.lineText}>{item.customer_phone}</Text>
              </View>
            </Card>
          </Pressable>
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
    marginBottom: spacing.md,
  },
  ref: { color: colors.gold, fontWeight: "800", fontSize: 13 },
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