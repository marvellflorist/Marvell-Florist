/** Private account wishlists. Every operation derives ownership from the
 * verified HttpOnly account session; the service key never reaches a browser. */
import { ok, fail, serverError, methodNotAllowed, readJsonBody, clientIp } from "./_lib/http.mjs";
import { cleanText, cleanBoolean, ValidationError } from "./_lib/validate.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { readSession, withCookies } from "./_lib/accounts.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";

const LIST_COLUMNS = "id, user_id, name, is_default, shared_with_marvell, created_at, updated_at";
const ITEM_COLUMNS = "id, list_id, item_key, item_data, created_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredId(value) {
  const id = String(value || "").trim();
  if (!UUID.test(id)) throw new ValidationError("list_id", "Please choose a wishlist.");
  return id;
}

function safeUrl(value, { image = false } = {}) {
  const raw = String(value || "").trim().slice(0, 1024);
  if (!raw || raw.startsWith("//")) return "";
  // Product assets legitimately contain commas and parentheses. The old
  // allow-list silently erased those image paths when a guest list was moved
  // into an account. Reject executable/markup-shaped values, then let the URL
  // parser validate the forms the storefront actually stores.
  if (/[\u0000-\u001f\u007f\s"'<>\\]/.test(raw)) return "";
  if (raw.startsWith("/")) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    try {
      const parsed = new URL(raw);
      return parsed.protocol === "https:" ? raw : "";
    } catch (_error) {
      return "";
    }
  }
  if (/^[a-z0-9]/i.test(raw)) return raw;
  return image ? "" : "";
}

function cleanItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("item", "Please choose a saved piece.");
  }
  const key = cleanText(value.id, { field: "item", max: 512, required: true, label: "saved piece" });
  if (!/^(?:href:|item:)/.test(key)) throw new ValidationError("item", "Please choose a saved piece.");
  const quantity = Math.min(9, Math.max(1, Number.parseInt(value.quantity, 10) || 1));
  return {
    item_key: key,
    item_data: {
      id: key,
      title: cleanText(value.title, { field: "title", max: 160 }),
      image: safeUrl(value.image, { image: true }),
      href: safeUrl(value.href),
      price: cleanText(value.price, { field: "price", max: 80 }),
      category: cleanText(value.category, { field: "category", max: 100 }),
      source: cleanText(value.source, { field: "source", max: 80 }),
      sku: /^[A-Z0-9]{2,6}-[0-9]{2,3}$/.test(String(value.sku || "").trim().toUpperCase())
        ? String(value.sku).trim().toUpperCase() : "",
      purchaseMode: value.purchaseMode === "direct" ? "direct" : "",
      quantity
    }
  };
}

