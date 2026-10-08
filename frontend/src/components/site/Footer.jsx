import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-gray-800 py-12 text-gray-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div>
          <div className="font-heading text-lg font-bold text-white mb-3">
            Mr. Robert's Fries 🍟
          </div>
          <p className="leading-relaxed">
            Ghana's most loved loaded fries, crispy chicken wings, and custom
            bowls. Delivered hot to Accra & Kumasi.
          </p>
        </div>

        <div>
          <div className="font-bold text-white uppercase tracking-wider text-[10px] mb-3">
            Menu
          </div>
          <ul className="space-y-2">
            <li><Link href="/menu" className="hover:text-brand-gold">Full Menu</Link></li>
            <li><Link href="/builder" className="hover:text-brand-gold">Custom Bowl</Link></li>
            <li><Link href="/search" className="hover:text-brand-gold">Search</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-bold text-white uppercase tracking-wider text-[10px] mb-3">
            Company
          </div>
          <ul className="space-y-2">
            <li><Link href="/about" className="hover:text-brand-gold">About Us</Link></li>
            <li><Link href="/locations" className="hover:text-brand-gold">Delivery Areas</Link></li>
            <li><Link href="/contact" className="hover:text-brand-gold">Contact</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-bold text-white uppercase tracking-wider text-[10px] mb-3">
            Contact
          </div>
          <ul className="space-y-2">
            <li><a href="tel:0599233488" className="hover:text-brand-gold">📞 0599233488</a></li>
            <li><a href="https://wa.me/233599233488" className="hover:text-brand-gold">💬 WhatsApp</a></li>
            <li><a href="https://www.instagram.com/mrobertfries/" className="hover:text-brand-gold">📷 Instagram</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© 2026 Mr. Robert's Fries Ghana. All rights reserved.</p>
        <p className="text-gray-600">Made with 🍟 in Accra</p>
      </div>
    </footer>
  );
}