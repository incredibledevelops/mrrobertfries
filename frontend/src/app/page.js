// frontend/app/page.js
"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";

export default function Home() {
  // ---------- State ----------
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [zones, setZones] = useState([]);
  const [builder, setBuilder] = useState({ bases: [], proteins: [], sauces: [], toppings: [] });
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  // Builder state
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedProteins, setSelectedProteins] = useState([]);
  const [selectedSauce, setSelectedSauce] = useState(null);

  // Customer form
  const [cust, setCust] = useState({
    full_name: "",
    email: "",
    phone: "",
    delivery_zone_id: "",
    delivery_address: "",
  });

  const DELIVERY_FEE = 15;

  // ---------- Load data from backend ----------
  useEffect(() => {
    async function load() {
      try {
        const [m, c, z, b] = await Promise.all([
          apiGet("/api/v1/menu?available_only=true"),
          apiGet("/api/v1/categories?active_only=true"),
          apiGet("/api/v1/delivery-zones?active_only=true"),
          apiGet("/api/v1/builder/grouped"),
        ]);
        setMenu(m);
        setCategories(c);
        setZones(z);
        setBuilder(b);

        // default selections
        if (b.bases[0]) setSelectedBase(b.bases[0]);
        if (b.sauces[0]) setSelectedSauce(b.sauces[0]);
        const defProtein = b.proteins.find(p => p.is_default);
        if (defProtein) setSelectedProteins([defProtein]);

        if (z[0]) setCust(prev => ({ ...prev, delivery_zone_id: z[0].id }));
      } catch (err) {
        console.error("Load error:", err);
        alert("Could not load menu. Is the backend running on " + process.env.NEXT_PUBLIC_API_URL + "?");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Re-render Lucide icons whenever content changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.lucide) {
      window.lucide.createIcons();
    }
  });

  // ---------- Cart logic ----------
  function addToCart(item) {
    setCart(prev => {
      const existing = prev.find(i => i.cartId === item.cartId);
      if (existing) {
        return prev.map(i => i.cartId === item.cartId ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setCartOpen(true);
  }

  function updateQty(cartId, delta) {
    setCart(prev =>
      prev
        .map(i => i.cartId === cartId ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    );
  }

  function removeItem(cartId) {
    setCart(prev => prev.filter(i => i.cartId !== cartId));
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal > 0 ? subtotal + DELIVERY_FEE : 0;

  // ---------- Builder logic ----------
  const builderTotal =
    (selectedBase?.price || 0) +
    selectedProteins.reduce((s, p) => s + p.price, 0);

  function toggleProtein(p) {
    setSelectedProteins(prev =>
      prev.find(x => x.id === p.id)
        ? prev.filter(x => x.id !== p.id)
        : [...prev, p]
    );
  }

  function addCustomBowl() {
    if (!selectedBase || !selectedSauce) {
      alert("Pick a base and a sauce first");
      return;
    }
    const proteinNames = selectedProteins.map(p => p.name).join(", ") || "None";
    addToCart({
      cartId: "bowl-" + Date.now(),
      item_id: null,
      name: `Custom Bowl (${selectedBase.name})`,
      unit_price: builderTotal,
      price: builderTotal,
      is_custom_bowl: true,
      customizations: {
        base: selectedBase.name,
        proteins: selectedProteins.map(p => p.name),
        sauce: selectedSauce.name,
      },
      description: `Proteins: ${proteinNames} • Sauce: ${selectedSauce.name}`,
    });
  }

  // ---------- Checkout ----------
  async function handleCheckout(e) {
    e.preventDefault();
    if (cart.length === 0) return alert("Your cart is empty");
    if (!cust.delivery_zone_id) return alert("Pick a delivery zone");

    setPayLoading(true);
    try {
      // 1) Create the order
      const orderPayload = {
        customer: {
          full_name: cust.full_name,
          email: cust.email,
          phone: cust.phone,
        },
        delivery_zone_id: cust.delivery_zone_id,
        delivery_address: cust.delivery_address,
        items: cart.map(i => ({
          item_id: i.item_id,
          name: i.name,
          unit_price: i.unit_price,
          quantity: i.qty,
          is_custom_bowl: i.is_custom_bowl,
          customizations: i.customizations || null,
        })),
      };
      const order = await apiSend("/api/v1/orders", "POST", orderPayload);

      // 2) Initialize Paystack payment
      const init = await apiSend("/api/v1/payments/initialize", "POST", {
        order_id: order.id,
        email: cust.email,
      });

      // 3) Redirect to Paystack's hosted checkout
      window.location.href = init.authorization_url;
    } catch (err) {
      alert("Checkout error: " + err.message);
    } finally {
      setPayLoading(false);
    }
  }

  // Filter menu by category
  const visibleMenu =
    activeCategory === "all"
      ? menu
      : menu.filter(m => {
          const cat = categories.find(c => c.id === m.category_id);
          return cat?.slug === activeCategory;
        });

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-brand-gold text-xl font-bold">
        Loading menu...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 font-body">
      {/* ============ TOP BAR ============ */}
      <div className="bg-gradient-to-r from-brand-crimson via-brand-amber to-brand-gold text-white text-xs md:text-sm font-semibold py-2 px-4 text-center">
        🇬🇭 Serving East Legon, UG Legon, UPSA, Adjiringanor & KNUST! •{" "}
        <a href="tel:0599233488" className="underline">0599233488</a>
      </div>

      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-40 bg-brand-dark/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-crimson p-0.5">
              <div className="w-full h-full bg-brand-dark rounded-[14px] flex items-center justify-center">
                <span className="font-heading text-2xl font-black text-brand-gold">MR</span>
              </div>
            </div>
            <div>
              <div className="font-heading text-xl font-black text-white leading-none">
                Mr. Robert's <span className="text-brand-gold">Fries</span>
              </div>
              <div className="text-[10px] text-gray-400 tracking-widest uppercase">
                Loaded Fries & Grill • Accra
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-300">
            <a href="#menu" className="hover:text-brand-gold">Menu</a>
            <a href="#builder" className="hover:text-brand-gold">Custom Bowl</a>
            <a href="#hubs" className="hover:text-brand-gold">Delivery Hubs</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/233599233488"
              target="_blank"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
            >
              WhatsApp
            </a>
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-3 rounded-2xl bg-brand-card border border-gray-700 text-brand-gold flex items-center gap-2"
            >
              🛒
              <span className="bg-brand-crimson text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
              <span className="hidden sm:inline font-bold text-sm text-white">
                GH₵ {subtotal.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-brand-dark to-brand-dark">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-block px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase">
              ✨ Accra's Most Loved Loaded Fries
            </div>
            <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-white leading-tight">
              Crispy Fries. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-brand-amber to-brand-crimson">
                Loaded to Perfection.
              </span>
            </h1>
            <p className="text-gray-300 max-w-xl">
              Hand-cut golden fries, Ghanaian fried yam, signature sauces, and juicy chicken wings. Delivered fresh to your campus or doorstep!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a href="#menu" className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-amber to-brand-crimson text-white font-bold">
                Explore Menu →
              </a>
              <a href="#builder" className="px-8 py-4 rounded-2xl bg-brand-card border border-brand-gold/40 text-brand-gold font-bold">
                🧑‍🍳 Build Custom Bowl
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl overflow-hidden border border-gray-700 bg-brand-card">
              <img
                src="https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcT4fXp6OHCfxjVnbIHWOHfsiOktpG4AYONDnsMb18_4Z-7E-RamGG9gPgnEJ9xvQGoK7CHw0GlhXicDwUA"
                alt="Mr. Robert Loaded Fries Bowl"
                className="w-full h-80 object-cover"
              />
              <div className="p-6">
                <h3 className="font-heading font-bold text-lg text-white">The Robert Special Bowl</h3>
                <p className="text-xs text-gray-400">Loaded Chicken, Cheddar, Shito Aioli & Fries</p>
                <div className="text-xl font-extrabold text-brand-gold mt-2">GH₵ 75.00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ MENU ============ */}
      <section id="menu" className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">Our Signature Menu</h2>
            <p className="text-gray-400 text-sm mt-2">Freshly fried, generous portions, bold Ghanaian flavors.</p>
          </div>

          {/* Category tabs */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap ${
                activeCategory === "all"
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-brand-card text-gray-300 border border-gray-700"
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap ${
                  activeCategory === cat.slug
                    ? "bg-brand-gold text-brand-dark"
                    : "bg-brand-card text-gray-300 border border-gray-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleMenu.map(item => (
              <div key={item.id} className="bg-brand-card rounded-2xl border border-gray-700 overflow-hidden flex flex-col">
                <div className="relative h-48 overflow-hidden">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-brand-dark/90 px-3 py-1 rounded-xl text-brand-gold font-extrabold text-sm border border-gray-700">
                    GH₵ {item.price.toFixed(2)}
                  </div>
                </div>
                <div className="p-5 flex-1">
                  <h3 className="font-heading font-bold text-lg text-white">{item.name}</h3>
                  <p className="text-xs text-gray-400 mt-2">{item.description}</p>
                </div>
                <div className="p-5 pt-0">
                  <button
                    onClick={() =>
                      addToCart({
                        cartId: "menu-" + item.id,
                        item_id: item.id,
                        name: item.name,
                        unit_price: item.price,
                        price: item.price,
                        is_custom_bowl: false,
                        description: item.description,
                      })
                    }
                    className="w-full py-3 rounded-xl bg-gray-800 hover:bg-brand-crimson text-white font-bold text-xs"
                  >
                    + Add to Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BUILDER ============ */}
      <section id="builder" className="py-16 bg-brand-card/40 border-y border-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-brand-gold font-bold text-xs uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
              DIY Feast
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mt-3">
              Build Your Custom Fry Bowl
            </h2>
          </div>

          <div className="bg-brand-card rounded-3xl border border-gray-700 p-6 space-y-8">
            {/* Base */}
            <div>
              <h3 className="font-heading font-bold text-white mb-3">Step 1: Select Base</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {builder.bases.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBase(b)}
                    className={`p-4 rounded-2xl border text-center ${
                      selectedBase?.id === b.id
                        ? "border-brand-gold bg-brand-gold/10"
                        : "border-gray-700 bg-brand-dark"
                    }`}
                  >
                    <div className="font-bold text-sm text-white">{b.name}</div>
                    <div className="text-xs text-brand-gold mt-1">GH₵ {b.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Proteins */}
            <div>
              <h3 className="font-heading font-bold text-white mb-3">Step 2: Select Protein</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {builder.proteins.map(p => {
                  const active = selectedProteins.find(x => x.id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProtein(p)}
                      className={`p-3.5 rounded-2xl border text-center ${
                        active
                          ? "border-brand-amber bg-brand-amber/10"
                          : "border-gray-700 bg-brand-dark"
                      }`}
                    >
                      <div className="font-bold text-sm text-white">{p.name}</div>
                      <div className="text-xs text-brand-gold mt-0.5">+ GH₵ {p.price.toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sauce */}
            <div>
              <h3 className="font-heading font-bold text-white mb-3">Step 3: Choose Sauce</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {builder.sauces.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSauce(s)}
                    className={`p-3 rounded-xl border text-xs font-bold ${
                      selectedSauce?.id === s.id
                        ? "border-brand-crimson bg-brand-crimson/10 text-white"
                        : "border-gray-700 bg-brand-dark text-white"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Total + Add */}
            <div className="pt-6 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-gray-400 block font-semibold">Total Custom Bowl Price:</span>
                <span className="text-3xl font-black text-brand-gold">
                  GH₵ {builderTotal.toFixed(2)}
                </span>
              </div>
              <button
                onClick={addCustomBowl}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-gold to-brand-amber text-brand-dark font-extrabold"
              >
                + Add Custom Bowl to Order
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HUBS ============ */}
      <section id="hubs" className="py-16">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-heading text-3xl font-extrabold text-white">Where We Deliver</h2>
            <p className="text-gray-300 text-sm mt-3">
              Our dispatch riders bring hot & fresh loaded fries right to your door.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {zones.map(z => (
                <div key={z.id} className="p-4 rounded-2xl bg-brand-card border border-gray-700">
                  <div className="font-bold text-white text-sm">📍 {z.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{z.description}</div>
                  <div className="text-xs text-emerald-400 mt-1 font-bold">
                    Delivery: GH₵ {z.delivery_fee.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-brand-card to-gray-900 p-8 rounded-3xl border border-gray-700">
            <h3 className="font-heading text-xl font-extrabold text-white mb-4">Order Hotline</h3>
            <div className="space-y-4 text-sm text-gray-300">
              <div>💳 Pay with MTN MoMo, Telecel Cash, or AT Money via Paystack</div>
              <div>🚚 Also available on Hubtel and Glovo</div>
              <div>🕒 Mon–Sun: 11:00 AM – 11:00 PM</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CART DRAWER ============ */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div onClick={() => setCartOpen(false)} className="absolute inset-0 bg-black/70" />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-brand-dark border-l border-gray-800 flex flex-col">
            <div className="p-6 border-b border-gray-800 flex justify-between">
              <h3 className="font-heading text-lg font-bold text-white">Your Order</h3>
              <button onClick={() => setCartOpen(false)} className="text-gray-400">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500">Your cart is empty</p>
              ) : (
                cart.map(item => (
                  <div key={item.cartId} className="p-4 rounded-2xl bg-brand-card border border-gray-800 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-sm text-white">{item.name}</div>
                      <div className="text-xs text-brand-gold font-bold mt-1">
                        GH₵ {(item.price * item.qty).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-brand-dark px-3 py-1.5 rounded-xl border border-gray-700">
                      <button onClick={() => updateQty(item.cartId, -1)} className="text-gray-400">−</button>
                      <span className="text-xs font-bold text-white">{item.qty}</span>
                      <button onClick={() => updateQty(item.cartId, 1)} className="text-gray-400">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-gray-800 space-y-4">
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Subtotal</span>
                <span className="text-white font-semibold">GH₵ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Delivery</span>
                <span className="text-emerald-400 font-semibold">GH₵ {DELIVERY_FEE.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-white pt-2 border-t border-gray-700">
                <span>Total</span>
                <span className="text-brand-gold">GH₵ {total.toFixed(2)}</span>
              </div>

              <button
                onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold"
              >
                🔒 Pay with Paystack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ CHECKOUT MODAL ============ */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setCheckoutOpen(false)} className="absolute inset-0 bg-black/80" />
          <div className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-6">
              <h3 className="font-heading text-lg font-bold text-white">Paystack MoMo Checkout</h3>
              <button onClick={() => setCheckoutOpen(false)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Full Name</label>
                <input
                  required
                  value={cust.full_name}
                  onChange={e => setCust({ ...cust, full_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                  placeholder="e.g. Kwadwo Mensah"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={cust.email}
                  onChange={e => setCust({ ...cust, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                  placeholder="kwadwo@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Phone</label>
                <input
                  required
                  value={cust.phone}
                  onChange={e => setCust({ ...cust, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                  placeholder="024XXXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Delivery Zone</label>
                <select
                  value={cust.delivery_zone_id}
                  onChange={e => setCust({ ...cust, delivery_zone_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name} — GH₵ {z.delivery_fee.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Delivery Address</label>
                <textarea
                  required
                  rows={2}
                  value={cust.delivery_address}
                  onChange={e => setCust({ ...cust, delivery_address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                  placeholder="e.g. Pent Block C Room 204, UG Legon"
                />
              </div>

              <div className="bg-gray-800/80 p-4 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between text-gray-300">
                  <span>Items Total:</span>
                  <span className="font-bold text-white">GH₵ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Delivery Fee:</span>
                  <span className="font-bold text-emerald-400">GH₵ {DELIVERY_FEE.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-brand-gold pt-2 border-t border-gray-700">
                  <span>Total:</span>
                  <span>GH₵ {total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={payLoading}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold"
              >
                {payLoading ? "Processing..." : "Confirm & Pay with Paystack"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="bg-black border-t border-gray-800 py-12 text-gray-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="font-heading text-lg font-bold text-white">Mr. Robert's Fries 🍟</div>
            <p className="mt-1">© 2026 Mr. Robert's Fries Ghana.</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://www.instagram.com/mrobertfries/" className="hover:text-brand-gold">Instagram</a>
            <a href="https://wa.me/233599233488" className="hover:text-brand-gold">WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  );
}