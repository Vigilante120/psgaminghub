import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getProducts } from "@/lib/products";
import { categoryLabel, fromPrice, inr, productConsoles } from "@/lib/store";
import Cover from "@/components/Cover";
import AddToCart from "@/components/AddToCart";
import HowItWorks from "@/components/HowItWorks";
import SlotInfo from "@/components/SlotInfo";
import ProductRow from "@/components/ProductRow";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Not found" };
  return {
    title: `${p.title} (${productConsoles(p).join(" / ")}) — from ${inr(fromPrice(p))}`,
    description: p.description ?? undefined,
    openGraph: p.cover_url ? { images: [p.cover_url] } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (await getProducts({ category: product.category, limit: 11 })).filter((p) => p.id !== product.id).slice(0, 10);
  const off =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : 0;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <nav className="mb-6 text-xs text-muted">
          <Link href="/" className="hover:text-white">Home</Link> /{" "}
          <Link href={`/collections/${product.category}`} className="hover:text-white">
            {categoryLabel(product.category)}
          </Link>{" "}
          / <span className="text-white">{product.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-line shadow-2xl shadow-brand/10">
            <Cover title={product.title} url={product.cover_url} sizes="(max-width: 1024px) 100vw, 420px" priority />
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              {productConsoles(product).map((p) => (
                <span key={p} className="rounded-md border border-line px-2 py-1 text-xs font-bold tracking-wider">
                  {p}
                </span>
              ))}
              {off > 0 && <span className="rounded-md bg-hot px-2 py-1 text-xs font-bold">SAVE {off}%</span>}
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold uppercase leading-tight tracking-wide md:text-5xl">
              {product.title}
            </h1>

            <div className="mt-5 flex items-end gap-3">
              {product.secondary_price != null && <span className="pb-1.5 text-sm text-muted">from</span>}
              <span className="font-display text-4xl font-bold">{inr(fromPrice(product))}</span>
              {off > 0 && <span className="pb-1 text-lg text-muted line-through">{inr(product.compare_at_price!)}</span>}
            </div>

            <div className="mt-8 max-w-md">
              <AddToCart product={product} />
            </div>

            <ul className="mt-6 grid max-w-md grid-cols-2 gap-2 text-sm text-muted">
              <li>⚡ Fast delivery</li>
              <li>🎮 Primary or Secondary slot</li>
              <li>📲 Pay with any UPI app</li>
              <li>🧾 Purchase receipt included</li>
            </ul>

            {product.description && (
              <div className="mt-10 max-w-2xl">
                <h2 className="font-display text-lg font-bold uppercase tracking-wide">About this game</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        <section className="mt-16">
          <h2 className="mb-5 font-display text-2xl font-bold uppercase tracking-wide">Primary or Secondary?</h2>
          <SlotInfo />
        </section>

        <section className="mt-16">
          <h2 className="mb-5 font-display text-2xl font-bold uppercase tracking-wide">How you get this game</h2>
          <HowItWorks />
        </section>
      </div>

      <ProductRow title="You may also like" href={`/collections/${product.category}`} products={related} />
    </>
  );
}
