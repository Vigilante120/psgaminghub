import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import OrderTimeline from "@/components/OrderTimeline";
import { STATUS_META, deliveryLine, formatDate, inr, whatsappLink, rentStatus, slotLabel } from "@/lib/store";
import CopyButton from "@/components/CopyButton";
import type { Order, OrderStatus } from "@/lib/types";
import { markDelivered, rejectPayment, setStatus, verifyPayment } from "../../actions";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await requireAdminPage();
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const order = data as Order;

  const [shot, receipt] = await Promise.all([
    order.payment_screenshot_path
      ? supabase.storage.from("payment-proofs").createSignedUrl(order.payment_screenshot_path, 60 * 30)
      : Promise.resolve(null),
    order.receipt_path ? supabase.storage.from("receipts").createSignedUrl(order.receipt_path, 60 * 30) : Promise.resolve(null),
  ]);
  const shotUrl = shot?.data?.signedUrl ?? null;
  const receiptUrl = receipt?.data?.signedUrl ?? null;

  const name = order.delivery_name ?? order.customer_name;
  const phone = order.delivery_phone ?? order.whatsapp;
  const detailLines = order.delivery_name
    ? (order.order_items ?? []).map((i) => deliveryLine(i, order.delivery_name!, order.delivery_phone ?? "")).join("\n")
    : "";
  const items = order.order_items?.map((i) => `${i.title} (${i.platform} ${slotLabel(i.slot)})`).join(", ") ?? "";
  const rentNote = (order.order_items ?? [])
    .filter((i) => i.slot === "Rent" && i.rent_ends_at)
    .map((i) => ` Your rent of ${i.title} ends on ${formatDate(i.rent_ends_at)}.`)
    .join("");
  const waMessages = {
    verified: `Hi ${name}, your payment for order ${order.order_number} (${inr(Number(order.total))}) is verified ✅. Are you available now to complete delivery of ${items}?`,
    delivered: `Hi ${name}, order ${order.order_number} is delivered 🎮. Your receipt is on your order page. Enjoy!${rentNote}`,
    rejected: `Hi ${name}, we couldn't verify the payment for order ${order.order_number}. Could you share the correct UTR / screenshot?`,
  };

  return (
    <div>
      <Link href="/admin" className="-my-2 inline-flex min-h-11 items-center text-sm text-muted hover:text-white">← All orders</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3 sm:mt-3 sm:gap-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">{order.order_number}</h1>
        <StatusBadge status={order.status} />
        <span className="ml-auto font-display text-xl font-bold sm:text-2xl">{inr(Number(order.total))}</span>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <OrderTimeline order={order} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Payment proof */}
          <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">1 · Payment proof</h2>
            {order.utr ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="label">UTR / transaction ID</p>
                    <p className="break-all font-mono text-lg tracking-wider">{order.utr}</p>
                    <p className="mt-3 label">Amount to match</p>
                    <p className="font-display text-xl font-bold">{inr(Number(order.total))}</p>
                    <p className="mt-3 text-xs text-muted">Submitted {formatDate(order.payment_submitted_at)}</p>
                    <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                      Always check this UTR and amount in your bank / UPI app. Screenshots can be edited.
                    </p>
                  </div>
                  {shotUrl && (
                    <a href={shotUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shotUrl} alt="Payment screenshot" className="max-h-96 w-full object-contain bg-black" />
                    </a>
                  )}
                </div>
                {order.status === "payment_submitted" && (
                  <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5">
                    <form action={verifyPayment} className="w-full sm:w-auto">
                      <input type="hidden" name="orderId" value={order.id} />
                      <button className="btn btn-primary w-full sm:w-auto">✓ Payment received — verify</button>
                    </form>
                    <form action={rejectPayment} className="flex w-full gap-2 sm:w-auto sm:flex-1">
                      <input type="hidden" name="orderId" value={order.id} />
                      <input name="note" placeholder="Reason (shown to customer)" className="input h-11 min-w-0 py-0 sm:text-sm" />
                      <button className="btn btn-ghost shrink-0 text-hot">Reject</button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">The customer hasn't submitted payment yet.</p>
            )}
          </section>

          {/* Fulfilment */}
          <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">2 · Deliver</h2>
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              <a href={whatsappLink(phone, waMessages.verified)} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
                WhatsApp: ready for QR step
              </a>
              <a href={whatsappLink(phone, waMessages.delivered)} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
                WhatsApp: delivered
              </a>
              <a href={whatsappLink(phone, waMessages.rejected)} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
                WhatsApp: payment issue
              </a>
            </div>

            {(order.status === "processing" || order.status === "delivered") && (
              <form action={markDelivered} className="mt-5 space-y-3 border-t border-line pt-5">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="label" htmlFor="receipt">
                  Purchase receipt (screenshot or PDF){order.receipt_path ? " — upload again to replace" : ""}
                </label>
                <input
                  id="receipt"
                  name="receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  required={!order.receipt_path}
                  className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/20 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-brand-2"
                />
                <button className="btn btn-primary w-full sm:w-auto">{order.status === "delivered" ? "Update receipt" : "Upload receipt & mark delivered"}</button>
              </form>
            )}
            {receiptUrl && (
              <a href={receiptUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm text-brand-2 hover:underline sm:mt-4 lg:min-h-0">
                View current receipt ↗
              </a>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-5 rounded-2xl border border-line bg-panel p-4 sm:p-6 text-sm">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">Customer</h2>
            <p className="mt-2 font-semibold">{order.customer_name}</p>
            <p className="break-all text-muted">{order.email}</p>
            <a href={whatsappLink(order.whatsapp, `Hi ${order.customer_name}, about order ${order.order_number}`)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[#25d366] hover:underline lg:min-h-0">
              {order.whatsapp} ↗
            </a>
          </div>
          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">Customer details</h2>
              {detailLines && <CopyButton text={detailLines} />}
            </div>
            {detailLines ? (
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white/5 p-2 font-mono text-xs">{detailLines}</pre>
            ) : (
              <p className="mt-2 text-muted">Sent with the payment proof.</p>
            )}
            {order.psn_id && <p className="mt-2 text-muted">PSN: {order.psn_id}</p>}
            {order.notes && <p className="mt-2 rounded-lg bg-white/5 p-2 text-muted">“{order.notes}”</p>}
          </div>
          <div className="border-t border-line pt-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">Items</h2>
            <ul className="mt-2 space-y-1.5">
              {order.order_items?.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span>
                    {i.title} · {i.platform} {slotLabel(i.slot)}
                    {i.slot === "Rent" && (
                      <span className="block text-xs text-amber-200">
                        {rentStatus(i)}
                        {i.rent_notified_at && ` · expiry email sent ${formatDate(i.rent_notified_at)}`}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0">{inr(Number(i.unit_price))}</span>
                </li>
              ))}
            </ul>
            {Number(order.discount) > 0 && <p className="mt-2 text-emerald-300">Discount −{inr(Number(order.discount))}</p>}
          </div>
          <form action={setStatus} className="space-y-2 border-t border-line pt-4">
            <label className="label" htmlFor="status">Manually set status</label>
            <input type="hidden" name="orderId" value={order.id} />
            <select id="status" name="status" defaultValue={order.status} className="input sm:text-sm">
              {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
            <button className="btn btn-ghost w-full text-xs">Save status</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
