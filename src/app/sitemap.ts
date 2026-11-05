import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { CATEGORIES } from "@/lib/store";
import { SITE_URL } from "@/lib/seo";

// Every public page Google should know about: home, collections and each active game.
// Built on each request (the product query reads cookies), so a new game shows up without a deploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...CATEGORIES.map((c) => ({
      url: `${SITE_URL}/collections/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: new Date(p.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.cover_url ? [p.cover_url] : undefined,
    })),
  ];
}
