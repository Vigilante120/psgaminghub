import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import ProductForm from "../ProductForm";

export default async function EditProduct({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const supabase = await requireAdminPage();
  const { id } = await params;
  // Opened from the store's Edit button: go back to that page after saving.
  // Only same-site paths ("/…" but not "//host") are allowed.
  const { back: rawBack } = await searchParams;
  const back = rawBack && rawBack.startsWith("/") && !rawBack.startsWith("//") && !rawBack.startsWith("/\\") ? rawBack : null;

  let product: Product | undefined;
  if (id !== "new") {
    const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    product = data as Product;
  }

  return (
    <div>
      <Link href={back ?? "/admin/products"} className="-my-2 inline-flex min-h-11 items-center text-sm text-muted hover:text-white">
        {back ? "← Back to the store" : "← Products"}
      </Link>
      <h1 className="mb-6 mt-3 font-display text-3xl font-bold uppercase tracking-wide">
        {product ? `Edit: ${product.title}` : "New product"}
      </h1>
      <ProductForm product={product} backTo={back ?? undefined} />
    </div>
  );
}
