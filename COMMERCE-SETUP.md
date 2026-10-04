# Marvell Commerce — Setup

Everything built for the October 2026 launch, and the exact steps needed to
make it live. Nothing in this document is automatic: the code is in place, but
it stays dormant until the environment variables below exist.

**Current state:** with no keys configured, the site behaves exactly as it does
today, plus the retail layer inside Featured. Checkout shows an honest "payment
is not live yet" panel with a WhatsApp handover. Nothing can be bought, and
nothing is broken.

**There is no Collections page.** A collection groups the catalogue and orders
what is merchandised; it has no URL of its own. Retail lives in Featured, and
`/collections`, `/collections/*` and `/shop` are permanent redirects there.

**Local development is `netlify dev` on <http://localhost:8888>** — the
canonical environment, and the only one that runs the real functions. See
[Local development](#5-local-development).

```bash
npm run dev        # netlify dev on :8888 — the real thing
npm run doctor     # what is wired up, without printing a single secret
```

To see the shop before Supabase exists, `npm run dev:static` serves the site on
:8889 with placeholder mode on. See [Placeholder shop](#0-placeholder-shop) for
what that mode is and why it cannot reach production by accident.

---

## 0. Placeholder shop

The repository ships a working demonstration catalogue — two collections and
nine SKUs — so the shop can be designed, reviewed and shown to people before
any database exists.

| | |
|---|---|
| Editorial content | `content/retail-products.json`, `content/collections.json` |
| Invented prices and stock | `content/placeholder-commerce.json` |
| Switch | `SHOP_PLACEHOLDER_MODE=true` |

The demonstration data covers every state the interface can render, so a
preview shows the awkward cases and not just the happy path: pieces in stock,
one down to its last two, one sold out, and an unlaunched Christmas collection
whose pieces are visible but not for sale.

**Placeholder mode cannot reach production by accident.** Three conditions must
all hold, and any one of them failing switches it off:

1. `SHOP_PLACEHOLDER_MODE` is explicitly `true` — it defaults to off
2. Supabase is **not** configured — real data always wins
3. `IPAYMU_ENVIRONMENT` is `sandbox` — production is deliberately unsupported

Checkout refuses regardless: it requires both Supabase and iPaymu sandbox
credentials, so nothing can be bought at an invented price even with the flag
on. And whenever the mode is active, every commerce page carries a visible
**Preview** notice saying the prices are placeholders. That notice is rendered
by the same code that loads the catalogue, so a page cannot show placeholder
pricing without it.

### Turning the placeholder off

Once the real SKUs are in `products_commerce`, placeholder mode switches itself
off — condition 2 above. You can then delete `content/placeholder-commerce.json`
and replace the demonstration products and collections in Decap with the real
ones. Nothing else refers to them.

---

## 1. What is where

| Concern | Owner | Edited in |
|---|---|---|
| Collection story, hero, palette, dates | Decap | `content/collections.json` |
| Product name, photos, description, materials | Decap | `content/retail-products.json` |
| **Price** | Supabase | `products_commerce.price_idr` |
| **Stock** | Supabase | `products_commerce.stock_quantity` |
| **On sale / sold out, right now** | Decap | `content/retail-commerce.json` |
| Orders, payments, reservations | Supabase | written only by server code |
| Customer accounts | Supabase Auth | `auth.users` + `customer_profiles` |

### The on-sale switch

Stock is Supabase's because it has to be: a quantity has to be held against a
concurrent order, and a file in git cannot do that. But taking a piece off
sale is a decision somebody makes in the middle of a Tuesday, and it should
not need a database console.

**Shop → Stock & Availability** in the CMS edits `content/retail-commerce.json`.
Every row has a **Bisa Dibeli** switch. Turn it off and that piece is sold
out from the next deploy, whatever Supabase says.

The switch only ever goes one way. For a SKU Supabase already answers for,
the file's price and stock figures are ignored entirely — only `available:
false` is honoured. That is what makes it safe to throw at any time: it
cannot put stock back on top of the source that is holding it, so it can
never oversell.

For a SKU Supabase has **no row for yet**, the file answers in full — price
and stock included. That is how a collection goes on sale before anybody has
written it into the database, and it is how Mother's Day sells today.

The two halves are joined by SKU. A SKU that exists in Decap but not in
Supabase renders as editorial content with no price and no Add to Bag. A SKU in
Supabase with no Decap entry never appears at all. **Both are required.**

Historical portfolio pieces are untouched: they have no SKU, so they cannot
acquire a price or a bag button.

---

## 2. Manual actions

### 2.1 Supabase

1. Create a project (region: Singapore is closest to Batam).
2. Open **SQL Editor** and run, in order:
   - `supabase/migrations/0001_commerce_core.sql`
   - `supabase/migrations/0002_security_rls.sql`
   - `supabase/migrations/0003_order_functions.sql`
   - `supabase/migrations/0004_staff_views.sql`
   - `supabase/migrations/0005_accounts.sql`
   - `supabase/migrations/0006_newsletter_names.sql`
   - `supabase/migrations/0007_my_marvell_profiles.sql`
   - `supabase/migrations/0008_wishlists_and_preferences.sql`

   0008 creates `wishlist_lists` and `wishlist_items`. Without it the wishlist
   endpoint fails on every call, and the browser falls back to the device
   list — so a signed-in customer is told their wishlist is saved on this
   device, with no error anywhere to explain why.

   0007 is what separates a Supabase Auth user from an account.
   Without it, neither Sign In nor Create your account can work: both ask
   `my_marvell_account()` whether an address already has an account, and
   `profile_completed_at` is the column that answers. `npm run doctor -- --live`
   names anything missing.
3. Run the seeds in `supabase/seed/`:
   - `0001_soft_tones.sql` — the Soft Tones and Christmas rows
   - `0002_mothers_day.sql` — the Mother's Day collection

   **Edit the prices and stock counts in those files first** — the values in
   them are placeholders for testing, not real numbers. Until `0002` is run,
   Mother's Day is priced from `content/retail-commerce.json`, which works but
   cannot hold stock against a concurrent order.
4. Copy **Project URL** and the **`service_role`** key from
   Settings → API. The service role key is a full-access credential: it goes
   into Netlify only, never into the repository, a browser, or a screenshot.
5. Optional but recommended — schedule the reservation sweeper as a second
   safety net alongside the Netlify scheduled function, under
   Database → Cron:
   ```sql
   select cron.schedule(
     'expire-stale-reservations',
     '*/10 * * * *',
     $$select expire_stale_reservations()$$
   );
   ```

**Note:** the site never talks to Supabase from the browser. The anon key is
configured (`SUPABASE_ANON_KEY`) because the account sign-in endpoints call
Supabase Auth with it, but it stays in Netlify's environment with the service
role key — no Supabase key of any kind is ever served to a page.

### 2.2 Brevo — already configured

Done: domain authentication, branded subdomain, the **Marvell Newsletter**
list (**ID 3**), and the attributes `EMAIL_OPT_IN`, `WHATSAPP_OPT_IN`,
`SOURCE`, `CONSENT_DATE`.

The code writes these on every signup:

| Attribute | Type | Written |
|---|---|---|
| `FIRSTNAME` | Text | Brevo standard |
| `EMAIL_OPT_IN` | Boolean | the email checkbox, on its own |
| `WHATSAPP_OPT_IN` | Boolean | the WhatsApp checkbox, on its own |
| `SOURCE` | Text | where the drawer was opened from |
| `CONSENT_DATE` | Date | the date of this signup or update, Jakarta time |
| `WHATSAPP` | Brevo standard phone | **only** when WhatsApp was ticked |

`WHATSAPP` is Brevo's own attribute rather than a second custom phone field.
A number given without the WhatsApp box ticked is never sent at all.

**Nothing to do unless** you want a separate WhatsApp-only list: create it and
set `BREVO_WHATSAPP_LIST_ID`. Left blank, everyone goes to list 3 only.

**To check it is working** after deploy: submit the drawer on the live site,
then open the contact in Brevo and confirm `CONSENT_DATE` is today and the two
opt-in booleans match what you ticked.

**VS Code Live Server:** Live Server cannot run `/api/newsletter` by itself.
Put `BREVO_API_KEY` and `BREVO_LIST_ID` in the local `.env`, then run
`npm run newsletter:live-server` in a terminal while Live Server is serving
the site on a port in the 5500–5599 range. The signup form automatically
uses the loopback newsletter API on port 8787 in that setup. The API uses the
same Netlify handler and keeps the Brevo key out of browser code. Opening the
site with `npm run dev` instead uses Netlify's API directly.

**The signup dialog**

The form in the footer asks for an email address. Entering it opens a dialog
that shows the address back and offers a salutation, a first name and a last
name — all optional — with the consent sentence above the Submit button.
Nothing is sent until that button.

`FIRSTNAME` and `LASTNAME` are Brevo's own built-in attributes and need no
setup. The salutation is **not** sent by default: Brevo rejects an entire
contact for one attribute it has not been told about, and losing a
subscription over a salutation is a bad trade. To send it:

1. Brevo → Contacts → Settings → Contact attributes → create a **text**
   attribute, e.g. `TITLE`.
2. Set `BREVO_TITLE_ATTRIBUTE=TITLE` in Netlify.

Either way the choice is recorded in our own `newsletter_events` table, which
is the consent proof that does not depend on Brevo.

### 2.3 iPaymu API v2 — sandbox only

1. Create or sign into the separate iPaymu Sandbox account at
   `https://sandbox.ipaymu.com`.
2. From Sandbox → Integration/API Key, copy the sandbox **VA** and **API Key**.
   They are server-side credentials and belong only in Netlify's Functions
   environment scope (or the gitignored local `.env`).
3. Set the callback type to `application/json` and configure the notification
   URL in the sandbox integration settings:
   ```
   https://marvellflorist.com/api/payments/ipaymu/webhook
   ```
4. Set `IPAYMU_ENVIRONMENT=sandbox`, `IPAYMU_VA`, and `IPAYMU_API_KEY` in
   Netlify, redeploy, then complete an end-to-end sandbox order and confirm the
   stock movement in Supabase.
5. To simulate a paid callback, use `https://sandbox.ipaymu.com/notify` with
   the Session ID, transaction ID, or merchant reference from the test order.

Marvell never receives card details. iPaymu's hosted checkout collects payment
details and the application receives only session, transaction, and status data.

Production is intentionally incomplete. The code contains no production iPaymu
base URL or enable switch because ordinary Netlify Functions do not provide the
static outbound IP required by iPaymu Live.

### 2.4 Netlify

1. Add every variable from `.env.example` under
   Site settings → Environment variables.
2. Confirm Functions are enabled (the first deploy with `netlify/functions/`
   present turns them on).
3. After deploying, check the scheduled function `reservations-cleanup` appears
   under Functions and is running every 10 minutes.

### 2.5 Accounts — what is built, and what is still yours to switch on

The account system is built and tested. It is passwordless by design: there is
no password field, no password endpoint and nothing to leak. Signing in means
proving you can read a mailbox, or letting Google prove it for you.

**How it works**

| Route | Does |
|---|---|
| `POST /api/account/request-code` | Supabase mints a one-time code and a hashed token; Brevo delivers both |
| `POST /api/account/verify` | Supabase checks the code; the session goes into httpOnly cookies |
| `/my-marvell` | the sign-up page: email or Google, then title and last name |
| `GET /api/account/confirm` | the link in the same email, exchanged server-side |
| `GET /api/account/session` | who is signed in; `PATCH` saves details, `DELETE` signs out |
| `GET /api/account/orders` | that person's orders and receipts |
| `GET /api/account/google` | Continue with Google (PKCE, server-side) |

The session lives in `mv_session` and `mv_refresh` — httpOnly, Secure,
SameSite=Lax, the refresh cookie scoped to `/api/account`. Page script cannot
read either, which is why no Supabase key has to reach the browser.

**Email delivery: nothing further to configure.**

Sign-in codes go out through the Brevo transactional API from
`BREVO_ACCOUNT_SENDER` (defaults to `info@`), using the API key that already
works. **Supabase SMTP is deliberately not used and does not need to be set
up**: Supabase only generates the code, and we deliver it. That avoids
Supabase's built-in SMTP, which is rate-limited to a handful of messages an
hour and is not meant for production.

If you would rather Supabase sent the mail itself, point
Authentication → Settings → SMTP at Brevo's SMTP relay — but then the branding
of those emails moves into Supabase's templates, and this code would need to
call `signInWithOtp` instead. The current arrangement keeps the sign-in email
looking like the rest of Marvell's mail.

**Still to do — Supabase Auth settings**

1. Authentication → Providers → **Email**: leave it enabled. Turn
   **Confirm email** on. Passwords are not used either way.
2. Authentication → URL Configuration → **Site URL**:
   `https://marvellflorist.com`.
3. Same screen → **Redirect URLs**, add:
   - `https://marvellflorist.com/api/account/google/callback`
   - your Netlify preview domain's equivalent, if you sign in on previews
4. Authentication → Rate limits: the defaults are fine; the endpoints add
   their own tighter limits per IP and per address.
5. Settings → API → copy the **service_role** key into Netlify as
   `SUPABASE_SERVICE_ROLE_KEY`. It is the one value still missing: without it
   sign-in codes cannot be generated and order history cannot be read. Never
   paste it into a chat, a screenshot or the repository.

**Continue with Google — the exact callback URL**

The button is built and visible on both the panel and `/my-marvell`, and is
plainly disabled until Supabase reports the provider as on. Two URLs are
needed, and they are different things:

| Goes into | Value |
|---|---|
| **Google Cloud → Authorised redirect URI** | `https://zvjhsqewwhtcfxpegagq.supabase.co/auth/v1/callback` |
| **Supabase → Redirect URLs** | `https://marvellflorist.com/api/account/google/callback` |

Google redirects to Supabase; Supabase redirects to us. Putting our URL into
Google, or Google's into Supabase, is the usual way this fails.

For a Netlify preview or local work, add the same path on that origin to
Supabase's Redirect URLs — for example
`http://localhost:8888/api/account/google/callback`.

**Still to do — Google, in two consoles**

*Google Cloud Console*

1. APIs & Services → OAuth consent screen: External, app name **Marvell
   Florist**, support email `hello@marvellflorist.com`, authorised domain
   `marvellflorist.com`. Add the `email`, `profile` and `openid` scopes.
2. Credentials → Create credentials → **OAuth client ID** → Web application.
3. **Authorised JavaScript origins:** `https://marvellflorist.com`
4. **Authorised redirect URI** — this one is Supabase's, not ours:
   `https://zvjhsqewwhtcfxpegagq.supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client secret**.

*Supabase*

6. Authentication → Providers → **Google**: enable it, paste the client ID and
   secret, save.

Until step 6 is done, `/api/account/session` reports `providers.google: false`
and the panel does not draw the button — it is never shown on a door that does
not open. Nothing else needs changing when you switch it on.

**Historical guest orders**

After somebody signs in, `claim_orders_for_user()` attaches any order whose
email matches the address Supabase has confirmed. The address is read from
`auth.users` inside that function — never from the browser — and an
unconfirmed address claims nothing. Guest orders that are never claimed stay
exactly as they are, and checkout never asks for an account.

### 2.6 Email identity — already configured

All three mailboxes exist and are verified:

| Address | Used for | Variable |
|---|---|---|
| `info@marvellflorist.com` | newsletters, campaigns, brand communication | `BREVO_NEWSLETTER_SENDER` |
| `hello@marvellflorist.com` | inquiries, consultations, fresh-flower requests | `MARVELL_INQUIRY_EMAIL` |
| `orders@marvellflorist.com` | receipts and order status — **nothing sends here yet** | `BREVO_ORDER_SENDER` |
| `info@marvellflorist.com` | Account sign-in codes (transactional, never a list) | `BREVO_ACCOUNT_SENDER` |

`hello@` is now the published contact address across the site, replacing the
old Gmail address. WhatsApp consultation is untouched and remains the primary
contact route everywhere it already was.

The Brevo service reads all three through `senders` in
`netlify/functions/_lib/brevo.mjs`, so receipt code added later inherits the
right From address instead of inventing one.

---

## 3. Launching a collection

1. **Decap → Shop — Products**: add each piece. The SKU is permanent — it is
   the join key to price and stock, and changing it later orphans the product.
   Slugs become URLs (`/product/soft-tones-no-1`).
2. **Decap → Shop — Collections**: create the launch, set `status`, and list
   the SKUs in the order they should appear. This is a grouping, not a page —
   an `active` collection is what puts its SKUs in front of a shopper.
3. **Supabase → `products_commerce`**: insert a row per SKU with the real price
   and stock. Nothing is purchasable until this exists.
4. Set the collection `status` to `active`.
5. Run `node scripts/build-sitemap.mjs` and commit the updated `sitemap.xml`.

**To take something off sale:** set `purchasable = false` (stays visible, loses
Add to Bag) or `active = false` (disappears from the shop). Do not delete the
row — order history references the SKU.

---

## 4. How an order actually works

```
browser                    our server                 Supabase / iPaymu Sandbox
───────                    ──────────                 ───────────────────
bag: [{sku, qty}]
        │
        ├── POST /api/cart/validate ──► load real prices + stock
        │                               recompute every total
        │   ◄── corrected lines ────────┘
        │
        ├── POST /api/checkout ───────► validate customer data
        │                               re-price from the database
        │                               reserve stock ATOMICALLY
        │                               sign API v2 request
        │                               request hosted payment URL
        │   ◄── payment_url ────────────┘
        │
        ├── browser redirects to iPaymu hosted checkout
        │
        │                               iPaymu ────► POST /api/payments/ipaymu/webhook
        │                                            verify callback HMAC-SHA256
        │                                            re-confirm with iPaymu v2
        │                                            commit stock, mark paid
        │
        └── /order/MF-… polls until the webhook lands
```

The browser saying "payment succeeded" only navigates to the confirmation page.
It cannot mark anything paid. Only the signed webhook can.

Unpaid orders release their stock after `RESERVATION_TTL_MINUTES` (default 30),
swept every 10 minutes.

---

## 5. Local development

### 5.1 The canonical environment

**`netlify dev` on <http://localhost:8888> is the only local environment that
runs the real application architecture.** Same functions, same routing table,
same redirects, same env-var contract as production — the difference is only
where the secrets come from. A feature is tested when it has been exercised
here, and not before.

```bash
npm install
cp .env.example .env     # fill in what you have; blanks degrade gracefully
npm run dev              # netlify dev on :8888
npm run doctor           # what is ready, what is blocked, and why
npm run doctor -- --live # also calls Supabase and Brevo, read-only
```

VS Code Live Server is **not** a backend environment and must not be used as
one. Neither is `npm run dev:static` (the dependency-free stand-in, on :8889).
Both serve files; neither runs `netlify/functions`, so every endpoint below is
simply absent on them:

| Cannot be tested without `netlify dev` |
|---|
| Brevo newsletter subscriptions |
| Supabase reads and writes |
| Passwordless accounts sign-in |
| Continue with Google |
| Bag / server-side cart validation |
| iPaymu Sandbox checkout |

`netlify dev` reads `.env` at startup and prints the name of every variable it
injected. **Restart it after editing `.env`** — values are captured once.

> **Keep this directory unlinked.** If it is ever `netlify link`ed, the CLI also
> pulls the production site's environment, which would point local development
> at the real Brevo list and the production Supabase keys. Check the startup log
> if unsure: it names each variable and its source.

### 5.2 Two values that must differ from production

| Variable | Local | Production |
|---|---|---|
| `SITE_ORIGIN` | `http://localhost:8888` | `https://marvellflorist.com` |
| `BREVO_LIST_ID` | your localhost test list | `3` (real audience) |

`SITE_ORIGIN` is not cosmetic: the sign-in link in the email, the Google PKCE
callback and payment return URLs are all built from it.

It is also the one case where the session cookies drop their `Secure` flag.
Safari refuses to store a `Secure` cookie from a plain-http origin, so signing
in on localhost would appear to work and then silently forget. The test in
`netlify/functions/_lib/accounts.mjs` is narrow — `http:` on `localhost`,
`127.0.0.1` or `[::1]` and nothing else — so no real host can opt out of
`Secure` by accident, not even `http://localhost.example.com`.

### 5.3 Brevo — a separate list for localhost

Development signups must not land in the real audience or re-trigger
production automations. Make a test list once:

1. Brevo → **Contacts** → **Lists** → **Create a list**
2. Name it something unmistakable, e.g. `Marvell Newsletter — LOCAL TEST`
3. Open it; the **id is the number in the URL** (`/contact/list/{id}`), and is
   also shown in the list header
4. Put that number in `.env` as **`BREVO_LIST_ID`**. Leave Netlify's own
   `BREVO_LIST_ID` at `3`.

`npm run doctor` warns whenever a local `BREVO_LIST_ID` is still `3`, and
`npm run doctor -- --live` prints the list's real name and contact count so you
can see at a glance which audience you are about to write to.

Two things a separate list does **not** solve, because Brevo contacts are
global and lists are only groupings:

- Subscribing a real address locally still rewrites that contact's attributes
  (`EMAIL_OPT_IN`, `CONSENT_DATE`, `SOURCE`). Use throwaway addresses —
  `you+local1@gmail.com` and friends all reach your inbox and are distinct
  contacts to Brevo.
- The API key is the same key as production. There is no sandbox mode; these
  are real API calls against the real account, which is the point.

### 5.4 Continue with Google on localhost

The existing server-side PKCE implementation already supports localhost. There
is nothing to build and **nothing to implement a second time** — it is a
configuration matter only. The redirect chain is:

```
browser  ->  http://localhost:8888/api/account/google
         ->  https://zvjhsqewwhtcfxpegagq.supabase.co/auth/v1/authorize
         ->  Google
         ->  https://zvjhsqewwhtcfxpegagq.supabase.co/auth/v1/callback   <- Google's redirect URI
         ->  http://localhost:8888/api/account/google/callback           <- Supabase's redirect URL
```

Google never sees a localhost URL; Supabase does. Putting one in the other's
field is the usual way this fails.

| Goes into | Exact value |
|---|---|
| **Google Cloud → Authorised redirect URI** | `https://zvjhsqewwhtcfxpegagq.supabase.co/auth/v1/callback` |
| **Google Cloud → Authorised JavaScript origins** | `https://marvellflorist.com` *(and `http://localhost:8888` only if a browser-side Google library is ever added — this implementation needs neither)* |
| **Supabase → Redirect URLs** | `http://localhost:8888/api/account/google/callback` |
| **Supabase → Redirect URLs** | `https://marvellflorist.com/api/account/google/callback` |
| **Supabase → Site URL** | `https://marvellflorist.com` |
| **`.env` → `SITE_ORIGIN`** | `http://localhost:8888` |

Register the production redirect URL at the same time. Supabase's redirect list
is shared, adding one does not remove the other, and it is one fewer thing to
remember at deploy.

`npm run doctor` prints these derived from your actual `SUPABASE_URL`, so they
never have to be typed from memory.

### 5.5 What each credential unblocks

| Missing | Breaks |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | bag validation, checkout, order history, **and sign-in codes** — `request-code` calls the service client to mint them |
| `BREVO_API_KEY` | newsletter **and** accounts entirely (`isAccountsConfigured` requires it, because a sign-in form that cannot deliver a code is worse than none) |
| `IPAYMU_VA` / `IPAYMU_API_KEY` | checkout stays on the honest "payments not live" panel |

Note the coupling: **`BREVO_API_KEY` gates accounts, not just the
newsletter**, and Google sign-in inherits that gate through
`isAccountsConfigured()`.

### 5.6 Walking a feature end to end

```bash
npm run doctor           # confirm the integration is actually wired up
npm run dev              # :8888
# ... exercise the flow in a browser ...
npm run check            # no secret name reachable from browser code
npm test                 # the suite
```

Only then deploy.

```bash
npm run check    # parses every script, function and content file
npm test         # validation, webhooks, cart, panels, page rendering
```

Both run without any credentials.

---

## 6. Security notes

- `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `IPAYMU_VA`, and `IPAYMU_API_KEY` are
  read only inside `netlify/functions/`. `npm run check` fails if any of those
  names appears in a browser-facing file.
- The cart in `localStorage` holds SKUs and quantities only. A price written
  into storage is discarded on read and never sent to the server.
- All totals are computed in Postgres inside the same locked transaction that
  reserves the stock, so two shoppers cannot buy the same last unit.
- iPaymu API v2 requests hash the exact JSON body with SHA-256 and sign
  `METHOD:VA:BODY_HASH:API_KEY` using HMAC-SHA256. Callback HMACs use the
  documented normalized, sorted payload and the merchant VA, and are compared
  with `timingSafeEqual`.
- CMS content is sanitised server-side: images must be site-relative, trailers
  must be YouTube or Vimeo over https, and everything is HTML-escaped at render.
- Database errors are logged server-side and never returned to a browser.
- The customer account system is passwordless: no password is collected,
  stored or checked anywhere, so there is none to leak. Sessions are httpOnly
  cookies the page cannot read; the browser holds no Supabase key.
- Identity is never taken from a request body. Orders are attached to a person
  only by an address Supabase Auth has confirmed, read server-side.
- An account is not a mailing list. Creating an account subscribes nobody, and
  `marketing_email_opt_in` is only ever set by the newsletter form.

**Known gap:** there is no Content-Security-Policy. The existing pages carry
large inline `<script>` and `<style>` blocks, so a policy strict enough to be
worth having would break them. Worth doing as its own piece of work.

---

## 7. Separate staff application

The new Marvell Admin source is under `marvell-admin/` and is configured as a
separate Netlify site. It does not replace Decap `/admin/`. Its migrations are
prepared but have **not** been applied by this repository change. Follow
[MARVELL-ADMIN-SETUP.md](MARVELL-ADMIN-SETUP.md) for the database preflight,
manual migration sequence, host configuration, owner bootstrap, and sandbox
verification.
