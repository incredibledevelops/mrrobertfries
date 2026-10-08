"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // Fallback — build a WhatsApp message
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
      <section className="py-12 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:text-brand-gold">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-300">Contact</span>
          </nav>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            Contact Us
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl">
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
              <div className="space-y-4">
                <ContactRow icon="📞" label="Call us" value="0599233488" href="tel:0599233488" />
                <ContactRow
                  icon="💬"
                  label="WhatsApp"
                  value="+233 59 923 3488"
                  href="https://wa.me/233599233488"
                />
                <ContactRow
                  icon="📷"
                  label="Instagram"
                  value="@mrobertfries"
                  href="https://www.instagram.com/mrobertfries/"
                />
                <ContactRow
                  icon="🕒"
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
                <div className="p-4 rounded-xl bg-brand-card border border-gray-700">
                  <div className="font-bold text-white">Accra — East Legon</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Boundary Road, East Legon
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    UG Legon · UPSA · Adjiringanor · Madina · Adenta
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-brand-card border border-gray-700">
                  <div className="font-bold text-white">Kumasi — KNUST</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Bomso Road, near KNUST
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Bomso · Ayeduase · Adum · Kejetia
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-card to-gray-900 border border-gray-700">
              <div className="text-xs uppercase text-brand-gold font-bold tracking-widest">
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
                className="inline-block mt-3 px-4 py-2 rounded-xl bg-brand-gold text-brand-dark text-xs font-extrabold"
              >
                Enquire on WhatsApp →
              </a>
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div className="bg-brand-card border border-emerald-500/40 rounded-3xl p-8 text-center">
                <div className="text-5xl">🙏</div>
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
                  className="mt-6 px-5 py-2 rounded-xl bg-gray-800 text-white text-xs font-bold"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-brand-card border border-gray-700 rounded-3xl p-6 space-y-4"
              >
                <h2 className="font-heading text-2xl font-bold text-white">
                  Send a Message
                </h2>
                <p className="text-xs text-gray-400">
                  We'll get back to you on WhatsApp within a few hours.
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Your Name
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
                    placeholder="How can we help?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold"
                >
                  Send via WhatsApp →
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function ContactRow({ icon, label, value, href }) {
  const content = (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-card border border-gray-700 hover:border-brand-gold transition-colors">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">
          {label}
        </div>
        <div className="text-white font-bold">{value}</div>
      </div>
    </div>
  );
  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }
  return content;
}