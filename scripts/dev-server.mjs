/**
 * Local development server — the stand-in, NOT the canonical environment.
 *
 * `netlify dev` on http://localhost:8888 is the real thing and the only place
 * a feature may be signed off: it runs the same functions, routing table and
 * redirects as production, with secrets injected from .env. Use it whenever
 * the work touches Brevo, Supabase, accounts, the bag validation or
 * iPaymu.
 *
 * This is a dependency-free stand-in for quick static checks when the CLI is
 * unavailable: it serves the site, applies the redirect table from
 * netlify.toml, and mounts netlify/functions under /api. It does not reproduce
 * Netlify's edge behaviour, its env injection or its function runtime.
 *
 * It defaults to 8889 so that it can never quietly take the canonical port and
 * leave you testing something other than what you think.
 *
 * Run with: node scripts/dev-server.mjs [port]
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PORT = Number.parseInt(process.argv[2] || "8889", 10);

// This server only ever runs locally, so the placeholder shop is on unless
// the environment says otherwise. Production defaults to off.
if (process.env.SHOP_PLACEHOLDER_MODE === undefined) {
  process.env.SHOP_PLACEHOLDER_MODE = "true";
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

/** Minimal TOML reader for the redirect table — enough for this one file. */
async function loadRedirects() {
  const source = await readFile(path.join(ROOT, "netlify.toml"), "utf8");
  const redirects = [];
  let current = null;

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line === "[[redirects]]") {
      current = {};
      redirects.push(current);
      continue;
    }
    if (line.startsWith("[")) {
      current = null;
      continue;
    }
    if (!current) continue;

    const match = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^"(.*)"$/, "$1");
    current[key] = value === "true" ? true : value === "false" ? false : value;
  }
  return redirects;
}

const FUNCTION_ROUTES = new Map();

async function loadFunctions() {
  const { readdir } = await import("node:fs/promises");
  const dir = path.join(ROOT, "netlify/functions");

  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".mjs")) continue;
    const module = await import(pathToFileURL(path.join(dir, entry.name)).href);
    // Netlify accepts either one path or several; both are mounted here so a
    // function with two routes behaves locally the way it will in production.
    const declared = module.config?.path;
    const routePaths = Array.isArray(declared) ? declared : declared ? [declared] : [];
    if (!routePaths.length || typeof module.default !== "function") continue;
    for (const routePath of routePaths) {
      FUNCTION_ROUTES.set(routePath, module.default);
      console.log(`  ${routePath}  ->  netlify/functions/${entry.name}`);
    }
  }
}

/** Matches "/api/order/:orderNumber" and "/api/x/*" style paths. */
function matchRoute(pathname) {
  for (const [pattern, handler] of FUNCTION_ROUTES) {
    if (pattern === pathname) return handler;
    const regex = new RegExp(
      `^${pattern.replace(/:[^/]+/g, "[^/]+").replace(/\*/g, ".*")}$`
    );
    if (regex.test(pathname)) return handler;
  }
  return null;
}

function matchRedirect(redirects, pathname) {
  for (const rule of redirects) {
    if (!rule.from || !rule.to) continue;
    if (rule.from.endsWith("/*")) {
      const prefix = rule.from.slice(0, -1);
      if (pathname.startsWith(prefix)) return rule;
    } else if (rule.from === pathname) {
      return rule;
    }
  }
  return null;
}

async function serveFile(res, filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(body);
    return true;
  } catch (_error) {
    return false;
  }
}

const redirects = await loadRedirects();
console.log(`Loaded ${redirects.length} redirect rules from netlify.toml`);
console.log("Mounting functions:");
await loadFunctions();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // 1. Serverless functions.
  const handler = matchRoute(pathname);
  if (handler) {
    const body = ["GET", "HEAD"].includes(req.method)
      ? undefined
      : await new Promise((resolve) => {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        });

    const request = new Request(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body
    });

    try {
      const response = await handler(request, {});
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch (error) {
      console.error(`[dev-server] ${pathname} threw`, error);
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, code: "server_error" }));
    }
    console.log(`${req.method} ${pathname} -> function`);
    return;
  }

  // 2. Forced redirects win over an existing file, as they do on Netlify.
  // This is what makes /about.html send a 301 to /about rather than serving
  // the file, so the canonical URL is the only one that renders.
  const forced = matchRedirect(redirects, pathname);
  if (forced?.force === true && ["301", "302"].includes(String(forced.status))) {
    res.writeHead(Number(forced.status), { location: forced.to });
    res.end();
    console.log(`${req.method} ${pathname} -> ${forced.status} ${forced.to} (forced)`);
    return;
  }

  // 3. The static file itself, if it exists.
  const direct = path.join(ROOT, pathname);
  if (pathname !== "/" && await serveFile(res, direct)) {
    return;
  }

  // 4. The rest of the redirect table.
  const rule = matchRedirect(redirects, pathname);
  if (rule) {
    if (String(rule.status) === "301" || String(rule.status) === "302") {
      res.writeHead(Number(rule.status), { location: rule.to });
      res.end();
      console.log(`${req.method} ${pathname} -> ${rule.status} ${rule.to}`);
      return;
    }
    if (await serveFile(res, path.join(ROOT, rule.to))) {
      console.log(`${req.method} ${pathname} -> rewrite ${rule.to}`);
      return;
    }
  }

  // 5. Directory index, as a static host does it. /admin/ is the one that
  // matters: without this the CMS is a 404 locally and looks broken for a
  // reason that has nothing to do with the CMS.
  if (pathname.endsWith("/") && await serveFile(res, path.join(ROOT, pathname, "index.html"))) {
    console.log(`${req.method} ${pathname} -> ${path.join(pathname, "index.html")}`);
    return;
  }

  // Netlify also redirects /dir to /dir/ where an index exists, so a link
  // without the trailing slash finds the same page.
  if (!pathname.endsWith("/") && !path.extname(pathname)) {
    try {
      const info = await stat(path.join(ROOT, pathname, "index.html"));
      if (info.isFile()) {
        res.writeHead(301, { location: `${pathname}/` });
        res.end();
        console.log(`${req.method} ${pathname} -> 301 ${pathname}/`);
        return;
      }
    } catch (_error) {
      // No directory index here; fall through to the 404.
    }
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
  console.log(`${req.method} ${pathname} -> 404`);
});

server.listen(PORT, () => {
  console.log(`\nMarvell dev server on http://localhost:${PORT}`);
  console.log("Supabase/Brevo/iPaymu use whatever is in your environment; unset keys degrade gracefully.\n");
});
