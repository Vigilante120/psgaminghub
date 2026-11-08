"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/types";
import { MAX_QTY, cartDiscount } from "@/lib/store";

type CartState = {
  ready: boolean;
  items: CartItem[];
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Adds copies to the line (merging with what's already there), capped at MAX_QTY. */
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (item: Pick<CartItem, "productId" | "platform" | "slot">, quantity: number) => void;
  remove: (item: Pick<CartItem, "productId" | "platform" | "slot">) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  /** Diwali offer: total rupees off across the cart. */
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

  // A product + platform + slot is a single line; buying several copies raises its quantity.
  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) =>
      prev.some((i) => sameLine(i, item))
        ? prev.map((i) => (sameLine(i, item) ? { ...i, ...item, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i))
        : [...prev, { ...item, quantity: Math.min(MAX_QTY, Math.max(1, quantity)) }]
    );
    setOpen(true);
  }, []);

  const setQuantity = useCallback((item: Pick<CartItem, "productId" | "platform" | "slot">, quantity: number) => {
    const q = Math.min(MAX_QTY, Math.max(1, Math.round(quantity)));
    setItems((prev) => prev.map((i) => (sameLine(i, item) ? { ...i, quantity: q } : i)));
  }, []);

  const remove = useCallback((item: Pick<CartItem, "productId" | "platform" | "slot">) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, item)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
    const discount = cartDiscount(subtotal);
    return {
      ready: loaded,
      items,
      open,
      setOpen,
      add,
      setQuantity,
      remove,
      clear,
      count,
      subtotal,
      discount,
      total: subtotal - discount,
    };
  }, [items, open, add, setQuantity, remove, clear, loaded]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
