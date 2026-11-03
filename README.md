# PS GAMING HUB

Online store for PS5, PS4 and PC games. Built with **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Supabase**.

Customers pay by **direct UPI**, submit their **UTR + payment screenshot**, you verify it in the admin panel, complete delivery with the customer on WhatsApp, then upload the **purchase receipt** and mark the order delivered.

---

## Order flow

| Status | Who acts | What happens |
|---|---|---|
| **Awaiting payment** | Customer | Order placed. Order page shows your UPI QR (amount + order number pre-filled) and a "Pay with UPI app" button on mobile. |
| **Verifying payment** | You | Customer submitted UTR + screenshot. Check the UTR and amount in your bank/UPI app, then click **Verify** or **Reject** (with a reason the customer sees). |
| **Processing** | You | Payment confirmed. Use the WhatsApp buttons to message the customer and do the QR step. |
| **Delivered** | — | You uploaded the receipt. The customer can download it from their order page. |
| **Payment rejected** | Customer | Customer sees your note and can submit a new UTR/screenshot. |

Built-in protections:
- Prices and discounts are recalculated in the database (`place_order`), so nobody can change a price in the browser.
- A UTR can only be used on **one** order (database unique index), which blocks reused screenshots.
- Payment screenshots and receipts live in **private** storage. Only the customer and admins can open them.
- Customers can't edit orders directly. Only the database functions and admins can.

---

## 1. Set up Supabase (10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and click **Run**.
3. Do the same with `supabase/seed.sql` to add sample products (optional, edit/delete later in the admin).
3a. Then run `supabase/migrations/002_slots.sql` (Primary / Secondary slots, delivery details, hides PC games and PS Plus).
   Set each game's **Secondary slot price** in Admin → Products; games without one are sold as Primary only.
3b. Optional, order emails: create a free [Resend](https://resend.com) account, then set `RESEND_API_KEY` and
   `ORDER_ALERT_EMAIL` (the email you signed up to Resend with) in `.env.local`. You get one email per payment
   with lines like `PS5 Secondary – John – +91 6239689030`.
4. Go to **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (change to your real domain after deploying)
   - **Redirect URLs:** add `http://localhost:3000/auth/callback` and later `https://yourdomain.com/auth/callback`
5. Optional, for faster testing: **Authentication → Providers → Email → turn off "Confirm email"**. Turn it back on before launch.

## 2. Run the site locally

You need [Node.js 20+](https://nodejs.org).

```bash
cd ps-gaming-hub
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
```

Fill in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase → **Project Settings → API**
- `NEXT_PUBLIC_UPI_ID`: your UPI ID (e.g. `psgaminghub@okaxis`)
- `NEXT_PUBLIC_UPI_NAME`: name shown in the UPI app
- `NEXT_PUBLIC_WHATSAPP`: your WhatsApp number with country code, digits only (e.g. `919876543210`)

```bash
npm run dev
```

Open http://localhost:3000.

## 3. Make yourself admin

1. On the site, click the person icon and **create an account** with your email.
2. In Supabase **SQL Editor**, run (with your email):

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

3. Refresh the site. An **Admin** button appears in the header, at `/admin`.

## 4. Admin panel

- **`/admin`**: order queue. The **To verify** and **To deliver** tabs list the oldest orders first, so nobody waits too long. Search by order number, UTR, PSN ID or phone.
- **Order page**: UTR, amount, screenshot, Verify/Reject, one-click WhatsApp messages, receipt upload + mark delivered, manual status override.
- **`/admin/products`**: add or edit games, prices, original (strikethrough) price, platforms, cover image, featured/hidden.

## 5. Deploy (free)

1. Push this folder to a GitHub repo.
2. Import it on [vercel.com](https://vercel.com) and add the same environment variables (set `NEXT_PUBLIC_SITE_URL` to your domain).
3. Add your domain's `/auth/callback` URL in Supabase redirect URLs and update the Site URL.

---

## Customise

- **Colors and fonts**: `src/app/globals.css` (`@theme` block) and `src/app/layout.tsx`.
- **Bundle offer** (currently 2 games = 10% off, 3+ = 15% off): change it in **both** `src/lib/store.ts` (`BUNDLE_OFFER`) and `place_order` in `supabase/schema.sql` (re-run that function).
- **FAQ and homepage text**: `src/app/page.tsx`.
- **Delivery steps text**: `src/components/HowItWorks.tsx`.

## Project structure

```
supabase/schema.sql        tables, security rules, storage buckets, order + payment functions
supabase/seed.sql          sample products
src/app/                   pages: home, collections, products, search, login, checkout, orders, admin
src/app/admin/actions.ts   admin server actions (verify, reject, deliver, products)
src/components/            header, cart drawer, product cards, timeline…
src/lib/                   Supabase clients, product queries, store settings, types
```

## Ideas for later

- Email notifications (e.g. Resend) when an order is paid or delivered.
- Telegram/WhatsApp alert to you when a customer submits payment.
- Razorpay as a second payment option for instant auto-verification.
- Customer reviews section.
