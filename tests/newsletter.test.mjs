/**
 * Newsletter signup.
 *
 * The consent rules are the point of these tests. A phone number is not
 * permission to message it, an email address is not permission to mail it, and
 * neither may be inferred from the other. The endpoint enforces both, and so
 * does the Brevo payload it builds.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { createLiveNewsletterServer } from "../scripts/live-newsletter-server.mjs";

const ROOT = new URL("../", import.meta.url);

/** Captures the request the Brevo service would have made. */
function captureBrevo() {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return { status: 204, json: async () => ({}) };
  };
  return {
    calls,
    restore() { globalThis.fetch = original; }
  };
}

let bust = 0;
async function loadBrevo(env = {}) {
  for (const key of ["BREVO_API_KEY", "BREVO_LIST_ID", "BREVO_WHATSAPP_LIST_ID"]) delete process.env[key];
  Object.assign(process.env, { BREVO_API_KEY: "test-key", BREVO_LIST_ID: "3", ...env });
  bust += 1;
  return import(`../netlify/functions/_lib/brevo.mjs?v=${bust}`);
}

// ------------------------------------------------------- attribute map -----

test("a subscriber maps onto the configured Brevo attributes", async () => {
  const { subscribeContact } = await loadBrevo();
  const brevo = captureBrevo();

  try {
    await subscribeContact({
      email: "jane@example.com",
      firstName: "Jane",
      phone: "6281275017456",
      emailOptIn: true,
      whatsappOptIn: true,
      source: "homepage-drawer"
    });
  } finally {
    brevo.restore();
  }

  const { body, init } = brevo.calls[0];
  assert.equal(body.email, "jane@example.com");
  assert.equal(body.updateEnabled, true, "an existing subscriber is updated, not duplicated");
  assert.deepEqual(body.listIds, [3], "added to the Marvell Newsletter list");

  assert.equal(body.attributes.FIRSTNAME, "Jane");
  assert.equal(body.attributes.EMAIL_OPT_IN, true);
  assert.equal(body.attributes.WHATSAPP_OPT_IN, true);
  assert.equal(body.attributes.SOURCE, "homepage-drawer");
  assert.match(body.attributes.CONSENT_DATE, /^\d{4}-\d{2}-\d{2}$/);

  // Brevo's own WhatsApp attribute, not a second custom phone field.
  assert.equal(body.attributes.WHATSAPP, "+6281275017456");
  assert.ok(!("WHATSAPP_NUMBER" in body.attributes), "no duplicate custom phone attribute");

  assert.equal(init.headers["api-key"], "test-key");
});

test("a phone number without WhatsApp consent never reaches Brevo", async () => {
  const { subscribeContact } = await loadBrevo();
  const brevo = captureBrevo();

  try {
    await subscribeContact({
      email: "jane@example.com",
      phone: "6281275017456",
      emailOptIn: true,
      whatsappOptIn: false,
      source: "footer"
    });
  } finally {
    brevo.restore();
  }

  const { body } = brevo.calls[0];
  assert.equal(body.attributes.WHATSAPP_OPT_IN, false);
  assert.ok(
    !("WHATSAPP" in body.attributes),
    "a number given for contact is not permission to market to it"
  );
});

test("CONSENT_DATE records today in Jakarta time", async () => {
  const { __testing } = await loadBrevo();
  // 20:00 UTC is already the next day in Jakarta (UTC+7).
  assert.equal(__testing.consentDate(new Date("2026-09-19T20:00:00Z")), "2026-09-20");
  assert.equal(__testing.consentDate(new Date("2026-09-19T10:00:00Z")), "2026-09-19");
});

test("the service refuses to run without configuration", async () => {
  const { subscribeContact, BrevoError } = await loadBrevo({ BREVO_API_KEY: "" });
  await assert.rejects(
    () => subscribeContact({ email: "a@b.com", emailOptIn: true }),
    (error) => error instanceof BrevoError && error.code === "not_configured"
  );
});

test("upstream failures never surface Brevo's own wording", async () => {
  const { subscribeContact, BrevoError } = await loadBrevo();
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    status: 400,
    json: async () => ({ code: "invalid_parameter", message: "Invalid phone number 0812 for contact jane@example.com" })
  });

  try {
    await assert.rejects(
      () => subscribeContact({ email: "jane@example.com", emailOptIn: true }),
      (error) => {
        assert.ok(error instanceof BrevoError);
        assert.ok(!/0812/.test(error.message), "upstream detail must not travel outward");
        assert.ok(!/jane@example\.com/.test(error.message), "no echoed customer data");
        return true;
      }
    );
  } finally {
    globalThis.fetch = original;
  }
});

// ------------------------------------------------------------- endpoint ----

