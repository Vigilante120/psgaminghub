import Link from "next/link";
import { requireAdminPage } from "@/lib/supabase/server";
import Stars from "@/components/Stars";
import { formatDate, reviewImageUrl } from "@/lib/store";
import type { Review, ReviewStatus } from "@/lib/types";
import { approveReview, rejectReview } from "../actions";

const TABS: { key: ReviewStatus; label: string }[] = [
  { key: "pending", label: "To approve" },
  { key: "approved", label: "Live" },
  { key: "rejected", label: "Rejected" },
];

type Row = Review & {
  products: { title: string; slug: string } | null;
  orders: { id: string; order_number: string; customer_name: string; email: string } | null;
};

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.status)?.key ?? "pending";
  const supabase = await requireAdminPage();

  const { data: all } = await supabase.from("reviews").select("status");
  const counts = (all ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const { data } = await supabase
    .from("reviews")
    .select("*, products(title, slug), orders(id, order_number, customer_name, email)")
    .eq("status", tab)
    .order("updated_at", { ascending: tab === "pending" }) // queue oldest-first, history newest-first
    .limit(200);
  const reviews = (data ?? []) as Row[];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">Reviews</h1>
      <p className="mt-1 text-sm text-muted">Only reviews you approve show on the website.</p>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:mt-5 sm:flex-wrap sm:px-0">
        {TABS.map((t) => {
          const n = counts[t.key] ?? 0;
          return (
            <Link
              key={t.key}
              href={`/admin/reviews?status=${t.key}`}
              className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition active:scale-95 lg:min-h-0 ${
                tab === t.key ? "border-brand bg-brand/15" : "border-line text-muted hover:text-white"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-xs ${t.key === "pending" && n > 0 ? "bg-hot text-white" : "bg-white/10"}`}>{n}</span>
            </Link>
          );
        })}
      </div>

      <ul className="mt-5 space-y-3">
        {reviews.length === 0 && (
          <li className="rounded-2xl border border-line bg-panel px-4 py-12 text-center text-muted">Nothing here. ⭐</li>
        )}
        {reviews.map((r) => (
          <li key={r.id} className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {r.products ? (
                  <Link href={`/products/${r.products.slug}#reviews`} className="font-display font-bold text-brand-2 hover:underline">
                    {r.products.title}
                  </Link>
                ) : (
                  <span className="font-display font-bold">Deleted game</span>
                )}
                <div className="mt-0.5 text-xs text-muted">
                  Shown as <b className="text-white">{r.display_name}</b>
                  {r.platform && <> · {r.platform}</>}
                  {r.orders && (
                    <>
                      {" "}· {r.orders.customer_name} ·{" "}
                      <Link href={`/admin/orders/${r.orders.id}`} className="hover:underline">{r.orders.order_number}</Link>
                    </>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted">{formatDate(r.updated_at)}</span>
            </div>

            <Stars value={r.rating} size={18} className="mt-3" />
            {r.body ? (
              <p className="mt-2 whitespace-pre-line text-sm">{r.body}</p>
            ) : (
              <p className="mt-2 text-sm italic text-muted">Stars only, no written review.</p>
            )}

            {r.image_paths.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.image_paths.map((p) => (
                  <a key={p} href={reviewImageUrl(p)} target="_blank" rel="noreferrer" className="block h-28 w-28 overflow-hidden rounded-lg border border-line hover:border-brand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={reviewImageUrl(p)} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            {r.status === "rejected" && r.admin_note && <p className="mt-2 text-xs text-hot">Your note: {r.admin_note}</p>}

            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
              {r.status !== "approved" && (
                <form action={approveReview}>
                  <input type="hidden" name="reviewId" value={r.id} />
                  <button className="btn min-h-11 bg-emerald-500 px-5 py-2 text-sm text-black hover:bg-emerald-400 lg:min-h-0">Approve</button>
                </form>
              )}
              {r.status !== "rejected" && (
                <form action={rejectReview} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="reviewId" value={r.id} />
                  <input name="note" placeholder="Note for the customer (optional)" maxLength={300} className="input h-11 min-w-0 flex-1 py-0 text-sm lg:h-10" />
                  <button className="btn btn-ghost min-h-11 px-5 py-2 text-sm text-hot lg:min-h-0">
                    {r.status === "approved" ? "Take down" : "Reject"}
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
