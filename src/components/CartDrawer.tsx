"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "./CartContext";
import Cover from "./Cover";
import { BUNDLE_OFFER, inr } from "@/lib/store";

export default function CartDrawer() {
  const { items, open, setOpen, remove, subtotal, discount, discountPercent, total, count } = useCart();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const nextTier = [...BUNDLE_OFFER.tiers].reverse().find((t) => count < t.minItems);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-panel transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold uppercase tracking-wider">Your cart ({count})</h2>
          <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-line" aria-label="Close cart">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-muted">Your cart is empty.</p>
            <Link href="/collections/all" onClick={() => setOpen(false)} className="btn btn-primary">
              Browse games
            </Link>
          </div>
        ) : (
          <>
            {nextTier && (
              <div className="mx-5 mt-4 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm">
                Add {nextTier.minItems - count} more {nextTier.minItems - count === 1 ? "game" : "games"} to get{" "}
                <b className="text-brand-2">{nextTier.percent}% off</b> your order.
              </div>
            )}
            <ul className="flex-1 space-y-3 overflow-y-auto p-5">
              {items.map((i) => (
                <li key={i.productId + i.platform + i.slot} className="flex gap-3 rounded-xl border border-line bg-panel-2 p-3">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg">
                    <Cover title={i.title} url={i.coverUrl} sizes="64px" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/products/${i.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 text-sm font-semibold">
                      {i.title}
                    </Link>
                    <span className="mt-1 w-fit rounded bg-white/5 px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-muted">
                      {i.platform} · {i.slot}
                    </span>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-display font-bold">{inr(i.price)}</span>
                      <button onClick={() => remove(i)} className="text-xs text-muted hover:text-hot">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-line p-5 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>{inr(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>Bundle discount ({discountPercent}%)</span>
                  <span>−{inr(discount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-display text-lg font-bold">
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-primary mt-3 w-full py-3.5">
                Checkout · Pay with UPI
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
