import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const consentScript = await readFile(new URL("../assets/consent.js", import.meta.url), "utf8");

test("language and cookie choices open as early centered dialogs with no persistent privacy button", async () => {
  const dom = new JSDOM("<!doctype html><html><head></head><body><button id='before'>Before</button></body></html>", {
    url: "https://marvellflorist.com/", runScripts: "outside-only"
  });
  const { window } = dom;
  const requests = [];
  let analyticsEnabled = 0;
  window.MarvellAnalytics = { enable: () => { analyticsEnabled += 1; }, disable() {} };
  Object.defineProperty(window.crypto, "randomUUID", { value: () => "d8a26c6d-3d1e-42fd-9b44-72e2080e31cd" });
  window.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ receipt_id: "receipt-test" }) };
  };
  window.eval(consentScript);

  const dialog = window.document.querySelector('[role="dialog"][aria-modal="true"]');
  assert.ok(dialog);
  assert.match(dialog.textContent, /Welcome to Marvell Florist/);
  assert.equal(window.document.querySelector(".mv-privacy-btn"), null);
  assert.match(window.document.querySelector("style").textContent, /place-items:center/);
  assert.match(window.document.querySelector("style").textContent, /backdrop-filter:blur/);

  const languageButtons = [...dialog.querySelectorAll(".mv-consent-actions button")];
  assert.deepEqual(languageButtons.map((button) => button.textContent), ["English", "Bahasa Indonesia"]);
  languageButtons[0].click();
  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.equal(window.localStorage.getItem("marvell-language-prompt-v1"), "en", "the welcome choice is remembered separately from a language query");

  const cookieDialog = window.document.querySelector('[role="dialog"][aria-modal="true"]');
  assert.match(cookieDialog.textContent, /We Use Cookies/);
  assert.match(cookieDialog.textContent, /Privacy Policy/);
  assert.equal(cookieDialog.querySelector('a[href="/privacy-policy.html"]')?.textContent, "Privacy Policy");

  const buttons = [...cookieDialog.querySelectorAll(".mv-consent-actions button")];
  assert.deepEqual(buttons.map((button) => button.textContent), ["Accept all cookies", "Cookie settings"]);
  assert.equal(cookieDialog.querySelector(".mv-consent-close"), null, "the first cookie dialog has only the reference actions");
  buttons[1].click();
  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.ok(window.document.querySelector('[name="analytics"]'));
  assert.ok(window.document.querySelector('[name="marketing"]'));

  window.document.querySelector(".mv-consent-primary").click();
  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.equal(window.document.querySelector(".mv-consent"), null);
  assert.equal(window.MarvellConsent.choices().analytics, false);
  assert.equal(window.MarvellConsent.choices().marketing, false);
  assert.equal(analyticsEnabled, 0);
  assert.equal(requests[0].url, "/api/privacy/consent");
  assert.equal(requests[0].body.analytics, false);

  window.MarvellConsent.open();
  assert.ok(window.document.querySelector('[name="analytics"]'), "settings remain available after the dialog closes");
  dom.window.close();
});

test("the footer has a regular cookie settings control", async () => {
  const footer = await readFile(new URL("../assets/shared-footer.js", import.meta.url), "utf8");
  const language = await readFile(new URL("../assets/site-language.js", import.meta.url), "utf8");
  assert.match(footer, /data-cookie-settings>Cookie settings<\/button>/);
  assert.match(footer, /window\.MarvellConsent\?\.open\?\.\(\)/);
  assert.match(language, /\[data-cookie-settings\].*Pengaturan cookie/);
});
