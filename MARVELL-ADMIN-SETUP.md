# Marvell Admin: review and manual rollout

No database migration or external dashboard change is performed by this code change.
Run the read-only preflight in the actual Supabase SQL editor before applying anything.

Read-only REST inspection on 22 September 2026 found both 0008 wishlist tables unavailable (HTTP 404) and the 0008 preference column unavailable (HTTP 400) in the configured project. A sample of commerce prices was rounded to thousands, but REST cannot prove the 0009 constraint exists. The SQL preflight below is the authoritative check; **0010 must wait until 0008 and 0009 are confirmed or applied manually**.

## 1. Database sequence

1. Run [`supabase/verify/0002_pre_admin_migration_state.sql`](supabase/verify/0002_pre_admin_migration_state.sql) in the target Supabase project. It checks for 0008 wishlist tables/preferences and RLS, and the 0009 rounded-price constraint and data. Local migration files do **not** prove those migrations reached the database.
2. If either check fails, review and apply the corresponding existing 0008 or 0009 migration manually, then rerun the preflight.
3. After review, apply [`0010_marvell_admin_core.sql`](supabase/migrations/0010_marvell_admin_core.sql), [`0011_order_notifications.sql`](supabase/migrations/0011_order_notifications.sql), [`0012_attribution_and_consent.sql`](supabase/migrations/0012_attribution_and_consent.sql), and [`0013_admin_rpc_acl_and_aal2.sql`](supabase/migrations/0013_admin_rpc_acl_and_aal2.sql) in that order. These files are generated for manual application; no code path applies them. If 0010–0012 are already present, apply only 0013: it replaces the eight Admin mutation bodies with their AAL2-guarded versions, revokes their unintended `service_role` grants, and grants EXECUTE only to `authenticated`.
4. Run [`supabase/verify/0003_admin_privileges.sql`](supabase/verify/0003_admin_privileges.sql) and [`supabase/verify/0004_admin_integrity.sql`](supabase/verify/0004_admin_integrity.sql). The privilege verifier intentionally expects the eight Admin mutation RPCs to be executable by `authenticated`, but not by `anon`, `PUBLIC`, or `service_role`. Review the counts of paid stock exceptions, missing alerts, unreviewed released stock, and outbox states.
5. Create the first owner in Supabase Auth, then seed the owner membership in the SQL editor using the real email and display name. Check that the insert returns one row:

```sql
insert into public.staff_members
  (user_id, display_name, role, active, can_manage_stock, notify_paid_orders)
select id, 'Nama Pemilik', 'owner', true, true, true
from auth.users where lower(email) = lower('owner@example.test')
returning user_id;
```

Subsequent staff invitations use the owner UI and require a fresh TOTP code. Keep the initial owner account separate from a public customer session even if the email is the same; access depends on `staff_members` and `aal2`.

## 2. Two Netlify sites

Keep the existing public site on `marvellflorist.com`, including its Decap `/admin/`. Create a **second Netlify site** from the same repository for `admin.marvellflorist.com`. Leave its base directory at the repository root, set its package directory to `marvell-admin`, and use [`marvell-admin/netlify.toml`](marvell-admin/netlify.toml). The admin publish and functions directories are specified relative to the root base directory. The public site blocks `/marvell-admin/*` so the second app does not appear on the customer host.

For local Admin development, run `npm run dev:admin` from the repository root and open `http://localhost:8890`. The command serves the separate Admin assets and functions, sets `ADMIN_SITE_ORIGIN` to the local address, and does not need `admin.marvellflorist.com` or a linked Netlify site. The storefront can run at `http://localhost:8888` with `npm run dev` at the same time. The Admin CLI reads the root `.env` for local server-side credentials; sign-in and data operations still require a configured Supabase project.

Set the following server-side environment values in the appropriate Netlify sites. Use test addresses/keys in local and preview contexts:

| Value | Public site | Admin site |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | same project | same project |
| `BREVO_API_KEY`, `BREVO_ORDER_SENDER` | customer receipts and alerts | staff sign-in and invitation |
| `SITE_ORIGIN` | `https://marvellflorist.com` | `https://marvellflorist.com` for shared helpers |
| `ADMIN_SITE_ORIGIN` | `https://admin.marvellflorist.com` for alert links | `https://admin.marvellflorist.com` for origin checks/cookies |
| `MARVELL_ADMIN_ALERT_EMAIL` | optional fallback test mailbox until staff notifications are configured | not required |

The admin app has its own host-only `mv_admin_session` and `mv_admin_refresh` cookies. The public site's customer cookies are separate. Configure the public site's iPaymu Sandbox callback as `/api/payments/ipaymu/webhook` only after sandbox verification. Do not point iPaymu at the admin host.

## 3. Authentication and operations

