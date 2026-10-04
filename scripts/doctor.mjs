/**
 * Local integration readiness.
 *
 *   node scripts/doctor.mjs            configuration only, no network
 *   node scripts/doctor.mjs --live     also calls Supabase and Brevo read-only
 *
 * Answers one question: which parts of the site can actually be tested end to
 * end on http://localhost:8888 right now, and what is stopping the rest.
 *
 * It reads .env the same way `netlify dev` does and applies the same
 * predicates the functions use, so it cannot drift from what the endpoints
 * will decide at runtime.
 *
 * NO SECRET IS EVER PRINTED. A key is reported as present or absent and, where
 * a shape is diagnostic (a JWT versus a publishable key), by shape alone.
 */

import { readFile } from "node:fs/promises";
import process from "node:process";

const LIVE = process.argv.includes("--live");
const ORIGIN = "http://localhost:8888";

const c = {
  reset: "\u001b[0m", dim: "\u001b[2m", bold: "\u001b[1m",
  green: "\u001b[32m", red: "\u001b[31m", yellow: "\u001b[33m", blue: "\u001b[36m"
};
const tick = `${c.green}ready${c.reset}`;
const cross = `${c.red}blocked${c.reset}`;
const warn = `${c.yellow}check${c.reset}`;

/** Parses .env without exporting anything or echoing a value. */
async function loadEnv() {
  let raw = "";
  try { raw = await readFile(new URL("../.env", import.meta.url), "utf8"); }
  catch { return { found: false, vars: {} }; }
  const vars = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[trimmed.slice(0, eq).trim()] = value;
  }
  return { found: true, vars };
}

const { found, vars } = await loadEnv();
const get = (name) => String(vars[name] ?? process.env[name] ?? "").trim();
const has = (name) => Boolean(get(name));
const bool = (name, fallback = false) => {
  const v = get(name).toLowerCase();
  if (["true", "1", "yes"].includes(v)) return true;
  if (["false", "0", "no"].includes(v)) return false;
  return fallback;
};

console.log(`\n${c.bold}Marvell — local integration readiness${c.reset}`);
console.log(`${c.dim}canonical environment: ${ORIGIN} (netlify dev)${c.reset}`);
if (!found) {
  console.log(`\n${c.red}No .env found.${c.reset} Copy .env.example to .env and fill it in.\n`);
  process.exit(1);
}

// -- the same predicates the functions use ----------------------------------
const supabaseReady = Boolean(get("SUPABASE_URL") && get("SUPABASE_SERVICE_ROLE_KEY"));
const brevoReady = Boolean(get("BREVO_API_KEY") && Number.parseInt(get("BREVO_LIST_ID"), 10) > 0);
const accountsReady = Boolean(get("SUPABASE_URL") && get("SUPABASE_ANON_KEY") && get("BREVO_API_KEY"));
const paymentEnvironment = get("IPAYMU_ENVIRONMENT").toLowerCase() || "sandbox";
const paymentsReady = Boolean(
  paymentEnvironment === "sandbox" && get("IPAYMU_VA") && get("IPAYMU_API_KEY")
);

// A variable can appear in `netlify dev`'s "Injected .env file env vars" list
// and still be an empty string: that log names the variables it found in the
// file, not the ones that have values. So report blank-but-present separately
// from absent, because they look identical in the CLI's output.
const declaredButEmpty = Object.entries(vars).filter(([, v]) => !String(v).trim()).map(([k]) => k);

const rows = [
  ["Static site + redirects", true, "netlify dev serves the real routing table"],
  ["Catalogue  /api/catalog", true, "reads content/ from disk; needs no credentials"],
  ["Brevo newsletter", brevoReady, brevoReady ? `writes to list ${get("BREVO_LIST_ID")}` : "needs BREVO_API_KEY"],
  ["Supabase (bag, orders)", supabaseReady, supabaseReady ? "service role present" : "needs SUPABASE_SERVICE_ROLE_KEY"],
  ["Passwordless accounts", accountsReady && supabaseReady,
    accountsReady && supabaseReady ? "real email via Brevo" : "needs BREVO_API_KEY + SUPABASE_SERVICE_ROLE_KEY"],
  ["iPaymu v2", paymentsReady, paymentsReady ? "sandbox" : "needs sandbox VA + API key"]
];

