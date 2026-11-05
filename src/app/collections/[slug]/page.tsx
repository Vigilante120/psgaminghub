import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProducts } from "@/lib/products";
import { CATEGORIES } from "@/lib/store";
import ProductCard from "@/components/ProductCard";
import CollectionControls from "@/components/CollectionControls";
import CollectionHero from "@/components/CollectionHero";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; platform?: string; sale?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return { title: "Collection" };
  const title = `${cat.label}: Buy PS5 & PS4 Games in India`;
  const description = `${cat.blurb}. Best prices in India, pay with UPI, fast delivery on WhatsApp.`;
  return {
    title,
    description,
    alternates: { canonical: `/collections/${cat.slug}` },
    openGraph: { url: `/collections/${cat.slug}`, title, description },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();

  const products = await getProducts({
    category: slug,
    platform: sp.platform ?? null,
    sort: sp.sort ?? null,
    sale: sp.sale === "1",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <CollectionHero label={cat.label} blurb={cat.blurb} count={products.length} />

      <div className="mt-6 sm:mt-8">
        <Suspense>
          <CollectionControls total={products.length} />
        </Suspense>
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center text-muted">No products match these filters.</div>
      ) : (
        <div className="stagger mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
