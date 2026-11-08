"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "./CartContext";
import Cover from "./Cover";
import { gameDiscount, inr, slotLabel } from "@/lib/store";

export default function CartDrawer() {
  const { items, open, setOpen, remove, subtotal, discount, total, count } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // Stop the page scrolling behind the drawer
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, setOpen]);

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`absolute right-0 top-0 flex h-dvh w-full max-w-md flex-col border-l border-line bg-panel transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        inert={!open}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="font-display text-lg font-bold uppercase tracking-wider">Your cart ({count})</h2>
          <button onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-lg border border-line lg:h-9 lg:w-9" aria-label="Close cart">
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
            {discount > 0 && (
              <div className="mx-4 mt-4 rounded-xl border border-hot/30 bg-hot/10 px-4 py-3 text-sm sm:mx-5">
                🪔 Diwali offer applied: <b className="text-white">{inr(discount)} off</b> your order.
              </div>
            )}
            <ul className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
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
                      {i.platform} · {slotLabel(i.slot)}
                    </span>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-display font-bold">
                        {inr(i.price)}
                        {gameDiscount(i.price) > 0 && (
                          <span className="ml-2 rounded bg-hot/15 px-1.5 py-0.5 font-sans text-[11px] font-bold text-hot">
                            −{inr(gameDiscount(i.price))} Diwali
                          </span>
                        )}
                      </span>
                      <button onClick={() => remove(i)} className="-my-2 -mr-2 min-h-11 px-2 text-xs text-muted hover:text-hot lg:min-h-0">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="shrink-0 space-y-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm sm:p-5">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>{inr(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>🪔 Diwali discount</span>
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
