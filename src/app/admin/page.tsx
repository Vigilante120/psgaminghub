import Link from "next/link";
import { requireAdminPage } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import { STATUS_META, formatDate, inr } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/types";
import { BulkCancelProvider, SelectBox } from "./BulkCancel";

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
  // Unpaid orders can be ticked and cancelled together.
  const bulk = tab === "awaiting_payment";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">Orders</h1>
        <form className="w-full sm:max-w-xs">
          <input type="hidden" name="status" value={tab} />
          <input name="q" defaultValue={sp.q} placeholder="Search order #, name, phone, email…" className="input h-11 py-0 sm:text-sm lg:h-10" />
        </form>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:mt-5 sm:flex-wrap sm:px-0">
        {TABS.map((t) => {
          const n = t.key === "all" ? all?.length ?? 0 : counts[t.key] ?? 0;
          const urgent = (t.key === "payment_submitted" || t.key === "processing") && n > 0;
          return (
            <Link
              key={t.key}
              href={`/admin?status=${t.key}`}
              className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition active:scale-95 lg:min-h-0 ${
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

      <List bulk={bulk} rows={orders.map((o) => ({ id: o.id, createdAt: o.created_at }))}>
        {/* Phones: one card per order */}
        <ul className="stagger mt-4 space-y-3 md:hidden">
          {orders.length === 0 && (
            <li className="rounded-2xl border border-line bg-panel px-4 py-12 text-center text-muted">Nothing here. 🎮</li>
          )}
          {orders.map((o) => (
            <li key={o.id} className="flex items-center gap-1">
              <SelectBox id={o.id} label={o.order_number} />
              <Link href={`/admin/orders/${o.id}`} className="block min-w-0 flex-1 rounded-2xl border border-line bg-panel p-4 transition active:scale-[0.99] active:bg-panel-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-brand-2">{o.order_number}</div>
                    <div className="text-xs text-muted">{formatDate(o.created_at)}</div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm">{o.order_items?.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ""}${i.title} (${i.platform} ${i.slot})`).join(", ")}</p>
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                  <div className="min-w-0 text-sm">
                    <div className="truncate">{o.delivery_name ?? o.customer_name}</div>
                    <div className="truncate text-xs text-muted">{o.delivery_phone ?? o.whatsapp}</div>
                    {o.payment_submitted_at && <div className="mt-1 truncate text-xs text-muted">{proofText(o)}</div>}
                  </div>
                  <span className="shrink-0 font-display text-lg font-bold">{inr(Number(o.total))}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Tablets and up: table */}
        <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-line md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-panel-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                {bulk && <th className="w-12 pl-3"><span className="sr-only">Select</span></th>}
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={bulk ? 7 : 6} className="px-4 py-12 text-center text-muted">Nothing here. 🎮</td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="bg-panel hover:bg-panel-2">
                  {bulk && (
                    <td className="pl-3">
                      <SelectBox id={o.id} label={o.order_number} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="inline-flex min-h-11 items-center font-display font-bold text-brand-2 hover:underline lg:min-h-0">
                      {o.order_number}
                    </Link>
                    <div className="text-xs text-muted">{formatDate(o.created_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{o.delivery_name ?? o.customer_name}</div>
                    <div className="text-xs text-muted">{o.delivery_phone ?? o.whatsapp}</div>
                  </td>
                  <td className="max-w-[240px] px-4 py-3">
                    <div className="truncate">{o.order_items?.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ""}${i.title} (${i.platform} ${i.slot})`).join(", ")}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{o.payment_submitted_at ? proofText(o) : "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(Number(o.total))}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </List>
    </div>
  );
}

/** Wraps the list in the bulk-cancel controls on the "Awaiting payment" tab only. */
function List({ bulk, rows, children }: { bulk: boolean; rows: { id: string; createdAt: string }[]; children: React.ReactNode }) {
  return bulk ? <BulkCancelProvider rows={rows}>{children}</BulkCancelProvider> : <>{children}</>;
}

/** "UTR 4285…" for older orders, otherwise how many screenshots were sent. */
function proofText(o: Order) {
  if (o.utr) return `UTR ${o.utr}`;
  const n = o.payment_screenshot_paths?.length ?? (o.payment_screenshot_path ? 1 : 0);
  return `${n} screenshot${n === 1 ? "" : "s"}`;
}
