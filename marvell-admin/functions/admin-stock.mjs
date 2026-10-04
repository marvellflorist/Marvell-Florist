import { ok, fail, readJsonBody } from "../../netlify/functions/_lib/http.mjs";
import { methodNotAllowed } from "./_lib/admin-http.mjs";
import { getServiceClient } from "../../netlify/functions/_lib/supabase.mjs";
import { loadRetailProducts } from "../../netlify/functions/_lib/catalog.mjs";
import { authorize, userClient } from "./_lib/admin-api.mjs";
import { allowed, withCookies } from "./_lib/admin-auth.mjs";

export default async (request) => {
  if (!["GET", "POST"].includes(request.method)) return methodNotAllowed(["GET", "POST"]);
  try {
    const gate = await authorize(request, { mutation: request.method === "POST" });
    if (gate.response) return gate.response;
    const { session } = gate;
    if (!["owner", "store_admin", "florist"].includes(session.staff.role)) {
      return fail("akses_ditolak", "Akses ditolak.", 403);
    }
    if (request.method === "POST") {
      if (!allowed(session.staff, "stock.manage")) return fail("akses_ditolak", "Akses ditolak.", 403);
      const body = await readJsonBody(request, 4096);
      const quantity = Number(body?.quantity);
      if (!/^[A-Z0-9]{2,6}-[0-9]{2,3}$/.test(String(body?.sku || ""))
          || !Number.isSafeInteger(quantity) || quantity < 0) {
        return fail("data_tidak_valid", "Periksa jumlah stok.", 400);
      }
      const result = await userClient(session).rpc("admin_set_stock", {
        p_sku: body.sku, p_quantity: quantity
      });
      if (result.error) return fail("stok_gagal", "Stok belum tersimpan. Periksa jumlah yang dipesan.", 409);
      return withCookies(ok({ result: result.data }), session.cookies);
    }
    const [stockResult, products] = await Promise.all([
      getServiceClient().from("products_commerce")
        .select("sku, stock_quantity, reserved_quantity, price_idr, active, purchasable")
        .order("sku"),
      loadRetailProducts()
    ]);
    if (stockResult.error) throw stockResult.error;
    const names = new Map(products.map((p) => [p.sku, p]));
    return withCookies(ok({ products: (stockResult.data || []).map((p) => ({
      sku: p.sku, name: names.get(p.sku)?.name || p.sku,
      image: names.get(p.sku)?.images?.[0]?.image || "",
      available_quantity: Math.max(0, p.stock_quantity - p.reserved_quantity),
      stock_quantity: p.stock_quantity, reserved_quantity: p.reserved_quantity,
      active: p.active, purchasable: p.purchasable,
      ...(session.staff.role === "owner" || session.staff.role === "store_admin"
        ? { price_idr: p.price_idr } : {})
    })) }), session.cookies);
  } catch (error) {
    console.error("[admin-stock]", error?.code || "error");
    return fail("gangguan", "Stok belum dapat dimuat.", 503);
  }
};

export const config = { path: "/api/admin/stock" };
