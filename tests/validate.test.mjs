/**
 * Input validation.
 *
 * The case that matters most: a tampered cart. cleanCartLines must keep only
 * SKU and quantity, so that a price, name or total injected into localStorage
 * is structurally incapable of reaching the order.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanCartLines,
  cleanEmail,
  cleanPhone,
  cleanSku,
  cleanSlug,
  cleanQuantity,
  cleanText,
  cleanMultiline,
  cleanIsoDate,
  getJakartaDateIso,
  isSameDayUnavailable,
  cleanOrderNumber,
  ValidationError
} from "../netlify/functions/_lib/validate.mjs";

test("cleanCartLines keeps only sku and quantity", () => {
  const tampered = [
    { sku: "ST-01", quantity: 2, price_idr: 1, unit_price_idr: 1, name: "free flowers", total: 0 }
  ];
  const cleaned = cleanCartLines(tampered);

  assert.deepEqual(cleaned, [{ sku: "ST-01", quantity: 2 }]);
  assert.equal(Object.keys(cleaned[0]).length, 2, "no extra field survives");
});

test("cleanCartLines merges duplicate SKUs and caps quantity", () => {
  const cleaned = cleanCartLines([
    { sku: "ST-01", quantity: 15 },
    { sku: "st-01", quantity: 15 }
  ]);
  assert.deepEqual(cleaned, [{ sku: "ST-01", quantity: 20 }]);
});

test("cleanCartLines rejects an empty or oversized cart", () => {
  assert.throws(() => cleanCartLines([]), ValidationError);
  assert.throws(() => cleanCartLines(null), ValidationError);
  assert.throws(
    () => cleanCartLines(Array.from({ length: 21 }, (_, i) => ({ sku: `ST-${i}`, quantity: 1 }))),
    ValidationError
  );
});

test("cleanQuantity refuses zero, negatives and nonsense", () => {
  assert.equal(cleanQuantity(3), 3);
  assert.equal(cleanQuantity("4"), 4);
  assert.equal(cleanQuantity(999), 20, "capped");
  for (const bad of [0, -1, "abc", null, undefined, NaN]) {
    assert.throws(() => cleanQuantity(bad), ValidationError, `should reject ${bad}`);
  }
});

test("cleanSku enforces the SKU shape", () => {
  assert.equal(cleanSku("st-01"), "ST-01");
  assert.equal(cleanSku("  ST-01 "), "ST-01");
  for (const bad of ["", "ST01", "'; drop table orders; --", "../../etc/passwd", "ST-0001111"]) {
    assert.throws(() => cleanSku(bad), ValidationError, `should reject ${bad}`);
  }
});

test("cleanSlug only accepts url-safe slugs", () => {
  assert.equal(cleanSlug("soft-tones-no-1"), "soft-tones-no-1");
  for (const bad of ["../secret", "a b", "UPPER CASE!", "-leading", "trailing-", ""]) {
    assert.throws(() => cleanSlug(bad), ValidationError, `should reject ${bad}`);
  }
});

test("cleanEmail normalises and rejects junk", () => {
  assert.equal(cleanEmail("  Hello@Marvell.COM "), "hello@marvell.com");
  for (const bad of ["", "not-an-email", "a@b", "@b.com", "a b@c.com"]) {
    assert.throws(() => cleanEmail(bad), ValidationError, `should reject ${bad}`);
  }
});

test("cleanPhone normalises Indonesian formats to one shape", () => {
  const expected = "6281275017456";
  for (const input of ["081275017456", "+6281275017456", "6281275017456", "0812-7501-7456", "0812 7501 7456"]) {
    assert.equal(cleanPhone(input), expected, `failed for ${input}`);
  }
  assert.equal(cleanPhone("", { required: false }), "");
  assert.throws(() => cleanPhone("", { required: true }), ValidationError);
  assert.throws(() => cleanPhone("12"), ValidationError);
});

test("cleanText strips control characters and enforces length", () => {
  assert.equal(cleanText("  Jane   Doe \u0000 "), "Jane Doe");
  assert.throws(() => cleanText("x".repeat(600), { max: 500 }), ValidationError);
  assert.throws(() => cleanText("", { required: true }), ValidationError);
});

test("cleanText leaves HTML intact for the renderer to escape", () => {
  // Validation does not strip markup; escaping at render time is what makes
  // it safe. This asserts the division of labour explicitly.
  const value = cleanText("<script>alert(1)</script>");
  assert.equal(value, "<script>alert(1)</script>");
});

test("cleanMultiline keeps paragraphs but collapses runaway blank lines", () => {
  assert.equal(cleanMultiline("Line one\n\n\n\nLine two"), "Line one\n\nLine two");
  assert.throws(() => cleanMultiline("x".repeat(1100), { max: 1000 }), ValidationError);
});

test("cleanIsoDate refuses past dates and far-future dates", () => {
  const today = new Date();
  const iso = (date) => date.toISOString().slice(0, 10);

  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  assert.equal(cleanIsoDate(iso(tomorrow)), iso(tomorrow));
  assert.equal(cleanIsoDate(""), "");

  const lastYear = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
  assert.throws(() => cleanIsoDate(iso(lastYear)), ValidationError);

  const farOff = new Date(today.getTime() + 400 * 24 * 60 * 60 * 1000);
  assert.throws(() => cleanIsoDate(iso(farOff)), ValidationError);
  assert.throws(() => cleanIsoDate("not-a-date"), ValidationError);
});

test("same-day orders close at 16:00 WIB", () => {
  const beforeCutoff = new Date("2026-09-23T08:59:00Z");
  const atCutoff = new Date("2026-09-23T09:00:00Z");
  assert.equal(getJakartaDateIso(atCutoff), "2026-09-23");
  assert.equal(isSameDayUnavailable("2026-09-23", beforeCutoff), false);
  assert.equal(isSameDayUnavailable("2026-09-23", atCutoff), true);
  assert.equal(isSameDayUnavailable("2026-09-24", atCutoff), false);
});

test("cleanOrderNumber enforces the generated format", () => {
  assert.equal(cleanOrderNumber("mf-260919-k4t2m"), "MF-260919-K4T2M");
  for (const bad of ["MF-1-A", "1234", "MF-260919-K4T2", ""]) {
    assert.throws(() => cleanOrderNumber(bad), ValidationError, `should reject ${bad}`);
  }
});

test("an order's date is optional to the validator, and required by checkout", async () => {
  // cleanIsoDate serves more than one caller, so emptiness stays legal here
  // and the decision belongs to whoever is asking.
  assert.equal(cleanIsoDate(""), "");
  assert.throws(() => cleanIsoDate("", { required: true }), ValidationError);
  assert.throws(() => cleanIsoDate(undefined, { required: true }), ValidationError);

  // Checkout is the caller that asks. An arrangement is made for a day, and
  // both halves of the order — the date and the window — are refused empty
  // rather than defaulted, for pickup as well as for delivery.
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../netlify/functions/checkout.mjs", import.meta.url), "utf8"
  );
  assert.match(source, /cleanIsoDate\(body\.delivery_date, \{\s*required: true/);
  assert.match(source, /delivery_time_window: cleanTimeWindow\(body\.delivery_time_window\)/);
  assert.match(source, /throw new ValidationError\("delivery_time_window"/);
  assert.match(source, /isSameDayUnavailable\(deliveryDate\)/);

  // The old shape silently accepted anything it did not recognise.
  assert.ok(
    !/\["morning", "afternoon"\]\.includes\(body\.delivery_time_window\)\s*\?/.test(source),
    "an unrecognised window is no longer quietly turned into no preference"
  );
});