let endpointBust = 0;
async function callEndpoint(payload, env = {}) {
  for (const key of ["BREVO_API_KEY", "BREVO_LIST_ID", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    delete process.env[key];
  }
  Object.assign(process.env, { BREVO_API_KEY: "test-key", BREVO_LIST_ID: "3", ...env });
  endpointBust += 1;

  const module = await import(`../netlify/functions/newsletter.mjs?v=${endpointBust}`);
  const brevo = captureBrevo();
  let response;
  try {
    response = await module.default(
      new Request("https://marvellflorist.com/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json", "x-nf-client-connection-ip": `10.0.0.${endpointBust}` },
        body: JSON.stringify(payload)
      })
    );
  } finally {
    brevo.restore();
  }
  return { response, data: await response.json(), calls: brevo.calls };
}

const VALID = {
  firstName: "Marshall",
  email: "example@email.com",
  whatsapp: "+6281275017456",
  emailOptIn: true,
  whatsappOptIn: false,
  source: "homepage-drawer",
  elapsed_ms: 9000
};

test("the documented payload shape is accepted", async () => {
  const { response, data, calls } = await callEndpoint(VALID);
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(calls.length, 1, "the contact reached Brevo");
  assert.equal(calls[0].body.attributes.FIRSTNAME, "Marshall");
  assert.equal(calls[0].body.attributes.SOURCE, "homepage-drawer");
});

test("snake_case is still accepted, so a cached script cannot drop consent", async () => {
  const { data, calls } = await callEndpoint({
    first_name: "Marshall",
    email: "example@email.com",
    phone: "+6281275017456",
    email_opt_in: true,
    whatsapp_opt_in: true,
    source: "footer",
    elapsed_ms: 9000
  });
  assert.equal(data.ok, true);
  assert.equal(calls[0].body.attributes.WHATSAPP_OPT_IN, true);
  assert.equal(calls[0].body.attributes.WHATSAPP, "+6281275017456");
});

test("at least one opt-in is required", async () => {
  const { response, data, calls } = await callEndpoint({
    ...VALID, emailOptIn: false, whatsappOptIn: false
  });
  assert.equal(response.status, 400);
  assert.equal(data.code, "consent_required");
  assert.equal(calls.length, 0, "nothing is sent to Brevo without consent");
});

test("an email address alone does not subscribe anyone", async () => {
  const { data, calls } = await callEndpoint({
    email: "example@email.com", source: "footer", elapsed_ms: 9000
  });
  assert.equal(data.ok, false);
  assert.equal(data.code, "consent_required");
  assert.equal(calls.length, 0);
});

test("WhatsApp consent without a number is refused", async () => {
  const { response, data } = await callEndpoint({
    email: "example@email.com", emailOptIn: false, whatsappOptIn: true,
    whatsapp: "", source: "footer", elapsed_ms: 9000
  });
  assert.equal(response.status, 400);
  assert.equal(data.code, "phone_required");
  assert.equal(data.field, "whatsapp");
});

test("a bad email is rejected before Brevo is called", async () => {
  const { response, data, calls } = await callEndpoint({ ...VALID, email: "not-an-email" });
  assert.equal(response.status, 400);
  assert.equal(data.code, "invalid_input");
  assert.equal(calls.length, 0);
});

test("the honeypot is answered as success but sends nothing", async () => {
  const { response, data, calls } = await callEndpoint({ ...VALID, company: "Acme Bots Ltd" });
  assert.equal(response.status, 200);
  assert.equal(data.ok, true, "a bot must not learn that it was caught");
  assert.equal(calls.length, 0, "nothing reaches Brevo");
});

test("an instant submission is treated as automated", async () => {
  const { data, calls } = await callEndpoint({ ...VALID, elapsed_ms: 40 });
  assert.equal(data.ok, true);
  assert.equal(calls.length, 0);
});

test("a missing key fails gracefully instead of crashing", async () => {
  const { response, data, calls } = await callEndpoint(VALID, { BREVO_API_KEY: "" });
  assert.equal(response.status, 503);
  assert.equal(data.code, "not_configured");
  assert.match(data.message, /not quite ready|try again/i);
  assert.equal(calls.length, 0);
  // The response must read as a temporary problem, not an internal fault.
  assert.ok(!/key|env|brevo/i.test(data.message), "no infrastructure detail leaks");
});

test("only POST is allowed", async () => {
  const module = await import("../netlify/functions/newsletter.mjs");
  const response = await module.default(
    new Request("https://marvellflorist.com/api/newsletter", { method: "GET" })
  );
  assert.equal(response.status, 405);
});

test("the endpoint is mounted at /api/newsletter", async () => {
  const module = await import("../netlify/functions/newsletter.mjs");
  assert.equal(module.config.path, "/api/newsletter");
  assert.ok(module.config.rateLimit, "repeated submissions are rate limited");
});

