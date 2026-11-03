import Link from "next/link";
import Logo from "./Logo";
import { CATEGORIES } from "@/lib/store";

export default function Footer() {
  const wa = process.env.NEXT_PUBLIC_WHATSAPP;
  return (
    <footer className="mt-24 border-t border-line bg-panel/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            PS5 and PS4 games at prices that make sense, in Primary or Secondary slots. Pay with any UPI app and
            get your game fast.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
            {["UPI", "GPay", "PhonePe", "Paytm", "BHIM"].map((p) => (
              <span key={p} className="rounded-md border border-line px-2 py-1">
                {p}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider">Shop</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider">Help</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li><Link href="/#how-it-works" className="hover:text-white">How delivery works</Link></li>
            <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/orders" className="hover:text-white">Track my order</Link></li>
            {wa && (
              <li>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="hover:text-white">
                  WhatsApp support
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} PS GAMING HUB. Not affiliated with Sony Interactive Entertainment. All game names and
        trademarks belong to their respective owners.
      </div>
    </footer>
  );
}
