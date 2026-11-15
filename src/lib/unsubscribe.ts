import { createHmac, timingSafeEqual } from "crypto";

// Signed "stop cart reminders" links: the token proves the link came from our email,
// so nobody can unsubscribe someone else by guessing their user id.

function sign(userId: string) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`cart-reminders:${userId}`).digest("hex").slice(0, 32);
}

export function unsubscribeUrl(userId: string) {
  const token = sign(userId);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return token ? `${site}/api/cart-reminders/unsubscribe?u=${encodeURIComponent(userId)}&t=${token}` : null;
}

export function validUnsubscribe(userId: string, token: string) {
  const expected = sign(userId);
  if (!expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
