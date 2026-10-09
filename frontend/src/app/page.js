"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ChefHat,
  CreditCard,
  Truck,
  Clock,
  Phone,
  Plus,
  Star,
  Users,
  Timer,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useBranch } from "@/components/site/BranchContext";
import { useCart } from "@/components/site/CartContext";
import StarRating from "@/components/StarRating";
import FeaturedReviews from "@/components/FeaturedReviews";

export default function HomePage() {
  const { activeBranchId, activeBranch } = useBranch();
  const { addToCart } = useCart();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBranchId) return;
    (async () => {
      try {
        const items = await apiGet(
          `/api/v1/menu?available_only=true&branch_id=${activeBranchId}`
        );
        setFeatured(items.slice(0, 3));
      } catch (e) {
        console.error("Failed to load featured items:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeBranchId]);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Subtle radial gradient background */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #F59E0B 0%, transparent 50%), radial-gradient(circle at 80% 80%, #DC2626 0%, transparent 50%)",
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 grid lg:grid-cols-12 gap-12 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {activeBranch?.name || "Accra's Most Loved Loaded Fries"}
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-white leading-[1.05]">
              Crispy Fries.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-brand-amber to-brand-crimson">
                Loaded to Perfection.
              </span>
            </h1>

            <p className="text-gray-300 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg leading-relaxed">
              Hand-cut golden fries, Ghanaian fried yam, signature sauces, and
              juicy chicken wings. Delivered fresh to your campus or doorstep in
              under 30 minutes.
            </p>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/menu"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-amber to-brand-crimson hover:from-brand-gold hover:to-brand-amber text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-brand-crimson/20"
              >
                Order Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
              <Link
                href="/builder"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-brand-card border border-brand-gold/40 hover:border-brand-gold text-brand-gold font-bold transition-colors"
              >
                <ChefHat className="w-5 h-5" aria-hidden="true" />
                Build Custom Bowl
              </Link>
            </div>

            {/* Live stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 max-w-md mx-auto lg:mx-0">
              <StatChip
                icon={Users}
                value="2,000+"
                label="happy customers"
              />
              <StatChip icon={Timer} value="< 30 min" label="avg delivery" />
              <StatChip icon={Star} value="4.8 ★" label="customer rating" />
            </div>
          </div>

          {/* Right: hero image */}
          <div className="lg:col-span-5">
            <div className="relative">
              {/* Glow behind the card */}
              <div
                className="absolute -inset-4 bg-gradient-to-tr from-brand-gold/20 via-transparent to-brand-crimson/20 rounded-3xl blur-2xl"
                aria-hidden="true"
              />
              <div className="relative rounded-3xl overflow-hidden border border-gray-700 bg-brand-card shadow-2xl">
                <img
                  src="https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcT4fXp6OHCfxjVnbIHWOHfsiOktpG4AYONDnsMb18_4Z-7E-RamGG9gPgnEJ9xvQGoK7CHw0GlhXicDwUA"
                  alt="Mr. Robert's signature loaded fry bowl with crispy chicken, cheddar and shito aioli"
                  className="w-full h-80 sm:h-96 object-cover"
                  loading="eager"
                  fetchPriority="high"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
                <div className="p-6 bg-gradient-to-t from-brand-dark via-brand-card/80 to-transparent">
                  <div className="inline-flex items-center gap-1 text-[10px] text-brand-gold font-bold uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    Signature
                  </div>
                  <h3 className="font-heading font-bold text-lg text-white mt-2">
                    The Robert Special Bowl
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Loaded Chicken · Cheddar · Shito Aioli · Fries
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <StarRating rating={5} size="sm" />
                    <div className="text-xl font-extrabold text-brand-gold">
                      GH₵ 75.00
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="border-y border-gray-800 bg-brand-card/30">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <TrustItem icon={CreditCard} title="MoMo & Card" subtitle="Paystack secured" />
          <TrustItem icon={Truck} title="Fast Delivery" subtitle="Under 30 minutes" />
          <TrustItem icon={ShieldCheck} title="Fresh Daily" subtitle="Never frozen" />
          <TrustItem icon={MapPin} title="2 Branches" subtitle="Accra & Kumasi" />
        </div>
      </section>

      {/* ============ FEATURED ============ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
                Featured Today
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Our most-loved dishes at{" "}
                {activeBranch?.name || "your local branch"}.
              </p>
            </div>
            <Link
              href="/menu"
              className="hidden sm:inline-flex items-center gap-1.5 text-brand-gold hover:text-brand-amber text-sm font-bold transition-colors group"
            >
              See full menu
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-brand-card rounded-2xl border border-gray-700 overflow-hidden"
                >
                  <div className="h-48 bg-gray-800 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-2/3 bg-gray-700/60 rounded animate-pulse" />
                    <div className="h-3 w-full bg-gray-700/40 rounded animate-pulse" />
                    <div className="h-9 w-full bg-gray-700/40 rounded-xl animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
              <ChefHat
                className="w-12 h-12 text-gray-600 mx-auto mb-3"
                aria-hidden="true"
              />
              <p className="text-gray-400">
                No items available at this branch right now.
              </p>
              <Link
                href="/menu"
                className="inline-block mt-4 px-5 py-2 rounded-xl bg-brand-gold text-brand-dark font-bold text-sm"
              >
                Browse full menu
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((item) => (
                <FeaturedCard key={item.id} item={item} onAdd={addToCart} />
              ))}
            </div>
          )}

          <div className="sm:hidden mt-6 text-center">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold text-sm w-full"
            >
              See full menu
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ BUILDER TEASER ============ */}
      <section className="py-16 bg-brand-card/40 border-y border-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-1.5 text-brand-gold font-bold text-xs uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
            <ChefHat className="w-3.5 h-3.5" aria-hidden="true" />
            DIY Feast
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mt-3">
            Build Your Own Fry Bowl
          </h2>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Pick your base, stack on proteins, choose your sauce, and add
            toppings. Your perfect bowl, your way.
          </p>
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 mt-6 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-gold to-brand-amber hover:from-brand-amber hover:to-brand-gold text-brand-dark font-extrabold transition-all active:scale-[0.98]"
          >
            <ChefHat className="w-5 h-5" aria-hidden="true" />
            Start Building
          </Link>
        </div>
      </section>

      {/* ============ FEATURED REVIEWS ============ */}
      <FeaturedReviews />

      {/* ============ LOCATIONS TEASER ============ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
              We Deliver Where You Are
            </h2>
            <p className="text-gray-300 mt-3 leading-relaxed">
              From UG Legon campus to East Legon offices, from Madina to KNUST
              — our riders bring hot fries straight to your door.
            </p>
            <Link
              href="/locations"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors group"
            >
              See all delivery areas
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </Link>
          </div>

          <div className="bg-gradient-to-br from-brand-card to-gray-900 p-8 rounded-3xl border border-gray-700">
            <h3 className="font-heading text-xl font-extrabold text-white mb-5 flex items-center gap-2">
              <Phone className="w-5 h-5 text-brand-gold" aria-hidden="true" />
              Order Hotline
            </h3>
            <div className="space-y-4 text-sm text-gray-300">
              <HotlineRow
                icon={CreditCard}
                label="Pay with"
                value="MoMo, Telecel Cash, AT Money, card"
              />
              <HotlineRow
                icon={Truck}
                label="Also on"
                value="Hubtel & Glovo"
              />
              <HotlineRow
                icon={Clock}
                label="Open daily"
                value="11:00 AM – 11:00 PM"
              />
              <HotlineRow
                icon={Phone}
                label="Call us"
                value="0599233488"
                href="tel:0599233488"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ============ Sub-components ============ */

function StatChip({ icon: Icon, value, label }) {
  return (
    <div className="flex flex-col items-center lg:items-start gap-1">
      <div className="flex items-center gap-1.5 text-brand-gold">
        <Icon className="w-4 h-4" aria-hidden="true" />
        <span className="font-heading font-black text-lg text-white">{value}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
        {label}
      </span>
    </div>
  );
}

function TrustItem({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-white font-bold text-sm truncate">{title}</div>
        <div className="text-gray-500 text-[10px] truncate">{subtitle}</div>
      </div>
    </div>
  );
}

function FeaturedCard({ item, onAdd }) {
  return (
    <div className="bg-brand-card rounded-2xl border border-gray-700 overflow-hidden flex flex-col hover:border-brand-gold/60 hover:-translate-y-0.5 transition-all group">
      <Link href={`/menu/${item.slug}`} className="block relative h-48 overflow-hidden">
        <img
          src={item.image_url}
          alt={`${item.name} at Mr. Robert's Fries`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute top-3 right-3 bg-brand-dark/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-brand-gold font-extrabold text-sm border border-gray-700">
          GH₵ {item.price.toFixed(2)}
        </div>
        {item.total_reviews > 0 && (
          <div className="absolute top-3 left-3 bg-brand-dark/90 backdrop-blur-sm px-2 py-1 rounded-lg inline-flex items-center gap-1 text-xs font-bold border border-gray-700">
            <Star className="w-3 h-3 text-brand-gold fill-brand-gold" aria-hidden="true" />
            <span className="text-white">{item.average_rating.toFixed(1)}</span>
            <span className="text-gray-500">({item.total_reviews})</span>
          </div>
        )}
      </Link>

      <div className="p-5 flex-1 flex flex-col">
        <Link href={`/menu/${item.slug}`}>
          <h3 className="font-heading font-bold text-lg text-white hover:text-brand-gold transition-colors line-clamp-2">
            {item.name}
          </h3>
        </Link>
        <p className="text-xs text-gray-400 mt-2 line-clamp-2 flex-1">
          {item.description}
        </p>
        <button
          onClick={() =>
            onAdd({
              cartId: "menu-" + item.id,
              item_id: item.id,
              name: item.name,
              unit_price: item.price,
              price: item.price,
              is_custom_bowl: false,
            })
          }
          className="mt-4 w-full py-3 rounded-xl bg-gray-800 hover:bg-brand-crimson text-white font-bold text-xs transition-colors inline-flex items-center justify-center gap-1.5 group/btn"
          aria-label={`Add ${item.name} to order`}
        >
          <Plus
            className="w-4 h-4 group-hover/btn:rotate-90 transition-transform"
            aria-hidden="true"
          />
          Add to Order
        </button>
      </div>
    </div>
  );
}

function HotlineRow({ icon: Icon, label, value, href }) {
  const content = (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">
          {label}
        </div>
        <div className="text-white text-sm font-medium mt-0.5">{value}</div>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block hover:opacity-80 transition-opacity">
        {content}
      </a>
    );
  }
  return content;
}