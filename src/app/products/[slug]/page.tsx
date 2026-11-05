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
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, productDescription, productJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Not found" };
  const title = `${p.title} (${productConsoles(p).join(" / ")}) — from ${inr(fromPrice(p))}`;
  const description = productDescription(p);
  const images = p.cover_url ? [{ url: p.cover_url, alt: p.title }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: "website", url: `/products/${p.slug}`, title, description, images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images },
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
      <JsonLd
        data={[
          productJsonLd(product),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: categoryLabel(product.category), path: `/collections/${product.category}` },
            { name: product.title, path: `/products/${product.slug}` },
          ]),
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <nav className="-mt-3 mb-1 break-words text-xs text-muted sm:mt-0 sm:mb-6">
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-white lg:min-h-0">Home</Link> /{" "}
          <Link href={`/collections/${product.category}`} className="inline-flex min-h-11 items-center hover:text-white lg:min-h-0">
            {categoryLabel(product.category)}
          </Link>{" "}
          / <span className="text-white">{product.title}</span>
        </nav>

        <div className="grid gap-6 sm:gap-10 md:grid-cols-[minmax(0,300px)_1fr] lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-3xl border border-line shadow-2xl shadow-brand/10 md:max-w-none">
            <Cover title={product.title} url={product.cover_url} sizes="(max-width: 768px) 280px, (max-width: 1024px) 300px, 420px" priority />
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
            <h1 className="mt-4 break-words font-display text-3xl font-bold uppercase leading-tight tracking-wide sm:text-4xl lg:text-5xl">
              {product.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1 sm:mt-5">
              {product.secondary_price != null && <span className="pb-1.5 text-sm text-muted">from</span>}
              <span className="font-display text-3xl font-bold sm:text-4xl">{inr(fromPrice(product))}</span>
              {off > 0 && <span className="pb-1 text-lg text-muted line-through">{inr(product.compare_at_price!)}</span>}
            </div>

            <div className="mt-6 max-w-md sm:mt-8">
              <AddToCart product={product} />
            </div>

            <ul className="mt-6 grid max-w-md grid-cols-1 gap-2 text-sm text-muted min-[400px]:grid-cols-2">
              <li>⚡ Fast delivery</li>
              <li>🎮 {product.rent_price != null ? "Buy or rent for 30 days" : "Primary or Secondary slot"}</li>
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

        <section className="mt-12 sm:mt-16">
          <h2 className="mb-5 font-display text-2xl font-bold uppercase tracking-wide">
            {product.rent_price != null ? "Primary, Secondary or Rent?" : "Primary or Secondary?"}
          </h2>
          <SlotInfo showRent={product.rent_price != null} />
        </section>

        <section className="mt-12 sm:mt-16">
          <h2 className="mb-5 font-display text-2xl font-bold uppercase tracking-wide">How you get this game</h2>
          <HowItWorks />
        </section>
      </div>

      <ProductRow title="You may also like" href={`/collections/${product.category}`} products={related} />
    </>
  );
}
