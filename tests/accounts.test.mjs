/**
 * The account.
 *
 * These tests are about the promises the account system makes, not about its
 * wiring. Each one is a rule that would be quietly easy to break later:
 *
 *   · the browser never receives a Supabase key, and the session is not
 *     readable by page script
 *   · identity comes from Supabase, never from an email address in a request
 *   · an account is not a mailing list, and a mailing list is not an account
 *   · an order is not an account: guest checkout keeps working, guest orders
 *     are kept, and historical orders are only ever attached to a confirmed
 *     address
 *   · nothing pretends to work before it is configured
 *   · a Supabase Auth user is not an account
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), "utf8");

const ACCOUNTS = await read("netlify/functions/_lib/accounts.mjs");
const REQUEST_CODE = await read("netlify/functions/account-request-code.mjs");
const VERIFY = await read("netlify/functions/account-verify.mjs");
const CONFIRM = await read("netlify/functions/account-confirm.mjs");
const SESSION = await read("netlify/functions/account-session.mjs");
const ORDERS = await read("netlify/functions/account-orders.mjs");
const GOOGLE = await read("netlify/functions/account-google.mjs");
const REGISTER = await read("netlify/functions/account-register.mjs");
const SIGNIN_CODE = await read("netlify/functions/_lib/signin-code.mjs");
const MIGRATION = await read("supabase/migrations/0005_accounts.sql");
const PROFILES = await read("supabase/migrations/0007_my_marvell_profiles.sql");
const PANEL = await read("assets/account.js");
const ENV = await read("netlify/functions/_lib/env.mjs");
const JOIN = await read("account.html");

// ------------------------------------------------------------ the session --

test("no Supabase key ever reaches the browser", async () => {
  // The rule the whole project is built on. If a key appears in assets/, the
  // session stops being something only the server can mint.
  const assets = await readdir(new URL("assets/", ROOT));
  for (const name of assets.filter((file) => file.endsWith(".js"))) {
    const source = await read(`assets/${name}`);
    assert.ok(!/SUPABASE_(URL|ANON|SERVICE)/i.test(source), `${name} names a Supabase variable`);
    assert.ok(!/createClient\(/.test(source), `${name} builds a Supabase client`);
    // A JWT in page source would be a key in page source.
    assert.ok(!/eyJ[A-Za-z0-9_-]{20,}\./.test(source), `${name} looks like it carries a token`);
  }

  // Both keys are read in the functions' own env module and nowhere else.
  assert.match(ENV, /SUPABASE_ANON_KEY/);
  assert.match(ENV, /never sent to a\n   \* browser/);
});

test("the session cookies cannot be read, stolen in transit, or sent off-site", () => {
  const cookieFn = ACCOUNTS.slice(ACCOUNTS.indexOf("function cookie("), ACCOUNTS.indexOf("export function sessionCookies"));
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax"]) {
    assert.match(cookieFn, new RegExp(`"${flag}"`), `session cookies must set ${flag}`);
  }

  // The refresh token is the long-lived one, so it does not ride along with
  // every request to the site — only the endpoints that can use it.
  assert.match(ACCOUNTS, /REFRESH_COOKIE, session\.refresh_token, \{ maxAge: REFRESH_MAX_AGE, path: "\/api\/account" \}/);

  // Signing out ends the session at Supabase too. Clearing a cookie alone
  // leaves a refresh token that still works for a month.
  assert.match(ACCOUNTS, /auth\/v1\/logout/);
  assert.match(SESSION, /await revokeSession\(session\.accessToken\)/);
});

test("the panel is told who somebody is; it never decides", () => {
  assert.match(PANEL, /credentials: "same-origin"/, "the cookie is what authenticates");
  assert.match(PANEL, /state\.signedIn = Boolean\(data\?\.signed_in && data\?\.user\)/);
  assert.ok(
    !/localStorage\.(get|set|remove)Item|sessionStorage\.setItem\([^)]*session/i.test(PANEL),
    "nothing about a session is kept in the browser"
  );

  // And it asks again every time it opens, so a session ended elsewhere is
  // not still being drawn here.
  assert.match(PANEL, /refreshSession\(\);\n    \}/);
});

// ------------------------------------------------------------- identity ----

test("an email address in a request body is never identity", () => {
  // The claim function takes a user id and reads the address itself. If it
  // took an email, anyone could ask for anyone's orders.
  assert.match(MIGRATION, /create or replace function claim_orders_for_user\(p_user_id uuid\)/);
  assert.match(MIGRATION, /from auth\.users u\s*\n\s*where u\.id = p_user_id/);
  assert.match(MIGRATION, /security definer/);

  // An unconfirmed address claims nothing.
  assert.match(MIGRATION, /if v_email is null or v_confirmed is null then\s*\n\s*return 0;/);

  // And the JS never passes an address to it.
  assert.match(ACCOUNTS, /rpc\("claim_orders_for_user", \{ p_user_id: user\.id \}\)/);

  // Orders are selected by the user id alone.
  assert.match(ORDERS, /\.eq\("customer_user_id", session\.user\.id\)/);
  assert.ok(!/\.eq\("email"/.test(ORDERS), "never by an email the browser supplied");
});

test("the account endpoints refuse to trust the caller about who they are", () => {
  for (const [name, source] of Object.entries({ SESSION, ORDERS })) {
    assert.match(source, /readSession\(request\)/, `${name} reads the session`);
  }
  assert.match(ORDERS, /if \(!session\) \{\s*\n\s*return fail\("not_signed_in"/);

  // Nothing about a person is editable except by that person, and marketing
  // consent is not editable here at all. The write is scoped inside
  // updateProfileRow now, so the invariant is in two halves: the endpoint
  // hands it the id from the verified session, and the helper is the only
  // thing that decides which row a patch lands on.
  assert.match(SESSION, /updateProfileRow\(getServiceClient\(\), session\.user\.id, patch\)/);
  assert.ok(!/updateProfileRow\([^)]*body/.test(SESSION), "never an id from the request body");
  assert.match(ACCOUNTS, /export async function updateProfileRow\(serviceClient, userId, patch\)/);
  for (const write of ACCOUNTS.split("export async function updateProfileRow")[1].split("\n\n")[0]
    .matchAll(/\.update\(/g)) {
    assert.ok(write, "the helper updates");
  }
  assert.match(
    ACCOUNTS.split("export async function updateProfileRow")[1],
    /\.update\(row\)\s*\n\s*\.eq\("user_id", userId\)/,
    "and every patch it writes is scoped to that one user"
  );

  // Preferences may change a subscription, and only for the person signed in:
  // the address it acts on comes from the verified session, never the body.
  assert.match(SESSION, /email: session\.user\.email/);
  assert.ok(!/email: body/.test(SESSION), "a subscription is never applied to an address from the request");
});

// ------------------------------------------------------------ passwordless --

test("there is no password anywhere in the account system", () => {
  for (const [name, source] of Object.entries({ REQUEST_CODE, VERIFY, CONFIRM, SESSION, ORDERS, GOOGLE, PANEL })) {
    assert.ok(!/type="password"/.test(source), `${name} collects a password`);
    assert.ok(!/signInWithPassword|\bpassword:\s*[a-z]/i.test(source), `${name} uses a password flow`);
  }
  // Supabase mints and checks the code. We never hold or compare a credential.
  assert.match(SIGNIN_CODE, /auth\.admin\.generateLink\(\{ type: "magiclink", email \}\)/);
  assert.match(VERIFY, /auth\.verifyOtp\(\{ email, token: code, type: "email" \}\)/);
});

test("a Supabase Auth user is not an account", () => {
  // One column decides it, and only verification writes it.
  assert.match(PROFILES, /add column if not exists profile_completed_at timestamptz/);
  assert.match(ACCOUNTS, /profile_complete: Boolean\(profile\?\.profile_completed_at\)/,
    "the browser is told about the account, not about the auth identity");
  assert.match(ACCOUNTS, /patch\.profile_completed_at = new Date\(\)\.toISOString\(\)/);
  for (const [name, source] of Object.entries({ REQUEST_CODE, REGISTER, SESSION, GOOGLE })) {
    assert.ok(!/profile_completed_at\s*[:=]\s*new Date/.test(source),
      `${name} completes an account outside verification`);
  }

  // The lookup answers both halves separately and never collapses them.
  assert.match(PROFILES, /returns table \(user_id uuid, auth_exists boolean, profile_complete boolean\)/);
  assert.match(ACCOUNTS, /authExists: Boolean\(row\?\.auth_exists\)/);
  assert.match(ACCOUNTS, /profileComplete: Boolean\(row\?\.profile_complete\)/);
});

test("signing in never creates an account", () => {
  // The line that used to do it. Requesting a code may not mint a user.
  assert.ok(!/createUser/.test(REQUEST_CODE), "request-code creates an auth user");
  assert.ok(!/savePendingRegistration/.test(REQUEST_CODE), "request-code writes a profile");

  // It reads the account and refuses when there is none.
  assert.match(REQUEST_CODE, /const account = await lookupAccount\(supabase, email\)/);
  assert.match(REQUEST_CODE, /if \(!account\.profileComplete\)/);
  assert.match(REQUEST_CODE, /fail\("account_not_found"/);
  assert.match(REQUEST_CODE, /We couldn't find an account with this email\./);

  // And the panel turns that into the way out rather than a dead end.
  assert.match(PANEL, /data\?\.code === "account_not_found"/);
  assert.match(PANEL, /state\.notFound/);
});

test("registration completes an orphaned auth identity instead of refusing it", () => {
  // The state the old sign-in behaviour left real addresses in: an auth user
  // with no account. Registration has to be able to finish those.
  assert.match(REGISTER, /if \(account\.profileComplete\)/, "only a finished account is a conflict");
  assert.match(REGISTER, /fail\(\s*"account_exists"/);
  assert.match(REGISTER, /let userId = account\.userId;\n    if \(!userId\) \{/,
    "an existing identity is reused rather than recreated");
  assert.match(ACCOUNTS, /\.upsert\(/, "the profile row may already exist");

  // Nothing about the person is trusted until the code comes back.
  assert.match(REGISTER, /if \(session\)/, "a verified session may complete registration without a second code");
  assert.match(REGISTER, /!session\.user\.email_confirmed_at/, "the session must have proved its email");
  assert.match(REGISTER, /completeProfile\(supabase, session\.user/, "completion uses the verified identity");
  assert.match(REGISTER, /email_confirm: false/);
});

test("the sign-in link never puts a session in the address bar", () => {
  // Supabase's own action_link finishes with tokens in a URL fragment. We send
  // our own link and do the exchange server-side instead.
  assert.ok(!/action_link/.test(SIGNIN_CODE) || /Supabase's own action link/.test(SIGNIN_CODE));
  assert.match(SIGNIN_CODE, /new URL\("\/api\/account\/confirm", settings\.siteOrigin\)/);
  assert.match(CONFIRM, /verifyOtp\(\{ token_hash: tokenHash, type: "magiclink" \}\)/);

  // And the redirect afterwards can only be a path on this site.
  for (const source of [SIGNIN_CODE, CONFIRM, GOOGLE]) {
    assert.match(source, /if \(!raw\.startsWith\("\/"\) \|\| raw\.startsWith\("\/\/"\)\) return "\/";/);
  }
});

// ---------------------------------------------------------------- Google ----

test("Continue with Google is real, and is not drawn before it works", () => {
  // PKCE done server-side: the verifier is a cookie the page cannot read, and
  // only its hash is sent to the provider.
  assert.match(GOOGLE, /code_challenge_method", "s256"/);
  assert.match(GOOGLE, /createHash\("sha256"\)\.update\(verifier\)/);
  assert.match(GOOGLE, /grant_type=pkce/);
  assert.match(GOOGLE, /if \(!code \|\| !verifier\)/, "a redirect that did not start here is refused");

  // The provider list is asked for, not assumed. The button is only rendered
  // when Supabase says Google is switched on.
  assert.match(ACCOUNTS, /auth\/v1\/settings/);
  assert.match(GOOGLE, /if \(!providers\.google\)/);
  assert.match(SESSION, /providers: \{ google: Boolean\(providers\.google\) \}/);
  assert.match(PANEL, /state\.providers\.google\s*\n?\s*\?/);
});

// ------------------------------------------ accounts, orders and the list ---

test("an account is not a mailing list, and neither creates the other", () => {
  // Registration may carry a newsletter answer now, so the promise is no
  // longer "never touches a list". It is narrower and harder: nothing is
  // subscribed until the address has been verified, and only a ticked box
  // ever subscribes anybody.
  for (const [name, source] of Object.entries({ REQUEST_CODE, ORDERS, GOOGLE })) {
    assert.ok(!/subscribeContact/.test(source), `${name} subscribes somebody to a list`);
  }
  assert.match(REGISTER, /pending_marketing_opt_in|marketing\b/,
    "the box is recorded at registration, not acted on");
  assert.match(PROFILES, /add column if not exists pending_marketing_opt_in boolean not null default false/);

  // The subscription happens after proof by code or Google, through the same
  // call the newsletter form makes, and only when the parked answer says so.
  assert.match(VERIFY, /import \{ subscribeContact \}/);
  assert.match(ACCOUNTS, /const wantsNewsletter = Boolean\(profile\.pending_marketing_opt_in\)/);
  assert.match(ACCOUNTS, /if \(wantsNewsletter && typeof subscribeToNewsletter === "function"\)/);

  // The sign-in mail itself is still transactional and still touches no list.
  assert.match(SIGNIN_CODE, /import \{ sendTransactionalEmail \}/);
  assert.ok(!/subscribeContact|brevoListId/.test(SIGNIN_CODE), "sign-in mail never reaches the list");

  // The column defaults to false and the profile insert never sets it.
  assert.match(MIGRATION, /marketing_email_opt_in\s+boolean not null default false/);
  const insert = ACCOUNTS.slice(ACCOUNTS.indexOf(".insert({"), ACCOUNTS.indexOf("})\n    .select"));
  assert.ok(!/marketing/.test(insert), "creating a profile never opts anybody in");
  assert.match(insert, /user_id: user\.id/, "the slice above is the insert, not something else");
});

test("an order is not an account: guests keep everything they had", async () => {
  // The link is additive and optional.
  assert.match(MIGRATION, /add column if not exists customer_user_id uuid references auth\.users \(id\) on delete set null/);
  assert.ok(!/not null/.test(MIGRATION.slice(MIGRATION.indexOf("add column if not exists customer_user_id"), MIGRATION.indexOf("create index if not exists orders_customer_user_idx"))));

  // Checkout still takes no session and asks for no account.
  const checkout = await read("netlify/functions/checkout.mjs");
  assert.ok(!/readSession|customer_user_id|signed_in/.test(checkout), "checkout never asks who you are");

  // Guest receipts remain available through a random checkout/email token.
  const lookup = await read("netlify/functions/order-status.mjs");
  assert.match(lookup, /receiptTokenHash\(body\?\.receipt_token\)/);
  assert.match(lookup, /guest_receipt_tokens/);
  assert.match(lookup, /customer_user_id/);
  assert.match(PANEL, /function trackBody/, "the panel still offers it");
  assert.match(PANEL, /id: "track"/);
});

// ------------------------------------------------------- not yet configured --

test("nothing pretends to work before it is configured", () => {
  assert.match(ENV, /export function isAccountsConfigured\(\)/);
  assert.match(ENV, /config\.supabaseUrl && config\.supabaseAnonKey && config\.brevoApiKey/);

  for (const [name, source] of Object.entries({ REQUEST_CODE, VERIFY, CONFIRM, GOOGLE })) {
    assert.match(source, /isAccountsConfigured\(\)/, `${name} checks before promising anything`);
  }

  // The panel is told, rather than guessing, and says so in words.
  assert.match(SESSION, /available: false/);
  assert.match(PANEL, /function unavailableNotice/);
  assert.match(PANEL, /Accounts are not available yet/);
});

test("every account endpoint is mounted, method-checked and rate limited", () => {
  const endpoints = {
    REQUEST_CODE: [REQUEST_CODE, "/api/account/request-code"],
    VERIFY: [VERIFY, "/api/account/verify"],
    CONFIRM: [CONFIRM, "/api/account/confirm"],
    SESSION: [SESSION, "/api/account/session"],
    ORDERS: [ORDERS, "/api/account/orders"],
    GOOGLE: [GOOGLE, "/api/account/google"]
  };
  for (const [name, [source, path]] of Object.entries(endpoints)) {
    assert.ok(source.includes(`"${path}"`), `${name} is not mounted at ${path}`);
    assert.match(source, /methodNotAllowed\(/, `${name} does not check its method`);
    assert.match(source, /rateLimit: \{/, `${name} has no edge rate limit`);
  }

  // Guessing a six-digit code is the attack, so that one is the tightest.
  assert.match(VERIFY, /limit: 10, windowSeconds: 600/);
});

// ------------------------------------------------------------- signing up --

test("the registration page is one page, one form", () => {
  // Everything the account asks for, in one place, followed only by the code
  // that proves the address. No second form and no page in between.
  const steps = [...JOIN.matchAll(/data-join-step="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(steps)], ["register", "verify", "done"]);

  const registration = JOIN.slice(JOIN.indexOf('data-join-step="register"'), JOIN.indexOf('data-join-step="done"'));
  const fields = [...registration.matchAll(/<input[^>]*\sname="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(fields, [
    "first_name", "last_name", "email", "email_confirm",
    // The preferences, which are asked after the account itself and never
    // stand between somebody and having one.
    "newsletter", "personal_recommendations_opt_in",
    "occasion_reminders_opt_in", "personal_service_opt_in",
    "code"
  ]);
  for (const title of ["mr", "mrs", "ms", "miss", "mx"]) {
    assert.match(JOIN, new RegExp(`data-join-title-option="${title}"`));
  }
  assert.ok(!/type="password"/.test(JOIN), "and never a password");

  // The eyebrow above the title is gone, and nothing sells the account to you.
  assert.ok(!/data-join-kicker/.test(JOIN), "no MARVELL FLORIST eyebrow");
  assert.ok(!/join-list|<li>/.test(JOIN), "no benefit bullets");

  // The one line of legal copy, with the policy linked.
  assert.match(JOIN, /By creating your account, you acknowledge that you have read our/);
  assert.match(JOIN, /href="privacy-policy\.html"/);
});

test("the title is asked the way the newsletter form asks it", () => {
  // A line that opens, not a row of buttons: the same control, on both
  // surfaces, for the same question.
  const NEWSLETTER = ["nl-select", "nl-select-trigger", "nl-select-list", "nl-select-option"];
  for (const [name, source, prefix] of [["JOIN", JOIN, "join"], ["PANEL", PANEL, "account"]]) {
    for (const part of NEWSLETTER.map((cls) => cls.replace("nl", prefix))) {
      assert.match(source, new RegExp(part), `${name} is missing ${part}`);
    }
    assert.match(source, new RegExp(`${prefix}-select-trigger[^]*aria-expanded="false"`),
      `${name} does not start closed`);
    assert.match(source, new RegExp(`role="listbox"`), `${name} title list is not a listbox`);
    assert.ok(!new RegExp(`${prefix}-title-option[^]*aria-pressed`).test(source),
      `${name} still has the old button row`);
  }
  // Five options, still a closed set, still in this order.
  const options = [...JOIN.matchAll(/data-join-title-option="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(options, ["mr", "mrs", "ms", "miss", "mx"]);
});

test("every preference is its own decision, and every one starts off", () => {
  // Four separate choices, never collapsed into one consent. Each is stored
  // under its own name, so withdrawing one does not withdraw the others.
  const NAMES = [
    "newsletter",
    "personal_recommendations_opt_in",
    "occasion_reminders_opt_in",
    "personal_service_opt_in"
  ];
  for (const name of NAMES) {
    const box = JOIN.match(new RegExp(`<input type="checkbox" name="${name}"[^>]*>`));
    assert.ok(box, `there is a ${name} checkbox`);
    assert.ok(!/\bchecked\b/.test(box[0]), `${name} is never pre-selected`);
  }
  const all = JOIN.match(/<input type="checkbox" data-preferences-select-all[^>]*>/);
  assert.ok(all, "there is a Select All");
  assert.ok(!/\bchecked\b/.test(all[0]), "and Select All starts off too");

  // Select All writes to the four; the four write back to it, including the
  // part-selected state, so the summary can never contradict what is below it.
  assert.match(JOIN, /preferenceBoxes\.forEach\(\(box\) => \{ box\.checked = selectAll\.checked; \}\)/);
  assert.match(JOIN, /selectAll\.indeterminate = selected > 0 && selected < preferenceBoxes\.length/);

  // The account is made either way: the boxes are fields on the request and
  // nothing branches the registration on them.
  assert.match(JOIN, /newsletter: el\("\[data-join-newsletter\]"\)\.checked/);
  for (const name of NAMES.slice(1)) {
    assert.match(JOIN, new RegExp(`${name}: joinForm\\.elements\\.${name}\\.checked`));
  }
});

test("the sign-up page decides nothing about who somebody is", () => {
  assert.match(JOIN, /credentials: "same-origin"/);
  assert.match(JOIN, /data\?\.signed_in && data\?\.user/, "the server says, the page draws");
  assert.ok(!/localStorage/.test(JOIN), "and nothing is remembered in the browser");

  // Somebody who already has an account has nothing to do here; somebody
  // whose address is proved but unfinished gets the form with it locked.
  assert.match(JOIN, /if \(data\.user\.profile_complete\) \{\n          step\("done"\);/);
  assert.match(JOIN, /function lockEmail\(email\)/);
});

test("a title is a closed set, checked on both sides", () => {
  assert.match(SESSION, /\["mr", "mrs", "ms", "miss", "mx"\]\.includes\(wanted\)/);
  assert.match(REGISTER, /const TITLES = \["mr", "mrs", "ms", "miss", "mx"\]/);
  assert.match(PROFILES, /check \(title is null or title in \('mr', 'mrs', 'ms', 'miss', 'mx'\)\)/);
  // And the greeting is never a guess: no title and no name gets the plain
  // one, not a name invented from an email address.
  assert.match(PANEL, /a fallback, not a guess/);
  assert.match(PANEL, /return name \? t\(`Welcome, \$\{name\}`/);
});

test("Continue with Google is offered, and is plainly off until it works", () => {
  // Shown either way, so the way in is visible; disabled, so nobody presses a
  // button that cannot work. No client id or secret appears in page code.
  // It lives on the sign-in panel only. Google proves an address and asks for
  // no title or name, so it cannot finish a registration and is not offered
  // as a way to start one.
  assert.match(PANEL, /data-account-google/);
  assert.match(PANEL, /Continue with Google \(coming soon\)/);
  assert.ok(!/data-join-google/.test(JOIN), "Google is not a way to register");

  // Somebody who arrives that way without an account is sent to finish one.
  assert.match(GOOGLE, /account=complete-profile/);

  for (const [name, source] of Object.entries({ JOIN, PANEL })) {
    assert.ok(!/client_secret|GOCSPX|\.apps\.googleusercontent\.com/i.test(source),
      `${name} must never carry a Google credential`);
  }

  // The button only becomes real when Supabase reports the provider on.
  assert.match(PANEL, /state\.providers\.google/);
});
