import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import OrderTimeline from "@/components/OrderTimeline";
import PaymentPanel from "./PaymentPanel";
import { STATUS_META, deliveryLine, formatDate, inr, whatsappLink } from "@/lib/store";
import type { Order } from "@/lib/types";

export const metadata = { title: "Order details" };

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const { supabase, user } = await getSessionInfo();
  if (!user) redirect(`/login?next=/orders/${number}`);

  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("order_number", number).maybeSingle();
  if (!data) notFound();
  const order = data as Order;
  const total = Number(order.total);

  let receiptUrl: string | null = null;
  if (order.status === "delivered" && order.receipt_path) {
    const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(order.receipt_path, 60 * 30);
    receiptUrl = signed?.signedUrl ?? null;
  }

  const wa = process.env.NEXT_PUBLIC_WHATSAPP;
  const canPay = order.status === "awaiting_payment" || order.status === "rejected";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/orders" className="text-sm text-muted hover:text-white">← My orders</Link>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">{order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-muted">{STATUS_META[order.status].help}</p>
      {order.status === "rejected" && order.admin_note && (
        <p className="mt-3 rounded-xl border border-hot/30 bg-hot/10 px-4 py-3 text-sm text-hot">Note from us: {order.admin_note}</p>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
        <OrderTimeline order={order} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {canPay && (
            <PaymentPanel
              orderId={order.id}
              orderNumber={order.order_number}
              amount={total}
              userId={user.id}
              resubmit={order.status === "rejected"}
              items={(order.order_items ?? []).map((i) => ({ title: i.title, platform: i.platform, slot: i.slot }))}
              defaultName={order.delivery_name ?? order.customer_name}
              defaultPhone={order.delivery_phone ?? order.whatsapp}
            />
          )}

          {order.status === "payment_submitted" && (
            <div className="rounded-2xl border border-sky-400/30 bg-sky-400/5 p-6">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">Payment received for checking</h2>
              <p className="mt-2 text-sm text-muted">
                UTR <span className="font-mono text-white">{order.utr}</span> was submitted on {formatDate(order.payment_submitted_at)}. We'll
                verify it and message you on WhatsApp at {order.delivery_phone ?? order.whatsapp}.
              </p>
            </div>
          )}

          {order.status === "processing" && (
            <div className="rounded-2xl border border-violet-400/30 bg-violet-400/5 p-6">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">Payment verified 🎉</h2>
              <p className="mt-2 text-sm text-muted">
                Keep WhatsApp handy. We'll message you at {order.delivery_phone ?? order.whatsapp} to complete delivery.
              </p>
            </div>
          )}

          {order.status === "delivered" && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">Delivered — enjoy your game!</h2>
              <p className="mt-2 text-sm text-muted">Delivered on {formatDate(order.delivered_at)}.</p>
              {receiptUrl ? (
                <a href={receiptUrl} target="_blank" rel="noreferrer" className="btn btn-primary mt-4">
                  Download purchase receipt
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted">Your receipt will appear here shortly.</p>
              )}
            </div>
          )}

          {wa && (
            <a
              href={whatsappLink(wa, `Hi, I need help with order ${order.order_number}`)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost w-full"
            >
              Need help? Chat on WhatsApp
            </a>
          )}
        </div>

        <aside className="h-fit space-y-5 rounded-2xl border border-line bg-panel p-6">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">Items</h2>
            <ul className="mt-3 space-y-2">
              {order.order_items?.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 text-sm">
                  <span>
                    {i.title} <span className="text-muted">· {i.platform} {i.slot}</span>
                  </span>
                  <span className="shrink-0">{inr(Number(i.unit_price) * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>Bundle discount</span>
                  <span>−{inr(Number(order.discount))}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-lg font-bold">
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-1 border-t border-line pt-4 text-sm">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">Delivery</h2>
            {order.delivery_name ? (
              <ul className="space-y-1 font-mono text-xs">
                {order.order_items?.map((i) => (
                  <li key={i.id}>{deliveryLine(i, order.delivery_name!, order.delivery_phone ?? "")}</li>
                ))}
              </ul>
            ) : (
              <>
                <p>{order.customer_name}</p>
                <p className="text-muted">WhatsApp: {order.whatsapp}</p>
                <p className="text-xs text-muted">You'll confirm your delivery details after paying.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
