import { redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";
import CheckoutForm from "./CheckoutForm";
import { NO_INDEX } from "@/lib/seo";

export const metadata = { title: "Checkout", robots: NO_INDEX };

export default async function CheckoutPage() {
  const { supabase, user } = await getSessionInfo();
  if (!user) redirect("/login?next=/checkout");

  const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();

  // Pre-fill from the customer's last order, if any.
  const { data: last } = await supabase
    .from("orders")
    .select("customer_name, whatsapp")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">Checkout</h1>
      <p className="mt-2 text-muted">Tell us how to reach you. You'll pay by UPI on the next screen.</p>
      <CheckoutForm
        email={user.email ?? ""}
        defaults={{
          name: last?.customer_name ?? profile?.full_name ?? "",
          whatsapp: last?.whatsapp ?? profile?.phone ?? "",
        }}
      />
    </div>
  );
}
