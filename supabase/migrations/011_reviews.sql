-- =====================================================================
-- PS GAMING HUB — migration 011: customer reviews and ratings
-- Run once in Supabase → SQL Editor after 010_payment_without_utr.sql. Safe to re-run.
--   * Customers rate (1–5 stars) and review games from their delivered orders,
--     with up to 3 screenshots (stored as .webp in the review-images bucket).
--   * New and edited reviews wait as 'pending' until the admin approves them.
--     Only approved reviews are visible to other visitors.
-- =====================================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  platform text,
  display_name text not null check (char_length(display_name) between 1 and 40),
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 1000),
  image_paths text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (user_id, product_id)
);

create index if not exists reviews_product_approved on public.reviews (product_id) where status = 'approved';
create index if not exists reviews_status_created on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

-- Everyone sees approved reviews; customers also see their own; admin sees all.
drop policy if exists "reviews: read approved, own or admin" on public.reviews;
create policy "reviews: read approved, own or admin" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());

-- Only the admin changes a review directly (approve / reject). Customers go through submit_review.
drop policy if exists "reviews: admin update" on public.reviews;
create policy "reviews: admin update" on public.reviews
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- Customers: write or edit a review ------------------------
create or replace function public.submit_review(
  p_product_id uuid,
  p_rating int,
  p_body text,
  p_display_name text,
  p_image_paths text[]
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid;
  v_platform text;
  v_path text;
  v_paths text[] := coalesce(p_image_paths, '{}');
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_name text := trim(coalesce(p_display_name, ''));
begin
  if v_uid is null then
    raise exception 'Sign in to write a review';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Pick a rating from 1 to 5 stars';
  end if;
  if v_name = '' or char_length(v_name) > 40 then
    raise exception 'Enter the name to show with your review (up to 40 characters)';
  end if;
  if v_body is not null and char_length(v_body) > 1000 then
    raise exception 'Keep your review under 1000 characters';
  end if;
  if coalesce(array_length(v_paths, 1), 0) > 3 then
    raise exception 'Attach at most 3 screenshots';
  end if;
  foreach v_path in array v_paths loop
    if v_path is null or split_part(v_path, '/', 1) <> v_uid::text or v_path not like '%.webp' then
      raise exception 'Upload your screenshot again';
    end if;
  end loop;

  -- Only customers who received this game can review it.
  select o.id, oi.platform into v_order, v_platform
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
   where o.user_id = v_uid and o.status = 'delivered' and oi.product_id = p_product_id
   order by o.delivered_at desc nulls last
   limit 1;
  if v_order is null then
    raise exception 'You can review games once they are delivered to you';
  end if;

  insert into public.reviews (user_id, product_id, order_id, platform, display_name, rating, body, image_paths)
  values (v_uid, p_product_id, v_order, v_platform, v_name, p_rating, v_body, v_paths)
  on conflict (user_id, product_id) do update
     set order_id = excluded.order_id,
         platform = excluded.platform,
         display_name = excluded.display_name,
         rating = excluded.rating,
         body = excluded.body,
         image_paths = excluded.image_paths,
         status = 'pending',
         admin_note = null,
         approved_at = null,
         updated_at = now();
end;
$$;

revoke execute on function public.submit_review(uuid, int, text, text, text[]) from public, anon;
grant execute on function public.submit_review(uuid, int, text, text, text[]) to authenticated;

-- ---------- Storage: review screenshots (.webp only) ------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-images', 'review-images', true, 2097152, array['image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/webp'];

drop policy if exists "review-images owner upload" on storage.objects;
create policy "review-images owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);
