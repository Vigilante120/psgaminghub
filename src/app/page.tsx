import Link from "next/link";
import { getProducts } from "@/lib/products";
import ProductRow from "@/components/ProductRow";
import HowItWorks from "@/components/HowItWorks";
import Cover from "@/components/Cover";
import SlotInfo from "@/components/SlotInfo";

const PERKS = ["⚡ Fast delivery", "💸 Best prices in India", "📲 Pay with any UPI app", "🎧 WhatsApp support", "✅ On your own account", "🧾 Purchase receipt with every order"];

const FAQ = [
  {
    q: "What's the difference between Primary and Secondary?",
    a: "Primary: you play from your personal account, with lifetime access, online and offline. Secondary: you play from the ID we provide, with the same gameplay and features, but online only. With Secondary, you must stay connected to the internet (Wi-Fi) at all times.",
  },
  {
    q: "How do I receive my game?",
    a: "After paying, submit your UTR, screenshot and your details (for example: PS5 Secondary – John – +91 6239218530) on your order page. We verify the payment and complete delivery with you on WhatsApp. You then get the purchase receipt on your order page.",
  },
  {
    q: "How long does delivery take?",
    a: "Most orders are completed within minutes of payment verification during working hours. You can track the status any time on your order page.",
  },
  {
    q: "What is the UTR number?",
    a: "It's the 12-digit transaction reference your UPI app shows after payment (also called UPI Ref No. or Transaction ID). We use it to match your payment.",
  },
  {
    q: "Do I get lifetime access?",
    a: "Yes, with the Primary slot. The game is played from your personal account with lifetime access, online and offline.",
  },
  {
    q: "What if something goes wrong?",
    a: "If we can't complete your order, we refund you in full. Message us on WhatsApp with your order number and we'll sort it out.",
  },
];

export default async function Home() {
  const [featured, ps5Games, ps4Games] = await Promise.all([
    getProducts({ featured: true, limit: 3 }),
    getProducts({ category: "playstation-games", platform: "PS5", limit: 10 }),
    getProducts({ category: "playstation-games", platform: "PS4", limit: 10 }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand/30 blur-[120px]" />
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-[#8b5cf6]/25 blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-2" /> PS5 · PS4
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight md:text-7xl">
              Level up your <span className="text-gradient">library</span> for less.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              The latest PS5 and PS4 games at the best prices in India. Pick a Primary or Secondary slot, pay with UPI,
              and we deliver it fast.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/collections/playstation-games" className="btn btn-primary px-6 py-3.5">
                Shop PlayStation games
              </Link>
              <Link href="/#how-it-works" className="btn btn-ghost px-6 py-3.5">
                How it works
              </Link>
            </div>
          </div>

          {featured.length > 0 && (
            <div className="relative hidden h-[26rem] lg:block">
              {featured.slice(0, 3).map((p, i) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="absolute aspect-[3/4] w-56 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60 transition hover:z-10 hover:-translate-y-2"
                  style={{
                    left: `${i * 26}%`,
                    top: i === 1 ? "0" : "2.5rem",
                    transform: `rotate(${(i - 1) * 6}deg)`,
                    zIndex: i === 1 ? 2 : 1,
                  }}
                >
                  <Cover title={p.title} url={p.cover_url} sizes="224px" priority />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Perks ticker */}
        <div className="relative overflow-hidden border-t border-line bg-panel/60 py-3">
          <div className="animate-marquee flex w-max gap-10 whitespace-nowrap text-sm font-medium text-muted">
            {[...PERKS, ...PERKS].map((p, i) => (
              <span key={i}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Slots */}
      <section id="slots" className="mx-auto mt-16 max-w-7xl scroll-mt-24 px-4">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide md:text-3xl">Primary or Secondary?</h2>
        <p className="mt-2 max-w-2xl text-muted">Every game comes in two slot types. Pick the one that suits how you play.</p>
        <div className="mt-6">
          <SlotInfo />
        </div>
      </section>

      <ProductRow title="PS5 games" href="/collections/playstation-games?platform=PS5" products={ps5Games} />
      <ProductRow title="PS4 games" href="/collections/playstation-games?platform=PS4" products={ps4Games} />

      {/* How it works */}
      <section id="how-it-works" className="mx-auto mt-24 max-w-7xl scroll-mt-24 px-4">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide md:text-3xl">How delivery works</h2>
        <p className="mt-2 max-w-2xl text-muted">Four simple steps from checkout to playing.</p>
        <div className="mt-6">
          <HowItWorks />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto mt-24 max-w-3xl scroll-mt-24 px-4">
        <h2 className="text-center font-display text-2xl font-bold uppercase tracking-wide md:text-3xl">FAQ</h2>
        <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-panel">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                {f.q}
                <span className="text-brand-2 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