console.log(`\n${c.bold}Integrations${c.reset}`);
for (const [label, ready, note] of rows) {
  console.log(`  ${(ready ? tick : cross).padEnd(18)} ${label.padEnd(26)} ${c.dim}${note}${c.reset}`);
}

// -- things that are set but suspicious -------------------------------------
const notes = [];
const origin = get("SITE_ORIGIN");
if (origin !== ORIGIN) {
  notes.push(`SITE_ORIGIN is "${origin}". It must be ${ORIGIN} locally: the sign-in link in the email and the Google PKCE callback are both built from it.`);
}
if (paymentEnvironment !== "sandbox") {
  notes.push(`IPAYMU_ENVIRONMENT is "${paymentEnvironment}". Only sandbox is implemented; payments are disabled.`);
}
if (brevoReady && get("BREVO_LIST_ID") === "3") {
  notes.push('BREVO_LIST_ID is 3, the real "Marvell Newsletter" list. Point it at a localhost test list so development signups do not pollute the real audience or re-trigger automations.');
}
const anon = get("SUPABASE_ANON_KEY");
if (anon && !anon.startsWith("sb_publishable_") && !anon.startsWith("eyJ")) {
  notes.push("SUPABASE_ANON_KEY does not look like either a JWT or an sb_publishable_ key. Check Settings -> API.");
}
if (get("SUPABASE_SERVICE_ROLE_KEY") && get("SUPABASE_SERVICE_ROLE_KEY") === anon) {
  notes.push("SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY are the same value. They are different keys.");
}
if (bool("MARVELL_COMMERCE_TEST", false)) {
  notes.push("MARVELL_COMMERCE_TEST is on: the Mother's Day prototype catalogue is merged in.");
}

if (notes.length) {
  console.log(`\n${c.bold}Worth a look${c.reset}`);
  for (const note of notes) console.log(`  ${warn}  ${note}`);
}

// -- derived URLs, so they are never guessed --------------------------------
const supabaseUrl = get("SUPABASE_URL").replace(/\/+$/, "");
if (supabaseUrl) {
  console.log(`\n${c.bold}Derived URLs${c.reset} ${c.dim}(from SUPABASE_URL and SITE_ORIGIN)${c.reset}`);
  console.log(`  ${c.blue}Google Cloud -> Authorised redirect URI${c.reset}`);
  console.log(`      ${supabaseUrl}/auth/v1/callback`);
  console.log(`  ${c.blue}Supabase -> Redirect URLs (add both)${c.reset}`);
  console.log(`      ${ORIGIN}/api/account/google/callback`);
  console.log(`      https://marvellflorist.com/api/account/google/callback`);
  console.log(`  ${c.blue}Supabase -> Site URL${c.reset}`);
  console.log(`      https://marvellflorist.com`);
  console.log(`  ${c.blue}iPaymu Sandbox -> notifyUrl${c.reset}`);
  console.log(`      ${origin || ORIGIN}/api/payments/ipaymu/webhook`);
}

