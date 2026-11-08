import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliveryLine, inr } from "@/lib/store";
import type { Order } from "@/lib/types";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Emails the store owner when a customer submits payment + delivery details.
 * Called by the order page right after submit_payment. Sends at most once per submission
 * (claim_order_notification), and only for the signed-in customer's own order.
 */
export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_ALERT_EMAIL;
  if (!apiKey || !to) {
    console.warn("notify-order: RESEND_API_KEY or ORDER_ALERT_EMAIL not set, skipping email");
    return NextResponse.json({ sent: false, reason: "not_configured" });
  }

  const { orderId } = (await request.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId) return NextResponse.json({ sent: false, reason: "bad_request" }, { status: 400 });

  const supabase = await createClient();
  const { data: claimed, error: claimErr } = await supabase.rpc("claim_order_notification", { p_order_id: orderId });
  if (claimErr) {
    console.error("notify-order: claim failed", claimErr.message);
    return NextResponse.json({ sent: false, reason: "bad_request" }, { status: 400 });
  }
  if (!claimed) return NextResponse.json({ sent: false, reason: "already_sent" });

  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", orderId).single();
  const order = data as Order;
  const lines = (order.order_items ?? []).map((i) => deliveryLine(i, order.delivery_name ?? "", order.delivery_phone ?? ""));
  const games = (order.order_items ?? []).map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ""}${i.title} (${i.platform} ${i.slot})`);
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/admin/orders/${order.id}`;

  const text = [
    `New payment to verify: ${order.order_number}`,
    "",
    ...lines,
    "",
    `Games: ${games.join(", ")}`,
    `Amount: ${inr(Number(order.total))}`,
    `UTR: ${order.utr}`,
    `Customer email: ${order.email}`,
    "",
    `Verify it here: ${adminUrl}`,
  ].join("\n");

  const html = `
    <h2>New payment to verify: ${esc(order.order_number)}</h2>
    <pre style="font-size:15px;background:#f4f4f5;padding:12px;border-radius:8px">${lines.map(esc).join("\n")}</pre>
    <p><b>Games:</b> ${games.map(esc).join(", ")}<br>
       <b>Amount:</b> ${esc(inr(Number(order.total)))}<br>
       <b>UTR:</b> ${esc(order.utr ?? "")}<br>
       <b>Customer email:</b> ${esc(order.email)}</p>
    <p><a href="${esc(adminUrl)}">Open the order and verify the payment →</a></p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.ORDER_EMAIL_FROM || "PS GAMING HUB <onboarding@resend.dev>",
      to: to.split(",").map((s) => s.trim()),
      subject: `💰 ${order.order_number} · ${lines[0] ?? "New order"} · ${inr(Number(order.total))}`,
      text,
      html,
    }),
  });

  if (!res.ok) {
    console.error("notify-order: Resend error", res.status, await res.text());
    return NextResponse.json({ sent: false, reason: "email_failed" }, { status: 502 });
  }
  return NextResponse.json({ sent: true });
}
