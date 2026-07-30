#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const defaultWebPort = 5500;
const defaultProxyPort = 8081;
const webPort = getPort(process.argv[2] || process.env.CMS_WEB_PORT, defaultWebPort);
const proxyPort = getPort(process.argv[3] || process.env.CMS_PROXY_PORT, defaultProxyPort);
const proxyHosts = ["localhost", "127.0.0.1"];
let proxyProcess = null;
let staticServer = null;

function getPort(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : fallback;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mp4": "video/mp4",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ttf": "font/ttf",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".xml": "application/xml; charset=utf-8"
  }[ext] || "application/octet-stream";
}

function isInsideRoot(filePath) {
  const relative = path.relative(rootDir, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function serveFile(request, response) {
  let pathname = "/";
  try {
    pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
    pathname = decodeURIComponent(pathname);
  } catch (_error) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }

  if (pathname === "/admin") {
    response.writeHead(301, { Location: "/admin/" });
    response.end();
    return;
  }

  const relativePath = pathname.replace(/^\/+/, "") || "index.html";
  let filePath = path.normalize(path.join(rootDir, relativePath));
  if (!isInsideRoot(filePath)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch (_error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": getMimeType(filePath)
    });
    response.end(data);
  });
}

function startStaticServer(preferredPort) {
  const server = http.createServer(serveFile);
  staticServer = server;
  return new Promise((resolve, reject) => {
    let port = preferredPort;
    const maxPort = preferredPort + 20;

    function tryListen() {
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE" && port < maxPort) {
          port += 1;
          tryListen();
          return;
        }
        reject(error);
      });
      server.listen(port, host, () => resolve(port));
    }

    tryListen();
  });
}

function canConnect(port, hostname) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: hostname, port });
    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(700);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function waitForProxy(port, timeoutMs) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < timeoutMs) {
    for (const hostname of proxyHosts) {
      if (await canConnect(port, hostname)) return hostname;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return "";
}

function getDecapCommand() {
  const localBin = path.join(rootDir, "node_modules", ".bin", process.platform === "win32" ? "decap-server.cmd" : "decap-server");
  if (fs.existsSync(localBin)) return { command: localBin, args: ["--port", String(proxyPort)] };
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", `npx --yes decap-server --port ${proxyPort}`]
    };
  }
  return {
    command: "npx",
    args: ["--yes", "decap-server", "--port", String(proxyPort)]
  };
}

async function startProxy() {
  const existingHost = await waitForProxy(proxyPort, 500);
  if (existingHost) {
    console.log(`Decap local backend already detected at http://${existingHost}:${proxyPort}/api/v1`);
    return;
  }

  const { command, args } = getDecapCommand();
  console.log(`Starting Decap local backend on http://localhost:${proxyPort}/api/v1`);
  proxyProcess = spawn(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    windowsHide: true
  });

  proxyProcess.once("error", (error) => {
    console.error(`Could not start Decap local backend: ${error.message}`);
  });

  proxyProcess.once("exit", (code, signal) => {
    if (code === 0 || signal) return;
    console.error(`Decap local backend exited with code ${code}.`);
  });
}

function shutdown() {
  if (proxyProcess && !proxyProcess.killed) proxyProcess.kill();
  if (staticServer) {
    staticServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
    return;
  }
  process.exit(0);
}

async function main() {
  if (proxyPort !== defaultProxyPort) {
    console.warn("Warning: admin/config.yml expects the Decap proxy on port 8081.");
  }

  const actualWebPort = await startStaticServer(webPort);
  console.log(`Serving Marvell Florist at http://${host}:${actualWebPort}`);
  console.log(`Open the CMS at http://${host}:${actualWebPort}/admin/`);

  await startProxy();
  const readyHost = await waitForProxy(proxyPort, 30000);
  if (readyHost) {
    console.log(`Local CMS backend ready at http://${readyHost}:${proxyPort}/api/v1`);
  } else {
    console.warn("Local CMS backend was not detected yet. Keep this terminal open while npx finishes, or run npm run cms:proxy in another terminal.");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  console.error(error.message || error);
  shutdown();
});
