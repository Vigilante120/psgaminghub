-- =====================================================================
-- PS GAMING HUB — migration 009: Diwali offer extended to 9 Nov, on the cart total
-- Run once in Supabase → SQL Editor after 008_stock.sql. Safe to re-run.
-- Rs 350 off carts of Rs 3,999+, Rs 250 off carts of Rs 1,000–3,998, none below,
-- ending 9 Nov 2026 23:59:59 IST. Everything else in place_order (stock, Rent,
-- 5-copy cap) is unchanged from 008.
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
  v_left int;
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
    -- Stock: lock the game's row so two customers can't take the last copy at once,
    -- then hold the copies (Rent shares the Secondary count). NULL = not tracked.
    select case when r.slot = 'Primary' then primary_stock else secondary_stock end
      into v_left
      from public.products where id = r.id for update;
    if v_left is not null then
      if v_left < r.qty then
        if v_left = 0 then
          raise exception '% (%) is out of stock', r.title, r.slot;
        end if;
        raise exception 'Only % left of % (%). Lower the quantity in your cart.', v_left, r.title, r.slot;
      end if;
      if r.slot = 'Primary' then
        update public.products set primary_stock = primary_stock - r.qty where id = r.id;
      else
        update public.products set secondary_stock = secondary_stock - r.qty where id = r.id;
      end if;
    end if;

    v_unit := case r.slot when 'Secondary' then r.secondary_price when 'Rent' then r.rent_price else r.price end;
    v_subtotal := v_subtotal + v_unit * r.qty;

  end loop;

  -- Diwali offer (keep in sync with DIWALI_OFFER in src/lib/store.ts):
  -- Rs 350 off carts of 3999+, Rs 250 off carts of 1000-3998, until 9 Nov 2026 23:59:59 IST.
  if now() < timestamptz '2026-11-09 23:59:59+05:30' then
    v_discount := case when v_subtotal >= 3999 then 350 when v_subtotal >= 1000 then 250 else 0 end;
  end if;

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
