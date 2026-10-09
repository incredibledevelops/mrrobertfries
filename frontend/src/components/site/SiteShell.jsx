"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "./CartContext";
import { BranchProvider } from "./BranchContext";
import AnnouncementBar from "./AnnouncementBar";
import Header from "./Header";
import Footer from "./Footer";
import BranchPicker from "./BranchPicker";
import CartDrawer from "./CartDrawer";
import CheckoutModal from "./CheckoutModal";

const HIDE_CHROME_ON = ["/kitchen", "/rider", "/admin"];

export default function SiteShell({ children }) {
  const pathname = usePathname() || "";
  const hideChrome = HIDE_CHROME_ON.some((p) => pathname.startsWith(p));

  if (hideChrome) return children;

  return (
    <CartProvider>
      <BranchProvider>
        <div className="min-h-screen bg-brand-dark text-gray-100 font-body flex flex-col">
          <AnnouncementBar />
          <Header />
          <BranchPicker />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
          <CheckoutModal />
        </div>
      </BranchProvider>
    </CartProvider>
  );
}