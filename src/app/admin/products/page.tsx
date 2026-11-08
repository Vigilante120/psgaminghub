import Link from "next/link";
import { requireAdminPage } from "@/lib/supabase/server";
import Cover from "@/components/Cover";
import { LOW_STOCK, categoryLabel, inr } from "@/lib/store";
import type { Product } from "@/lib/types";

export default async function AdminProducts() {
  const supabase = await requireAdminPage();
  const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  const products = (data ?? []) as Product[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">Products ({products.length})</h1>
        <Link href="/admin/products/new" className="btn btn-primary">+ Add product</Link>
      </div>

      {/* Phones: one row per product */}
      <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line md:hidden">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 bg-panel p-3 active:bg-panel-2">
              <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded">
                <Cover title={p.title} url={p.cover_url} sizes="48px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.title}</span>
                <span className="block text-xs text-muted">{p.platforms.join(", ")}</span>
                <span className="mt-1 block text-xs">
                  {p.is_active ? <span className="text-emerald-300">Live</span> : <span className="text-muted">Hidden</span>}
                  {p.is_featured && <span className="ml-2 text-amber-300">★ Featured</span>}
                </span>
              </span>
              <span className="shrink-0 text-right text-sm">
                <span className="block font-semibold">{inr(Number(p.price))}</span>
                <span className="block text-xs text-muted">{p.secondary_price != null ? inr(Number(p.secondary_price)) : "—"}</span>
                {p.rent_price != null && <span className="block text-xs text-muted">Rent {inr(Number(p.rent_price))}</span>}
                <span className="block text-xs">Stock {stockText(p.primary_stock)} / {stockText(p.secondary_stock)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablets and up: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-line md:block">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-panel-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Platforms</th>
              <th className="px-4 py-3 text-right">Primary / Secondary / Rent</th>
              <th className="px-4 py-3 text-right">Stock P / S</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id} className="bg-panel hover:bg-panel-2">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded">
                      <Cover title={p.title} url={p.cover_url} sizes="36px" />
                    </span>
                    <span className="font-semibold hover:text-brand-2">{p.title}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{categoryLabel(p.category)}</td>
                <td className="px-4 py-3 text-muted">{p.platforms.join(", ")}</td>
                <td className="px-4 py-3 text-right">
                  <div className="font-semibold">
                    {inr(Number(p.price))}
                    <span className="text-muted"> / {p.secondary_price != null ? inr(Number(p.secondary_price)) : "—"}</span>
                    <span className="text-muted"> / {p.rent_price != null ? inr(Number(p.rent_price)) : "—"}</span>
                  </div>
                  {p.compare_at_price && <div className="text-xs text-muted line-through">{inr(Number(p.compare_at_price))}</div>}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {stockText(p.primary_stock)} / {stockText(p.secondary_stock)}
                </td>
                <td className="px-4 py-3 text-xs">
                  {p.is_active ? <span className="text-emerald-300">Live</span> : <span className="text-muted">Hidden</span>}
                  {p.is_featured && <span className="ml-2 text-amber-300">★ Featured</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** "∞" when not tracked, red at 0, amber when low. */
function stockText(n: number | null) {
  if (n == null) return <span className="text-muted">∞</span>;
  return <span className={n === 0 ? "text-hot" : n <= LOW_STOCK ? "text-amber-300" : ""}>{n}</span>;
}
