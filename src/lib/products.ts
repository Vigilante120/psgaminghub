import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export type ProductQuery = {
  category?: string;
  platform?: string | null;
  sort?: string | null;
  sale?: boolean;
  search?: string | null;
  featured?: boolean;
  limit?: number;
};

function normalize(rows: Record<string, unknown>[] | null): Product[] {
  return (rows ?? []).map((r) => ({
    ...(r as unknown as Product),
    price: Number(r.price),
    secondary_price: r.secondary_price == null ? null : Number(r.secondary_price),
    rent_price: r.rent_price == null ? null : Number(r.rent_price),
    compare_at_price: r.compare_at_price == null ? null : Number(r.compare_at_price),
    primary_stock: r.primary_stock == null ? null : Number(r.primary_stock),
    secondary_stock: r.secondary_stock == null ? null : Number(r.secondary_stock),
  }));
}

export async function getProducts(q: ProductQuery = {}): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select("*").eq("is_active", true);

  if (q.category && q.category !== "all") query = query.eq("category", q.category);
  if (q.platform) query = query.contains("platforms", [q.platform]);
  if (q.featured) query = query.eq("is_featured", true);
  if (q.search) query = query.ilike("title", `%${q.search.replace(/[%_]/g, "")}%`);
  if (q.sale) query = query.not("compare_at_price", "is", null);

  switch (q.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "az":
      query = query.order("title", { ascending: true });
      break;
    case "za":
      query = query.order("title", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  }

  if (q.limit) query = query.limit(q.limit);

  const { data, error } = await query;
  if (error) {
    console.error("getProducts", error.message);
    return [];
  }
  let products = normalize(data);
  if (q.sale) products = products.filter((p) => p.compare_at_price && p.compare_at_price > p.price);
  return products;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  return data ? normalize([data])[0] : null;
}
