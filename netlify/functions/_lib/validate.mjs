/**
 * Input validation.
 *
 * Everything arriving from a browser is treated as hostile. Each helper either
 * returns a clean, length-capped value or throws a ValidationError carrying a
 * customer-safe message.
 */

export class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.publicMessage = message;
  }
}

/** Strips control characters and collapses whitespace, then caps the length. */
export function cleanText(value, { field = "field", max = 500, required = false, label = "" } = {}) {
  const name = label || field;
  const raw = String(value ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) {
    if (required) throw new ValidationError(field, `Please enter your ${name}.`);
    return "";
  }
  if (raw.length > max) {
    throw new ValidationError(field, `Your ${name} is too long (max ${max} characters).`);
  }
  return raw;
}

/** Like cleanText but keeps newlines, for card messages and notes. */
export function cleanMultiline(value, { field = "field", max = 1000, label = "" } = {}) {
  const name = label || field;
  const raw = String(value ?? "")
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (raw.length > max) {
    throw new ValidationError(field, `Your ${name} is too long (max ${max} characters).`);
  }
  return raw;
}

/**
 * Deliberately permissive. The goal is to reject typos and obvious junk, not
 * to police the RFC — a real address that fails a clever regex is a lost sale.
 */
export function cleanEmail(value, { required = true } = {}) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) {
    if (required) throw new ValidationError("email", "Please enter your email address.");
    return "";
  }
  if (raw.length > 254 || !/^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(raw)) {
    throw new ValidationError("email", "That email address does not look right.");
  }
  return raw;
}

/**
 * Indonesian mobile numbers, normalised to international digits.
 * Accepts 08xx, +628xx, 628xx and spaced or dashed variants.
 */
export function cleanPhone(value, { required = false } = {}) {
  const digits = String(value ?? "").replace(/[^\d+]/g, "");
  if (!digits) {
    if (required) throw new ValidationError("phone", "Please enter your WhatsApp number.");
    return "";
  }

  let normalised = digits.replace(/^\+/, "");
  if (normalised.startsWith("0")) normalised = `62${normalised.slice(1)}`;
  if (normalised.startsWith("8")) normalised = `62${normalised}`;

  if (!/^\d{9,15}$/.test(normalised)) {
    throw new ValidationError("phone", "That phone number does not look right.");
  }
  return normalised;
}

export function cleanBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

/** SKUs are a closed format. Anything else is rejected outright. */
export function cleanSku(value) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,6}-[0-9]{2,3}$/.test(raw)) {
    throw new ValidationError("sku", "That product could not be found.");
  }
  return raw;
}

export function cleanSlug(value, field = "slug") {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw) || raw.length > 120) {
    throw new ValidationError(field, "That page could not be found.");
  }
  return raw;
}

export function cleanQuantity(value, { max = 20 } = {}) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new ValidationError("quantity", "Please choose a valid quantity.");
  }
  return Math.min(parsed, max);
}

function getJakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number.parseInt(values.year || "0", 10),
    month: Number.parseInt(values.month || "0", 10),
    day: Number.parseInt(values.day || "0", 10),
    hour: Number.parseInt(values.hour || "0", 10)
  };
}

export function getJakartaDateIso(date = new Date()) {
  const parts = getJakartaDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function isSameDayUnavailable(value, date = new Date()) {
  return String(value || "").trim() === getJakartaDateIso(date) && getJakartaDateParts(date).hour >= 16;
}

export function cleanIsoDate(value, { field = "delivery_date", required = false, label = "date" } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    if (required) throw new ValidationError(field, `Please choose a ${label}.`);
    return "";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new ValidationError(field, "Please choose a valid date.");
  }
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(field, "Please choose a valid date.");
  }
  // Nothing in the past, nothing more than a year out.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yearAhead = new Date(today.getTime() + 366 * 24 * 60 * 60 * 1000);
  if (parsed < today || parsed > yearAhead) {
    throw new ValidationError(field, "Please choose a date within the next year.");
  }
  return raw;
}

/**
 * Cart lines from localStorage. Only SKU and quantity are read — any price,
 * name or total the browser attached is discarded here and re-derived from the
 * database, which is what stops a tampered cart from changing the charge.
 */
export function cleanCartLines(value, { maxLines = 20 } = {}) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError("items", "Your bag is empty.");
  }
  if (value.length > maxLines) {
    throw new ValidationError("items", `A single order can hold up to ${maxLines} different pieces.`);
  }

  const merged = new Map();
  for (const line of value) {
    if (!line || typeof line !== "object") continue;
    const sku = cleanSku(line.sku);
    const quantity = cleanQuantity(line.quantity);
    merged.set(sku, Math.min((merged.get(sku) || 0) + quantity, 20));
  }

  if (!merged.size) throw new ValidationError("items", "Your bag is empty.");
  return [...merged.entries()].map(([sku, quantity]) => ({ sku, quantity }));
}

export function cleanOrderNumber(value) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!/^(?:MF-\d{6}-[A-Z0-9]{5}|MV-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4})$/.test(raw)) {
    throw new ValidationError("order", "That order could not be found.");
  }
  return raw;
}