// The footer and invitation feed one consent panel.
const NL_SOURCE = await readFile(new URL("assets/newsletter.js", ROOT), "utf8");
test("the newsletter invitation waits, fades, and returns on a five minute cadence", () => {
  const dom = new JSDOM('<!doctype html><html><body><footer id="site-footer"><div class="footer-inner"><div class="footer-grid"></div></div></footer></body></html>', {
    url: "https://marvellflorist.com/", runScripts: "outside-only"
  });
  const { window } = dom;
  let now = 1000, nextId = 0;
  const timers = new Map();
  window.Date.now = () => now;
  window.setTimeout = (callback, delay) => {
    const id = ++nextId;
    timers.set(id, { callback, due: now + delay });
    return id;
  };
  window.clearTimeout = (id) => timers.delete(id);
  window.requestAnimationFrame = (callback) => callback();
  const advance = (ms) => {
    now += ms;
    while (true) {
      const due = [...timers].filter(([, timer]) => timer.due <= now).sort((a, b) => a[1].due - b[1].due)[0];
      if (!due) break;
      timers.delete(due[0]);
      due[1].callback();
    }
  };
  window.eval(NL_SOURCE);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  const card = window.document.querySelector(".nl-card");
  assert.equal(card.hidden, true);
  assert.equal(Math.min(...[...timers.values()].map(timer => timer.due)), now + 120000);
  advance(120000);
  assert.equal(card.hidden, false);
  assert.ok(card.classList.contains("is-visible"));
  advance(18000);
  assert.ok(!card.classList.contains("is-visible"));
  advance(420);
  assert.equal(card.hidden, true);
  assert.equal(JSON.parse(window.localStorage.getItem("marvell-note-impressions")).nextAt, 121000 + 300000);
  dom.window.close();
});
function mountNewsletter(response = { ok: true }, url = "https://marvellflorist.com/") {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><footer id="site-footer"><div class="footer-inner"><div class="footer-grid"></div></div></footer></body></html>`, {
    url, runScripts: "outside-only"
  });
  const posted = [];
  dom.window.fetch = async (url, init) => {
    posted.push({ url, body: JSON.parse(init.body) });
    return { ok: response.ok, json: async () => response };
  };
  dom.window.requestAnimationFrame = (fn) => dom.window.setTimeout(fn, 0);
  dom.window.eval(NL_SOURCE);
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  return { dom, document: dom.window.document, posted };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 5));

test("the signup dialog escapes the homepage's tall section rule", async () => {
  const dom = new JSDOM(`<!doctype html><html><head><style>section{min-height:160vh;overflow:hidden}</style></head><body><footer id="site-footer"><div class="footer-inner"><div class="footer-grid"></div></div></footer></body></html>`, {
    url: "https://marvellflorist.com/", runScripts: "outside-only"
  });
  dom.window.requestAnimationFrame = (fn) => dom.window.setTimeout(fn, 0);
  dom.window.eval(NL_SOURCE);
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  const form = dom.window.document.querySelector(".nl-footer .nl-form");
  form.querySelector('[name="email"]').value = "reader@example.com";
  form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  await settle();
  const modal = dom.window.document.querySelector(".nl-modal");
  assert.equal(modal.hidden, false);
  assert.equal(dom.window.getComputedStyle(modal).minHeight, "0px");
  dom.window.close();
});

test("the footer signup is one field, submitted in place", () => {
  const { dom, document } = mountNewsletter();
  const block = document.querySelector(".nl-footer");
  assert.ok(block, "the footer carries the signup");
  assert.equal(block.nextElementSibling, document.querySelector(".footer-grid"));

  // Email and nothing else. A name field here is a name we do not need, and
  // WhatsApp consent is a different decision made somewhere else.
  const fields = [...block.querySelectorAll("input")].map((input) => input.name);
  assert.deepEqual(fields, ["email", "company"], "email, plus the honeypot");
  assert.equal(block.querySelector('[name="company"]').tabIndex, -1);
  assert.equal(block.querySelector('[type="checkbox"]'), null, "submitting is the consent");

  // And it is not a panel. There is nothing to open.
  assert.equal(document.querySelector(".mv-panel--newsletter"), null);
  assert.equal(document.querySelector(".nl-panel"), null);
  dom.window.close();
});

test("the consent is in the words the consent is for", () => {
  const { dom, document } = mountNewsletter();
  const terms = document.querySelector(".nl-footer .nl-terms");
  assert.match(terms.textContent, /agree to receive email from Marvell Florist/);
  assert.match(terms.textContent, /unsubscribe at any time/);
  assert.match(terms.textContent, /mailing list, not an account/);
  assert.equal(terms.querySelector("a").getAttribute("href"), "privacy-policy.html");
  dom.window.close();
});

/** Enters an address in the page form, which opens the dialog. */
async function reachDialog(context, email = "reader@example.com") {
  const { dom, document } = context;
  const form = document.querySelector(".nl-footer .nl-form");
  form.querySelector('[name="email"]').value = email;
  form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  await settle();
  return document.querySelector(".nl-modal");
}

test("the address opens the dialog, and nothing is sent yet", async () => {
  const context = mountNewsletter();
  const { dom, document, posted } = context;
  const modal = await reachDialog(context);

  assert.equal(modal.hidden, false, "the dialog is up");
  assert.equal(posted.length, 0, "and nothing has been sent");

  // The address is carried in, shown back, and still editable.
  assert.equal(modal.querySelector('[name="email"]').value, "reader@example.com");

  // The address and a name are required; the civility is not.
  assert.ok(modal.querySelector('[name="firstName"]'));
  assert.ok(modal.querySelector('[name="lastName"]'));
  assert.equal(modal.querySelector('[name="firstName"]').required, true);
  assert.equal(modal.querySelector('[name="lastName"]').required, true);
  assert.equal(modal.querySelector('[name="email"]').required, true);
  assert.match(modal.textContent, /Fields marked \* are required/);

  // And what is being agreed to is said before it can be agreed to.
  assert.match(modal.textContent, /agree to receive/i);
  assert.match(modal.textContent, /mailing list, not an account/);

  // What the data is used for, and how to stop it, in the panel itself.
  assert.match(modal.textContent, /offers, news and events/i);
  assert.match(modal.textContent, /management of its customer and commercial relationship/i);
  assert.match(modal.textContent, /Privacy Statement/);
  assert.match(modal.textContent, /personalised communications/i);
  assert.match(modal.textContent, /unsubscribe/i);
  dom.window.close();
});

test("every civility the dialog offers survives the endpoint", async () => {
  // The endpoint keeps a closed set, and it has to hold every option the
  // dialog shows or the chosen one is dropped on the way through without
  // anything being refused.
  const api = await readFile(new URL("netlify/functions/newsletter.mjs", ROOT), "utf8");
  const allowed = api.match(/\["mr",[^\]]*\]/)[0];
  const source = await readFile(new URL("assets/newsletter.js", ROOT), "utf8");
  const offered = [...source.matchAll(/\{ value: "([a-z]*)", label: t\(/g)].map((m) => m[1]);

  assert.ok(offered.length >= 5, "the dialog offers a full set of civilities");
  for (const value of offered) {
    assert.ok(value, "every option carries a real value, so an empty one means unanswered");
    assert.ok(allowed.includes(`"${value}"`), `${value} must be accepted by the endpoint`);
  }
});

test("every civility the dialog offers survives the database too", async () => {
  // The endpoint accepting a value is only half of it. newsletter_events has
  // a check constraint, and when that constraint was narrower than the dialog
  // a subscriber who chose Ms or Miss had their consent record refused —
  // silently, because the insert's error was never looked at.
  const migration = await readFile(
    new URL("supabase/migrations/0006_newsletter_names.sql", ROOT), "utf8"
  );
  const source = await readFile(new URL("assets/newsletter.js", ROOT), "utf8");
  const offered = [...source.matchAll(/\{ value: "([a-z]*)", label: t\(/g)].map((m) => m[1]);

  const allowed = migration.match(/newsletter_events_title_check[\s\S]*?check \(title is null or title in \(([^)]*)\)\)/);
  assert.ok(allowed, "the constraint is findable");
  for (const value of offered) {
    assert.ok(allowed[1].includes(`'${value}'`), `${value} must be accepted by the database`);
  }

  // And it has to be a drop-then-add, or a database already carrying the
  // narrow version keeps it: the previous version swallowed duplicate_object.
  // Comments are stripped first, because this file explains that history and
  // the explanation must not be what satisfies the test.
  const sql = migration.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
  assert.match(sql, /drop constraint if exists newsletter_events_title_check/);
  assert.ok(!/exception when duplicate_object/.test(sql),
    "the constraint must not be added inside a block that swallows the duplicate");
});

test("a refused consent record is reported, and never with the subscriber in it", async () => {
  // supabase-js resolves with { data, error } rather than throwing, so the
  // endpoint has to inspect the error. It also has to not print it whole:
  // Postgres puts the offending row in DETAIL, which for this table is the
  // subscriber's address, name and phone number.
  for (const key of ["BREVO_API_KEY", "BREVO_LIST_ID", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    delete process.env[key];
  }
  Object.assign(process.env, {
    BREVO_API_KEY: "test-key",
    BREVO_LIST_ID: "3",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key"
  });
  endpointBust += 1;
  const module = await import(`../netlify/functions/newsletter.mjs?v=${endpointBust}`);

  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("supabase.co")) {
      // What Postgres returns for a check violation, DETAIL and all.
      return {
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify({
          code: "23514",
          message: 'new row for relation "newsletter_events" violates check constraint "newsletter_events_title_check"',
          details: 'Failing row contains (a1b2, secret-subscriber@example.com, Marshall, Phan, ms, +6281275017456, footer).',
          hint: null
        }),
        json: async () => ({})
      };
    }
    brevoCalls.push(String(url));
    return { status: 204, json: async () => ({}) };
  };

  const logs = [];
  const originalError = console.error;
  console.error = (...args) => logs.push(args.join(" "));

  let response;
  try {
    response = await module.default(new Request("https://marvellflorist.com/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json", "x-nf-client-connection-ip": `10.9.0.${endpointBust}` },
      body: JSON.stringify({ ...VALID, title: "ms" })
    }));
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  const data = await response.json();
  assert.equal(data.ok, true, "the subscription stands: Brevo already accepted it");
  assert.equal(brevoCalls.length, 1, "and it is not retried, which would double the contact write");

  const line = logs.join("\n");
  assert.match(line, /consent record NOT written/, "the failure is not discarded in silence");
  assert.match(line, /23514/, "and it names the fault");
  assert.match(line, /source=homepage-drawer/, "with the one non-personal fact that makes it diagnosable");
  assert.ok(!/secret-subscriber@example\.com/.test(line), "the subscriber's address must not be logged");
  assert.ok(!/6281275017456/.test(line), "nor their phone number");
  assert.ok(!/Failing row contains/.test(line), "nor Postgres's DETAIL, which carries the whole row");
});

test("the civility is a disclosure, and every option is a real answer", async () => {
  const context = mountNewsletter();
  const { dom } = context;
  const modal = await reachDialog(context);

  const trigger = modal.querySelector("[data-nl-select-trigger]");
  const select = modal.querySelector("[data-nl-select]");
  assert.ok(trigger, "the title field is a disclosure, not a row of chips");
  assert.equal(trigger.getAttribute("aria-expanded"), "false", "it starts closed");

  // Five of them, and none of them declines the question: the field is
  // required, so an option meaning "no answer" would contradict the asterisk.
  const options = [...modal.querySelectorAll("[data-nl-title]")];
  assert.deepEqual(
    options.map((option) => option.textContent.trim()),
    ["Mr", "Mrs", "Miss", "Ms", "Mx"]
  );
  assert.ok(
    options.every((option) => option.dataset.nlTitle),
    "no option sends an empty title, so empty can only mean unanswered"
  );

  trigger.click();
  await settle();
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert.equal(select.getAttribute("data-open"), "true");

  options[2].click();
  await settle();
  assert.equal(trigger.getAttribute("aria-expanded"), "false", "choosing closes it");
  assert.equal(modal.querySelector(".nl-select-value").textContent, "Miss");
  assert.equal(options[2].getAttribute("aria-selected"), "true");
  dom.window.close();
});

test("the dialog scrolls the overlay, so its top is always reachable", async () => {
  // It used to be a fixed box centred with translate(-50%,-50%) and capped at
  // 88vh. Once the form outgrew that, the overflow went off the TOP of the
  // window and the heading and close button could not be scrolled back to.
  const source = await readFile(new URL("assets/newsletter.js", ROOT), "utf8");
  const modalRule = source.match(/'\.nl-modal\{[^']+'/)[0];
  assert.match(modalRule, /position:fixed/);
  assert.match(modalRule, /inset:0/);
  assert.match(modalRule, /overflow-y:auto/);
  assert.match(modalRule, /box-sizing:border-box/, "padding cannot push it past the viewport");
  assert.ok(!/translate\(-50%,-50%\)/.test(modalRule), "no half-height offset to hide the top");
  assert.ok(!/max-height/.test(modalRule), "the overlay is the scroller, not a capped box");

  // The sheet centres with an auto margin, which never pushes it out of reach.
  const cardRule = source.match(/'\.nl-modal-card\{[^']+'/)[0];
  assert.match(cardRule, /margin:auto/);
  assert.match(cardRule, /box-sizing:border-box/);
});

test("choosing a title moves nothing else in the dialog", async () => {
  // As an accordion the list grew inside the form, adding its height to the
  // sheet and pushing the name fields, the consent and Submit down the page.
  // It floats over them instead, like the footer's language switcher.
  const source = await readFile(new URL("assets/newsletter.js", ROOT), "utf8");
  const listRule = source.match(/'\.nl-select-list\{[^']+'/)[0];
  assert.match(listRule, /position:absolute/, "the list is taken out of the flow");
  assert.match(listRule, /visibility:hidden/);
  assert.match(listRule, /opacity:0/);
  assert.ok(!/max-height:0/.test(listRule), "nothing collapses to zero height in the form");

  const openRule = source.match(/'\.nl-select\[data-open=true\] \.nl-select-list\{[^']+'/)[0];
  assert.match(openRule, /opacity:1/);
  assert.match(openRule, /visibility:visible/);
});

test("submitting the dialog posts one email opt-in and says so", async () => {
  const context = mountNewsletter();
  const { dom, document, posted } = context;
  const modal = await reachDialog(context);

  modal.querySelector('[name="firstName"]').value = "Marshall";
  modal.querySelector('[name="lastName"]').value = "Phan";
  modal.querySelector('[data-nl-title="mr"]').click();
  modal.querySelector("[data-nl-modal-form]").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );
  await settle();

  assert.equal(posted.length, 1);
  assert.equal(posted[0].url, "/api/newsletter");
  assert.equal(posted[0].body.email, "reader@example.com");
  assert.equal(posted[0].body.emailOptIn, true);
  assert.equal(posted[0].body.whatsappOptIn, false, "this dialog never consents to WhatsApp");
  assert.equal(posted[0].body.firstName, "Marshall");
  assert.equal(posted[0].body.title, "mr");

  // The confirmation is addressed to the person who just filled the form in,
  // and carries its own way out rather than only the corner cross.
  const confirmation = document.querySelector(".nl-modal");
  assert.match(confirmation.textContent, /Join the world of Marvell/);
  assert.match(confirmation.textContent, /Marshall Phan/, "it names the subscriber");
  assert.match(confirmation.textContent, /successfully subscribed/);
  assert.match(confirmation.textContent, /Thank you/);

  const done = confirmation.querySelector(".nl-done-close");
  assert.ok(done, "the confirmation carries a labelled close button");
  assert.equal(done.getAttribute("data-nl-modal-close"), "", "and it is wired to the dialog's own close");
  assert.equal(document.activeElement, done, "focus follows the removed submit button to the way out");
  assert.ok(
    document.getElementById(confirmation.getAttribute("aria-labelledby")),
    "the dialog is still labelled by a heading that exists"
  );

  assert.equal(document.querySelector(".nl-footer .nl-form").hidden, true, "nothing left to submit");
  assert.equal(JSON.parse(dom.window.localStorage.getItem("marvell-note-subscribed")), true,
    "this browser remembers the successful signup");
  assert.equal(document.querySelector(".nl-card").hidden, true,
    "an invitation already behind the signup disappears immediately");

  await new Promise((resolve) => setTimeout(resolve, 1600));
  assert.equal(confirmation.hidden, true, "the successful signup popup dismisses itself");
  dom.window.close();
});

test("a browser that already subscribed is not invited or shown another signup form", () => {
  const dom = new JSDOM('<!doctype html><html><body><footer id="site-footer"><div class="footer-inner"><div class="footer-grid"></div></div></footer></body></html>', {
    url: "https://marvellflorist.com/", runScripts: "outside-only"
  });
  dom.window.localStorage.setItem("marvell-note-subscribed", "true");
  dom.window.requestAnimationFrame = (callback) => callback();
  dom.window.eval(NL_SOURCE);
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

  assert.equal(dom.window.document.querySelector(".nl-card").hidden, true);
  assert.equal(dom.window.document.querySelector(".nl-footer [data-nl-form]"), null);
  assert.match(dom.window.document.querySelector(".nl-footer").textContent, /Thank you for subscribing/);
  dom.window.close();
});

test("Live Server signup sends the same form to the loopback API", async () => {
  const context = mountNewsletter({ ok: true }, "http://127.0.0.1:5501/index.html");
  const { dom, posted } = context;
  const modal = await reachDialog(context);
  modal.querySelector('[name="firstName"]').value = "Marshall";
  modal.querySelector('[name="lastName"]').value = "Phan";
  modal.querySelector('[data-nl-title="mr"]').click();
  modal.querySelector("[data-nl-modal-form]").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );
  await settle();
  assert.equal(posted[0].url, "http://127.0.0.1:8787/api/newsletter");
  assert.equal(posted[0].body.emailOptIn, true);
  dom.window.close();
});

test("the Live Server bridge accepts local signup requests and CORS preflight", async () => {
  const server = createLiveNewsletterServer(async (request) => {
    const body = await request.json();
    return new Response(JSON.stringify({ ok: true, email: body.email }), {
      headers: { "content-type": "application/json" }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/newsletter`;
  const origin = "http://127.0.0.1:5501";
  try {
    const preflight = await fetch(url, { method: "OPTIONS", headers: { origin } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), origin);

    const response = await fetch(url, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email: "reader@example.com" })
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal((await response.json()).email, "reader@example.com");

    const blocked = await fetch(url, { method: "OPTIONS", headers: { origin: "https://example.com" } });
    assert.equal(blocked.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("a missing name is asked for rather than posted blank", async () => {
  const context = mountNewsletter();
  const { dom, document, posted } = context;
  const modal = await reachDialog(context);
  // The civility is checked first, so it is answered here to leave the name
  // as the only thing missing.
  modal.querySelector('[data-nl-title="mr"]').click();
  await settle();
  modal.querySelector("[data-nl-modal-form]").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );
  await settle();

  assert.equal(posted.length, 0, "nothing is sent");
  const status = document.querySelector("[data-nl-modal-status]");
  assert.equal(status.dataset.tone, "error");
  assert.match(status.textContent, /first and last name/i);
  assert.equal(modal.querySelector('[name="firstName"]').getAttribute("aria-invalid"), "true");
  assert.equal(document.querySelector(".nl-modal").hidden, false, "the dialog stays up");
  dom.window.close();
});

test("a name without a civility is asked for rather than posted blank", async () => {
  // The title is required, so a full name is no longer enough on its own.
  const context = mountNewsletter();
  const { dom, document, posted } = context;
  const modal = await reachDialog(context);
  modal.querySelector('[name="firstName"]').value = "Marshall";
  modal.querySelector('[name="lastName"]').value = "Phan";
  modal.querySelector("[data-nl-modal-form]").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );
  await settle();

  assert.equal(posted.length, 0, "nothing is sent");
  const status = document.querySelector("[data-nl-modal-status]");
  assert.equal(status.dataset.tone, "error");
  assert.match(status.textContent, /choose a title/i);

  const trigger = modal.querySelector("[data-nl-select-trigger]");
  assert.equal(trigger.getAttribute("aria-invalid"), "true");
  assert.equal(
    trigger.closest("[data-nl-select]").getAttribute("data-open"),
    "true",
    "a disclosure that was missed is opened rather than just reddened"
  );

  // Answering it clears the accusation and lets the same submit through.
  modal.querySelector('[data-nl-title="mx"]').click();
  await settle();
  assert.equal(trigger.getAttribute("aria-invalid"), "false");
  modal.querySelector("[data-nl-modal-form]").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );
  await settle();
  assert.equal(posted.length, 1);
  assert.equal(posted[0].body.title, "mx");
  dom.window.close();
});

