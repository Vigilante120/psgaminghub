"use client";

import { useEffect, useState } from "react";
import type { Console, Product, Slot } from "@/lib/types";
import {
  MAX_QTY,
  RENT_DAYS,
  SECONDARY_WARNING,
  SLOTS,
  inr,
  productConsoles,
  slotPrice,
  slotStock,
  stockLabel,
} from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "./CartContext";
import QtyStepper from "./QtyStepper";

const TONE = { ok: "text-emerald-300", low: "text-amber-300", out: "text-hot" } as const;

export default function AddToCart({ product }: { product: Product }) {
  const { add, items } = useCart();
  const consoles = productConsoles(product);
  const [platform, setPlatform] = useState<Console>(consoles[0] ?? "PS5");
  const [stock, setStock] = useState({ primary_stock: product.primary_stock, secondary_stock: product.secondary_stock });
  const firstInStock = SLOTS.find((s) => slotPrice(product, s.slot) != null && slotStock(stock, s.slot) !== 0)?.slot;
  const [slot, setSlot] = useState<Slot>(firstInStock ?? "Primary");
  const [qty, setQty] = useState(1);
  const price = slotPrice(product, slot) ?? product.price;

  // Live stock: Supabase pushes every change to this game's row, so counts update while the page is open.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`stock-${product.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${product.id}` },
        (payload) => {
          const row = payload.new as Partial<Product>;
          setStock({ primary_stock: row.primary_stock ?? null, secondary_stock: row.secondary_stock ?? null });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [product.id]);

  // Copies the customer can still add: the per-order cap, the stock left, minus what's already in the cart.
  const left = slotStock(stock, slot);
  const inCart = items
    .filter((i) => i.productId === product.id && (slot === "Primary" ? i.slot === "Primary" : i.slot !== "Primary"))
    .reduce((n, i) => n + i.quantity, 0);
  const sameLineInCart = items.find((i) => i.productId === product.id && i.platform === platform && i.slot === slot)?.quantity ?? 0;
  const max = Math.max(0, Math.min(MAX_QTY - sameLineInCart, left == null ? Infinity : left - inCart));
  const out = left === 0;

  // Keep the picked quantity inside the limit when stock or the cart changes.
  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, max || 1)));
  }, [max]);

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
            const label = stockLabel(slotStock(stock, s.slot));
            const disabled = p == null || label.tone === "out";
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
                <span className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="font-display text-lg font-bold">{p == null ? "Not available" : inr(p)}</span>
                  {p != null && <span className={`text-[11px] font-semibold ${TONE[label.tone]}`}>{label.text}</span>}
                </span>
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

      <div>
        <span className="label">Copies</span>
        <div className="flex flex-wrap items-center gap-3">
          <QtyStepper value={qty} max={Math.max(1, max)} onChange={setQty} />
          <span className="text-xs text-muted">
            {out
              ? "Out of stock"
              : max === 0
                ? "You have the most you can buy in your cart"
                : `Up to ${MAX_QTY} per order. Buying for friends? Pick how many.`}
          </span>
        </div>
      </div>

      <button
        className="btn btn-primary w-full py-3.5 text-sm sm:text-base"
        disabled={out || max === 0}
        onClick={() =>
          add(
            {
              productId: product.id,
              slug: product.slug,
              title: product.title,
              platform,
              slot,
              price,
              coverUrl: product.cover_url,
            },
            qty
          )
        }
      >
        {out
          ? "Out of stock"
          : `Add ${qty > 1 ? `${qty} × ` : "to cart · "}${platform} ${slot} · ${inr(price * qty)}`}
      </button>
    </div>
  );
}
