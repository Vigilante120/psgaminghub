-- =====================================================================
-- PS GAMING HUB — Supabase schema
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- =====================================================================

-- ---------- Profiles (one per signed-up user) ------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- Products --------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category text not null check (category in ('playstation-games', 'pc-games', 'playstation-plus')),
  platforms text[] not null default '{PS5}',
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  cover_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category) where is_active;

-- ---------- Orders ----------------------------------------------------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('PSG-' || nextval('public.order_number_seq')),
  user_id uuid not null references auth.users (id) on delete restrict,
  customer_name text not null,
  email text not null,
  whatsapp text not null,
  psn_id text not null,
  console text not null check (console in ('PS5', 'PS4', 'PC')),
  notes text,
  subtotal numeric(10, 2) not null,
  discount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'payment_submitted', 'processing', 'delivered', 'rejected', 'cancelled')),
  utr text,
  payment_screenshot_path text,
  receipt_path text,
  admin_note text,
  created_at timestamptz not null default now(),
  payment_submitted_at timestamptz,
  verified_at timestamptz,
  delivered_at timestamptz
);

-- The same UPI transaction ID can never be used on two orders (stops reused screenshots).
create unique index if not exists orders_utr_unique on public.orders (upper(utr)) where utr is not null;
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  title text not null,
  platform text not null,
  unit_price numeric(10, 2) not null,
  quantity int not null default 1 check (quantity between 1 and 5)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------- place_order: prices are always computed on the server ----
-- items: [{ "product_id": "...", "platform": "PS5", "quantity": 1 }, ...]
create or replace function public.place_order(
  p_items jsonb,
  p_name text,
  p_email text,
  p_whatsapp text,
  p_psn_id text,
  p_console text,
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
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_psn_id), '') = ''
     or length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 then
    raise exception 'Name, PSN ID and a valid WhatsApp number are required';
  end if;
  if p_console not in ('PS5', 'PS4', 'PC') then
    raise exception 'Invalid console';
  end if;

  -- Validate every item against the live product table
  for r in
    select p.id, p.title, p.price, p.platforms,
           (i ->> 'platform') as platform,
           greatest(1, least(5, coalesce((i ->> 'quantity')::int, 1))) as qty
    from jsonb_array_elements(p_items) as i
    left join public.products p on p.id = (i ->> 'product_id')::uuid and p.is_active
  loop
    if r.id is null then
      raise exception 'A product in your cart is no longer available';
    end if;
    if not (r.platform = any (r.platforms)) then
      raise exception '% is not available for %', r.title, r.platform;
    end if;
    v_subtotal := v_subtotal + r.price * r.qty;
    v_count := v_count + r.qty;
  end loop;

  -- Bundle offer (keep in sync with BUNDLE_OFFER in src/lib/store.ts)
  v_pct := case when v_count >= 3 then 15 when v_count >= 2 then 10 else 0 end;
  v_discount := round(v_subtotal * v_pct / 100.0, 0);

  insert into public.orders (user_id, customer_name, email, whatsapp, psn_id, console, notes,
                             subtotal, discount, total)
  values (v_uid, trim(p_name), trim(p_email), trim(p_whatsapp), trim(p_psn_id), p_console,
          nullif(trim(coalesce(p_notes, '')), ''),
          v_subtotal, v_discount, v_subtotal - v_discount)
  returning id, orders.order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, title, platform, unit_price, quantity)
  select v_order_id, p.id, p.title, i ->> 'platform', p.price,
         greatest(1, least(5, coalesce((i ->> 'quantity')::int, 1)))
  from jsonb_array_elements(p_items) as i
  join public.products p on p.id = (i ->> 'product_id')::uuid;

  return query select v_order_id, v_order_number;
end;
$$;

-- ---------- submit_payment: customer sends UTR + screenshot ----------
create or replace function public.submit_payment(
  p_order_id uuid,
  p_utr text,
  p_screenshot_path text
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
  if exists (select 1 from public.orders where upper(utr) = v_utr and id <> p_order_id) then
    raise exception 'This UTR has already been used on another order';
  end if;

  update public.orders
     set utr = v_utr,
         payment_screenshot_path = p_screenshot_path,
         status = 'payment_submitted',
         payment_submitted_at = now()
   where id = p_order_id
     and user_id = auth.uid()
     and status in ('awaiting_payment', 'rejected');

  if not found then
    raise exception 'This order cannot accept a payment right now';
  end if;
end;
$$;

-- ---------- Row Level Security ---------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "products: public read active" on public.products;
create policy "products: public read active" on public.products
  for select using (is_active or public.is_admin());

drop policy if exists "products: admin write" on public.products;
create policy "products: admin write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- Customers never insert/update orders directly — only via the functions above.
drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders: admin update" on public.orders;
create policy "orders: admin update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items: read own or admin" on public.order_items;
create policy "order_items: read own or admin" on public.order_items
  for select using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

grant execute on function public.place_order(jsonb, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_payment(uuid, text, text) to authenticated;

-- ---------- Storage buckets ------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true),
       ('payment-proofs', 'payment-proofs', false),
       ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Product images: anyone can view, only admins upload
drop policy if exists "product-images admin write" on storage.objects;
create policy "product-images admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- Payment proofs: path = <user_id>/<order_id>/<file>. Owner uploads, owner + admin read.
drop policy if exists "payment-proofs owner upload" on storage.objects;
create policy "payment-proofs owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "payment-proofs owner or admin read" on storage.objects;
create policy "payment-proofs owner or admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Receipts: path = <customer_user_id>/<order_number>-receipt.<ext>. Admin uploads, customer reads.
drop policy if exists "receipts admin write" on storage.objects;
create policy "receipts admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and public.is_admin())
  with check (bucket_id = 'receipts' and public.is_admin());

drop policy if exists "receipts owner read" on storage.objects;
create policy "receipts owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
