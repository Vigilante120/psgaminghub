-- =====================================================================
-- PS GAMING HUB — migration 007: Diwali offer replaces the bundle discount
-- Run once in Supabase → SQL Editor after 006_rent.sql. Safe to re-run.
-- Flat Rs 300 / Rs 200 off each game by price, ending 8 Nov 2026 23:59:59 IST;
-- after that place_order applies no discount at all.
-- =====================================================================

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
  v_unit numeric(10, 2);
  v_discount numeric(10, 2) := 0;
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
    select p.id, p.title, p.price, p.secondary_price, p.rent_price, p.platforms,
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
    if r.slot not in ('Primary', 'Secondary', 'Rent') then
      raise exception 'Invalid slot for %', r.title;
    end if;
    if r.slot = 'Secondary' and r.secondary_price is null then
      raise exception '% is not available as a Secondary slot', r.title;
    end if;
    if r.slot = 'Rent' and r.rent_price is null then
      raise exception '% is not available for rent', r.title;
    end if;
    v_unit := case r.slot when 'Secondary' then r.secondary_price when 'Rent' then r.rent_price else r.price end;
    v_subtotal := v_subtotal + v_unit * r.qty;

    -- Diwali offer (keep in sync with DIWALI_OFFER in src/lib/store.ts):
    -- Rs 300 off each game priced 1500+, Rs 200 off each game priced 1000-1499, until 8 Nov 2026 23:59:59 IST.
    if now() < timestamptz '2026-11-08 23:59:59+05:30' then
      v_discount := v_discount + (case when v_unit >= 1500 then 300 when v_unit >= 1000 then 200 else 0 end) * r.qty;
    end if;
  end loop;

  insert into public.orders (user_id, customer_name, email, whatsapp, notes, subtotal, discount, total)
  values (v_uid, trim(p_name), trim(p_email), trim(p_whatsapp),
          nullif(trim(coalesce(p_notes, '')), ''),
          v_subtotal, v_discount, v_subtotal - v_discount)
  returning id, orders.order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, title, platform, slot, unit_price, quantity)
  select v_order_id, p.id, p.title, i ->> 'platform', coalesce(i ->> 'slot', 'Primary'),
         case coalesce(i ->> 'slot', 'Primary')
           when 'Secondary' then p.secondary_price
           when 'Rent' then p.rent_price
           else p.price
         end,
         greatest(1, least(5, coalesce((i ->> 'quantity')::int, 1)))
  from jsonb_array_elements(p_items) as i
  join public.products p on p.id = (i ->> 'product_id')::uuid;

  return query select v_order_id, v_order_number;
end;
$$;

revoke execute on function public.place_order(jsonb, text, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text) to authenticated;
