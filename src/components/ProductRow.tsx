import Link from "next/link";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function ProductRow({ title, href, products }: { title: string; href: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:mt-16">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide md:text-3xl">{title}</h2>
        <Link href={href} className="-my-3 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-brand-2 hover:underline">
          View all →
        </Link>
      </div>
      <div className="stagger no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto sm:gap-4 px-4 pb-2">
        {products.map((p) => (
          <div key={p.id} className="w-[47%] shrink-0 snap-start sm:w-[31%] md:w-[23%] lg:w-[18.5%]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
