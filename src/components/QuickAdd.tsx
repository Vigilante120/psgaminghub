import Link from "next/link";
import type { Product } from "@/lib/types";

/** Small button on product cards; opens the product page so the customer picks a console and slot. */
export default function QuickAdd({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-2 ring-1 ring-brand/30 transition hover:bg-brand hover:text-white lg:h-10 lg:w-10"
      aria-label={`Choose console and slot for ${product.title}`}
      title="Choose console & slot"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}
