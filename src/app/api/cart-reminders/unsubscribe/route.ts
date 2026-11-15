import { createAdminClient } from "@/lib/supabase/admin";
import { validUnsubscribe } from "@/lib/unsubscribe";
import { STORE_NAME } from "@/lib/store";

export const dynamic = "force-dynamic";

// One-click "stop cart reminder emails" link from the bottom of the email.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  const ok = /^[0-9a-f-]{36}$/i.test(userId) && validUnsubscribe(userId, token);

  let done = false;
  if (ok) {
    const supabase = createAdminClient();
    const { error } = supabase
      ? await supabase.from("carts").upsert({ user_id: userId, email_opt_out: true }, { onConflict: "user_id" })
      : { error: new Error("not configured") };
    done = !error;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "/";
  const message = done
    ? "You won't get cart reminder emails from us any more. Order updates still arrive as usual."
    : "This link didn't work. Please message us on WhatsApp and we'll stop the emails for you.";
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${STORE_NAME}</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#05060a;color:#fff;font-family:Arial,sans-serif;padding:16px">
<div style="max-width:420px;text-align:center"><h1 style="font-size:22px">${done ? "Unsubscribed ✅" : "Something went wrong"}</h1>
<p style="color:#a1a1aa;line-height:1.5">${message}</p><p><a href="${site}" style="color:#7aa2ff">Back to ${STORE_NAME}</a></p></div></body></html>`,
    { status: done ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// Mail apps' one-click "Unsubscribe" button (List-Unsubscribe-Post) sends a POST to the same link.
export async function POST(request: Request) {
  return GET(request);
}
