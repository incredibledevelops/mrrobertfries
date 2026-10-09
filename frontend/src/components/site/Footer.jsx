import Link from "next/link";
import {
  Utensils,
  Phone,
  MessageCircle,
  Camera,
  MapPin,
  ArrowUp,
} from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-gray-800 text-gray-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-2 sm:col-span-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 mb-4 group"
            aria-label="Mr. Robert's Fries home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center group-hover:scale-105 transition-transform">
              <Utensils
                className="w-4 h-4 text-brand-dark"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </div>
            <span className="font-heading text-base font-bold text-white">
              Mr. Robert's Fries
            </span>
          </Link>
          <p className="leading-relaxed text-gray-500">
            Ghana's most loved loaded fries, crispy chicken wings, and custom
            bowls. Delivered hot to Accra & Kumasi.
          </p>
        </div>

        {/* Menu */}
        <div>
          <div className="font-bold text-white uppercase tracking-wider text-[10px] mb-4">
            Menu
          </div>
          <ul className="space-y-2.5">
            <FooterLink href="/menu">Full Menu</FooterLink>
            <FooterLink href="/builder">Custom Bowl</FooterLink>
            <FooterLink href="/search">Search</FooterLink>
          </ul>
        </div>

        {/* Company */}
        <div>
          <div className="font-bold text-white uppercase tracking-wider text-[10px] mb-4">
            Company
          </div>
          <ul className="space-y-2.5">
            <FooterLink href="/about">About Us</FooterLink>
            <FooterLink href="/locations">Delivery Areas</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <div className="font-bold text-white uppercase tracking-wider text-[10px] mb-4">
            Get in Touch
          </div>
          <ul className="space-y-2.5">
            <li>
              <a
                href="tel:0599233488"
                className="inline-flex items-center gap-2 hover:text-brand-gold transition-colors"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                0599233488
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/233599233488"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-emerald-400 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                WhatsApp
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/mrobertfries/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-pink-400 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Instagram
              </a>
            </li>
          </ul>

          {/* Kitchens */}
          <div className="mt-6">
            <div className="font-bold text-white uppercase tracking-wider text-[10px] mb-3">
              Kitchens
            </div>
            <ul className="space-y-2">
              <li className="inline-flex items-start gap-2 text-gray-500">
                <MapPin
                  className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-gold"
                  aria-hidden="true"
                />
                <span>East Legon, Accra</span>
              </li>
              <li className="inline-flex items-start gap-2 text-gray-500">
                <MapPin
                  className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-gold"
                  aria-hidden="true"
                />
                <span>Bomso, Kumasi</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p>© {year} Mr. Robert's Fries Ghana. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Made with{" "}
              <Utensils
                className="inline w-3 h-3 text-brand-gold"
                aria-hidden="true"
              />{" "}
              in Accra
            </span>
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1 text-gray-500 hover:text-brand-gold transition-colors"
            >
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
              Back to top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        className="text-gray-400 hover:text-brand-gold transition-colors inline-flex items-center gap-1.5 group"
      >
        <span className="w-1 h-1 rounded-full bg-gray-700 group-hover:bg-brand-gold transition-colors" />
        {children}
      </Link>
    </li>
  );
}