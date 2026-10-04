import { json } from "../../../netlify/functions/_lib/http.mjs";

export function methodNotAllowed(methods) {
  return json({ ok: false, code: "metode_tidak_diizinkan",
    message: "Metode permintaan tidak diizinkan." }, 405,
  { allow: methods.join(", ") });
}
