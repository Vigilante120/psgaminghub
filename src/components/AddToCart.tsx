"use client";

import { useState } from "react";
import type { Console, Product, Slot } from "@/lib/types";
import { RENT_DAYS, SECONDARY_WARNING, SLOTS, inr, productConsoles, slotPrice } from "@/lib/store";
import { useCart } from "./CartContext";

export default function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const consoles = productConsoles(product);
  const [platform, setPlatform] = useState<Console>(consoles[0] ?? "PS5");
  const [slot, setSlot] = useState<Slot>("Primary");
  const price = slotPrice(product, slot) ?? product.price;

  if (consoles.length === 0) return <p className="text-sm text-muted">Currently unavailable.</p>;

  return (
    <div className="space-y-5">
      <div>
        <span className="label">Choose your console</span>
        <div className="flex gap-2">
          {consoles.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`min-h-11 rounded-xl border px-5 py-2.5 font-display text-sm font-semibold tracking-wider transition active:scale-95 ${
                platform === p ? "border-brand bg-brand/15 text-white" : "border-line text-muted hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Choose your slot</span>
        <div className="grid grid-cols-2 gap-2">
          {SLOTS.map((s) => {
            const p = slotPrice(product, s.slot);
            const disabled = p == null;
            // Rent only shows on games that have a rent price; it spans the full row under the two slots.
            if (s.slot === "Rent" && disabled) return null;
            return (
              <button
                key={s.slot}
                onClick={() => !disabled && setSlot(s.slot)}
                disabled={disabled}
                className={`rounded-xl border px-4 py-3 text-left transition ${s.slot === "Rent" ? "col-span-2" : ""} enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
                  slot === s.slot ? "border-brand bg-brand/15" : "border-line hover:border-[#33405f]"
                }`}
              >
                <span className="block font-display text-sm font-semibold uppercase tracking-wider">{s.slot === "Rent" ? s.title : s.slot}</span>
                <span className="mt-0.5 block text-xs text-muted">{s.hint}</span>
                <span className="mt-1.5 block font-display text-lg font-bold">{disabled ? "Not available" : inr(p)}</span>
              </button>
            );
          })}
        </div>
        {slot === "Rent" && (
          <p className="animate-rise mt-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            Your {RENT_DAYS} days start when we deliver the game. We'll email you when the rent ends. {SECONDARY_WARNING}
          </p>
        )}
      </div>

      <button
        className="btn btn-primary w-full py-3.5 text-sm sm:text-base"
        onClick={() =>
          add({
            productId: product.id,
            slug: product.slug,
            title: product.title,
            platform,
            slot,
            price,
            coverUrl: product.cover_url,
          })
        }
      >
        Add to cart · {platform} {slot === "Rent" ? "Rent" : slot} · {inr(price)}
      </button>
    </div>
  );
}
