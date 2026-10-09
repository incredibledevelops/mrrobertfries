import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { CheckCircle2, History } from "lucide-react-native";
import * as api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Card from "../components/Card";
import Screen from "../components/Screen";
import { colors, spacing } from "../theme/theme";

export default function HistoryScreen() {
  const { token, signOut } = useAuth();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getHistory(token);
      const delivered = (Array.isArray(data) ? data : []).filter(
        (o) => o.status === "delivered"
      );
      setOrders(delivered);
    } catch (e) {
      if (e.status === 401) {
        toast.show("Session expired.", "error");
        signOut();
      } else {
        toast.show(e.message || "Could not load history", "error");
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

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todays = orders.filter(
      (o) => o.delivered_at && new Date(o.delivered_at) >= today
    );
    return { today: todays.length, total: orders.length };
  }, [orders]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.sub}>Your completed deliveries</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>TODAY</Text>
          <Text style={styles.statValue}>{stats.today}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>ALL TIME</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
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
              <History color={colors.textDim} size={48} />
              <Text style={styles.emptyTitle}>
                No completed deliveries yet
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.ref}>{item.reference}</Text>
              <CheckCircle2 color={colors.success} size={18} />
            </View>
            <Text style={styles.customer}>{item.customer_name}</Text>
            <View style={styles.row}>
              <Text style={styles.meta}>
                {item.delivered_at
                  ? new Date(item.delivered_at).toLocaleString()
                  : ""}
              </Text>
              <Text style={styles.total}>
                GH₵ {item.total.toFixed(2)}
              </Text>
            </View>
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.textDim,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.gold,
    marginTop: spacing.xs,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ref: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  customer: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  meta: { color: colors.textDim, fontSize: 12, marginTop: spacing.sm },
  total: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 14,
    marginTop: spacing.sm,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: spacing.md },
  emptyTitle: { color: colors.textMuted, fontSize: 14 },
});