// frontend/app/admin/dashboard/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [orders, setOrders] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("mrf_token");
    if (!t) {
      router.push("/admin");
      return;
    }
    setToken(t);
    loadAll(t);
  }, []);

  async function loadAll(t) {
    try {
      const [oRes, aRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/orders?limit=100`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`${API_URL}/api/v1/analytics/overview?days=30`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
      ]);

      if (!oRes.ok || !aRes.ok) throw new Error("Could not load admin data");

      setOrders(await oRes.json());
      setOverview(await aRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId, status) {
    try {
      const res = await fetch(`${API_URL}/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
    } catch (e) {
      alert(e.message);
    }
  }

  function logout() {
    localStorage.removeItem("mrf_token");
    router.push("/admin");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-gold">Loading dashboard...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-white">Admin Dashboard</h1>
          <button onClick={logout} className="px-4 py-2 rounded-xl bg-brand-crimson text-white text-sm font-bold">
            Logout
          </button>
        </div>

        {/* Stats cards */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-brand-card border border-gray-700 rounded-2xl p-5">
              <div className="text-xs text-gray-400 uppercase">Total Revenue</div>
              <div className="text-2xl font-black text-brand-gold mt-1">
                GH₵ {overview.summary.total_revenue.toFixed(2)}
              </div>
            </div>
            <div className="bg-brand-card border border-gray-700 rounded-2xl p-5">
              <div className="text-xs text-gray-400 uppercase">Total Orders</div>
              <div className="text-2xl font-black text-white mt-1">
                {overview.summary.total_orders}
              </div>
            </div>
            <div className="bg-brand-card border border-gray-700 rounded-2xl p-5">
              <div className="text-xs text-gray-400 uppercase">Avg Order Value</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                GH₵ {overview.summary.average_order_value.toFixed(2)}
              </div>
            </div>
            <div className="bg-brand-card border border-gray-700 rounded-2xl p-5">
              <div className="text-xs text-gray-400 uppercase">Pending</div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {overview.summary.pending_orders}
              </div>
            </div>
          </div>
        )}

        {/* Top sellers */}
        {overview?.top_sellers?.length > 0 && (
          <div className="bg-brand-card border border-gray-700 rounded-2xl p-6 mb-8">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Top Sellers (30 days)</h2>
            <div className="space-y-2">
              {overview.top_sellers.map((t, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white">{t.quantity}× {t.name}</span>
                  <span className="text-brand-gold font-bold">GH₵ {t.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders table */}
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-6">
          <h2 className="font-heading text-lg font-bold text-white mb-4">Recent Orders</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-sm">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="py-2 pr-4">Reference</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Zone</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-gray-800">
                      <td className="py-3 pr-4 font-mono text-xs text-gray-300">{o.reference}</td>
                      <td className="py-3 pr-4">
                        <div className="text-white">{o.customer.full_name}</div>
                        <div className="text-xs text-gray-500">{o.customer.phone}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">{o.delivery_zone_name}</td>
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
                          onChange={e => updateStatus(o.id, e.target.value)}
                          className="bg-brand-dark border border-gray-700 text-xs text-white rounded-lg px-2 py-1"
                        >
                          <option value="pending">pending</option>
                          <option value="paid">paid</option>
                          <option value="preparing">preparing</option>
                          <option value="out_for_delivery">out_for_delivery</option>
                          <option value="delivered">delivered</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}