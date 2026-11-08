import Link from "next/link";
import type { Product } from "@/lib/types";
import { LOW_STOCK, fromPrice, inr, productConsoles, soldOut } from "@/lib/store";
import Cover from "./Cover";
import QuickAdd from "./QuickAdd";

export default function ProductCard({ product }: { product: Product }) {
  const off =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : 0;
  const out = soldOut(product);
  // Low-stock hint: copies left across the slots on sale, only when every one of them is tracked.
  const counts = [product.primary_stock, ...(product.secondary_price != null ? [product.secondary_stock] : [])];
  const left = counts.every((n) => n != null) ? counts.reduce<number>((a, n) => a + (n ?? 0), 0) : null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel transition-[translate,scale,border-color,box-shadow] duration-300 ease-out will-change-transform hover:-translate-y-1 hover:border-brand/50 hover:shadow-[0_24px_50px_-22px] hover:shadow-brand/70 active:scale-[0.98] active:duration-100">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[3/4] overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105">
          <Cover title={product.title} url={product.cover_url} />
        </div>
        {out && (
          <span className="absolute inset-x-0 bottom-0 bg-black/75 py-1.5 text-center font-display text-xs font-bold uppercase tracking-wider text-hot backdrop-blur">
            Out of stock
          </span>
        )}
        {!out && left != null && left <= LOW_STOCK && (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1.5 text-center text-xs font-semibold text-amber-300 backdrop-blur">
            Only {left} left
          </span>
        )}
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-md bg-hot px-2 py-1 font-display text-xs font-bold">
            -{off}%
          </span>
        )}
        <div className="absolute right-3 top-3 flex gap-1">
          {productConsoles(product).map((p) => (
            <span key={p} className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wider backdrop-blur">
              {p}
            </span>
          ))}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-snug transition-colors hover:text-brand-2">
          {product.title}
        </Link>
        <div className="mt-3 flex items-end justify-between gap-1.5 sm:gap-2">
          <div>
            <div className="font-display text-base font-bold sm:text-lg">
              {product.secondary_price != null && <span className="mr-1 text-xs font-normal text-muted">from</span>}
              {inr(fromPrice(product))}
            </div>
            {off > 0 && <div className="text-xs text-muted line-through">{inr(product.compare_at_price!)}</div>}
          </div>
          <QuickAdd product={product} />
        </div>
      </div>
    </div>
  );
}
