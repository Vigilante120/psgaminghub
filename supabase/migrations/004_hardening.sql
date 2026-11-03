-- =====================================================================
-- PS GAMING HUB — migration 004: pre-launch security hardening
-- Run once in Supabase → SQL Editor after 002_slots.sql. Safe to re-run.
-- =====================================================================

-- ---------- Storage: enforce file type and size on the server (M2) ----
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/heic']
where id = 'payment-proofs';

update storage.buckets set file_size_limit = 10485760,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
where id = 'receipts';

update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
where id = 'product-images';

-- ---------- Orders: field lengths and unpaid-order limit (M4) ---------
alter table public.orders
  drop constraint if exists orders_customer_name_len,
  drop constraint if exists orders_email_len,
  drop constraint if exists orders_whatsapp_len,
  drop constraint if exists orders_notes_len,
  drop constraint if exists orders_delivery_name_len,
  drop constraint if exists orders_delivery_phone_len,
  drop constraint if exists orders_utr_len;

alter table public.orders
  add constraint orders_customer_name_len  check (char_length(customer_name) <= 100),
  add constraint orders_email_len          check (char_length(email) <= 254),
  add constraint orders_whatsapp_len       check (char_length(whatsapp) <= 20),
  add constraint orders_notes_len          check (notes is null or char_length(notes) <= 1000),
  add constraint orders_delivery_name_len  check (delivery_name is null or char_length(delivery_name) <= 100),
  add constraint orders_delivery_phone_len check (delivery_phone is null or char_length(delivery_phone) <= 20),
  add constraint orders_utr_len            check (utr is null or char_length(utr) <= 30);

create or replace function public.limit_open_orders()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.orders
       where user_id = new.user_id and status = 'awaiting_payment'
         and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'You have too many unpaid orders. Pay for one first or message us on WhatsApp.';
  end if;
  return new;
end;
$$;

revoke execute on function public.limit_open_orders() from public, anon, authenticated;

drop trigger if exists orders_limit_open on public.orders;
create trigger orders_limit_open before insert on public.orders
  for each row execute function public.limit_open_orders();

-- ---------- submit_payment: check ownership before the UTR check (L1) -
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
  -- Ownership + status first, so the UTR check below can't be used to probe other orders.
  if not exists (select 1 from public.orders
                  where id = p_order_id and user_id = auth.uid()
                    and status in ('awaiting_payment', 'rejected')) then
    raise exception 'This order cannot accept a payment right now';
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

-- ---------- Functions: signed-in users only (L6) ----------------------
revoke execute on function public.place_order(jsonb, text, text, text, text) from public, anon;
revoke execute on function public.submit_payment(uuid, text, text, text, text) from public, anon;
revoke execute on function public.claim_order_notification(uuid) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text) to authenticated;
grant execute on function public.submit_payment(uuid, text, text, text, text) to authenticated;
grant execute on function public.claim_order_notification(uuid) to authenticated;
