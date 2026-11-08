import type { Product } from "@/lib/types";
import { RENT_DAYS, STORE_NAME, fromPrice, inr, productConsoles, soldOut } from "@/lib/store";

/** Public address of the store, without a trailing slash. Search engines only ever see this one. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.psgaminghub.com").replace(/\/+$/, "");

/** Pages that are private or per-visitor: kept out of search results (robots.txt and noindex). */
export const PRIVATE_PATHS = ["/admin", "/api", "/auth", "/checkout", "/orders", "/login", "/reset-password", "/search"];

/** The metadata private pages share: not in results, but links on them still count. */
export const NO_INDEX = { index: false, follow: true } as const;

/** Search snippet for a game: the admin's description when it has one, otherwise a useful default. */
export function productDescription(p: Product) {
  const consoles = productConsoles(p).join(" & ");
  const rent = p.rent_price ? `, or rent it for ${RENT_DAYS} days at ${inr(p.rent_price)}` : "";
  const fallback = `Buy ${p.title} for ${consoles} in India from ${inr(fromPrice(p))}. Primary or Secondary slot${rent}. Pay with UPI, fast delivery on WhatsApp.`;
  const text = (p.description ?? "").replace(/\s+/g, " ").trim();
  // Short one-liners like "Digital PlayStation game, delivered to your console." are shared by most games;
  // Google treats identical snippets as duplicates, so those get the per-game text instead.
  if (text.length < 80) return fallback;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

/** schema.org Product: lets Google show the price and "In stock" under the result. */
export function productJsonLd(p: Product) {
  const prices = [p.price, p.secondary_price, p.rent_price].filter((n): n is number => typeof n === "number" && n > 0);
  const url = `${SITE_URL}/products/${p.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: productDescription(p),
    image: p.cover_url ? [p.cover_url] : undefined,
    url,
    sku: p.slug,
    category: "Video Games",
    brand: { "@type": "Brand", name: "PlayStation" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
      availability: soldOut(p) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url,
      seller: { "@type": "Organization", name: STORE_NAME },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}

/** Store name, logo and the site search box Google can show under the home result. */
export const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: STORE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: STORE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  },
];
