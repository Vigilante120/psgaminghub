-- =====================================================================
-- PS GAMING HUB — migration 010: payment proof without a UTR
-- Run once in Supabase → SQL Editor after 009_diwali_extended.sql. Safe to re-run.
--   * Customers pay by QR (₹2,000 per scan, so bigger totals are split into
--     several payments) or straight to the UPI ID, then upload one screenshot
--     per payment and confirm on WhatsApp. No UTR is asked for any more.
--   * orders.payment_screenshot_paths holds every screenshot; the old single
--     payment_screenshot_path keeps the first one so older screens still work.
--   * The old submit_payment (with UTR) is left in place for pages that are
--     still open from before the update.
-- =====================================================================

alter table public.orders
  add column if not exists payment_screenshot_paths text[];

create or replace function public.submit_payment_proof(
  p_order_id uuid,
  p_screenshot_paths text[],
  p_delivery_name text,
  p_delivery_phone text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_path text;
  v_count int := coalesce(array_length(p_screenshot_paths, 1), 0);
begin
  if v_count = 0 then
    raise exception 'Attach the screenshot of your payment';
  end if;
  if v_count > 10 then
    raise exception 'Attach at most 10 screenshots';
  end if;
  -- Every screenshot must sit in the customer's own folder in payment-proofs.
  foreach v_path in array p_screenshot_paths loop
    if v_path is null or split_part(v_path, '/', 1) <> auth.uid()::text then
      raise exception 'Upload your payment screenshot again';
    end if;
  end loop;
  if coalesce(trim(p_delivery_name), '') = ''
     or length(regexp_replace(coalesce(p_delivery_phone, ''), '\D', '', 'g')) < 10 then
    raise exception 'Enter your name and a valid phone number';
  end if;

  update public.orders
     set payment_screenshot_path = p_screenshot_paths[1],
         payment_screenshot_paths = p_screenshot_paths,
         utr = null,
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

revoke execute on function public.submit_payment_proof(uuid, text[], text, text) from public, anon;
grant execute on function public.submit_payment_proof(uuid, text[], text, text) to authenticated;
