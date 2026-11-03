import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; middleware refreshes the session.
          }
        },
      },
    }
  );
}

/** Returns the signed-in user and whether they are an admin. */
export async function getSessionInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, isAdmin: Boolean(profile?.is_admin) };
}

/** For admin pages: sends signed-out visitors to login and shows 404 to non-admins. */
export async function requireAdminPage() {
  const info = await getSessionInfo();
  if (!info.user) redirect("/login?next=/admin");
  if (!info.isAdmin) notFound();
  return info.supabase;
}
