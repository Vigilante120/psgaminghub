import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses row-level security. Server-only — import it only from
 * route handlers that check their own authorisation (e.g. the cron route's CRON_SECRET).
 * Never prefix the key with NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Keys never contain whitespace; strip any line break picked up when pasting it into Vercel.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/\s+/g, "");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
