"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  MessageCircle,
  Camera,
  Clock,
  Home,
  Send,
  Check,
  MapPin,
  UtensilsCrossed,
  ArrowRight,
} from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const text = `Hello Mr. Robert's Fries!%0A%0AName: ${encodeURIComponent(
      form.name
    )}%0AEmail: ${encodeURIComponent(form.email)}%0A%0A${encodeURIComponent(
      form.message
    )}`;
    window.open(`https://wa.me/233599233488?text=${text}`, "_blank");
    setSent(true);
  }

  return (
    <>
      <section className="py-12 sm:py-16 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-brand-gold transition-colors"
            >
              <Home className="w-3 h-3" aria-hidden="true" />
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-300">Contact</span>
          </nav>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            Contact Us
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl text-sm sm:text-base">
            Questions, feedback, corporate orders, or just want to say hi?
            We're here.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-2xl font-bold text-white mb-4">
                Reach Us
              </h2>
              <div className="space-y-3">
                <ContactRow
                  icon={Phone}
                  label="Call us"
                  value="0599233488"
                  href="tel:0599233488"
                />
                <ContactRow
                  icon={MessageCircle}
                  label="WhatsApp"
                  value="+233 59 923 3488"
                  href="https://wa.me/233599233488"
                  accent="emerald"
                />
                <ContactRow
                  icon={Camera}
                  label="Instagram"
                  value="@mrobertfries"
                  href="https://www.instagram.com/mrobertfries/"
                  accent="pink"
                />
                <ContactRow
                  icon={Clock}
                  label="Hours"
                  value="Mon–Sun: 11:00 AM – 11:00 PM"
                />
              </div>
            </div>

            <div>
              <h3 className="font-heading text-xl font-bold text-white mb-3">
                Our Kitchens
              </h3>
              <div className="space-y-3 text-sm text-gray-300">
                <KitchenCard
                  name="Accra — East Legon"
                  address="Boundary Road, East Legon"
                  areas="UG Legon · UPSA · Adjiringanor · Madina · Adenta"
                />
                <KitchenCard
                  name="Kumasi — KNUST"
                  address="Bomso Road, near KNUST"
                  areas="Bomso · Ayeduase · Adum · Kejetia"
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-card to-gray-900 border border-gray-700">
              <div className="text-xs uppercase text-brand-gold font-bold tracking-widest inline-flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5" aria-hidden="true" />
                Corporate & Bulk Orders
              </div>
              <p className="text-sm text-gray-300 mt-2">
                Planning an event, office lunch, or party? We do discounted
                bulk orders starting at 15 bowls.
              </p>
              <a
                href="https://wa.me/233599233488?text=Hi%2C%20I%27d%20like%20to%20enquire%20about%20bulk%2Fcorporate%20orders"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark text-xs font-extrabold transition-colors group"
              >
                Enquire on WhatsApp
                <ArrowRight
                  className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div className="bg-brand-card border border-emerald-500/40 rounded-3xl p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <Check
                    className="w-8 h-8 text-emerald-400"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </div>
                <h2 className="font-heading text-2xl font-bold text-white mt-4">
                  Medaase!
                </h2>
                <p className="text-gray-400 mt-2 text-sm">
                  We've opened WhatsApp with your message. Send it and we'll
                  reply as soon as possible.
                </p>
                <button
                  onClick={() => {
                    setSent(false);
                    setForm({ name: "", email: "", message: "" });
                  }}
                  className="mt-6 px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-brand-card border border-gray-700 rounded-3xl p-6 sm:p-8 space-y-4"
              >
                <h2 className="font-heading text-2xl font-bold text-white">
                  Send a Message
                </h2>
                <p className="text-xs text-gray-400">
                  We'll get back to you on WhatsApp within a few hours.
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Your Name
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold transition-colors resize-none"
                    placeholder="How can we help?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Send via WhatsApp
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function ContactRow({ icon: Icon, label, value, href, accent }) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "pink"
      ? "text-pink-400"
      : "text-brand-gold";

  const content = (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-card border border-gray-700 hover:border-brand-gold transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-brand-dark border border-gray-700 flex items-center justify-center shrink-0">
        <Icon
          className={`w-5 h-5 ${accentClass}`}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">
          {label}
        </div>
        <div className="text-white font-bold truncate">{value}</div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="block"
      >
        {content}
      </a>
    );
  }
  return content;
}

function KitchenCard({ name, address, areas }) {
  return (
    <div className="p-4 rounded-xl bg-brand-card border border-gray-700">
      <div className="font-bold text-white inline-flex items-center gap-1.5">
        <MapPin className="w-4 h-4 text-brand-gold" aria-hidden="true" />
        {name}
      </div>
      <div className="text-xs text-gray-400 mt-1">{address}</div>
      <div className="text-xs text-gray-500 mt-1">{areas}</div>
    </div>
  );
}