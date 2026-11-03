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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide">My orders</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn btn-ghost text-xs">Sign out</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-line bg-panel p-10 text-center">
          <p className="text-muted">No orders yet.</p>
          <Link href="/collections/all" className="btn btn-primary mt-5">Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.order_number}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel p-5 transition hover:border-brand/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
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
