"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/types";
import { bundleDiscountPercent } from "@/lib/store";

type CartState = {
  ready: boolean;
  items: CartItem[];
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (item: Omit<CartItem, "quantity">) => void;
  remove: (item: Pick<CartItem, "productId" | "platform" | "slot">) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  discountPercent: number;
  discount: number;
  total: number;
};

const CartContext = createContext<CartState | null>(null);
// v2: cart lines carry a slot (Primary / Secondary).
const STORAGE_KEY = "psgh-cart-v2";

const sameLine = (a: Pick<CartItem, "productId" | "platform" | "slot">, b: Pick<CartItem, "productId" | "platform" | "slot">) =>
  a.productId === b.productId && a.platform === b.platform && a.slot === b.slot;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* storage unavailable */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, loaded]);

  // Each game is delivered once per slot, so a product + platform + slot is a single line.
  const add = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => (prev.some((i) => sameLine(i, item)) ? prev : [...prev, { ...item, quantity: 1 }]));
    setOpen(true);
  }, []);

  const remove = useCallback((item: Pick<CartItem, "productId" | "platform" | "slot">) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, item)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
    const discountPercent = bundleDiscountPercent(count);
    const discount = Math.round((subtotal * discountPercent) / 100);
    return {
      ready: loaded,
      items,
      open,
      setOpen,
      add,
      remove,
      clear,
      count,
      subtotal,
      discountPercent,
      discount,
      total: subtotal - discount,
    };
  }, [items, open, add, remove, clear, loaded]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
