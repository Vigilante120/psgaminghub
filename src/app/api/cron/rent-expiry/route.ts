import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORE_NAME, formatDate } from "@/lib/store";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const DELETE_VIDEOS = {
  PS4: "https://www.youtube.com/watch?v=qnKXAFEoBSo",
  PS5: "https://www.youtube.com/watch?v=LzrBFB9G0jE",
};

type DueItem = {
  id: string;
  title: string;
  platform: string;
  rent_ends_at: string;
  purchase: { order_number: string; email: string; customer_name: string; delivery_name: string | null };
};

/**
 * Runs daily (vercel.json crons). Emails each customer whose 30-day Rent has ended, with the
 * steps to delete the ID from their console, and BCCs the store owner so they can take the slot back.
 * Each item is claimed (rent_notified_at) before sending, so nobody gets the email twice.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const supabase = createAdminClient();
  if (!apiKey || !supabase) {
    console.error("rent-expiry: RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("order_items")
    .select("id, title, platform, rent_ends_at, purchase:orders!inner(order_number, email, customer_name, delivery_name, status)")
    .eq("slot", "Rent")
    .is("rent_notified_at", null)
    .lte("rent_ends_at", new Date().toISOString())
    .eq("purchase.status", "delivered")
    .limit(50);
  if (error) {
    // Redact: fetch errors can echo request headers, which carry the service key.
    console.error("rent-expiry: query failed", error.message.replace(/sb_secret_\S+|eyJ[\w.-]+/g, "[redacted]"));
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const alertTo = (process.env.ORDER_ALERT_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  let sent = 0;
  const failed: string[] = [];

  for (const item of (data ?? []) as unknown as DueItem[]) {
    // Claim first: if another run already took this item, skip it.
    const { data: claimed } = await supabase
      .from("order_items")
      .update({ rent_notified_at: new Date().toISOString() })
      .eq("id", item.id)
      .is("rent_notified_at", null)
      .select("id");
    if (!claimed?.length) continue;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ORDER_EMAIL_FROM || `${STORE_NAME} <onboarding@resend.dev>`,
        to: [item.purchase.email],
        bcc: alertTo.length ? alertTo : undefined,
        subject: `Your rent of ${item.title} is over`,
        ...rentOverEmail(item),
      }),
    });

    if (res.ok) {
      sent++;
    } else {
      console.error("rent-expiry: Resend error", item.purchase.order_number, res.status, await res.text());
      failed.push(item.purchase.order_number);
      // Un-claim so tomorrow's run tries again.
      await supabase.from("order_items").update({ rent_notified_at: null }).eq("id", item.id);
    }
  }

  // One line per run, so the Vercel logs show the job ran and what it did.
  console.log(`rent-expiry: due ${data?.length ?? 0}, sent ${sent}, failed ${failed.length}`);
  return NextResponse.json({ due: data?.length ?? 0, sent, failed });
}

function rentOverEmail(item: DueItem) {
  const name = item.purchase.delivery_name || item.purchase.customer_name;
  const game = `${item.title} (${item.platform})`;

  const text = [
    `Hi ${name},`,
    "",
    `Your rent of ${game} is over. Kindly delete the account using the following steps:`,
    "",
    "Settings > Users and Accounts > Delete User, then delete the game ID.",
    "",
    "Or watch this YouTube video to delete a user from your PS5 or PS4:",
    `To delete a user from PS4: ${DELETE_VIDEOS.PS4}`,
    `To delete a user from PS5: ${DELETE_VIDEOS.PS5}`,
    "",
    `Order ${item.purchase.order_number} · rent ended ${formatDate(item.rent_ends_at)}`,
    "",
    `Want to keep playing? Rent it again or buy it at ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}`.trim(),
    "",
    `Thanks for renting with ${STORE_NAME}!`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
      <p>Hi ${esc(name)},</p>
      <p>Your rent of <b>${esc(game)}</b> is over. Kindly delete the account using the following steps:</p>
      <p style="background:#f4f4f5;padding:12px;border-radius:8px"><b>Settings &gt; Users and Accounts &gt; Delete User</b>, then delete the game ID.</p>
      <p>Or watch this YouTube video to delete a user from your PS5 or PS4:</p>
      <ul>
        <li>To delete a user from PS4: <a href="${DELETE_VIDEOS.PS4}">${DELETE_VIDEOS.PS4}</a></li>
        <li>To delete a user from PS5: <a href="${DELETE_VIDEOS.PS5}">${DELETE_VIDEOS.PS5}</a></li>
      </ul>
      <p style="color:#666;font-size:13px">Order ${esc(item.purchase.order_number)} · rent ended ${esc(formatDate(item.rent_ends_at))}</p>
      <p>Want to keep playing? Rent it again or buy it on <a href="${esc(process.env.NEXT_PUBLIC_SITE_URL ?? "")}">${esc(STORE_NAME)}</a>.</p>
      <p>Thanks for renting with ${esc(STORE_NAME)}!</p>
    </div>`;

  return { text, html };
}
