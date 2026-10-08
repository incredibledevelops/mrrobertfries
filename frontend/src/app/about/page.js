import Link from "next/link";

export const metadata = {
  title: "About Us",
  description:
    "Learn the story behind Mr. Robert's Fries — Ghana's most loved loaded fries brand, born in Accra and loved across the country.",
};

export default function AboutPage() {
  return (
    <>
      <section className="py-16 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <nav className="text-xs text-gray-500 mb-6">
            <Link href="/" className="hover:text-brand-gold">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-300">About</span>
          </nav>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-white leading-tight">
            Fresh. Bold.{" "}
            <span className="text-brand-gold">Unforgettable.</span>
          </h1>
          <p className="text-gray-300 mt-6 max-w-2xl mx-auto text-lg">
            We started with a simple idea: take great Ghanaian flavors, put them
            on top of the crispiest fries in Accra, and get them to you before
            they cool down.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 space-y-8 text-gray-300 leading-relaxed">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white mb-3">
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
            <h2 className="font-heading text-2xl font-bold text-white mb-3">
              What Makes Us Different
            </h2>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-brand-gold">🍟</span>
                <span>
                  <strong className="text-white">Hand-cut, never frozen.</strong>{" "}
                  Our fries are cut fresh every morning.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-brand-gold">🌶️</span>
                <span>
                  <strong className="text-white">Signature Ghanaian sauces.</strong>{" "}
                  Shito aioli, green pepper, sweet chili — made from scratch.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-brand-gold">🛵</span>
                <span>
                  <strong className="text-white">Fast, local delivery.</strong>{" "}
                  Most orders arrive in under 30 minutes.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-brand-gold">💳</span>
                <span>
                  <strong className="text-white">Pay how you want.</strong> MoMo,
                  Telecel Cash, AT Money, or card — all via Paystack.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-2xl font-bold text-white mb-3">
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
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-amber to-brand-crimson text-white font-bold"
            >
              Order Now
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 rounded-2xl bg-brand-card border border-brand-gold/40 text-brand-gold font-bold"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}