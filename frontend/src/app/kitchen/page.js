"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ChefHat,
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  LogOut,
  Search,
  X,
  MapPin,
  FileText,
  Printer,
  Play,
  CheckCircle2,
  Truck,
  Clock,
  AlertCircle,
  Zap,
  User,
  UtensilsCrossed,
  Wifi,
  WifiOff,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { API_URL } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function elapsedColor(minutes) {
  if (minutes < 5) return "text-emerald-400 bg-emerald-500/10";
  if (minutes < 10) return "text-brand-gold bg-brand-gold/10";
  if (minutes < 20) return "text-brand-amber bg-brand-amber/10";
  return "text-red-400 bg-red-500/10";
}

/* ------------------------------------------------------------------ */
/*  UI primitives                                                      */
/* ------------------------------------------------------------------ */

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function KitchenCard({ order, column, onAdvance, onView }) {
  const ageColor = elapsedColor(order.minutes_in_current_status);
  const isOld = order.minutes_since_created > 20;

  return (
    <div
      className={`p-3 rounded-xl bg-brand-dark border ${
        isOld ? "border-red-500/60 animate-pulse" : "border-gray-700"
      }`}
    >
      <div
        onClick={onView}
        className="cursor-pointer"
        title="Click for details"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView();
          }
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="font-mono text-xs text-brand-gold font-bold">
            {order.reference}
          </div>
          <div
            className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 ${ageColor}`}
          >
            <Clock className="w-3 h-3" />
            {order.minutes_in_current_status}m
          </div>
        </div>

        <div className="text-sm text-white font-bold mb-1 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-gray-500" />
          {order.customer_name}
        </div>
        <div className="text-[11px] text-gray-400 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {order.delivery_zone_name}
        </div>

        <div className="space-y-0.5 text-xs border-t border-gray-800 pt-2 mb-2">
          {order.items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-200 truncate">
                <span className="text-brand-gold font-bold">
                  {item.quantity}×
                </span>{" "}
                {item.name}
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="text-[10px] text-gray-500">
              +{order.items.length - 3} more…
            </div>
          )}
        </div>

        {order.notes && (
          <div className="text-[11px] text-amber-300 bg-amber-500/10 rounded p-2 mb-2 flex items-start gap-1.5">
            <FileText className="w-3 h-3 shrink-0 mt-0.5" />
            {order.notes}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {column === "new" && (
          <button
            onClick={() => onAdvance(order.id, "preparing")}
            className="flex-1 py-2 rounded-lg bg-brand-amber text-brand-dark font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-amber-500"
          >
            <Play className="w-3.5 h-3.5" />
            Start Preparing
          </button>
        )}
        {column === "preparing" && (
          <button
            onClick={() => onAdvance(order.id, "ready")}
            className="flex-1 py-2 rounded-lg bg-brand-gold text-brand-dark font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-brand-amber"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark Ready
          </button>
        )}
        {column === "ready" && (
          <div className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Waiting for rider
          </div>
        )}
        {column === "out_for_delivery" && (
          <div className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Out with rider
          </div>
        )}
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onAdvance, onPrint }) {
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
      <div className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-mono text-brand-gold font-bold">
              {order.reference}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(order.created_at).toLocaleString()}
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

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-brand-dark border border-gray-800">
            <div className="text-xs uppercase text-gray-500 font-bold mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Customer
            </div>
            <div className="text-white font-bold">{order.customer_name}</div>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {order.delivery_zone_name}
            </div>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {order.minutes_since_created} min since created
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-brand-dark border border-gray-800">
            <div className="text-xs uppercase text-gray-500 font-bold mb-2 flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Items ({order.items.length})
            </div>
            <div className="space-y-2">
              {order.items.map((i, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-sm text-gray-200"
                >
                  <span>
                    <span className="text-brand-gold font-bold">
                      {i.quantity}×
                    </span>{" "}
                    {i.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {order.notes && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-xs uppercase text-amber-400 font-bold mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Notes
              </div>
              <div className="text-sm text-amber-200">{order.notes}</div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onPrint}
            className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Ticket
          </button>
          {order.status === "paid" && (
            <button
              onClick={() => onAdvance("preparing")}
              className="flex-1 py-3 rounded-xl bg-brand-amber hover:bg-amber-500 text-brand-dark font-extrabold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Preparing
            </button>
          )}
          {order.status === "preparing" && (
            <button
              onClick={() => onAdvance("ready")}
              className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Ready
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  page                                                               */
/* ------------------------------------------------------------------ */

export default function KitchenDisplay() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [search, setSearch] = useState("");
  const [detailOrder, setDetailOrder] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const wsRef = useRef(null);
  const prevNewCountRef = useRef(0);
  const knownRefsRef = useRef(new Set());

  useEffect(() => {
    const t = localStorage.getItem("mrf_kitchen_token");
    const savedSound = localStorage.getItem("mrf_kitchen_sound");
    if (savedSound !== null) setSoundOn(savedSound === "1");
    if (t) {
      setToken(t);
      fetchFeed(t);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      // Tick to refresh elapsed timers via re-render
      setFeed((f) => (f ? { ...f } : f));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const fetchFeed = useCallback(
    async (t) => {
      try {
        const res = await fetch(`${API_URL}/api/v1/kitchen/feed`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("mrf_kitchen_token");
          setToken(null);
          setError("Session expired — please log in again");
          return;
        }
        if (!res.ok) throw new Error("Could not load kitchen feed");
        const data = await res.json();
        setFeed(data);
        setLastUpdated(new Date());

        const newOrders = data.new || [];
        const currentRefs = new Set(newOrders.map((o) => o.reference));
        let hasNew = false;
        for (const ref of currentRefs) {
          if (!knownRefsRef.current.has(ref)) {
            hasNew = true;
          }
        }
        knownRefsRef.current = currentRefs;

        if (hasNew && soundOn && prevNewCountRef.current >= 0) {
          playBeep();
        }
        prevNewCountRef.current = newOrders.length;
      } catch (e) {
        setError(e.message);
      }
    },
    [soundOn]
  );

  // WebSocket
  useEffect(() => {
    if (!token) return;

    const wsUrl = API_URL.replace(/^http/, "ws") + "/api/v1/kitchen/ws";
    let reconnectTimer = null;
    let closed = false;

    function connect() {
      if (closed) return;
      setWsStatus("connecting");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("connected");
        ws.send(JSON.stringify({ token }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "order.updated") {
            fetchFeed(token);
            setLastUpdated(new Date());
          }
        } catch {}
      };

      ws.onerror = () => setWsStatus("error");
      ws.onclose = () => {
        setWsStatus("disconnected");
        if (!closed) reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    const pingTimer = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 30000);

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pingTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [token, fetchFeed]);

  // Fallback polling
  useEffect(() => {
    if (!token) return;
    if (wsStatus === "connected") return;
    const t = setInterval(() => fetchFeed(token), 10000);
    return () => clearInterval(t);
  }, [token, wsStatus, fetchFeed]);

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
      const me = await meRes.json();
      if (!["kitchen", "admin", "staff"].includes(me.role)) {
        throw new Error("You don't have kitchen access");
      }

      localStorage.setItem("mrf_kitchen_token", data.access_token);
      setToken(data.access_token);
      await fetchFeed(data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("mrf_kitchen_token");
    if (wsRef.current) wsRef.current.close();
    setToken(null);
    setFeed(null);
  }

  function toggleSound() {
    setSoundOn((v) => {
      localStorage.setItem("mrf_kitchen_sound", v ? "0" : "1");
      return !v;
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }

  async function advance(orderId, status) {
    try {
      const res = await fetch(
        `${API_URL}/api/v1/kitchen/orders/${orderId}/status`,
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
        throw new Error(err.detail || "Failed to advance");
      }
      await fetchFeed(token);
      setDetailOrder(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function markAllNewAsPreparing() {
    if (!feed?.new?.length) return;
    if (!confirm(`Move all ${feed.new.length} new orders to "Preparing"?`))
      return;
    for (const order of feed.new) {
      try {
        await fetch(
          `${API_URL}/api/v1/kitchen/orders/${order.id}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: "preparing" }),
          }
        );
      } catch {}
    }
    await fetchFeed(token);
  }

  function printOrder(order) {
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    const items = order.items
      .map(
        (i) =>
          `<tr><td style="font-size:16px;padding:4px 0;">${i.quantity}× ${i.name}</td></tr>`
      )
      .join("");
    win.document.write(`
      <html>
        <head>
          <title>Order ${order.reference}</title>
          <style>
            body { font-family: monospace; padding: 16px; width: 320px; }
            h1 { font-size: 20px; margin: 0 0 8px 0; }
            .ref { font-size: 14px; color: #555; margin-bottom: 12px; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            .meta { font-size: 12px; color: #333; }
            .meta div { margin: 3px 0; }
            .notes { background: #f5f5f5; padding: 8px; font-size: 13px; margin-top: 8px; }
            hr { border: none; border-top: 1px dashed #999; }
          </style>
        </head>
        <body>
          <h1>MR. ROBERT'S FRIES</h1>
          <div class="ref">${order.reference}</div>
          <hr />
          <table class="items">${items}</table>
          <hr />
          <div class="meta">
            <div><b>Customer:</b> ${order.customer_name}</div>
            <div><b>Zone:</b> ${order.delivery_zone_name}</div>
            <div><b>Time:</b> ${new Date(order.created_at).toLocaleString()}</div>
          </div>
          ${
            order.notes
              ? `<div class="notes"><b>Notes:</b> ${order.notes}</div>`
              : ""
          }
          <hr />
          <div style="font-size:11px;text-align:center;margin-top:8px;">
            Thank you! · 0599233488
          </div>
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  const filteredFeed = useMemo(() => {
    if (!feed) return null;
    if (!search.trim()) return feed;
    const s = search.toLowerCase();
    const filterBucket = (arr) =>
      arr.filter(
        (o) =>
          o.reference.toLowerCase().includes(s) ||
          o.customer_name.toLowerCase().includes(s) ||
          o.items.some((it) => it.name.toLowerCase().includes(s))
      );
    return {
      new: filterBucket(feed.new),
      preparing: filterBucket(feed.preparing),
      ready: filterBucket(feed.ready),
      out_for_delivery: filterBucket(feed.out_for_delivery),
    };
  }, [feed, search]);

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
              <ChefHat className="w-7 h-7 text-brand-dark" />
            </div>
            <h1 className="font-heading text-2xl font-extrabold text-white mt-4">
              Kitchen Display
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Live order feed — sign in to continue
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kitchen@mrfries.com"
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
            />
          </Field>

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

  const columns = [
    {
      key: "new",
      title: "New Orders",
      accent: "border-brand-crimson",
      Icon: Bell,
    },
    {
      key: "preparing",
      title: "Preparing",
      accent: "border-brand-amber",
      Icon: Play,
    },
    {
      key: "ready",
      title: "Ready for Pickup",
      accent: "border-brand-gold",
      Icon: CheckCircle2,
    },
    {
      key: "out_for_delivery",
      title: "On the Way",
      accent: "border-emerald-500",
      Icon: Truck,
    },
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <header className="border-b border-gray-800 bg-brand-card/50 backdrop-blur sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-brand-dark" />
            </div>
            <div>
              <div className="font-heading text-lg font-black text-white leading-none">
                Kitchen Display
              </div>
              <div className="text-[10px] text-gray-400 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 ${
                    wsStatus === "connected"
                      ? "text-emerald-400"
                      : wsStatus === "connecting"
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                >
                  {wsStatus === "connected" ? (
                    <Wifi className="w-3 h-3" />
                  ) : (
                    <WifiOff className="w-3 h-3" />
                  )}
                  {wsStatus === "connected"
                    ? "Live"
                    : wsStatus === "connecting"
                    ? "Connecting…"
                    : "Polling"}
                </span>
                ·{" "}
                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString()}`
                  : "Loading…"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref, name, item…"
                className="pl-8 pr-3 py-2 rounded-xl bg-brand-dark border border-gray-700 text-white text-xs outline-none focus:border-brand-gold w-40 sm:w-56"
              />
            </div>
            <button
              onClick={toggleSound}
              title={soundOn ? "Sound on" : "Sound off"}
              aria-label={soundOn ? "Mute sound" : "Unmute sound"}
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              {soundOn ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={toggleFullscreen}
              title="Toggle fullscreen"
              aria-label="Toggle fullscreen"
              className="hidden sm:flex p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              {fullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => fetchFeed(token)}
              aria-label="Refresh"
              title="Refresh now"
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-crimson hover:bg-red-700 text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>

        {feed?.new?.length > 0 && (
          <div className="px-4 sm:px-6 pb-3 flex items-center gap-3">
            <button
              onClick={markAllNewAsPreparing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-amber hover:bg-amber-500 text-brand-dark text-xs font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-amber/60"
            >
              <Zap className="w-3.5 h-3.5" />
              Start all {feed.new.length} new orders
            </button>
          </div>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => {
          const Icon = col.Icon;
          return (
            <div
              key={col.key}
              className="bg-brand-card/40 rounded-2xl border border-gray-800 p-4"
            >
              <div
                className={`border-t-4 ${col.accent} -mx-4 -mt-4 mb-4 rounded-t-2xl`}
              />
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-white font-extrabold flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {col.title}
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-800 text-white">
                  {filteredFeed?.[col.key]?.length || 0}
                </span>
              </div>

              <div className="space-y-3">
                {!filteredFeed ? (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading…
                  </p>
                ) : filteredFeed[col.key].length === 0 ? (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    {search ? "No matches" : "No orders"}
                  </p>
                ) : (
                  filteredFeed[col.key].map((order) => (
                    <KitchenCard
                      key={order.id}
                      order={order}
                      column={col.key}
                      onAdvance={advance}
                      onView={() => setDetailOrder(order)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onAdvance={(status) => advance(detailOrder.id, status)}
          onPrint={() => printOrder(detailOrder)}
        />
      )}
    </div>
  );
}