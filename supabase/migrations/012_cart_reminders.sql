-- =====================================================================
-- PS GAMING HUB — migration 012: saved carts and "your cart is waiting" emails
-- Run once in Supabase → SQL Editor after 011_reviews.sql. Safe to re-run.
--   * Signed-in customers' carts are saved here (they were only in the browser),
--     so the cart also follows them to another device.
--   * /api/cron/cart-reminders emails carts left for over an hour. The schedule
--     that calls it every 15 minutes is in the SECOND part below; it needs the
--     site's CRON_SECRET pasted in, so it is not run with this file.
-- =====================================================================

create table if not exists public.carts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  item_count int not null default 0,
  -- Changes only when the cart's contents change, so the "1 hour" is from the last real change.
  updated_at timestamptz not null default now(),
  reminded_at timestamptz,
  email_opt_out boolean not null default false
);

create index if not exists carts_due on public.carts (updated_at) where item_count > 0 and not email_opt_out;

alter table public.carts enable row level security;

-- Customers read their own saved cart; all writes go through save_cart (or the server).
drop policy if exists "carts: read own" on public.carts;
create policy "carts: read own" on public.carts
  for select using (user_id = auth.uid());

create or replace function public.save_cart(p_items jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
  v_count int;
begin
  if v_uid is null then
    return; -- signed out: nothing to save
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) > 30 or length(v_items::text) > 20000 then
    raise exception 'Cart is too large';
  end if;
  select coalesce(sum(greatest(0, least(5, coalesce((e->>'quantity')::int, 0)))), 0)
    into v_count
    from jsonb_array_elements(v_items) e;

  insert into public.carts (user_id, items, item_count, updated_at)
  values (v_uid, v_items, v_count, now())
  on conflict (user_id) do update
     set items = excluded.items,
         item_count = excluded.item_count,
         updated_at = case when public.carts.items is distinct from excluded.items then now() else public.carts.updated_at end;
end;
$$;

revoke execute on function public.save_cart(jsonb) from public, anon;
grant execute on function public.save_cart(jsonb) to authenticated;


-- =====================================================================
-- SECOND PART — the 15-minute schedule. Run this separately, AFTER the
-- website update is live. Replace PASTE_CRON_SECRET_HERE with the value of
-- CRON_SECRET from Vercel → Settings → Environment Variables. Safe to re-run.
-- =====================================================================
--
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select cron.unschedule('cart-reminders') where exists (select 1 from cron.job where jobname = 'cart-reminders');
-- select cron.schedule(
--   'cart-reminders',
--   '*/15 * * * *',
--   $job$
--     select net.http_get(
--       url := 'https://www.psgaminghub.com/api/cron/cart-reminders',
--       headers := jsonb_build_object('Authorization', 'Bearer PASTE_CRON_SECRET_HERE'),
--       timeout_milliseconds := 30000
--     );
--   $job$
-- );