test("the required note and the labels agree on what is required", async () => {
  const context = mountNewsletter();
  const { dom } = context;
  const modal = await reachDialog(context);
  const starred = [...modal.querySelectorAll(".nl-label")]
    .filter((label) => label.textContent.includes("*"))
    .map((label) => label.textContent.replace("*", "").trim());
  assert.deepEqual(starred, ["Email address", "Title", "First name", "Last name"]);
  dom.window.close();
});

test("the dialog reads its own fields, not the first ones on the page", async () => {
  // Opened from the invitation card, with the footer form left untouched.
  // The submit listener is delegated on `document`, so reading the form off
  // event.currentTarget searched the whole page and checked the footer's
  // empty email input — and told the reader their address was invalid.
  const context = mountNewsletter();
  const { dom, document, posted } = context;

  const card = document.querySelector(".nl-card");
  const cardForm = card.querySelector("[data-nl-form]");
  cardForm.querySelector('[name="email"]').value = "reader@example.com";
  cardForm.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  await settle();

  assert.equal(
    document.querySelector('.nl-footer input[name="email"]').value,
    "",
    "the footer form is untouched, and comes first in the document"
  );

  const modal = document.querySelector(".nl-modal");
  assert.equal(modal.hidden, false, "the card opened the dialog");
  modal.querySelector('[data-nl-title="mr"]').click();
  await settle();
  modal.querySelector('[name="firstName"]').value = "Marshall";
  modal.querySelector('[name="lastName"]').value = "Phan";
  modal.querySelector("[data-nl-modal-form]").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );
  await settle();

  assert.equal(posted.length, 1, "the address from the card is accepted");
  assert.equal(posted[0].body.email, "reader@example.com");
  assert.equal(posted[0].body.source, "card");
  assert.equal(posted[0].body.firstName, "Marshall");
  dom.window.close();
});

