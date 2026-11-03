-- =====================================================================
-- PS GAMING HUB — migration 002: Primary / Secondary slots
-- Run once in Supabase → SQL Editor on a database that already has schema.sql.
-- Safe to re-run.
-- =====================================================================

-- ---------- Products: price per slot ---------------------------------
-- `price` is the Primary slot price. Secondary is offered only when secondary_price is set.
alter table public.products
  add column if not exists secondary_price numeric(10, 2) check (secondary_price is null or secondary_price >= 0);

-- We only sell PS4 / PS5 games for now: hide PC games and PS Plus (not deleted, re-enable in admin).
update public.products set is_active = false where category in ('pc-games', 'playstation-plus');

-- ---------- Order items: which slot was bought ------------------------
alter table public.order_items
  add column if not exists slot text not null default 'Primary' check (slot in ('Primary', 'Secondary'));

-- ---------- Orders: delivery details sent after payment --------------
alter table public.orders alter column psn_id drop not null;
alter table public.orders alter column console drop not null;
alter table public.orders add column if not exists delivery_name text;
alter table public.orders add column if not exists delivery_phone text;
alter table public.orders add column if not exists notified_at timestamptz;

-- ---------- place_order: items now carry a slot ----------------------
-- items: [{ "product_id": "...", "platform": "PS5", "slot": "Secondary" }, ...]
drop function if exists public.place_order(jsonb, text, text, text, text, text, text);

create or replace function public.place_order(
  p_items jsonb,
  p_name text,
  p_email text,
  p_whatsapp text,
  p_notes text default null
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(10, 2) := 0;
  v_count int := 0;
  v_pct int := 0;
  v_discount numeric(10, 2);
  r record;
begin
  if v_uid is null then
    raise exception 'Please sign in to place an order';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;
  if coalesce(trim(p_name), '') = ''
     or length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 then
    raise exception 'Name and a valid WhatsApp number are required';
  end if;

  -- Validate every item against the live product table
  for r in
    select p.id, p.title, p.price, p.secondary_price, p.platforms,
           (i ->> 'platform') as platform,
           coalesce(i ->> 'slot', 'Primary') as slot,
           greatest(1, least(5, coalesce((i ->> 'quantity')::int, 1))) as qty
    from jsonb_array_elements(p_items) as i
    left join public.products p on p.id = (i ->> 'product_id')::uuid and p.is_active
  loop
    if r.id is null then
      raise exception 'A product in your cart is no longer available';
    end if;
    if r.platform not in ('PS4', 'PS5') or not (r.platform = any (r.platforms)) then
      raise exception '% is not available for %', r.title, r.platform;
    end if;
    if r.slot not in ('Primary', 'Secondary') then
      raise exception 'Invalid slot for %', r.title;
    end if;
    if r.slot = 'Secondary' and r.secondary_price is null then
      raise exception '% is not available as a Secondary slot', r.title;
    end if;
    v_subtotal := v_subtotal + (case when r.slot = 'Secondary' then r.secondary_price else r.price end) * r.qty;
    v_count := v_count + r.qty;
  end loop;

  -- Bundle offer (keep in sync with BUNDLE_OFFER in src/lib/store.ts)
  v_pct := case when v_count >= 3 then 15 when v_count >= 2 then 10 else 0 end;
  v_discount := round(v_subtotal * v_pct / 100.0, 0);

  insert into public.orders (user_id, customer_name, email, whatsapp, notes, subtotal, discount, total)
  values (v_uid, trim(p_name), trim(p_email), trim(p_whatsapp),
          nullif(trim(coalesce(p_notes, '')), ''),
          v_subtotal, v_discount, v_subtotal - v_discount)
  returning id, orders.order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, title, platform, slot, unit_price, quantity)
  select v_order_id, p.id, p.title, i ->> 'platform', coalesce(i ->> 'slot', 'Primary'),
         case when coalesce(i ->> 'slot', 'Primary') = 'Secondary' then p.secondary_price else p.price end,
         greatest(1, least(5, coalesce((i ->> 'quantity')::int, 1)))
  from jsonb_array_elements(p_items) as i
  join public.products p on p.id = (i ->> 'product_id')::uuid;

  return query select v_order_id, v_order_number;
end;
$$;

-- ---------- submit_payment: UTR + screenshot + delivery details ------
drop function if exists public.submit_payment(uuid, text, text);

create or replace function public.submit_payment(
  p_order_id uuid,
  p_utr text,
  p_screenshot_path text,
  p_delivery_name text,
  p_delivery_phone text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_utr text := upper(regexp_replace(coalesce(p_utr, ''), '\s', '', 'g'));
begin
  if length(v_utr) < 8 or length(v_utr) > 30 then
    raise exception 'Enter the full UTR / transaction ID from your UPI app';
  end if;
  if p_screenshot_path is null or split_part(p_screenshot_path, '/', 1) <> auth.uid()::text then
    raise exception 'Upload your payment screenshot';
  end if;
  if coalesce(trim(p_delivery_name), '') = ''
     or length(regexp_replace(coalesce(p_delivery_phone, ''), '\D', '', 'g')) < 10 then
    raise exception 'Enter your name and a valid phone number';
  end if;
  if exists (select 1 from public.orders where upper(utr) = v_utr and id <> p_order_id) then
    raise exception 'This UTR has already been used on another order';
  end if;

  update public.orders
     set utr = v_utr,
         payment_screenshot_path = p_screenshot_path,
         delivery_name = trim(p_delivery_name),
         delivery_phone = trim(p_delivery_phone),
         status = 'payment_submitted',
         payment_submitted_at = now(),
         notified_at = null
   where id = p_order_id
     and user_id = auth.uid()
     and status in ('awaiting_payment', 'rejected');

  if not found then
    raise exception 'This order cannot accept a payment right now';
  end if;
end;
$$;

-- ---------- claim_order_notification: send the admin email once -----
-- Returns true only for the first call after a payment is submitted, so the email isn't sent twice.
create or replace function public.claim_order_notification(p_order_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update public.orders
     set notified_at = now()
   where id = p_order_id
     and user_id = auth.uid()
     and status = 'payment_submitted'
     and notified_at is null;
  return found;
end;
$$;

grant execute on function public.place_order(jsonb, text, text, text, text) to authenticated;
grant execute on function public.submit_payment(uuid, text, text, text, text) to authenticated;
grant execute on function public.claim_order_notification(uuid) to authenticated;
