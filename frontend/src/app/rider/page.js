"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Bike,
  LogOut,
  MapPin,
  Phone,
  Navigation,
  Package,
  CheckCircle2,
  Clock,
  History,
  Wallet,
  TrendingUp,
  AlertCircle,
  Loader2,
  Play,
  X,
  ClipboardList,
  Truck,
  User,
  Search,
} from "lucide-react";
import { API_URL } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  UI primitives                                                      */
/* ------------------------------------------------------------------ */

function TabBtn({ active, onClick, label, Icon, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 ${
        active
          ? "border-brand-gold text-brand-gold"
          : "border-transparent text-gray-400 hover:text-white"
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
      {count !== undefined && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            active
              ? "bg-brand-gold/20 text-brand-gold"
              : "bg-gray-800 text-gray-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Stat({ label, value, sub, Icon, color = "text-white" }) {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className={`text-xl font-black mt-1 ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{sub}</div>
    </div>
  );
}

function Empty({ Icon, title, cta, onCta }) {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
      <Icon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
      <p className="text-gray-400 mt-3">{title}</p>
      {cta && (
        <button
          onClick={onCta}
          className="mt-4 px-5 py-2 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function MyDeliveryCard({ order, onAdvance, onView, onConfirmDelivery }) {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-5 hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <button
            onClick={onView}
            className="font-mono text-xs text-brand-gold font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-brand-gold/40 rounded px-1 -mx-1"
          >
            {order.reference}
          </button>
          <div className="text-white font-bold mt-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-500" />
            {order.customer_name}
          </div>
        </div>
        <span
          className={`text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
            order.status === "out_for_delivery"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-emerald-500/20 text-emerald-400"
          }`}
        >
          {order.status === "out_for_delivery" ? (
            <Truck className="w-3 h-3" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
          {order.status.replace("_", " ")}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2 text-gray-300">
          <Phone className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <a
            href={`tel:${order.customer_phone}`}
            className="text-brand-gold underline hover:no-underline"
          >
            {order.customer_phone}
          </a>
        </div>
        <div className="flex items-start gap-2 text-gray-300">
          <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <span>
            {order.delivery_address}
            <span className="text-gray-500"> · {order.delivery_zone_name}</span>
          </span>
        </div>
        <div className="flex justify-between text-gray-400 pt-2 border-t border-gray-800">
          <span className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            {order.items_count} items
          </span>
          <span className="text-brand-gold font-bold">
            GH₵ {order.total.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {order.status === "ready" && (
          <button
            onClick={() => onAdvance(order.id, "out_for_delivery")}
            className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Delivery
          </button>
        )}
        {order.status === "out_for_delivery" && (
          <button
            onClick={onConfirmDelivery}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark Delivered
          </button>
        )}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            order.delivery_address
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open in Google Maps"
          title="Open in Google Maps"
          className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600 flex items-center justify-center"
        >
          <Navigation className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

function ClaimableCard({ order, onClaim }) {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-5 hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono text-xs text-brand-gold font-bold">
            {order.reference}
          </div>
          <div className="text-white text-sm mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
            {order.delivery_zone_name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-brand-gold font-bold">
            GH₵ {order.total.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500 flex items-center justify-end gap-1">
            <Package className="w-3 h-3" />
            {order.items_count} items
          </div>
        </div>
      </div>
      <button
        onClick={onClaim}
        className="w-full py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
      >
        Claim This Order
      </button>
    </div>
  );
}

function HistoryCard({ order }) {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-4 flex items-center justify-between">
      <div>
        <div className="font-mono text-xs text-gray-400">{order.reference}</div>
        <div className="text-white text-sm mt-1 flex items-center gap-1.5">
          <User className="w-3 h-3 text-gray-500" />
          {order.customer_name}
        </div>
        <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {order.delivered_at
            ? new Date(order.delivered_at).toLocaleString()
            : ""}
        </div>
      </div>
      <div className="text-right">
        <div className="text-brand-gold font-bold">
          GH₵ {order.total.toFixed(2)}
        </div>
        <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-end gap-1">
          <CheckCircle2 className="w-3 h-3" />
          DELIVERED
        </div>
      </div>
    </div>
  );
}

function RiderDetailModal({ order, onClose, onAdvance, onConfirm }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80"
        aria-hidden="true"
      />
      <div className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-mono text-brand-gold font-bold">
              {order.reference}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {order.status.replace("_", " ").toUpperCase()}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-brand-dark border border-gray-800">
          <div className="text-xs uppercase text-gray-500 font-bold mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Customer
          </div>
          <div className="text-white font-bold">{order.customer_name}</div>
          <div className="mt-2">
            <a
              href={`tel:${order.customer_phone}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <Phone className="w-3.5 h-3.5" />
              Call {order.customer_phone}
            </a>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-brand-dark border border-gray-800">
          <div className="text-xs uppercase text-gray-500 font-bold mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Delivery Address
          </div>
          <div className="text-white">{order.delivery_address}</div>
          <div className="text-xs text-gray-400 mt-1">
            {order.delivery_zone_name}
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              order.delivery_address
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark text-xs font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
          >
            <Navigation className="w-3.5 h-3.5" />
            Open in Maps
          </a>
        </div>

        <div className="flex justify-between p-4 rounded-2xl bg-brand-dark border border-gray-800">
          <span className="text-gray-400 text-sm flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            {order.items_count} items
          </span>
          <span className="text-brand-gold font-bold">
            GH₵ {order.total.toFixed(2)}
          </span>
        </div>

        <div className="flex gap-2">
          {order.status === "ready" && (
            <button
              onClick={() => onAdvance("out_for_delivery")}
              className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Delivery
            </button>
          )}
          {order.status === "out_for_delivery" && (
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Delivered
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmDeliveryModal({ order, onCancel, onConfirm }) {
  const [confirmText, setConfirmText] = useState("");
  const expected = order.customer_name.trim();
  const valid =
    confirmText.trim().toLowerCase() === expected.toLowerCase();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={onCancel}
        className="absolute inset-0 bg-black/80"
        aria-hidden="true"
      />
      <div className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="font-heading text-lg font-bold text-white">
            Confirm delivery
          </h3>
        </div>
        <p className="text-xs text-gray-400">
          Type the customer's name to confirm you delivered the order.
        </p>

        <div className="p-3 rounded-xl bg-brand-dark border border-gray-700">
          <div className="text-[10px] uppercase text-gray-500 font-bold">
            Customer name
          </div>
          <div className="text-white font-bold">{order.customer_name}</div>
        </div>

        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={`Type "${expected}"`}
          autoFocus
          className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 ${
            confirmText.length > 0 && !valid
              ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
              : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
          }`}
        />

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!valid}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  page                                                               */
/* ------------------------------------------------------------------ */

export default function RiderPortal() {
  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mine, setMine] = useState([]);
  const [assignable, setAssignable] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("mine");
  const [detailOrder, setDetailOrder] = useState(null);
  const [confirmDelivery, setConfirmDelivery] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("mrf_rider_token");
    if (t) {
      setToken(t);
      refresh(t);
    }
  }, []);

  const refresh = useCallback(async (t) => {
    try {
      const [meRes, mineRes, assignRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`${API_URL}/api/v1/riders/mine`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`${API_URL}/api/v1/riders/assignable`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`${API_URL}/api/v1/riders/mine?include_delivered=true`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
      ]);

      if (mineRes.status === 401) {
        localStorage.removeItem("mrf_rider_token");
        setToken(null);
        setError("Session expired — please log in again");
        return;
      }

      setMe(await meRes.json());
      setMine(await mineRes.json());
      setAssignable(await assignRes.json());

      const hist = await historyRes.json();
      setHistory(hist.filter((o) => o.status === "delivered"));
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const t = setInterval(() => refresh(token), 20000);
    return () => clearInterval(t);
  }, [token, refresh]);

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Login failed");
      }
      const data = await res.json();

      const meRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const meData = await meRes.json();
      if (meData.role !== "rider") {
        throw new Error("You don't have rider access");
      }

      localStorage.setItem("mrf_rider_token", data.access_token);
      setToken(data.access_token);
      setMe(meData);
      await refresh(data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("mrf_rider_token");
    setToken(null);
    setMine([]);
    setAssignable([]);
    setHistory([]);
  }

  async function claim(orderId) {
    try {
      const res = await fetch(`${API_URL}/api/v1/riders/claim/${orderId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Claim failed");
      }
      await refresh(token);
      setTab("mine");
    } catch (e) {
      setError(e.message);
    }
  }

  async function advance(orderId, status) {
    try {
      const res = await fetch(
        `${API_URL}/api/v1/riders/orders/${orderId}/status`,
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
        const err = await res.json();
        throw new Error(err.detail || "Failed");
      }
      await refresh(token);
      setDetailOrder(null);
      setConfirmDelivery(null);
    } catch (e) {
      setError(e.message);
    }
  }

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivered = history.filter(
      (o) => o.delivered_at && new Date(o.delivered_at) >= today
    );
    const total = delivered.reduce((s, o) => s + o.total, 0);
    const feeShare = total * 0.15;
    return { count: delivered.length, feeShare };
  }, [history]);

  /* ---------- Login screen ---------- */
  if (!token) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <form
          onSubmit={login}
          className="w-full max-w-sm bg-brand-card border border-gray-700 rounded-3xl p-8 space-y-4"
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center mx-auto">
              <Bike className="w-7 h-7 text-brand-dark" />
            </div>
            <h1 className="font-heading text-2xl font-extrabold text-white mt-4">
              Rider Portal
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Manage your deliveries
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rider@mrfries.com"
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
            />
          </div>

          <button
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <header className="border-b border-gray-800 bg-brand-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center">
              <Bike className="w-5 h-5 text-brand-dark" />
            </div>
            <div>
              <div className="font-heading text-lg font-black text-white leading-none">
                {me?.full_name || "Rider Portal"}
              </div>
              <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Truck className="w-3 h-3" />
                {mine.length} active · {assignable.length} available
                {lastUpdated && ` · ${lastUpdated.toLocaleTimeString()}`}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-crimson hover:bg-red-700 text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar">
          <TabBtn
            active={tab === "mine"}
            onClick={() => setTab("mine")}
            label="My Deliveries"
            Icon={Truck}
            count={mine.length}
          />
          <TabBtn
            active={tab === "claim"}
            onClick={() => setTab("claim")}
            label="Available"
            Icon={ClipboardList}
            count={assignable.length}
          />
          <TabBtn
            active={tab === "history"}
            onClick={() => setTab("history")}
            label="History"
            Icon={History}
            count={history.length}
          />
        </div>
      </header>

      {error && (
        <div className="max-w-4xl mx-auto p-4">
          <div
            role="alert"
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Today"
            value={todayStats.count}
            sub="deliveries"
            Icon={Truck}
            color="text-white"
          />
          <Stat
            label="Earnings today"
            value={`GH₵ ${todayStats.feeShare.toFixed(2)}`}
            sub="est."
            Icon={Wallet}
            color="text-brand-gold"
          />
          <Stat
            label="Total"
            value={history.length}
            sub="all time"
            Icon={TrendingUp}
            color="text-emerald-400"
          />
        </div>

        {tab === "mine" &&
          (mine.length === 0 ? (
            <Empty
              Icon={Bike}
              title="No active deliveries"
              cta="Browse available orders"
              onCta={() => setTab("claim")}
            />
          ) : (
            mine.map((order) => (
              <MyDeliveryCard
                key={order.id}
                order={order}
                onAdvance={advance}
                onView={() => setDetailOrder(order)}
                onConfirmDelivery={() => setConfirmDelivery(order)}
              />
            ))
          ))}

        {tab === "claim" &&
          (assignable.length === 0 ? (
            <Empty
              Icon={Package}
              title="No orders waiting for a rider."
            />
          ) : (
            assignable.map((order) => (
              <ClaimableCard
                key={order.id}
                order={order}
                onClaim={() => claim(order.id)}
              />
            ))
          ))}

        {tab === "history" &&
          (history.length === 0 ? (
            <Empty Icon={History} title="No completed deliveries yet." />
          ) : (
            history.map((order) => (
              <HistoryCard key={order.id} order={order} />
            ))
          ))}
      </main>

      {detailOrder && (
        <RiderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onAdvance={(status) => advance(detailOrder.id, status)}
          onConfirm={() => {
            setDetailOrder(null);
            setConfirmDelivery(detailOrder);
          }}
        />
      )}

      {confirmDelivery && (
        <ConfirmDeliveryModal
          order={confirmDelivery}
          onCancel={() => setConfirmDelivery(null)}
          onConfirm={() => advance(confirmDelivery.id, "delivered")}
        />
      )}
    </div>
  );
}