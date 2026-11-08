"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";

async function requireAdmin() {
  const info = await getSessionInfo();
  if (!info.user || !info.isAdmin) throw new Error("Not authorised");
  return info.supabase;
}

function refresh(orderId?: string) {
  revalidatePath("/admin");
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
}

// ---------- Orders ----------------------------------------------------

export async function verifyPayment(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("orderId"));
  const { error } = await supabase
    .from("orders")
    .update({ status: "processing", verified_at: new Date().toISOString(), admin_note: null })
    .eq("id", id)
    .eq("status", "payment_submitted");
  if (error) throw new Error(error.message);
  refresh(id);
}

export async function rejectPayment(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("orderId"));
  const note = String(formData.get("note") ?? "").trim() || "Payment could not be verified.";
  const { error } = await supabase
    .from("orders")
    .update({ status: "rejected", admin_note: note, verified_at: null })
    .eq("id", id)
    .in("status", ["payment_submitted", "processing"]);
  if (error) throw new Error(error.message);
  refresh(id);
}

export async function markDelivered(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("orderId"));
  const receipt = formData.get("receipt");

  const { data: order, error: readErr } = await supabase
    .from("orders")
    .select("user_id, order_number, receipt_path")
    .eq("id", id)
    .single();
  if (readErr || !order) throw new Error(readErr?.message ?? "Order not found");

  let receiptPath: string | null = order.receipt_path;
  if (receipt instanceof File && receipt.size > 0) {
    const ext = receipt.name.split(".").pop()?.toLowerCase() || "png";
    receiptPath = `${order.user_id}/${order.order_number}-receipt.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("receipts")
      .upload(receiptPath, receipt, { contentType: receipt.type, upsert: true });
    if (upErr) throw new Error(upErr.message);
  }
  if (!receiptPath) throw new Error("Attach the purchase receipt before marking as delivered.");

  const { error } = await supabase
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString(), receipt_path: receiptPath })
    .eq("id", id)
    .in("status", ["processing", "delivered"]);
  if (error) throw new Error(error.message);
  refresh(id);
}

export async function setStatus(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("orderId"));
  const status = String(formData.get("status"));
  const allowed = ["awaiting_payment", "payment_submitted", "processing", "delivered", "rejected", "cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
}

// ---------- Products --------------------------------------------------

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Parses a rupee amount from the form; blank is allowed only for optional prices. */
function money(v: FormDataEntryValue | null, label: string, required: boolean) {
  const s = String(v ?? "").trim();
  if (!s) {
    if (required) throw new Error(`${label} is required`);
    return null;
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) throw new Error(`${label} must be between 1 and 100000`);
  return Math.round(n);
}

/** Parses a stock count; blank means "not tracked" (unlimited). */
function stock(v: FormDataEntryValue | null, label: string) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0 || n > 100000) throw new Error(`${label} must be a whole number of 0 or more`);
  return n;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Returns a result instead of redirecting, so the form can show "Changes saved"
 * before it moves on, and show validation errors inline (production hides thrown messages).
 */
export async function saveProduct(formData: FormData): Promise<SaveResult> {
  try {
    await writeProduct(formData);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the product." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

async function writeProduct(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");

  const platforms = formData.getAll("platforms").map(String);
  if (platforms.length === 0) throw new Error("Pick at least one platform");

  const row: Record<string, unknown> = {
    title,
    slug: String(formData.get("slug") ?? "").trim() || slugify(title),
    description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category")),
    platforms,
    price: money(formData.get("price"), "Primary price", true),
    secondary_price: money(formData.get("secondary_price"), "Secondary price", false),
    rent_price: money(formData.get("rent_price"), "Rent price", false),
    compare_at_price: money(formData.get("compare_at_price"), "Original price", false),
    primary_stock: stock(formData.get("primary_stock"), "Primary stock"),
    secondary_stock: stock(formData.get("secondary_stock"), "Secondary stock"),
    is_featured: formData.get("is_featured") === "on",
    is_active: formData.get("is_active") === "on",
  };

  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${row.slug}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("product-images").upload(path, image, { contentType: image.type });
    if (upErr) throw new Error(upErr.message);
    row.cover_url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  const { error } = id
    ? await supabase.from("products").update(row).eq("id", id)
    : await supabase.from("products").insert(row);
  if (error) throw new Error(error.code === "23505" ? "Another product already uses this URL slug." : error.message);
}

export async function deleteProduct(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export type BulkResult = { ok: true; cancelled: number } | { ok: false; error: string };

/**
 * Cancels many unpaid orders at once. Only orders still awaiting payment are touched,
 * so an order that got paid while the admin was selecting is left alone.
 * The restock trigger runs per row, so every cancelled order puts its copies back.
 */
export async function cancelUnpaidOrders(ids: string[]): Promise<BulkResult> {
  try {
    const supabase = await requireAdmin();
    const clean = [...new Set(ids.map(String))].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
    if (clean.length === 0) return { ok: false, error: "Select at least one order." };
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .in("id", clean)
      .eq("status", "awaiting_payment")
      .select("id");
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true, cancelled: data?.length ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not cancel the orders." };
  }
}
