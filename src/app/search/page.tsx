import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const products = q.trim() ? await getProducts({ search: q.trim() }) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
        {q ? <>Results for “{q}”</> : "Search"}
      </h1>
      <form action="/search" className="mt-5 max-w-xl">
        <input name="q" defaultValue={q} placeholder="Search games…" className="input" autoFocus />
      </form>
      {q && products.length === 0 && <p className="mt-10 text-muted">No games found. Try a shorter search.</p>}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
