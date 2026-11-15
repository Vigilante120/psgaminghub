import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, isAdmin } = await getSessionInfo();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin) notFound();

  const { count: pendingReviews } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-center gap-1 border-b border-line pb-3 sm:gap-2 sm:pb-4">
        <span className="mr-2 font-display sm:mr-4 text-sm font-bold uppercase tracking-widest text-brand-2">Admin</span>
        <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-sm transition hover:bg-white/5 active:scale-95 lg:min-h-0">Orders</Link>
        <Link href="/admin/products" className="inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-sm transition hover:bg-white/5 active:scale-95 lg:min-h-0">Products</Link>
        <Link href="/admin/reviews" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition hover:bg-white/5 active:scale-95 lg:min-h-0">
          Reviews
          {!!pendingReviews && <span className="rounded-full bg-hot px-1.5 text-xs font-semibold text-white">{pendingReviews}</span>}
        </Link>
      </div>
      <div className="pt-5 sm:pt-6">{children}</div>
    </div>
  );
}