// -- live, read-only checks -------------------------------------------------
if (LIVE) {
  console.log(`\n${c.bold}Live checks${c.reset} ${c.dim}(read-only)${c.reset}`);

  if (supabaseUrl && anon) {
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: anon } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const on = Object.entries(data.external || {}).filter(([, v]) => v).map(([k]) => k);
      console.log(`  ${tick}  Supabase Auth reachable; providers on: ${on.join(", ") || "none"}`);
      console.log(`  ${data.external?.google ? tick : cross}  Google provider ${data.external?.google ? "enabled" : "NOT enabled — Continue with Google stays hidden"}`);
    } catch (error) {
      console.log(`  ${cross}  Supabase Auth unreachable (${error.message})`);
    }
  }

  if (supabaseReady) {
    // Table by table, and named. A project with the keys set but the
    // migrations unrun answers every auth call perfectly and then fails on the
    // first row it is asked for, which reads as a broken feature rather than
    // as an empty database. Asking here turns that into one line.
    const rest = {
      apikey: get("SUPABASE_SERVICE_ROLE_KEY"),
      authorization: `Bearer ${get("SUPABASE_SERVICE_ROLE_KEY")}`
    };
    const tables = {
      products_commerce: "0001_commerce_core.sql",
      orders: "0001_commerce_core.sql",
      customer_profiles: "0005_accounts.sql",
      // Without these two the wishlist endpoint fails on every call and the
      // browser falls back to the device list, so a signed-in customer is
      // quietly told their wishlist is "saved on this device". Nothing else
      // reports it, which is why it is checked here.
      wishlist_lists: "0008_wishlists_and_preferences.sql",
      wishlist_items: "0008_wishlists_and_preferences.sql"
    };
    let missing = false;
    for (const [table, migration] of Object.entries(tables)) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, { headers: rest });
        if (response.ok) {
          console.log(`  ${tick}  ${table} readable`);
        } else {
          missing = true;
          console.log(`  ${cross}  ${table} missing (HTTP ${response.status}) — run supabase/migrations/${migration}`);
        }
      } catch (error) {
        console.log(`  ${cross}  Supabase REST unreachable (${error.message})`);
        break;
      }
    }
    // The functions, which a table check does not cover. my_marvell_account is
    // what tells a sign-in from a registration, so without it neither works.
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/my_marvell_account`, {
        method: "POST",
        headers: { ...rest, "content-type": "application/json" },
        body: JSON.stringify({ p_email: "doctor@example.invalid" })
      });
      if (response.ok) {
        console.log(`  ${tick}  my_marvell_account() present`);
      } else {
        missing = true;
        console.log(`  ${cross}  my_marvell_account() missing (HTTP ${response.status}) — run supabase/migrations/0007_my_marvell_profiles.sql`);
      }
    } catch (error) {
      console.log(`  ${cross}  Supabase REST unreachable (${error.message})`);
    }

    if (missing) {
      console.log(`  ${warn}  sign-in and Create your account both need the schema above; run the migrations in order`);
    }
  }

  if (get("BREVO_API_KEY")) {
    try {
      const response = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": get("BREVO_API_KEY") } });
      console.log(`  ${response.ok ? tick : cross}  Brevo key valid (HTTP ${response.status})`);
      const listId = Number.parseInt(get("BREVO_LIST_ID"), 10);
      if (response.ok && listId > 0) {
        const list = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}`, { headers: { "api-key": get("BREVO_API_KEY") } });
        if (list.ok) {
          const body = await list.json();
          console.log(`  ${tick}  Brevo list ${listId} = "${body.name}" (${body.uniqueSubscribers ?? "?"} contacts)`);
        } else {
          console.log(`  ${cross}  Brevo list ${listId} not readable (HTTP ${list.status})`);
        }
      }
    } catch (error) {
      console.log(`  ${cross}  Brevo unreachable (${error.message})`);
    }
  }

  try {
    const response = await fetch(`${ORIGIN}/api/catalog`, { signal: AbortSignal.timeout(4000) });
    console.log(`  ${response.ok ? tick : cross}  netlify dev answering on ${ORIGIN} (HTTP ${response.status})`);
  } catch {
    console.log(`  ${warn}  nothing answering on ${ORIGIN} — start it with: npm run dev`);
  }
}

if (declaredButEmpty.length) {
  console.log(`\n${c.bold}Present in .env but empty${c.reset}`);
  console.log(`  ${c.dim}netlify dev lists these as "injected" anyway — its startup log names`);
  console.log(`  variables it found, not ones that have values. An empty line still counts.${c.reset}`);
  for (const name of declaredButEmpty) console.log(`    ${c.yellow}${name}${c.reset}`);
}

console.log(`\n${c.dim}Nothing above prints a secret. Re-run after editing .env; restart netlify dev to pick changes up.${c.reset}\n`);
