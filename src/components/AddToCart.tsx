"use client";

import { useState } from "react";
import type { Console, Product, Slot } from "@/lib/types";
import { SLOTS, inr, productConsoles, slotPrice } from "@/lib/store";
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
              className={`rounded-xl border px-5 py-2.5 font-display text-sm font-semibold tracking-wider transition ${
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
            return (
              <button
                key={s.slot}
                onClick={() => !disabled && setSlot(s.slot)}
                disabled={disabled}
                className={`rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  slot === s.slot ? "border-brand bg-brand/15" : "border-line hover:border-[#33405f]"
                }`}
              >
                <span className="block font-display text-sm font-semibold uppercase tracking-wider">{s.slot}</span>
                <span className="mt-0.5 block text-xs text-muted">{s.points[2]}</span>
                <span className="mt-1.5 block font-display text-lg font-bold">{disabled ? "Not available" : inr(p)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        className="btn btn-primary w-full py-3.5 text-base"
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
        Add to cart · {platform} {slot} · {inr(price)}
      </button>
    </div>
  );
}