function check(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function defaultList(db, userId) {
  const existing = check(await db.from("wishlist_lists").select(LIST_COLUMNS)
    .eq("user_id", userId).eq("is_default", true).maybeSingle());
  if (existing) return existing;
  const inserted = await db.from("wishlist_lists")
    .insert({ user_id: userId, name: "Saved", is_default: true })
    .select(LIST_COLUMNS).single();
  if (!inserted.error) return inserted.data;
  if (inserted.error.code !== "23505") throw inserted.error;
  return check(await db.from("wishlist_lists").select(LIST_COLUMNS)
    .eq("user_id", userId).eq("is_default", true).single());
}

async function ownedList(db, userId, listId) {
  return check(await db.from("wishlist_lists").select(LIST_COLUMNS)
    .eq("id", requiredId(listId)).eq("user_id", userId).maybeSingle());
}

async function snapshot(db, userId) {
  const lists = check(await db.from("wishlist_lists").select(LIST_COLUMNS)
    .eq("user_id", userId).order("created_at", { ascending: true })) || [];
  if (!lists.length) return { lists: [], items: [] };
  const items = check(await db.from("wishlist_items").select(ITEM_COLUMNS)
    .in("list_id", lists.map((list) => list.id))
    .order("created_at", { ascending: false })) || [];
  return { lists, items };
}

export default async (request) => {
  const method = request.method.toUpperCase();
  if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
  const limit = checkRateLimit(`account-wishlist:${clientIp(request)}`, { limit: 120, windowSeconds: 60 });
  if (!limit.allowed) return fail("rate_limited", "Please wait a moment.", 429);
  try {
    const session = await readSession(request);
    if (!session) return fail("not_signed_in", "Please sign in to save pieces to your account.", 401);
    const db = getServiceClient();
    const profile = check(await db.from("customer_profiles").select("profile_completed_at")
      .eq("user_id", session.user.id).maybeSingle());
    if (!profile?.profile_completed_at) {
      return withCookies(fail("profile_incomplete", "Please complete your account first.", 403), session.cookies);
    }
    const main = await defaultList(db, session.user.id);
    if (method === "POST") {
      const body = await readJsonBody(request, 48 * 1024);
      const operation = String(body.operation || "");
      if (operation === "merge" || operation === "add_item") {
        const list = operation === "merge" || !body.list_id
          ? main : await ownedList(db, session.user.id, body.list_id);
        if (!list) return withCookies(fail("not_found", "Wishlist not found.", 404), session.cookies);
        const incoming = operation === "merge" ? body.items : [body.item];
        if (!Array.isArray(incoming) || incoming.length > 48) {
          return withCookies(fail("invalid_items", "Too many saved pieces.", 400), session.cookies);
        }
        const rows = [...new Map(incoming.map((item) => {
          const cleaned = cleanItem(item);
          return [cleaned.item_key, { ...cleaned, list_id: list.id }];
        })).values()];
        if (rows.length) check(await db.from("wishlist_items")
          .upsert(rows, { onConflict: "list_id,item_key", ignoreDuplicates: true }));
      } else if (operation === "remove_item") {
        const list = await ownedList(db, session.user.id, body.list_id || main.id);
        if (!list) return withCookies(fail("not_found", "Wishlist not found.", 404), session.cookies);
        const key = cleanText(body.item_key, { field: "item_key", max: 512, required: true });
        check(await db.from("wishlist_items").delete().eq("list_id", list.id).eq("item_key", key));
      } else if (operation === "update_item") {
        const list = await ownedList(db, session.user.id, body.list_id || main.id);
        if (!list) return withCookies(fail("not_found", "Wishlist not found.", 404), session.cookies);
        const item = cleanItem(body.item);
        check(await db.from("wishlist_items").update({ item_data: item.item_data })
          .eq("list_id", list.id).eq("item_key", item.item_key));
      } else if (operation === "clear_list") {
        const list = await ownedList(db, session.user.id, body.list_id || main.id);
        if (!list) return withCookies(fail("not_found", "Wishlist not found.", 404), session.cookies);
        check(await db.from("wishlist_items").delete().eq("list_id", list.id));
      } else if (operation === "create_list") {
        const name = cleanText(body.name, { field: "name", max: 80, required: true, label: "list name" });
        const countResult = await db.from("wishlist_lists").select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id);
        if (countResult.error) throw countResult.error;
        if (countResult.count >= 20) return withCookies(fail("list_limit", "You have enough lists for now.", 400), session.cookies);
        check(await db.from("wishlist_lists").insert({ user_id: session.user.id, name }));
      } else if (["rename_list", "delete_list", "set_share"].includes(operation)) {
        const list = await ownedList(db, session.user.id, body.list_id);
        if (!list) return withCookies(fail("not_found", "Wishlist not found.", 404), session.cookies);
        if (operation === "rename_list") {
          const name = cleanText(body.name, { field: "name", max: 80, required: true, label: "list name" });
          check(await db.from("wishlist_lists").update({ name }).eq("id", list.id).eq("user_id", session.user.id));
        } else if (operation === "delete_list") {
          if (list.is_default) return withCookies(fail("default_list", "The Saved list cannot be deleted.", 400), session.cookies);
          check(await db.from("wishlist_lists").delete().eq("id", list.id).eq("user_id", session.user.id));
        } else {
          check(await db.from("wishlist_lists").update({ shared_with_marvell: cleanBoolean(body.shared) })
            .eq("id", list.id).eq("user_id", session.user.id));
        }
      } else if (["copy_item", "move_item"].includes(operation)) {
        const from = await ownedList(db, session.user.id, body.from_list_id);
        const to = await ownedList(db, session.user.id, body.to_list_id);
        if (!from || !to) return withCookies(fail("not_found", "Wishlist not found.", 404), session.cookies);
        const key = cleanText(body.item_key, { field: "item_key", max: 512, required: true });
        const item = check(await db.from("wishlist_items").select(ITEM_COLUMNS)
          .eq("list_id", from.id).eq("item_key", key).maybeSingle());
        if (!item) return withCookies(fail("not_found", "Saved piece not found.", 404), session.cookies);
        if (from.id !== to.id) {
          check(await db.from("wishlist_items").upsert({ list_id: to.id, item_key: key, item_data: item.item_data },
            { onConflict: "list_id,item_key", ignoreDuplicates: true }));
          if (operation === "move_item") check(await db.from("wishlist_items").delete()
            .eq("list_id", from.id).eq("item_key", key));
        }
      } else {
        return withCookies(fail("invalid_operation", "That wishlist action is not available.", 400), session.cookies);
      }
    }
    return withCookies(ok({ ...(await snapshot(db, session.user.id)), default_list_id: main.id }), session.cookies);
  } catch (error) {
    if (error instanceof ValidationError) return fail("invalid_request", error.message, 400, { field: error.field });
    if (["invalid_json", "payload_too_large"].includes(error?.publicCode)) {
      return fail(error.publicCode, "That request could not be read.", 400);
    }
    return serverError("account-wishlist", error);
  }
};

export const config = { path: "/api/account/wishlist",
  rateLimit: { windowSize: 60, windowLimit: 120, aggregateBy: ["ip"] } };