test("a rejected address keeps the dialog, and never shows Brevo's own words", async () => {
  const context = mountNewsletter({ ok: false, message: "Please try again shortly." });
  const { dom, document } = context;
  const modal = await reachDialog(context);
  modal.querySelector('[data-nl-title="mr"]').click();
  await settle();
  modal.querySelector('[name="firstName"]').value = "Marshall";
  modal.querySelector('[name="lastName"]').value = "Phan";
  modal.querySelector("[data-nl-modal-form]").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );
  await settle();

  const status = document.querySelector("[data-nl-modal-status]");
  assert.equal(status.dataset.tone, "error");
  assert.match(status.textContent, /try again/i);
  assert.equal(document.querySelector(".nl-modal").hidden, false, "still there to resubmit");
  assert.equal(document.querySelector(".nl-submit").disabled, false);
  dom.window.close();
});

test("the dialog can be closed without sending anything", async () => {
  const context = mountNewsletter();
  const { dom, document, posted } = context;
  await reachDialog(context);
  document.querySelector("[data-nl-modal-close]").click();
  await settle();
  assert.equal(posted.length, 0);
  assert.ok(!document.querySelector(".nl-modal").classList.contains("is-open"));
  dom.window.close();
});

test("clicking off the sheet closes the dialog", async () => {
  // The overlay is the scroller and covers the whole window, so it sits over
  // the backdrop and the backdrop's own listener can no longer be reached.
  const context = mountNewsletter();
  const { dom, document, posted } = context;
  const modal = await reachDialog(context);

  modal.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await settle();

  assert.equal(posted.length, 0, "nothing was sent");
  assert.ok(!document.querySelector(".nl-modal").classList.contains("is-open"));
  dom.window.close();
});

