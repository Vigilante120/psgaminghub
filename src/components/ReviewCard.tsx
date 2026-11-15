import Link from "next/link";
import Stars from "@/components/Stars";
import { formatDate, reviewImageUrl } from "@/lib/store";
import type { PublicReview } from "@/lib/reviews";

/** One approved customer review. Pass `product` to show which game it is about. */
export default function ReviewCard({ review, product }: { review: PublicReview; product?: { title: string; slug: string } | null }) {
  const day = formatDate(review.approved_at ?? review.created_at).split(",")[0];
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20 font-display font-bold text-brand-2" aria-hidden="true">
            {review.display_name.trim()[0]?.toUpperCase() ?? "?"}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold">{review.display_name}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="font-semibold text-emerald-300">✓ Verified buyer</span>
              {review.platform && <span>· {review.platform}</span>}
            </div>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted">{day}</span>
      </div>

      <Stars value={review.rating} className="mt-3" />
      {product && (
        <Link href={`/products/${product.slug}`} className="mt-2 line-clamp-1 text-sm font-semibold text-brand-2 hover:underline">
          {product.title}
        </Link>
      )}
      {review.body && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{review.body}</p>}

      {review.image_paths.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.image_paths.map((p, i) => (
            <a key={p} href={reviewImageUrl(p)} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-line transition hover:border-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={reviewImageUrl(p)} alt={`Screenshot ${i + 1} from ${review.display_name}`} loading="lazy" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
