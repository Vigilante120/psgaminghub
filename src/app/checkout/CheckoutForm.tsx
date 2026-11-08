"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/CartContext";
import Cover from "@/components/Cover";
import Spinner from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";
import { inr, slotLabel } from "@/lib/store";

type Defaults = { name: string; whatsapp: string };

export default function CheckoutForm({ email, defaults }: { email: string; defaults: Defaults }) {
  const router = useRouter();
  const { ready, items, subtotal, discount, total, clear } = useCart();
  const [form, setForm] = useState({ ...defaults, notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("place_order", {
      p_items: items.map((i) => ({ product_id: i.productId, platform: i.platform, slot: i.slot, quantity: i.quantity })),
      p_name: form.name,
      p_email: email,
      p_whatsapp: form.whatsapp,
      p_notes: form.notes,
    });

    if (error || !data?.[0]) {
      setError(error?.message ?? "Could not place the order. Please try again.");
      setBusy(false);
      return;
    }
    clear();
    router.push(`/orders/${data[0].order_number}`);
  }

  if (!ready) return <div className="mt-10 h-64 animate-pulse rounded-2xl border border-line bg-panel" />;

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-line bg-panel p-6 text-center sm:p-10">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/collections/all" className="btn btn-primary mt-5">Browse games</Link>
      </div>
    );
  }

  return (
    <form onSubmit={placeOrder} className="animate-rise mt-6 grid gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Your details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" className="input" value={form.name} onChange={set("name")} required />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input opacity-70" value={email} disabled />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="wa">WhatsApp number</label>
              <input
                id="wa"
                className="input"
                value={form.whatsapp}
                onChange={set("whatsapp")}
                placeholder="+91 98765 43210"
                inputMode="tel"
                required
              />
              <p className="mt-1.5 text-xs text-muted">We'll message you here to complete delivery.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Notes (optional)</h2>
          <textarea id="notes" rows={2} className="input mt-4" value={form.notes} onChange={set("notes")} placeholder="Best time to reach you, etc." />
          <p className="mt-3 text-xs text-muted">
            After paying, you'll send your details on the order page, e.g. <b className="text-white">PS5 Secondary – John – +91 6239689030</b>.
          </p>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-panel p-4 sm:p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {items.map((i) => (
            <li key={i.productId + i.platform + i.slot} className="flex items-center gap-3">
              <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md">
                <Cover title={i.title} url={i.coverUrl} sizes="44px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.title}</p>
                <p className="text-xs text-muted">{i.platform} · {slotLabel(i.slot)}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold">{inr(i.price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between text-muted"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-300">
              <span>🪔 Diwali discount</span>
              <span>−{inr(discount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 font-display text-xl font-bold"><span>Total</span><span>{inr(total)}</span></div>
        </div>

        {error && <p role="alert" className="animate-rise mt-4 rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>}

        <button className="btn btn-primary mt-5 w-full py-3.5" disabled={busy} aria-busy={busy}>
          {busy ? (
            <>
              <Spinner />
              Placing order…
            </>
          ) : (
            "Place order & pay with UPI"
          )}
        </button>
        <p className="mt-3 text-center text-xs text-muted">You'll see our UPI QR code on the next screen.</p>
      </aside>
    </form>
  );
}
