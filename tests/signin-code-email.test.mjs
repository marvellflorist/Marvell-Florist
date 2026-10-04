import test from "node:test";
import assert from "node:assert/strict";
import { sendSignInCode } from "../netlify/functions/_lib/signin-code.mjs";

/**
 * Sends one code and hands back what Brevo was asked to deliver.
 *
 * SITE_ORIGIN is deliberately set to localhost here, because that is the
 * development value and the images must not follow it: an email is fetched by
 * Gmail's image proxy, which cannot reach this machine.
 */
async function send(options = {}) {
  const previous = {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_ACCOUNT_SENDER: process.env.BREVO_ACCOUNT_SENDER,
    SITE_ORIGIN: process.env.SITE_ORIGIN,
    EMAIL_ASSET_ORIGIN: process.env.EMAIL_ASSET_ORIGIN
  };
  const originalFetch = globalThis.fetch;
  process.env.BREVO_API_KEY = "test-only";
  process.env.BREVO_ACCOUNT_SENDER = "account@example.test";
  process.env.SITE_ORIGIN = "http://localhost:8888";
  delete process.env.EMAIL_ASSET_ORIGIN;
  let sent;
  globalThis.fetch = async (url, request) => {
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    sent = JSON.parse(request.body);
    return new Response(null, { status: 201 });
  };
  try {
    const service = { auth: { admin: { generateLink: async (request) => {
      assert.deepEqual(request, { type: "magiclink", email: "reader@example.test" });
      return { data: { properties: { email_otp: "12345678", hashed_token: "test-hash" } } };
    } } } };
    const result = await sendSignInCode(service, "reader@example.test", "/account", options);
    return { sent, result };
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

/** Every <img> in a message, as { src, alt, width, height }. */
function images(html) {
  return [...html.matchAll(/<img\b[^>]*>/g)].map((match) => {
    const attr = (name) => (match[0].match(new RegExp(`${name}="([^"]*)"`)) || [, null])[1];
    return { src: attr("src"), alt: attr("alt"), width: attr("width"), height: attr("height") };
  });
}

test("Both messages point their images at the public origin, never at SITE_ORIGIN", async () => {
  for (const options of [{}, { registering: true }]) {
    const { sent } = await send(options);
    const found = images(sent.htmlContent);
    assert.ok(found.length > 0, "a message with no images at all has lost the wordmark");
    for (const img of found) {
      // The bug this test exists for: /assets/ is the website's working
      // directory and its files are not deployed, so a src pointing into it
      // reaches Gmail as a 404 page and renders as an outlined box.
      assert.match(img.src, /^https:\/\/marvellflorist\.com\/email\//, `${img.src} is not on the permanent email shelf`);
      assert.doesNotMatch(img.src, /localhost|\/assets\//);
      // An image-blocked inbox draws the box from these, so the message keeps
      // its shape instead of collapsing.
      assert.match(img.width, /^\d+$/, `${img.src} has no explicit width`);
      assert.match(img.height, /^\d+$/, `${img.src} has no explicit height`);
      assert.match(sent.htmlContent, /max-width:\d+px;height:auto;/);
    }
    // No webfont is declared at all, so there is no second face to fall back
    // from: Gmail strips @font-face and what arrived instead was the name set
    // in a plain sans, which is not the name.
    assert.doesNotMatch(sent.htmlContent, /@font-face/);
    assert.doesNotMatch(sent.htmlContent, /Adelio|Georgia|serif(?!;)/);
    // No rules and no bullet characters. A line drawn round the text is a
    // form, and a row of asterisks is a specification.
    assert.doesNotMatch(sent.htmlContent, /border:1px|border-top:/);
    assert.doesNotMatch(sent.htmlContent, /;">\*/);
    assert.doesNotMatch(sent.textContent, /^\*/m);
    assert.doesNotMatch(sent.htmlContent, /—/);
    // The message has to be readable with images switched off, so the name is
    // in the text as well as in the picture of the name.
    assert.match(sent.textContent, /^MARVELL FLORIST/);
    assert.match(sent.textContent, /12345678/);
    assert.doesNotMatch(sent.subject, /12345678/);
  }
});

test("Signing back in is the code and almost nothing else", async () => {
  const { sent, result } = await send();

  assert.deepEqual(result, { codeLength: 8 });
  assert.deepEqual(sent.sender, { email: "account@example.test", name: "Marvell Florist" });
  assert.deepEqual(sent.to, [{ email: "reader@example.test" }]);
  assert.equal(sent.subject, "Your Marvell account sign-in code");

  // The wordmark, and no campaign photograph: somebody with an account is
  // being let back in, not sold one.
  const found = images(sent.htmlContent);
  assert.equal(found.length, 1);
  assert.deepEqual(found[0], {
    src: "https://marvellflorist.com/email/logo.png",
    alt: "Marvell Florist",
    width: "250",
    height: "30"
  });

  assert.match(sent.htmlContent, /Your sign-in code for My Marvell\./);
  assert.match(sent.htmlContent, /To sign in, please enter the following verification code:/);
  assert.match(sent.htmlContent, /<strong[^>]*>12345678<\/strong>/);
  assert.match(sent.htmlContent, /Username: <a href="mailto:reader@example\.test"/);
  assert.match(sent.htmlContent, /We will never ask you for it by phone/);
  assert.match(sent.textContent, /We will never ask you for it by phone/);

  // Nothing that belongs to the welcome has leaked in.
  assert.doesNotMatch(sent.htmlContent, /Welcome to Marvell Florist|Enjoy a more personal experience/);
  assert.doesNotMatch(sent.htmlContent, /new collections, seasonal releases/);

  assert.match(sent.htmlContent, /http:\/\/localhost:8888\/api\/account\/confirm\?token_hash=test-hash&amp;next=%2Faccount/);
  assert.match(sent.textContent, /http:\/\/localhost:8888\/api\/account\/confirm\?token_hash=test-hash&next=%2Faccount/);
});

test("A new account is welcomed with the photograph, the name and the code that activates it", async () => {
  const { sent } = await send({ name: "Amelia Kusuma", registering: true });

  assert.equal(sent.subject, "Your Marvell account verification code");

  const found = images(sent.htmlContent);
  assert.equal(found.length, 2);
  assert.equal(found[0].src, "https://marvellflorist.com/email/logo.png");
  // The photograph carries the message; it is decorative beside the text, so
  // it is never given alt text to read aloud.
  assert.deepEqual(found[1], {
    src: "https://marvellflorist.com/email/my-marvell-welcome.jpg",
    alt: "",
    width: "520",
    height: "347"
  });

  assert.match(sent.htmlContent, /Dear Amelia Kusuma,/);
  assert.match(sent.htmlContent, /Welcome to Marvell Florist\./);
  assert.match(sent.htmlContent, /Enjoy a more personal experience with Marvell\./);
  assert.match(sent.htmlContent, /new collections, seasonal releases/);
  // The account does not exist until the code is entered, so an activation
  // mail without one would be an invitation to a door that cannot open.
  assert.match(sent.htmlContent, /To finish creating your account, please enter the following verification code:/);
  assert.match(sent.htmlContent, /<strong[^>]*>12345678<\/strong>/);
  assert.match(sent.htmlContent, /open My Marvell from this email/);

  assert.doesNotMatch(sent.htmlContent, /Your sign-in code for My Marvell/);
});

test("A name in the greeting cannot carry markup into the message", async () => {
  const { sent } = await send({ name: '<script>x</script>', registering: true });
  assert.doesNotMatch(sent.htmlContent, /<script>/);
  assert.match(sent.htmlContent, /Dear &lt;script&gt;x&lt;\/script&gt;,/);
});

test("EMAIL_ASSET_ORIGIN moves the images without touching a template", async () => {
  const previous = process.env.EMAIL_ASSET_ORIGIN;
  process.env.EMAIL_ASSET_ORIGIN = "https://cdn.example.test/";
  try {
    const originalFetch = globalThis.fetch;
    let sent;
    process.env.BREVO_API_KEY = "test-only";
    globalThis.fetch = async (url, request) => { sent = JSON.parse(request.body); return new Response(null, { status: 201 }); };
    const service = { auth: { admin: { generateLink: async () => ({ data: { properties: { email_otp: "12345678", hashed_token: "h" } } }) } } };
    try {
      await sendSignInCode(service, "reader@example.test", "/account");
    } finally {
      globalThis.fetch = originalFetch;
    }
    // The trailing slash in the setting must not survive into the URL.
    assert.equal(images(sent.htmlContent)[0].src, "https://cdn.example.test/email/logo.png");
  } finally {
    if (previous === undefined) delete process.env.EMAIL_ASSET_ORIGIN; else process.env.EMAIL_ASSET_ORIGIN = previous;
  }
});
