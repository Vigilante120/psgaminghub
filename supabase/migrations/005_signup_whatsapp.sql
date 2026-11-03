-- =====================================================================
-- PS GAMING HUB — migration 005: save the WhatsApp number from sign-up
-- Run once in Supabase → SQL Editor after 004_hardening.sql. Safe to re-run.
-- =====================================================================

-- The sign-up form sends full_name and whatsapp as user metadata.
-- Copy both onto the profile; checkout pre-fills from profiles.phone.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'whatsapp', '')), 20), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Backfill accounts created with the new form before this migration ran.
update public.profiles p
   set phone = left(trim(u.raw_user_meta_data ->> 'whatsapp'), 20)
  from auth.users u
 where u.id = p.id
   and p.phone is null
   and coalesce(trim(u.raw_user_meta_data ->> 'whatsapp'), '') <> '';
