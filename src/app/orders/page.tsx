import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, inr } from "@/lib/store";
import type { Order } from "@/lib/types";

export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  const { supabase, user } = await getSessionInfo();
  if (!user) redirect("/login?next=/orders");

  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as Order[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">My orders</h1>
          <div className="mt-3 inline-flex max-w-full items-center gap-3 rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/15 to-violet-500/10 py-2 pl-2 pr-4 shadow-[0_0_24px_-8px_rgb(47_107_255/0.6)]">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 via-brand to-violet-500 font-display text-base font-bold uppercase text-white">
              {user.email?.[0] ?? "?"}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink bg-emerald-400" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-2">Signed in as</span>
              <span className="block break-all text-sm font-semibold text-white sm:text-base">{user.email}</span>
            </span>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn btn-ghost text-xs">Sign out</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-line bg-panel p-6 text-center sm:p-10">
          <p className="text-muted">No orders yet.</p>
          <Link href="/collections/all" className="btn btn-primary mt-5">Start shopping</Link>
        </div>
      ) : (
        <ul className="stagger mt-8 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.order_number}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-panel p-4 transition hover:-translate-y-0.5 hover:border-brand/50 active:scale-[0.99] sm:p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display text-lg font-bold">{o.order_number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">
                    {o.order_items?.map((i) => `${i.title} (${i.platform})`).join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatDate(o.created_at)}</p>
                </div>
                <span className="font-display text-xl font-bold">{inr(Number(o.total))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
