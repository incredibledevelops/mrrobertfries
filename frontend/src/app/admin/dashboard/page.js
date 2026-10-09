"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import {
  TableSkeleton,
  StatCardSkeleton,
  SkeletonLine,
  SkeletonBlock,
} from "@/components/Skeleton";

const PERIODS = [
  { key: 7, label: "Last 7 days" },
  { key: 30, label: "Last 30 days" },
  { key: 90, label: "Last 90 days" },
];

const STATUS_COLORS = {
  pending: "#9CA3AF",
  paid: "#10B981",
  preparing: "#F59E0B",
  ready: "#D97706",
  out_for_delivery: "#F97316",
  delivered: "#059669",
  cancelled: "#EF4444",
  failed: "#DC2626",
};

const CHART_COLORS = ["#F59E0B", "#D97706", "#DC2626", "#10B981", "#3B82F6"];

// Full order status set for the admin status dropdown. Include every
// OrderStatus the backend understands.
const ORDER_STATUS_OPTIONS = [
  "pending",
  "paid",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "failed",
];

const ORDERS_PAGE_SIZE = 25;

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl border text-sm font-semibold shadow-lg backdrop-blur flex items-center gap-2 ${
        isError
          ? "bg-red-950/90 border-red-700 text-red-200"
          : "bg-emerald-950/90 border-emerald-700 text-emerald-200"
      }`}
    >
      {isError ? (
        <XCircle className="w-4 h-4" />
      ) : (
        <CheckCircle2 className="w-4 h-4" />
      )}
      {toast.message}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersSkip, setOrdersSkip] = useState(0);
  const [overview, setOverview] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, []);

  const loadOrders = useCallback(async (t, skip) => {
    setLoadingOrders(true);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/orders?limit=${ORDERS_PAGE_SIZE}&skip=${skip}`,
        { headers: { Authorization: `Bearer ${t}` } }
      );
      if (!res.ok) throw new Error("Could not load orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      // If the response is shorter than the page size, we've reached the end.
      // Track a lower bound for "total" as page-size * page count.
      setOrdersSkip(skip);
      setOrdersTotal(skip + (Array.isArray(data) ? data.length : 0));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem("mrf_token");
    if (!t) {
      router.push("/admin");
      return;
    }
    setToken(t);
    loadOrders(t, 0);
  }, [router, loadOrders]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoadingStats(true);
      try {
        const res = await fetch(
          `${API_URL}/api/v1/analytics/overview?days=${days}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Could not load analytics");
        const data = await res.json();
        if (!cancelled) setOverview(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, days]);

  const updateStatus = useCallback(
    async (orderId, status) => {
      try {
        const res = await fetch(
          `${API_URL}/api/v1/orders/${orderId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to update");
        }
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
        showToast("Status updated.");
      } catch (e) {
        showToast(e.message, "error");
      }
    },
    [token, showToast]
  );

  const goToPage = useCallback(
    (delta) => {
      if (!token) return;
      const next = Math.max(0, ordersSkip + delta * ORDERS_PAGE_SIZE);
      loadOrders(token, next);
    },
    [token, ordersSkip, loadOrders]
  );

  // Recharts axis coloring
  const axisProps = {
    stroke: "#6B7280",
    tick: { fill: "#9CA3AF", fontSize: 11 },
    tickLine: false,
  };

  const tooltipStyle = {
    backgroundColor: "#111827",
    border: "1px solid #374151",
    borderRadius: 12,
    color: "#F9FAFB",
  };

  const pageNumber = Math.floor(ordersSkip / ORDERS_PAGE_SIZE) + 1;
  const canGoPrev = ordersSkip > 0;
  const canGoNext = orders.length === ORDERS_PAGE_SIZE;

  return (
    <div>
      {/* Header + period switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Revenue, orders, and trends at a glance.
          </p>
        </div>
        <div className="flex gap-2 bg-brand-card border border-gray-700 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setDays(p.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                days === p.key
                  ? "bg-brand-gold text-brand-dark"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* KPI CARDS with week-over-week deltas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loadingStats || !overview ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Total Revenue"
              value={`GH₵ ${overview.summary.total_revenue.toFixed(2)}`}
              color="text-brand-gold"
              delta={overview.weekly?.revenue_change_pct}
            />
            <KpiCard
              label="Total Orders"
              value={overview.summary.total_orders}
              color="text-white"
              delta={overview.weekly?.orders_change_pct}
            />
            <KpiCard
              label="Avg Order Value"
              value={`GH₵ ${overview.summary.average_order_value.toFixed(2)}`}
              color="text-emerald-400"
            />
            <KpiCard
              label="Pending"
              value={overview.summary.pending_orders}
              color="text-amber-400"
            />
          </>
        )}
      </div>

      {/* Secondary stats row */}
      {overview && !loadingStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <SmallStat
            label="Promo Discounts"
            value={`GH₵ ${overview.summary.total_promo_discount.toFixed(2)}`}
            color="text-brand-crimson"
          />
          <SmallStat
            label="Loyalty Redeemed"
            value={`GH₵ ${overview.summary.total_loyalty_discount.toFixed(2)}`}
            color="text-emerald-400"
          />
          <SmallStat
            label="Points Earned / Redeemed"
            value={`${overview.summary.total_points_earned} / ${overview.summary.total_points_redeemed}`}
            color="text-brand-gold"
          />
        </div>
      )}

      {/* Revenue trend line chart */}
      <div className="bg-brand-card border border-gray-700 rounded-2xl p-6 mb-6">
        <h2 className="font-heading text-lg font-bold text-white mb-1">
          Revenue Trend
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Daily revenue for the selected period
        </p>

        {loadingStats || !overview ? (
          <SkeletonBlock className="h-72" />
        ) : overview.daily.length === 0 ? (
          <p className="text-gray-500 text-sm">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={288}>
            <LineChart data={overview.daily}>
              <defs>
                <linearGradient id="revColor" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#374151" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`GH₵ ${Number(v).toFixed(2)}`, "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="url(#revColor)"
                strokeWidth={3}
                dot={{ r: 3, fill: "#F59E0B" }}
                activeDot={{ r: 6, fill: "#DC2626" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column row: hourly bars + status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Hourly bars */}
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-6">
          <h2 className="font-heading text-lg font-bold text-white mb-1">
            Orders by Hour
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            When customers order most
          </p>
          {loadingStats || !overview ? (
            <SkeletonBlock className="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={overview.hourly}>
                <CartesianGrid stroke="#374151" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={2}
                  {...axisProps}
                />
                <YAxis {...axisProps} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v} orders`, "Orders"]}
                />
                <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                  {overview.hourly.map((entry, i) => (
                    <Cell key={i} fill={entry.orders > 0 ? "#F59E0B" : "#374151"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status donut */}
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-6">
          <h2 className="font-heading text-lg font-bold text-white mb-1">
            Order Status
          </h2>
          <p className="text-xs text-gray-500 mb-6">Distribution by state</p>
          {loadingStats || !overview ? (
            <SkeletonBlock className="h-64" />
          ) : overview.status_breakdown.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie
                  data={overview.status_breakdown}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {overview.status_breakdown.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.status] || CHART_COLORS[i % 5]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, n) => [`${v} orders`, n]}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top sellers bar + top promos + top zones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top sellers */}
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-6">
          <h2 className="font-heading text-lg font-bold text-white mb-4">
            Top Sellers
          </h2>
          {loadingStats || !overview ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonLine className="h-4 w-1/2" />
                  <SkeletonLine className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : overview.top_sellers.length === 0 ? (
            <p className="text-gray-500 text-sm">No sales yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, overview.top_sellers.length * 44)}>
              <BarChart
                layout="vertical"
                data={overview.top_sellers}
                margin={{ left: 10, right: 10 }}
              >
                <CartesianGrid stroke="#374151" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" {...axisProps} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  {...axisProps}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v} sold`, "Quantity"]}
                />
                <Bar dataKey="quantity" fill="#F59E0B" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top promos */}
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-6">
          <h2 className="font-heading text-lg font-bold text-white mb-4">
            Top Promo Codes
          </h2>
          {loadingStats || !overview ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonLine className="h-4 w-1/2" />
                  <SkeletonLine className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !overview.top_promos || overview.top_promos.length === 0 ? (
            <p className="text-gray-500 text-sm">No promo usage yet</p>
          ) : (
            <div className="space-y-3">
              {overview.top_promos.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-brand-gold font-bold truncate">
                      {p.code}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {p.times_used}× used
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-sm">
                      −GH₵ {p.discount_given.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top zones */}
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-6">
          <h2 className="font-heading text-lg font-bold text-white mb-4">
            Top Delivery Zones
          </h2>
          {loadingStats || !overview ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonLine className="h-4 w-1/2" />
                  <SkeletonLine className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : !overview.top_zones || overview.top_zones.length === 0 ? (
            <p className="text-gray-500 text-sm">No deliveries yet</p>
          ) : (
            <div className="space-y-3">
              {overview.top_zones.map((z, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white truncate">{z.zone}</span>
                    <span className="text-brand-gold font-bold ml-2">
                      {z.orders}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-amber to-brand-gold"
                      style={{
                        width: `${
                          (z.orders / overview.top_zones[0].orders) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-brand-card border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="font-heading text-lg font-bold text-white">
            Recent Orders
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button
              onClick={() => goToPage(-1)}
              disabled={!canGoPrev || loadingOrders}
              aria-label="Previous page"
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold">
              Page {pageNumber}
            </span>
            <button
              onClick={() => goToPage(1)}
              disabled={!canGoNext || loadingOrders}
              aria-label="Next page"
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loadingOrders ? (
          <TableSkeleton rows={6} />
        ) : orders.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {ordersSkip === 0
              ? "No orders yet."
              : "No more orders on this page."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Zone</th>
                  <th className="py-2 pr-4">Promo</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-800">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-300">
                      {o.reference}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-white">{o.customer.full_name}</div>
                      <div className="text-xs text-gray-500">
                        {o.customer.phone}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">
                      {o.delivery_zone_name}
                    </td>
                    <td className="py-3 pr-4">
                      {o.promo_code ? (
                        <span className="font-mono text-xs text-emerald-400">
                          {o.promo_code}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-brand-gold font-bold">
                      GH₵ {o.total.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-800 text-white">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className="bg-brand-dark border border-gray-700 text-xs text-white rounded-lg px-2 py-1"
                      >
                        {ORDER_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function KpiCard({ label, value, color, delta }) {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-5">
      <div className="text-xs text-gray-400 uppercase">{label}</div>
      <div className={`text-2xl font-black mt-1 ${color}`}>{value}</div>
      {delta !== null && delta !== undefined && (
        <div
          className={`text-[11px] font-bold mt-2 flex items-center gap-1 ${
            delta >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          <span>{delta >= 0 ? "▲" : "▼"}</span>
          <span>{Math.abs(delta)}% vs last week</span>
        </div>
      )}
    </div>
  );
}

function SmallStat({ label, value, color }) {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-4">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-lg font-black mt-1 ${color}`}>{value}</div>
    </div>
  );
}