Supabase Auth currently provides TOTP enrollment, factor listing, challenge/verification, and an `aal2` claim in the access token. The app verifies the user with Supabase and checks active `staff_members` on every admin request. A valid `aal2` session can be reopened without another ordinary MFA challenge. Permission changes ask the owner for a fresh TOTP code. There is no custom trusted-device token.

The local enrollment button sends `POST /api/admin/mfa/enroll`; this path is handled directly by `marvell-admin/functions/admin-auth.mjs` and is included in that function's Netlify path configuration. `npm run dev:admin` sets `ADMIN_SITE_ORIGIN=http://localhost:8890`, so the POST origin check and host-only non-`Secure` development cookies work on localhost without the production domain. Production must set the HTTPS Admin origin and receives `Secure` cookies.

Supabase creates a TOTP enrollment as an `unverified` factor. The JavaScript client's `listFactors().totp` collection contains only verified factors, while unfinished factors remain in `listFactors().all`. Because Supabase does not return the old QR secret on a later page load, starting enrollment removes only unfinished TOTP factors and creates a fresh one. It never removes a verified factor at AAL1. A successful `challengeAndVerify` writes the returned AAL2 access and refresh tokens into the Admin cookies. Supabase reports that verifying a newly enrolled factor signs out the user's other sessions; this is expected platform behavior rather than a custom device mechanism.

Supabase session time box, inactivity timeout, single-session setting, and JWT lifetime are project settings. A session can require sign-in again when those settings expire or a refresh fails; the app cannot promise a fixed “remember this device” period independently of Supabase. [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa), [TOTP flow](https://supabase.com/docs/guides/auth/auth-mfa/totp), [session controls](https://supabase.com/docs/guides/auth/sessions).

In `notification_settings`, configure timezone, opening/closing hours, weekdays, `acknowledge_after_work_minutes`, and `reconcile_from` after review. Active owner/store-admin members with `notify_paid_orders` receive paid-order alerts. When none are configured, the outbox records an unconfigured fallback; `MARVELL_ADMIN_ALERT_EMAIL` may route it to a safe local/test mailbox. The verified webhook commits the paid order and outbox together, then triggers immediate delivery. The five-minute scheduled job retries, escalates, and reconciles missing rows. Email delivery is at least once; a provider acceptance followed by a database failure can produce a duplicate email. After eight failed attempts an outbox row needs manual review, exposed by the integrity SQL.

A separate five-minute payment reconciler checks recent iPaymu orders once their transaction ID is known. iPaymu's documented status endpoint requires that ID, so a callback that never arrived must be replayed from the iPaymu Sandbox notify tool. Its lookback is `PAYMENT_RECONCILE_DAYS` (default 30, maximum 90). It uses the same guarded payment commit, so a late discovery cannot claim expired stock. A payment received after its reservation deadline is paid with a stock exception. Staff must inspect availability; the resolution action checks unreserved inventory and allocates the full order atomically after a written note. If stock is still unavailable, the action fails and the order stays in the attention queue. Refunds/cancellations that require provider action remain manual in this phase; staff should use the iPaymu sandbox dashboard and record the decision outside the app until a verified refund integration exists.

## 4. Cards, receipts, and measurement

The card print size is set by `--card-width`, `--card-height`, and `--card-padding` in [`admin.css`](marvell-admin/public/assets/admin.css). Confirm printer and paper before changing these. The card carries the greeting, optional sender, and public Marvell reference. Recipient contact and fulfillment facts stay in the job view. The print dialog is followed by a separate `Sudah Dicetak` confirmation.

New public order references are random `MV-XXXX-XXXX`; historical `MF-...` references still work. Neither reference authorizes receipt access. Checkout stores a random guest receipt token for that browser; paid receipts also go by email. A lost or historical guest receipt gets a fresh email link after a generic request. The iPaymu session/transaction IDs, internal UUID, and future fiscal document number remain separate.

Google Analytics and first-party marketing events start only after an optional analytics choice. Consent can be changed using the `Cookie settings` link in the footer. Analytics failures never reverse or delay payment, stock, notifications, or printing. Owner channel/campaign figures cover only attributed, consenting sessions; “Tanpa atribusi” includes all others. The sales view reports paid online order value rather than a tax/accounting ledger. Refund amounts, payment fees, and reliable conversion rates need a later source of truth.

## 5. Review gates

Run `npm run check` and `npm test` locally after every phase. After manual migrations and test configuration, verify iPaymu sandbox checkout, delayed settlement after both elapsed and released holds, duplicate webhook, immediate staff alert, scheduled retry, role access, MFA session reopen, card print confirmation, receipt link, and consent withdrawal. A full end-to-end signoff requires iPaymu sandbox credentials and callback configuration.
