import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSessionInfo } from "@/lib/supabase/server";

// Takes one review screenshot, converts it to .webp (max 1600px, metadata such as
// GPS location stripped) and stores it in the customer's folder in review-images.
// Converting here, not in the browser, means iPhones (whose browsers can't make
// .webp) end up with the same format as everyone else.

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const { supabase, user } = await getSessionInfo();
  if (!user) return NextResponse.json({ error: "Sign in to add a screenshot." }, { status: 401 });

  // Only customers with a delivered order can review, so only they can upload.
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "delivered");
  if (!count) return NextResponse.json({ error: "You can add screenshots once a game is delivered to you." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose an image." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is too big (max 8 MB)." }, { status: 413 });

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate() // respect the phone's orientation before metadata is dropped
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "We couldn't read that image. Try a PNG or JPG screenshot." }, { status: 415 });
  }

  const path = `${user.id}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("review-images").upload(path, webp, { contentType: "image/webp" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path });
}
