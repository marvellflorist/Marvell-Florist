/**
 * Migration safety.
 *
 * These tests read the SQL rather than a database, because the thing they
 * guard is invisible at runtime until it is too late: a function that revokes
 * EXECUTE from anon and authenticated but not from PUBLIC looks locked and is
 * not. PostgreSQL grants EXECUTE on every new function to PUBLIC, and every
 * role holds PUBLIC implicitly.
 *
 * supabase/verify/0001_function_privileges.sql is the other half of this and
 * checks the same rule against a real database with has_function_privilege().
 * This half runs in CI, before anybody applies anything.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const DIR = new URL("supabase/migrations/", ROOT);

const files = (await readdir(DIR)).filter((name) => name.endsWith(".sql")).sort();
const sources = new Map();
for (const name of files) sources.set(name, await readFile(new URL(name, DIR), "utf8"));

/** The SQL half of these checks, which runs against a real database. */
const VERIFY = (await Promise.all([
  readFile(new URL("supabase/verify/0001_function_privileges.sql", ROOT), "utf8"),
  readFile(new URL("supabase/verify/0003_admin_privileges.sql", ROOT), "utf8")
])).join("\n");

/** The file with its comment lines removed, so prose can never satisfy a test. */
function sql(name) {
  return sources.get(name).split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
}

