import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOW_STOCK, STORE_NAME, inr, slotLabel } from "@/lib/store";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import type { CartItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// Called every 15 minutes by Supabase pg_cron (see migration 012). Emails signed-in
// customers whose cart has sat unchanged for over an hour without an order.
//   * At most one reminder per cart change, and never more than one a day.
//   * Carts older than 2 days are left alone.
//   * Each cart is claimed (reminded_at) before sending, so overlapping runs can't double-send.

const WAIT_MS = 60 * 60 * 1000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type CartRow = { user_id: string; items: CartItem[]; updated_at: string; reminded_at: string | null };
type Line = CartItem & { left: number | null; cover: string | null; slug: string };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const supabase = createAdminClient();
  if (!apiKey || !supabase) {
    console.error("cart-reminders: RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const now = Date.now();
  const { data, error } = await supabase
    .from("carts")
    .select("user_id, items, updated_at, reminded_at")
    .gt("item_count", 0)
    .eq("email_opt_out", false)
    .lte("updated_at", new Date(now - WAIT_MS).toISOString())
    .gte("updated_at", new Date(now - MAX_AGE_MS).toISOString())
    .limit(100);
  if (error) {
    console.error("cart-reminders: query failed", error.message.replace(/sb_secret_\S+|eyJ[\w.-]+/g, "[redacted]"));
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  // Not yet reminded about this version of the cart, and not reminded in the last day.
  const due = ((data ?? []) as CartRow[]).filter((c) => {
    if (!c.reminded_at) return true;
    const reminded = new Date(c.reminded_at).getTime();
    return reminded < new Date(c.updated_at).getTime() && now - reminded > COOLDOWN_MS;
  });

  let sent = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const cart of due) {
    // Claim this exact cart version; a change or another run in the meantime makes this a no-op.
    let claim = supabase
      .from("carts")
      .update({ reminded_at: new Date().toISOString() })
      .eq("user_id", cart.user_id)
      .eq("updated_at", cart.updated_at);
    claim = cart.reminded_at ? claim.eq("reminded_at", cart.reminded_at) : claim.is("reminded_at", null);
    const { data: claimed } = await claim.select("user_id");
    if (!claimed?.length) continue;

    // Ordered since the cart last changed? Then they already bought it.
    const { count: orders } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", cart.user_id)
      .gte("created_at", cart.updated_at);
    if (orders) {
      skipped++;
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(cart.user_id);
    const user = userData?.user;
    if (!user?.email) {
      skipped++;
      continue;
    }

    // Current titles, stock and covers; drop games that are no longer for sale.
    const ids = [...new Set(cart.items.map((i) => i.productId))];
    const { data: products } = await supabase
      .from("products")
      .select("id, slug, title, cover_url, is_active, primary_stock, secondary_stock")
      .in("id", ids);
    const lines: Line[] = cart.items.flatMap((i) => {
      const p = products?.find((x) => x.id === i.productId);
      if (!p?.is_active) return [];
      const left = i.slot === "Primary" ? p.primary_stock : p.secondary_stock;
      return [{ ...i, title: p.title, slug: p.slug, cover: p.cover_url, left: left == null ? null : Number(left) }];
    });
    if (!lines.length) {
      skipped++;
      continue;
    }

    const meta = user.user_metadata ?? {};
    const name = String(meta.full_name ?? meta.name ?? "").trim().split(/\s+/)[0] || "there";
    const unsub = unsubscribeUrl(cart.user_id);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ORDER_EMAIL_FROM || `${STORE_NAME} <onboarding@resend.dev>`,
        to: [user.email],
        subject: "Your cart is waiting 🛒 Buy fast before stock runs out",
        headers: unsub ? { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
        ...cartEmail(name, lines, unsub),
      }),
    });

    if (res.ok) {
      sent++;
    } else {
      console.error("cart-reminders: Resend error", res.status, await res.text());
      failed.push(cart.user_id.slice(0, 8));
      // Un-claim so the next run tries again.
      await supabase.from("carts").update({ reminded_at: cart.reminded_at }).eq("user_id", cart.user_id);
    }
  }

  console.log(`cart-reminders: candidates ${data?.length ?? 0}, due ${due.length}, sent ${sent}, skipped ${skipped}, failed ${failed.length}`);
  return NextResponse.json({ due: due.length, sent, skipped, failed: failed.length });
}

function cartEmail(name: string, lines: Line[], unsub: string | null) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const checkout = `${site}/checkout`;
  const total = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const stockNote = (l: Line) => (l.left == null ? "" : l.left <= 0 ? "Sold out" : l.left <= LOW_STOCK ? `Only ${l.left} left` : "");

  const text = [
    `Hi ${name},`,
    "",
    "Your cart is waiting! Buy fast before stock runs out:",
    "",
    ...lines.map((l) => `- ${l.quantity > 1 ? `${l.quantity}× ` : ""}${l.title} (${l.platform} ${slotLabel(l.slot)}) ${inr(l.price * l.quantity)}${stockNote(l) ? ` · ${stockNote(l)}` : ""}`),
    "",
    `Complete your order: ${checkout}`,
    "",
    `Pay with any UPI app. Questions? Reply on WhatsApp from ${site}.`,
    "",
    unsub ? `Don't want these reminders? ${unsub}` : "",
  ].join("\n");

  const rows = lines
    .map((l) => {
      const note = stockNote(l);
      return `
        <tr>
          <td style="padding:10px 0;width:64px;vertical-align:top">
            ${l.cover ? `<img src="${esc(l.cover)}" width="56" height="75" alt="" style="display:block;border-radius:8px;object-fit:cover">` : ""}
          </td>
          <td style="padding:10px 12px;vertical-align:top">
            <a href="${esc(`${site}/products/${l.slug}`)}" style="color:#111;font-weight:bold;text-decoration:none">${l.quantity > 1 ? `${l.quantity}× ` : ""}${esc(l.title)}</a>
            <div style="color:#666;font-size:13px">${esc(`${l.platform} ${slotLabel(l.slot)}`)}</div>
            ${note ? `<div style="color:#dc2626;font-size:13px;font-weight:bold;margin-top:2px">${esc(note)}</div>` : ""}
          </td>
          <td style="padding:10px 0;text-align:right;vertical-align:top;font-weight:bold;white-space:nowrap">${esc(inr(l.price * l.quantity))}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:520px">
      <p>Hi ${esc(name)},</p>
      <p style="font-size:18px;font-weight:bold;margin:0 0 4px">Your cart is waiting 🛒</p>
      <p style="margin-top:0">Buy fast before stock runs out! These games are still in your cart:</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee">${rows}</table>
      <p style="text-align:right;margin:8px 0 20px">Total: <b>${esc(inr(total))}</b></p>
      <p style="text-align:center">
        <a href="${esc(checkout)}" style="display:inline-block;background:#2f6bff;color:#fff;font-weight:bold;padding:14px 28px;border-radius:10px;text-decoration:none">Complete my order →</a>
      </p>
      <p style="color:#666;font-size:13px;text-align:center">Pay with any UPI app · Fast delivery on WhatsApp</p>
      ${unsub ? `<p style="color:#999;font-size:12px;text-align:center;margin-top:28px">Don't want these reminders? <a href="${esc(unsub)}" style="color:#999">Unsubscribe</a></p>` : ""}
    </div>`;

  return { text, html };
}
