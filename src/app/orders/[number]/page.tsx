import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import OrderTimeline from "@/components/OrderTimeline";
import PaymentPanel from "./PaymentPanel";
import { STATUS_META, deliveryLine, formatDate, inr, rentStatus, slotLabel, whatsappLink } from "@/lib/store";
import type { Order } from "@/lib/types";
import { NO_INDEX } from "@/lib/seo";

export const metadata = { title: "Order details", robots: NO_INDEX };

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
  const rentals = (order.order_items ?? []).filter((i) => i.slot === "Rent" && i.rent_ends_at);
  const shots = order.payment_screenshot_paths?.length ?? (order.payment_screenshot_path ? 1 : 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <Link href="/orders" className="-my-2 inline-flex min-h-11 items-center text-sm text-muted hover:text-white">← My orders</Link>

      <div className="mt-2 flex flex-wrap items-center gap-3 sm:mt-4 sm:gap-4">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">{order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-muted">{STATUS_META[order.status].help}</p>
      {order.status === "rejected" && order.admin_note && (
        <p className="mt-3 rounded-xl border border-hot/30 bg-hot/10 px-4 py-3 text-sm text-hot">Note from us: {order.admin_note}</p>
      )}

      <div className="mt-6 rounded-2xl border border-line bg-panel p-4 sm:mt-8 sm:p-6">
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
            <div className="rounded-2xl border border-sky-400/30 bg-sky-400/5 p-4 sm:p-6">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">Screenshot received ✅</h2>
              <p className="mt-2 text-sm text-muted">
                Sent on {formatDate(order.payment_submitted_at)}. <b className="text-white">Last step:</b> message us on WhatsApp so we can
                confirm your payment quickly. We'll reply at {order.delivery_phone ?? order.whatsapp}.
              </p>
              {wa && (
                <a
                  href={whatsappLink(
                    wa,
                    `Hi PS GAMING HUB, I've paid ${inr(total)} for order ${order.order_number}` +
                      (shots > 1 ? ` in ${shots} payments` : "") +
                      `. My screenshot${shots > 1 ? "s are" : " is"} on the website. Please confirm my payment.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn mt-4 w-full bg-[#25d366] py-3.5 text-black hover:bg-[#2ee672] sm:w-auto"
                >
                  Confirm payment on WhatsApp
                </a>
              )}
            </div>
          )}

          {order.status === "processing" && (
            <div className="rounded-2xl border border-violet-400/30 bg-violet-400/5 p-4 sm:p-6">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">Payment verified 🎉</h2>
              <p className="mt-2 text-sm text-muted">
                Keep WhatsApp handy. We'll message you at {order.delivery_phone ?? order.whatsapp} to complete delivery.
              </p>
            </div>
          )}

          {order.status === "delivered" && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 sm:p-6">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">Delivered — enjoy your game!</h2>
              <p className="mt-2 text-sm text-muted">Delivered on {formatDate(order.delivered_at)}.</p>
              {rentals.length > 0 && (
                <ul className="mt-3 space-y-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                  {rentals.map((i) => (
                    <li key={i.id}>
                      ⏳ <b>{i.title}</b> ({i.platform}): {rentStatus(i)}
                    </li>
                  ))}
                  <li className="text-xs text-amber-200/80">We'll email you when the rent is over, with the steps to remove the ID.</li>
                </ul>
              )}
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

        <aside className="h-fit space-y-5 rounded-2xl border border-line bg-panel p-4 sm:p-6">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">Items</h2>
            <ul className="mt-3 space-y-2">
              {order.order_items?.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 text-sm">
                  <span>
                    {i.quantity > 1 && <b className="mr-1">{i.quantity}×</b>}
                    {i.title} <span className="text-muted">· {i.platform} {slotLabel(i.slot)}</span>
                    {i.slot === "Rent" && <span className="block text-xs text-amber-200">{rentStatus(i)}</span>}
                  </span>
                  <span className="shrink-0">{inr(Number(i.unit_price) * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>Discount</span>
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