test("clicking inside the sheet leaves the dialog open", async () => {
  const context = mountNewsletter();
  const { dom, document } = context;
  const modal = await reachDialog(context);

  modal.querySelector(".nl-modal-card").dispatchEvent(
    new dom.window.MouseEvent("click", { bubbles: true })
  );
  await settle();

  assert.ok(document.querySelector(".nl-modal").classList.contains("is-open"));
  dom.window.close();
});

test("an invalid address never opens the dialog, let alone reaches the server", async () => {
  const { dom, document, posted } = mountNewsletter();
  const form = document.querySelector(".nl-footer .nl-form");
  form.querySelector('[name="email"]').value = "not-an-address";
  form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  await settle();
  assert.equal(posted.length, 0);
  assert.equal(document.querySelector(".nl-modal").hidden, true);
  assert.equal(form.querySelector('[name="email"]').getAttribute("aria-invalid"), "true");
  dom.window.close();
});

// -------------------------------------------------- mounted in the footer ---

/**
 * The home page loads this script and assets/shared-footer.js both deferred,
 * with this one first, so when it ran there was no footer to put the signup
 * in and the mailing list was missing from the home page alone. Every other
 * page happened to load them as ordinary body scripts, where this one waits
 * for DOMContentLoaded and the footer is always up by then — which is why the
 * gap survived: the order is not the same on every page and never was.
 */
