-- =====================================================================
-- PS GAMING HUB — migration 008: stock counts, held on order, live updates
-- Run once in Supabase → SQL Editor after 007_diwali_offer.sql. Safe to re-run.
--   * products.primary_stock / secondary_stock: copies left; NULL = not tracked (unlimited).
--     Rent uses the Secondary count.
--   * place_order checks and holds stock (up to 5 copies per line, as before).
--   * Rejecting or cancelling an order puts its copies back; un-cancelling takes them again.
--   * The products table is added to Supabase Realtime so the store updates live.
-- =====================================================================

-- ---------- Products: stock columns ------------------------------------
alter table public.products
  add column if not exists primary_stock int check (primary_stock is null or primary_stock >= 0),
  add column if not exists secondary_stock int check (secondary_stock is null or secondary_stock >= 0);

-- ---------- place_order: same as 007, plus the stock check -------------
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


-- ---------- Give stock back when an order is rejected or cancelled -----
create or replace function public.restock_on_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_was_closed boolean := old.status in ('rejected', 'cancelled');
  v_is_closed boolean := new.status in ('rejected', 'cancelled');
  v_sign int;
begin
  if v_was_closed = v_is_closed then
    return new;
  end if;
  v_sign := case when v_is_closed then 1 else -1 end;

  update public.products p
     set primary_stock = case when p.primary_stock is null then null
                              else greatest(0, p.primary_stock + v_sign * x.prim) end,
         secondary_stock = case when p.secondary_stock is null then null
                                else greatest(0, p.secondary_stock + v_sign * x.sec) end
    from (
      select product_id,
             coalesce(sum(quantity) filter (where slot = 'Primary'), 0) as prim,
             coalesce(sum(quantity) filter (where slot <> 'Primary'), 0) as sec
        from public.order_items
       where order_id = new.id and product_id is not null
       group by product_id
    ) x
   where p.id = x.product_id;
  return new;
end;
$$;

drop trigger if exists orders_restock_on_status on public.orders;
create trigger orders_restock_on_status
  after update of status on public.orders
  for each row execute function public.restock_on_status();

-- ---------- Realtime: push product changes (stock) to the store --------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;
