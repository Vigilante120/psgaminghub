import Link from "next/link";
import { requireAdminPage } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import { STATUS_META, formatDate, inr } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/types";

const TABS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "payment_submitted", label: "To verify" },
  { key: "processing", label: "To deliver" },
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "delivered", label: "Delivered" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.status)?.key ?? "payment_submitted") as OrderStatus | "all";
  const supabase = await requireAdminPage();

  // Counts for the tabs
  const { data: all } = await supabase.from("orders").select("status");
  const counts = (all ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  let query = supabase.from("orders").select("*, order_items(*)");
  if (tab !== "all") query = query.eq("status", tab);
  if (sp.q) {
    const q = sp.q.replace(/[,()%]/g, "").trim();
    query = query.or(`order_number.ilike.%${q}%,utr.ilike.%${q}%,delivery_name.ilike.%${q}%,delivery_phone.ilike.%${q}%,whatsapp.ilike.%${q}%,email.ilike.%${q}%`);
  }
  // Work queues are oldest-first; history is newest-first.
  const oldestFirst = tab === "payment_submitted" || tab === "processing";
  const { data } = await query.order("created_at", { ascending: oldestFirst }).limit(200);
  const orders = (data ?? []) as Order[];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Orders</h1>
        <form className="w-full max-w-xs">
          <input type="hidden" name="status" value={tab} />
          <input name="q" defaultValue={sp.q} placeholder="Search order #, UTR, name, phone…" className="input h-10 py-0 text-sm" />
        </form>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = t.key === "all" ? all?.length ?? 0 : counts[t.key] ?? 0;
          const urgent = (t.key === "payment_submitted" || t.key === "processing") && n > 0;
          return (
            <Link
              key={t.key}
              href={`/admin?status=${t.key}`}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                tab === t.key ? "border-brand bg-brand/15" : "border-line text-muted hover:text-white"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-xs ${urgent ? "bg-hot text-white" : "bg-white/10"}`}>{n}</span>
            </Link>
          );
        })}
      </div>

      {tab !== "all" && <p className="mt-4 text-sm text-muted">{STATUS_META[tab].label}: {orders.length} orders</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-panel-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">UTR</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">Nothing here. 🎮</td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="bg-panel hover:bg-panel-2">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-display font-bold text-brand-2 hover:underline">
                    {o.order_number}
                  </Link>
                  <div className="text-xs text-muted">{formatDate(o.created_at)}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{o.delivery_name ?? o.customer_name}</div>
                  <div className="text-xs text-muted">{o.delivery_phone ?? o.whatsapp}</div>
                </td>
                <td className="max-w-[240px] px-4 py-3">
                  <div className="truncate">{o.order_items?.map((i) => `${i.title} (${i.platform} ${i.slot})`).join(", ")}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{o.utr ?? "—"}</td>
                <td className="px-4 py-3 text-right font-semibold">{inr(Number(o.total))}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