test("the signup waits for a footer that is built after this script runs", async () => {
  const dom = new JSDOM('<!doctype html><html><body><footer id="site-footer"></footer></body></html>', {
    url: "https://marvellflorist.com/", runScripts: "outside-only"
  });
  const { window, window: { document } } = dom;
  // A deferred script runs with the document parsed but not yet loaded, so
  // newsletter.js mounts immediately instead of waiting for DOMContentLoaded.
  Object.defineProperty(document, "readyState", { get: () => "interactive", configurable: true });
  window.eval(NL_SOURCE);
  assert.equal(document.querySelector(".nl-footer"), null, "nothing to mount into yet");

  const footer = document.getElementById("site-footer");
  footer.innerHTML = '<div class="footer-inner"><div class="footer-grid"></div></div>';
  await settle();

  const block = document.querySelector("#site-footer .nl-block");
  assert.ok(block, "the signup lands as soon as the footer is built");
  assert.ok(block.nextElementSibling?.classList.contains("footer-grid"), "above the footer columns");
  assert.ok(document.querySelector('.nl-footer input[name="email"]'), "and it is a working form");
  dom.window.close();
});

test("the signup is bound whenever it lands, not only when the footer was first", async () => {
  const dom = new JSDOM('<!doctype html><html><body><footer id="site-footer"></footer></body></html>', {
    url: "https://marvellflorist.com/", runScripts: "outside-only"
  });
  const { window, window: { document } } = dom;
  Object.defineProperty(document, "readyState", { get: () => "interactive", configurable: true });
  const posted = [];
  window.fetch = async (url, init) => {
    posted.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => ({ ok: true }) };
  };
  window.requestAnimationFrame = (fn) => window.setTimeout(fn, 0);
  window.eval(NL_SOURCE);
  document.getElementById("site-footer").innerHTML =
    '<div class="footer-inner"><div class="footer-grid"></div></div>';
  await settle();

  const form = document.querySelector(".nl-footer .nl-form");
  form.querySelector('[name="email"]').value = "reader@example.com";
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await settle();

  assert.ok(document.querySelector(".nl-modal").classList.contains("is-open"), "the consent dialog opens");
  dom.window.close();
});

test("every page that carries the mailing list carries the footer it mounts into", async () => {
  const pages = [
    "index.html", "about.html", "contact.html", "faq.html", "services.html", "journals.html",
    "gallery.html", "featured.html", "wishlist.html", "product.html", "bag.html",
    "checkout.html", "account.html", "order.html", "privacy-policy.html", "terms-conditions.html"
  ];
  for (const page of pages) {
    const html = await readFile(new URL(page, ROOT), "utf8");
    if (!html.includes("newsletter.js")) continue;
    assert.ok(html.includes("shared-footer.js"), `${page} loads the newsletter without a footer to put it in`);
  }
});
