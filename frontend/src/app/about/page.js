import Link from "next/link";
import {
  Utensils,
  Flame,
  Bike,
  CreditCard,
  Sparkles,
  Heart,
  ChefHat,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "About Us",
  description:
    "Learn the story behind Mr. Robert's Fries — Ghana's most loved loaded fries brand, born in Accra and loved across the country.",
};

const DIFFERENTIATORS = [
  {
    icon: Utensils,
    title: "Hand-cut, never frozen",
    body: "Our fries are cut fresh every morning.",
  },
  {
    icon: Flame,
    title: "Signature Ghanaian sauces",
    body: "Shito aioli, green pepper, sweet chili — all made from scratch.",
  },
  {
    icon: Bike,
    title: "Fast, local delivery",
    body: "Most orders arrive in under 30 minutes.",
  },
  {
    icon: CreditCard,
    title: "Pay how you want",
    body: "MoMo, Telecel Cash, AT Money, or card — all via Paystack.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="py-16 sm:py-20 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <nav className="flex items-center justify-center gap-1.5 text-xs text-gray-500 mb-6">
            <Link href="/" className="hover:text-brand-gold transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-300">About</span>
          </nav>
          <div className="inline-flex items-center gap-1.5 text-brand-gold font-bold text-xs uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Our Story
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-white leading-[1.05]">
            Fresh. Bold.{" "}
            <span className="text-brand-gold">Unforgettable.</span>
          </h1>
          <p className="text-gray-300 mt-6 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            We started with a simple idea: take great Ghanaian flavors, put
            them on top of the crispiest fries in Accra, and get them to you
            before they cool down.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 space-y-10 text-gray-300 leading-relaxed">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white mb-4 inline-flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-brand-gold" aria-hidden="true" />
              Our Story
            </h2>
            <p>
              Mr. Robert's Fries started in a small kitchen in East Legon with
              one deep fryer and a very specific obsession: the perfect loaded
              fry bowl. We weren't interested in shortcuts. Hand-cut potatoes.
              Fresh sauces made daily. Chicken marinated for 24 hours before it
              hits the oil.
            </p>
            <p className="mt-3">
              Word spread fast. First the students at UG Legon, then East Legon
              offices, then Madina, then UPSA. Before long, we were running
              deliveries to Kumasi too. Every bowl, every wing, every gizzard
              still made with the same care as the very first one.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-2xl font-bold text-white mb-4">
              What Makes Us Different
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {DIFFERENTIATORS.map(({ icon: Icon, title, body }, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-brand-card border border-gray-700 hover:border-brand-gold/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
                  </div>
                  <div className="text-white font-bold text-sm">{title}</div>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-heading text-2xl font-bold text-white mb-4 inline-flex items-center gap-2">
              <Heart className="w-5 h-5 text-brand-gold" aria-hidden="true" />
              Our Promise
            </h2>
            <p>
              If your food arrives cold, if your order is wrong, if anything
              isn't right — call us. We'll make it right. No questions.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-brand-card/40 border-y border-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-white">
            Ready to taste the difference?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-amber to-brand-crimson hover:from-brand-gold hover:to-brand-amber text-white font-bold transition-all active:scale-[0.98] group"
            >
              Order Now
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-brand-card border border-brand-gold/40 hover:border-brand-gold text-brand-gold font-bold transition-colors"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}