/** Every `create or replace function name(...)` that is security definer. */
function definerFunctions(name) {
  const body = sources.get(name);
  const found = [];
  const pattern = /create or replace function\s+(?:public\.)?([a-z_]+)\s*\(/g;
  let match;
  while ((match = pattern.exec(body))) {
    const next = body.indexOf("create or replace function", match.index + 1);
    const slice = body.slice(match.index, next === -1 ? body.length : next);
    if (/\bsecurity definer\b/i.test(slice)) found.push(match[1]);
  }
  return found;
}

test("the migrations are numbered in the order they must run", () => {
  assert.deepEqual(
    files,
    [
      "0001_commerce_core.sql",
      "0002_security_rls.sql",
      "0003_order_functions.sql",
      "0004_staff_views.sql",
      "0005_accounts.sql",
      "0006_newsletter_names.sql",
      "0007_my_marvell_profiles.sql",
      "0008_wishlists_and_preferences.sql",
      "0009_round_commerce_prices.sql",
      "0010_marvell_admin_core.sql",
      "0011_order_notifications.sql",
      "0012_attribution_and_consent.sql",
      "0013_admin_rpc_acl_and_aal2.sql",
      "0014_ipaymu_sandbox.sql"
    ],
    "a new migration needs a number and a place in this list"
  );
});

test("commerce prices are corrected once, then constrained to whole thousands", () => {
  const body = sql("0009_round_commerce_prices.sql");
  assert.match(body, /update public\.products_commerce[\s\S]*round\(price_idr::numeric \/ 1000\)[\s\S]*where price_idr % 1000 <> 0;/i);
  assert.match(body, /alter table public\.products_commerce[\s\S]*check \(price_idr % 1000 = 0\);/i);
});

test("every security definer function revokes EXECUTE from PUBLIC", () => {
  // The bug this exists to stop coming back. Revoking from anon and
  // authenticated leaves PostgreSQL's default PUBLIC grant standing, and anon
  // holds PUBLIC implicitly, so the function stays reachable.
  let checked = 0;
  for (const name of files) {
    for (const fn of definerFunctions(name)) {
      checked += 1;
      const body = sql(name);
      const revoke = new RegExp(`revoke\\s+(all|execute)[^;]*\\bon function\\s+(?:public\\.)?${fn}\\s*\\([^)]*\\)[^;]*\\bfrom\\b([^;]*);`, "i");
      const match = body.match(revoke);
      assert.ok(match, `${name}: ${fn} is security definer and revokes nothing`);
      const from = match[2];
      for (const role of ["public", "anon", "authenticated"]) {
        assert.match(from, new RegExp(`\\b${role}\\b`), `${name}: ${fn} does not revoke from ${role}`);
      }
    }
  }
  assert.ok(checked >= 15, "all original and Admin security definer functions were checked");
});

test("a revoked function is granted back only to the role that calls it", () => {
  // Revoking PUBLIC also takes the grant away from service_role's inherited
  // path, so every function the Netlify functions actually call has to be
  // granted back by name. Getting this wrong breaks checkout rather than
  // leaking anything, which is why it is a separate test.
  const wants = {
    create_order_with_reservations: "service_role",
    commit_order_payment: "service_role",
    release_order_reservations: "service_role",
    expire_stale_reservations: "service_role",
    claim_orders_for_user: "service_role",
    my_marvell_account: "service_role",
    staff_account_by_email: "service_role",
    claim_notification_outbox: "service_role",
    enqueue_notification_escalations: "service_role",
    reconcile_paid_order_notifications: "service_role",
    admin_transition_order: "authenticated",
    admin_card_action: "authenticated",
    admin_resolve_attention: "authenticated",
    admin_assign_delivery: "authenticated",
    admin_change_delivery: "authenticated",
    admin_set_stock: "authenticated",
    admin_update_staff: "authenticated",
    admin_add_staff: "authenticated"
  };
  for (const [fn, role] of Object.entries(wants)) {
    const file = files.find((name) => definerFunctions(name).includes(fn));
    assert.ok(file, `${fn} was not found in any migration`);
    assert.match(
      sql(file),
      new RegExp(`grant\\s+execute\\s+on function\\s+(?:public\\.)?${fn}\\s*\\([^)]*\\)\\s*to\\s+${role}`, "i"),
      `${fn} is revoked but never granted to ${role}`
    );
  }
  assert.match(sql("0010_marvell_admin_core.sql"),
    /revoke all on function public\.advance_production_status\(text, production_status\)[^;]*from public, anon, authenticated, service_role;/);
});

test("every Admin mutation RPC enforces staff identity, active membership and AAL2", () => {
  const functions = [
    "admin_transition_order", "admin_card_action", "admin_resolve_attention",
    "admin_assign_delivery", "admin_change_delivery", "admin_set_stock",
    "admin_update_staff", "admin_add_staff"
  ];
  for (const migration of ["0010_marvell_admin_core.sql", "0013_admin_rpc_acl_and_aal2.sql"]) {
    const source = sources.get(migration);
    for (const fn of functions) {
      const start = source.indexOf(`create or replace function public.${fn}(`);
      assert.notEqual(start, -1, `${migration}: ${fn} is missing`);
      const next = source.indexOf("create or replace function", start + 1);
      const block = source.slice(start, next === -1 ? source.length : next);
      assert.match(block, /auth\.uid\(\)/, `${migration}: ${fn} does not bind the JWT actor`);
      assert.match(block, /public\.staff_members[\s\S]*\bactive\b/,
        `${migration}: ${fn} does not check active staff membership`);
      assert.match(block, /auth\.jwt\(\)->>'aal'[\s\S]*<>\s*'aal2'/,
        `${migration}: ${fn} does not enforce AAL2`);
      assert.match(block, /STAFF_ACCESS_DENIED/,
        `${migration}: ${fn} has no authorization failure`);
      assert.match(block,
        new RegExp(`revoke\\s+all\\s+on function\\s+public\\.${fn}\\([^;]+from\\s+public,\\s*anon,\\s*authenticated,\\s*service_role;`, "i"),
        `${migration}: ${fn} does not remove service-role execution`);
      assert.match(block,
        new RegExp(`grant\\s+execute\\s+on function\\s+public\\.${fn}\\([^;]+to\\s+authenticated;`, "i"),
        `${migration}: ${fn} is not granted only to authenticated`);
    }
  }
});

test("generate_order_number is not executable by an API role", () => {
  // Not security definer, and its only caller is one that is — so by the time
  // it runs the current user is already the owner. A grant would hand out an
  // order-number generator nothing needs to call from outside.
  const body = sql("0003_order_functions.sql");
  assert.match(body, /revoke execute on function generate_order_number\(\)[^;]*from public, anon, authenticated, service_role;/);
  assert.ok(!/grant\s+execute\s+on function\s+generate_order_number/i.test(body),
    "generate_order_number must not be granted to any role");
});

test("no migration deletes data or drops a table or column", () => {
  for (const name of files) {
    const body = sql(name);
    assert.ok(!/\btruncate\b/i.test(body), `${name} truncates`);
    assert.ok(!/\bdelete\s+from\b/i.test(body), `${name} deletes rows`);
    assert.ok(!/\bdrop\s+table\b/i.test(body), `${name} drops a table`);
    assert.ok(!/\bdrop\s+column\b/i.test(body), `${name} drops a column`);
    assert.ok(!/\bdrop\s+schema\b/i.test(body), `${name} drops a schema`);
    // A DROP is allowed only where it is immediately recreated: triggers,
    // policies and constraints are dropped so that re-running is safe.
    for (const match of body.matchAll(/\bdrop\s+(\w+)/gi)) {
      assert.match(
        match[1].toLowerCase(),
        /^(trigger|policy|constraint)$/,
        `${name} drops a ${match[1]}, which is not one of the re-creatable kinds`
      );
    }
  }
});

test("every added column is nullable or carries a default", () => {
  // `add column ... not null` with no default rewrites the table and fails on
  // any existing row. Every one here has to be safe against a populated table.
  for (const name of files) {
    for (const match of sql(name).matchAll(/add column if not exists\s+([a-z_]+)([^;,\n]*)/gi)) {
      const [, column, rest] = match;
      if (/not null/i.test(rest)) {
        assert.match(rest, /default/i, `${name}: ${column} is NOT NULL with no default`);
      }
    }
  }
});

test("a widened check constraint is dropped first, not added inside a swallow", () => {
  // `exception when duplicate_object then null` silently keeps the old, narrow
  // constraint on any database that already has it. A widening must drop.
  for (const [name, column] of [
    ["0006_newsletter_names.sql", "newsletter_events_title_check"],
    ["0007_my_marvell_profiles.sql", "customer_profiles_title_check"]
  ]) {
    const body = sql(name);
    assert.match(body, new RegExp(`drop constraint if exists ${column}`), `${name} does not drop ${column} first`);
    const titles = body.match(/title is null or title in \(([^)]*)\)/);
    assert.ok(titles, `${name}: the title set is findable`);
    for (const value of ["mr", "mrs", "ms", "miss", "mx"]) {
      assert.ok(titles[1].includes(`'${value}'`), `${name} does not allow ${value}`);
    }
  }
});

test("the privilege verification script covers every security definer function", () => {
  // The SQL half of this file. If a function is added and not listed there,
  // nobody finds out until it is reachable.
  const verify = VERIFY;
  for (const name of files) {
    for (const fn of definerFunctions(name)) {
      assert.match(verify, new RegExp(`public\\.${fn}\\(`), `${fn} is not checked by the verification script`);
    }
  }
  assert.match(verify, /has_function_privilege\('anon'/);
  assert.match(verify, /has_function_privilege\('authenticated'/);
  assert.match(verify, /raise exception/);
});

test("post-migration integrity verification is read-only and covers missing alerts", async () => {
  const body = await readFile(new URL("supabase/verify/0004_admin_integrity.sql", ROOT), "utf8");
  assert.match(body, /paid_orders_missing_alert/);
  assert.match(body, /paid_orders_with_unreviewed_released_stock/);
  assert.ok(!/\b(insert|update|delete|alter|drop)\s+(into|table|public\.)/i.test(body));
});
