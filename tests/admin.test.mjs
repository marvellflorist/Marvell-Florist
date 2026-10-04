/**
 * The CMS admin page.
 *
 * /admin/ stopped loading with:
 *
 *   Error loading the CMS configuration
 *   Config Errors: TypeError: crypto.randomUUID is not a function
 *
 * The message points at config.yml, and the config is not the problem. Decap
 * builds the JSON schema it validates config.yml against, and that builder
 * opens with `const e = crypto.randomUUID()`. When randomUUID is missing the
 * schema throws before the config is ever read, and the failure is reported as
 * a config error.
 *
 * randomUUID is restricted to secure contexts — present on https:// and on
 * localhost, absent on a plain-http LAN address, which is how the admin gets
 * opened from a phone or a second machine. getRandomValues carries no such
 * restriction, so the polyfill is built from it.
 *
 * These tests hold the two halves of the fix: the polyfill is correct and runs
 * first, and the CMS version is pinned so a CDN cannot publish another
 * regression into a live admin with nothing in this repository moving.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const ADMIN = await readFile(new URL("admin/index.html", ROOT), "utf8");

/** The polyfill block, lifted out of the page exactly as it is served. */
function polyfillSource() {
  const match = ADMIN.match(/<script>\s*\(function \(\) \{\s*var c = window\.crypto[\s\S]*?\}\)\(\);\s*<\/script>/);
  assert.ok(match, "the randomUUID polyfill is present in admin/index.html");
  return match[0].replace(/^<script>/, "").replace(/<\/script>$/, "");
}

/** Runs the polyfill against a crypto object and returns the window it made. */
function runPolyfill(cryptoObject) {
  const window = { crypto: cryptoObject };
  const context = vm.createContext({ window, Uint8Array });
  vm.runInContext(polyfillSource(), context);
  return window;
}

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("the polyfill produces real version-4 UUIDs", () => {
  // An insecure context: getRandomValues is there, randomUUID is not.
  const window = runPolyfill({ getRandomValues: (array) => webcrypto.getRandomValues(array) });
  assert.equal(typeof window.crypto.randomUUID, "function");

  const seen = new Set();
  for (let i = 0; i < 2000; i += 1) {
    const id = window.crypto.randomUUID();
    assert.match(id, V4, `${id} is not an RFC 4122 v4 UUID`);
    seen.add(id);
  }
  assert.equal(seen.size, 2000, "and they are distinct");
});

test("the polyfill leaves a working randomUUID alone", () => {
  const native = () => "native-value";
  const window = runPolyfill({ randomUUID: native, getRandomValues: () => {} });
  assert.equal(window.crypto.randomUUID, native, "the browser's own implementation is kept");
});

test("the polyfill gives up quietly rather than throwing", () => {
  // Neither function: nothing to build a UUID from. The page must still parse
  // and load, and let Decap report whatever it finds.
  assert.doesNotThrow(() => runPolyfill({}));
  assert.doesNotThrow(() => runPolyfill(undefined));
});

test("the polyfill runs before the CMS bundle is fetched", () => {
  // Order is the whole point: Decap calls randomUUID while it loads, so a
  // polyfill that ran afterwards would fix nothing.
  const polyfillAt = ADMIN.indexOf("c.randomUUID = function randomUUID");
  const loadAt = ADMIN.indexOf("decap-cms.js");
  assert.ok(polyfillAt > -1 && loadAt > -1);
  assert.ok(polyfillAt < loadAt, "the polyfill must come first in the document");
});

test("the CMS version is pinned, on both CDNs", () => {
  // "^3.0.0" floats. 3.16.x is the range that introduced the randomUUID call,
  // and it arrived in a live admin with no commit here to explain it.
  const version = ADMIN.match(/const DECAP_VERSION = "([^"]+)"/);
  assert.ok(version, "a pinned version is declared");
  assert.match(version[1], /^\d+\.\d+\.\d+$/, "an exact version, not a range");

  assert.ok(!/decap-cms@\^/.test(ADMIN), "no floating range is left anywhere");
  for (const cdn of ["unpkg.com", "cdn.jsdelivr.net"]) {
    assert.ok(
      ADMIN.includes(`https://${cdn}/npm/decap-cms@\${DECAP_VERSION}/dist/decap-cms.js`) ||
      ADMIN.includes(`https://${cdn}/decap-cms@\${DECAP_VERSION}/dist/decap-cms.js`),
      `${cdn} is loaded at the pinned version`
    );
  }
});

test("the admin is not made public to make it load", async () => {
  // Fixing the page must not become "remove the login". The backend stays
  // git-gateway, which authenticates through Netlify Identity.
  const config = await readFile(new URL("admin/config.yml", ROOT), "utf8");
  assert.match(config, /^backend:\s*\n\s*name: git-gateway/m, "still behind git-gateway");

  // The local no-auth backend must stay local-only. It is keyed to a proxy on
  // 127.0.0.1, and the page only reaches for it on a hostname it recognises as
  // local — loopback, a .local name, or a private LAN address, so the admin
  // opens without a password from a phone on the same wifi too.
  assert.match(config, /local_backend:\s*\n\s*url: http:\/\/127\.0\.0\.1:8081/);
  assert.match(ADMIN, /function isLocalHostname\(value\)/, "local mode is host-gated");
  assert.match(ADMIN, /proxy_url: LOCAL_DECAP_PROXY_URL/, "and local uses the proxy backend");

  // Anything unrecognised is production, which is the safe way round to be
  // wrong: a public host must never be handed the no-login backend.
  const gate = ADMIN.slice(ADMIN.indexOf("function isLocalHostname"), ADMIN.indexOf("const isLocalAdminHost"));
  const isLocalHostname = new Function(`${gate} return isLocalHostname;`)();
  for (const host of ["localhost", "127.0.0.1", "192.168.1.7", "10.0.0.4", "172.20.1.1", "studio.local"]) {
    assert.equal(isLocalHostname(host), true, `${host} edits files on this machine`);
  }
  for (const host of ["marvellflorist.com", "www.marvellflorist.com", "marvell.netlify.app", "172.32.1.1", "8.8.8.8"]) {
    assert.equal(isLocalHostname(host), false, `${host} must keep its login`);
  }

  // And nothing that belongs on a server is in the page.
  for (const secret of ["SUPABASE_SERVICE_ROLE_KEY", "BREVO_API_KEY", "IPAYMU_VA", "IPAYMU_API_KEY"]) {
    assert.ok(!ADMIN.includes(secret), `${secret} must never reach the browser`);
  }
});

test("the dev server serves /admin/ the way a static host does", async () => {
  // Without a directory index, /admin/ is a local 404 and the CMS looks broken
  // for a reason that has nothing to do with the CMS.
  const server = await readFile(new URL("scripts/dev-server.mjs", ROOT), "utf8");
  assert.match(server, /pathname\.endsWith\("\/"\) && await serveFile\(res, path\.join\(ROOT, pathname, "index\.html"\)\)/);
  assert.match(server, /res\.writeHead\(301, \{ location: `\$\{pathname\}\/` \}\)/, "/admin redirects to /admin/");
});
