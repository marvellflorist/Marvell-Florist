/**
 * Environment access. Every secret in the project is read through here, which
 * keeps the list of things that must be configured in one auditable place.
 *
 * Nothing in this module may ever be imported by browser code.
 */

export function env(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function intEnv(name, fallback) {
  const parsed = Number.parseInt(env(name, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function boolEnv(name, fallback = false) {
  const value = env(name, "").toLowerCase();
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return fallback;
}

export const config = {
  get supabaseUrl() {
    return env("SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return env("SUPABASE_SERVICE_ROLE_KEY");
  },
  /**
   * The anon key. Read here, used only by the sign-in endpoints to call
   * Supabase Auth, and — like every other key in this file — never sent to a
   * browser. The account's session lives in an httpOnly cookie precisely so
   * that no Supabase key of any kind has to.
   */
  get supabaseAnonKey() {
    return env("SUPABASE_ANON_KEY");
  },
  get brevoApiKey() {
    return env("BREVO_API_KEY");
  },
  get brevoListId() {
    return intEnv("BREVO_LIST_ID", 0);
  },
  get brevoWhatsappListId() {
    return intEnv("BREVO_WHATSAPP_LIST_ID", 0);
  },
  /**
   * The name of a Brevo text attribute holding the salutation (MR/MRS/MX).
   * Blank by default and deliberately so: Brevo refuses an entire contact for
   * one attribute it has not been told about, so the salutation is only sent
   * once somebody has created the attribute and named it here.
   */
  get brevoTitleAttribute() {
    return env("BREVO_TITLE_ATTRIBUTE", "");
  },
  /**
   * Sending identities. Nothing sends mail yet — these are read by the Brevo
   * service so that campaign and transactional code added later inherits the
   * right From address instead of inventing one.
   */
  get brevoNewsletterSender() {
    return env("BREVO_NEWSLETTER_SENDER", "info@marvellflorist.com");
  },
  get brevoOrderSender() {
    return env("BREVO_ORDER_SENDER", "orders@marvellflorist.com");
  },
  get marvellInquiryEmail() {
    return env("MARVELL_INQUIRY_EMAIL", "hello@marvellflorist.com");
  },
  /** Sign-in codes. A verified identity, and not the one receipts come from. */
  get brevoAccountSender() {
    return env("BREVO_ACCOUNT_SENDER", env("BREVO_NEWSLETTER_SENDER", "info@marvellflorist.com"));
  },
  get ipaymuVa() {
    return env("IPAYMU_VA");
  },
  get ipaymuApiKey() {
    return env("IPAYMU_API_KEY");
  },
  get ipaymuEnvironment() {
    return env("IPAYMU_ENVIRONMENT", "sandbox").toLowerCase();
  },
  get reservationTtlMinutes() {
    return Math.min(Math.max(intEnv("RESERVATION_TTL_MINUTES", 30), 5), 240);
  },
  get deliveryFeeIdr() {
    return Math.max(intEnv("DELIVERY_FEE_IDR", 0), 0);
  },
  get siteOrigin() {
    return env("SITE_ORIGIN", env("URL", "https://marvellflorist.com"));
  },
  /**
   * Where the images inside an email are fetched from.
   *
   * Deliberately NOT siteOrigin. That one is http://localhost:8888 during
   * development, and an email is read by Gmail's image proxy, which is not on
   * this machine and never will be. A localhost src in a sent email is a
   * broken image, every time, so the asset origin defaults to production and
   * stays there no matter what SITE_ORIGIN says.
   *
   * It is an override rather than a constant only so the images can be moved
   * to another public host later without editing a template.
   */
  get emailAssetOrigin() {
    return env("EMAIL_ASSET_ORIGIN", "https://marvellflorist.com").replace(/\/+$/, "");
  }
};

/**
 * The Mother's Day commerce prototype.
 *
 * Development only. When on, content/_dev-mothers-day-commerce.json is merged
 * into the catalogue so the dormant Mother's Day collection can be carried all
 * the way from Featured to the cart. Its stock figures are invented and its
 * prices are copied from content/featured.json.
 *
 * Off unless asked for, and forced off on the production payment configuration,
 * so the prototype cannot reach a site that can actually take money. The
 * Mother's Day collection is not relaunched by this flag: the browser still
 * only shows it with ?commerce-test=1.
 */
export function isCommerceTestMode() {
  // Only sandbox exists in this integration. Any other value is a fail-closed
  // production request and must not activate prototype commerce data.
  if (config.ipaymuEnvironment !== "sandbox") return false;
  return boolEnv("MARVELL_COMMERCE_TEST", false);
}

/** True when Supabase is wired up. The site degrades gracefully when not. */
export function isSupabaseConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

/** True only for a complete iPaymu sandbox configuration. Production is off. */
export function isPaymentsConfigured() {
  return Boolean(
    config.ipaymuEnvironment === "sandbox" && config.ipaymuVa && config.ipaymuApiKey
  );
}

export function isBrevoConfigured() {
  return Boolean(config.brevoApiKey && config.brevoListId);
}

/**
 * Why a configuration predicate said no, in words that are safe to log.
 *
 * These exist because "not configured" on its own sends you looking in the
 * wrong place. A variable can be present in .env, be listed by `netlify dev`
 * as injected, and still be an empty string — the CLI's startup log names the
 * variables it found, not the ones that have values. Naming the empty setting
 * turns a guess into a fact.
 *
 * Names only. No function here returns, logs or compares a value.
 */
export function brevoConfigProblems() {
  const problems = [];
  if (!config.brevoApiKey) problems.push("BREVO_API_KEY is empty");
  if (!env("BREVO_LIST_ID")) problems.push("BREVO_LIST_ID is empty");
  else if (!(config.brevoListId > 0)) problems.push("BREVO_LIST_ID is not a positive number");
  return problems;
}

export function accountsConfigProblems() {
  const problems = [];
  if (!config.supabaseUrl) problems.push("SUPABASE_URL is empty");
  if (!config.supabaseAnonKey) problems.push("SUPABASE_ANON_KEY is empty");
  // Brevo gates accounts as well as the mailing list: a sign-in form that
  // cannot deliver a code is worse than no sign-in form, so this is checked
  // here rather than being discovered at the moment somebody tries to use it.
  if (!config.brevoApiKey) problems.push("BREVO_API_KEY is empty (it delivers the sign-in code)");
  // Not part of isAccountsConfigured(), but request-code cannot mint a code
  // without it, so a session that looks available would fail on first use.
  if (!config.supabaseServiceRoleKey) problems.push("SUPABASE_SERVICE_ROLE_KEY is empty");
  return problems;
}

/**
 * True when accounts can actually sign somebody in.
 *
 * Three things are needed and all three are separate: a database, a key that
 * can talk to Supabase Auth, and a way to deliver the code. Sign-in is offered
 * only when all three are present — a sign-in form that cannot deliver a code
 * is worse than no sign-in form, because it looks like it worked.
 *
 * The list id is deliberately not part of this: the mailing list and the
 * account system share a provider and nothing else.
 */
export function isAccountsConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && config.brevoApiKey);
}
