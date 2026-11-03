import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getSessionInfo();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <span className="mr-4 font-display text-sm font-bold uppercase tracking-widest text-brand-2">Admin</span>
        <Link href="/admin" className="rounded-lg px-3 py-1.5 text-sm hover:bg-white/5">Orders</Link>
        <Link href="/admin/products" className="rounded-lg px-3 py-1.5 text-sm hover:bg-white/5">Products</Link>
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
