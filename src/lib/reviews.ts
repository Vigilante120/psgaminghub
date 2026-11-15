import { createClient } from "@/lib/supabase/server";
import { ratingSummary } from "@/lib/store";
import type { Review } from "@/lib/types";

/** Columns other visitors may see (no user id or admin note). */
const PUBLIC_COLUMNS = "id, product_id, platform, display_name, rating, body, image_paths, approved_at, created_at";

export type PublicReview = Pick<Review, "id" | "product_id" | "platform" | "display_name" | "rating" | "body" | "image_paths" | "approved_at" | "created_at">;

/** Approved reviews for one game, newest first, with the rating summary. */
export async function getProductReviews(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(PUBLIC_COLUMNS)
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(100);
  const reviews = (data ?? []) as PublicReview[];
  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }));
  return { reviews, breakdown, ...ratingSummary(reviews.map((r) => r.rating)) };
}

/** Latest approved reviews across the store, for the home page. */
export async function getLatestReviews(limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(`${PUBLIC_COLUMNS}, products(title, slug)`)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as (PublicReview & { products: { title: string; slug: string } | null })[];
}
