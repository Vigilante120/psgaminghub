import type { Category, Console, OrderStatus, Product, Slot } from "./types";

export const STORE_NAME = "PS GAMING HUB";

// We only sell PS4 / PS5 games for now. PC games and PS Plus are hidden (see migration 002).
export const CATEGORIES: { slug: Category | "all"; label: string; blurb: string }[] = [
  { slug: "all", label: "All Games", blurb: "Every PS5 & PS4 game in the hub: buy Primary or Secondary, or rent for 30 days" },
  { slug: "playstation-games", label: "PlayStation Games", blurb: "PS5 & PS4 games: buy Primary or Secondary, or rent for 30 days" },
];

export const CONSOLES: Console[] = ["PS5", "PS4"];

/** Consoles a product can be bought for (ignores PC). */
export function productConsoles(product: Pick<Product, "platforms">): Console[] {
  return CONSOLES.filter((c) => product.platforms.includes(c));
}

// hint: the one-liner shown on the slot picker.
export const SLOTS: { slot: Slot; title: string; hint: string; points: string[] }[] = [
  {
    slot: "Primary",
    title: "Primary slot",
    hint: "Online & offline supported",
    points: ["Play from your personal account", "Lifetime access", "Online & offline supported"],
  },
  {
    slot: "Secondary",
    title: "Secondary slot",
    hint: "Online only supported",
    points: ["Play from the ID we provide", "Same gameplay and features as Primary", "Online only supported"],
  },
  {
    slot: "Rent",
    title: "Rent · 30 days",
    hint: "Secondary slot · 30 days from delivery",
    points: ["Secondary slot on the ID we provide", "30 days from delivery", "Online only supported"],
  },
];

/** How long a Rent lasts, counted from when the order is marked delivered (see migration 006). */
export const RENT_DAYS = 30;

/** Slot as shown to people: Rent always means a Secondary slot. */
export function slotLabel(slot: Slot) {
  return slot === "Rent" ? `Rent (Secondary, ${RENT_DAYS} days)` : slot;
}

export const SECONDARY_WARNING =
  "You must stay connected to the internet (Wi-Fi) at all times.";

/** Price for a slot, or null when that slot isn't offered. */
export function slotPrice(product: Pick<Product, "price" | "secondary_price" | "rent_price">, slot: Slot): number | null {
  if (slot === "Secondary") return product.secondary_price;
  if (slot === "Rent") return product.rent_price;
  return product.price;
}

/** Lowest price across the slots on offer, for "from ₹…" labels. */
export function fromPrice(product: Pick<Product, "price" | "secondary_price">) {
  return product.secondary_price != null ? Math.min(product.price, product.secondary_price) : product.price;
}

/** One line about a Rent item's 30 days, or null for bought slots. */
export function rentStatus(item: { slot: Slot; rent_ends_at: string | null }) {
  if (item.slot !== "Rent") return null;
  if (!item.rent_ends_at) return `${RENT_DAYS} days start when delivered`;
  const ended = new Date(item.rent_ends_at).getTime() <= Date.now();
  return `${ended ? "Rent ended" : "Rent ends"} ${formatDate(item.rent_ends_at)}`;
}

/** The details line the customer sends after paying, e.g. "PS5 Secondary – John – +91 6239689030". */
export function deliveryLine(item: { platform: string; slot: Slot }, name: string, phone: string) {
  return `${item.platform} ${slotLabel(item.slot)} – ${name.trim()} – ${phone.trim()}`;
}

export function categoryLabel(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? "Products";
}

/** Bundle offer shown in the announcement bar and applied at checkout (must match place_order in SQL). */
export const BUNDLE_OFFER = {
  text: "Buy 2 games, get 10% off · Buy 3+, get 15% off",
  tiers: [
    { minItems: 3, percent: 15 },
    { minItems: 2, percent: 10 },
  ],
};

export function bundleDiscountPercent(itemCount: number) {
  return BUNDLE_OFFER.tiers.find((t) => itemCount >= t.minItems)?.percent ?? 0;
}

export function inr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    // Servers run in UTC; always show India time.
    timeZone: "Asia/Kolkata",
  });
}

export const STATUS_META: Record<OrderStatus, { label: string; tone: string; help: string }> = {
  awaiting_payment: {
    label: "Awaiting payment",
    tone: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
    help: "Pay via UPI and submit your UTR + screenshot below.",
  },
  payment_submitted: {
    label: "Verifying payment",
    tone: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
    help: "We're checking your payment. This usually takes a few minutes.",
  },
  processing: {
    label: "Processing",
    tone: "bg-violet-400/15 text-violet-300 ring-violet-400/30",
    help: "Payment confirmed. We'll message you on WhatsApp to complete delivery.",
  },
  delivered: {
    label: "Delivered",
    tone: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
    help: "Your game is on your account. Your purchase receipt is below.",
  },
  rejected: {
    label: "Payment rejected",
    tone: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
    help: "We couldn't verify this payment. Contact support on WhatsApp.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-zinc-400/15 text-zinc-300 ring-zinc-400/30",
    help: "This order was cancelled.",
  },
};

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function upiLink(opts: { amount: number; orderNumber: string }) {
  const params = new URLSearchParams({
    pa: process.env.NEXT_PUBLIC_UPI_ID ?? "",
    pn: process.env.NEXT_PUBLIC_UPI_NAME ?? STORE_NAME,
    am: opts.amount.toFixed(2),
    cu: "INR",
    tn: `Order ${opts.orderNumber}`,
  });
  return `upi://pay?${params.toString()}`;
}
