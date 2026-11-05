-- =====================================================================
-- PS GAMING HUB — migration 006: Rent slot (Secondary slot for 30 days)
-- Run once in Supabase → SQL Editor after 005_signup_whatsapp.sql. Safe to re-run.
-- =====================================================================

-- ---------- Products: rent price --------------------------------------
-- Rent is offered only when rent_price is set. It is always a Secondary slot
-- (Primary is sold permanently), for 30 days from delivery.
alter table public.products
  add column if not exists rent_price numeric(10, 2) check (rent_price is null or rent_price >= 0);

-- ---------- Order items: Rent slot and its 30-day window --------------
-- Drop the old Primary/Secondary check whatever Postgres named it, then add the new one.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.order_items'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%slot%'
  loop
    execute format('alter table public.order_items drop constraint %I', c);
  end loop;
end $$;
alter table public.order_items
  add constraint order_items_slot_check check (slot in ('Primary', 'Secondary', 'Rent'));

-- rent_ends_at: set when the order is marked delivered (delivered_at + 30 days).
-- rent_notified_at: set once the "rent is over" email has been sent, so it goes out once.
alter table public.order_items add column if not exists rent_ends_at timestamptz;
alter table public.order_items add column if not exists rent_notified_at timestamptz;

create index if not exists order_items_rent_due_idx
  on public.order_items (rent_ends_at)
  where slot = 'Rent' and rent_notified_at is null;

-- ---------- Start the 30-day clock on delivery -----------------------
-- Runs however the order becomes delivered (Mark delivered or the status dropdown).
-- Only fills empty rent_ends_at, so re-uploading a receipt doesn't restart the clock.
create or replace function public.start_rent_clock()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    update public.order_items
       set rent_ends_at = coalesce(new.delivered_at, now()) + interval '30 days'
     where order_id = new.id
       and slot = 'Rent'
       and rent_ends_at is null;
  end if;
  return new;
end;
$$;

revoke execute on function public.start_rent_clock() from public, anon, authenticated;

drop trigger if exists orders_start_rent_clock on public.orders;
create trigger orders_start_rent_clock
  after update of status on public.orders
  for each row execute function public.start_rent_clock();

-- ---------- place_order: accept the Rent slot ------------------------
-- Same as migration 002, plus Rent priced from products.rent_price.
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
    v_subtotal := v_subtotal
      + (case r.slot when 'Secondary' then r.secondary_price when 'Rent' then r.rent_price else r.price end) * r.qty;
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
