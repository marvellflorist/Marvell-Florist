/**
 * Local API bridge for VS Code Live Server. Live Server serves static files on
 * port 55xx; it cannot execute Netlify functions. This process runs the same
 * newsletter handler on loopback without sending a secret to the browser.
 */
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import newsletter from "../netlify/functions/newsletter.mjs";

const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):55\d\d$/;
const MAX_BODY_BYTES = 8 * 1024;

export function createLiveNewsletterServer(handler = newsletter) {
  return createServer(async (incoming, outgoing) => {
    const origin = String(incoming.headers.origin || "");
    const headers = {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      vary: "Origin",
      ...(LOCAL_ORIGIN.test(origin) ? { "access-control-allow-origin": origin } : {})
    };
    const send = (status, body = "") => {
      outgoing.writeHead(status, headers);
      outgoing.end(body);
    };

    if (!LOCAL_ORIGIN.test(origin)) {
      send(403, JSON.stringify({ ok: false, message: "Local origin required." }));
      return;
    }
    if (incoming.url !== "/api/newsletter") {
      send(404, JSON.stringify({ ok: false, message: "Not found." }));
      return;
    }
    if (incoming.method === "OPTIONS") {
      outgoing.writeHead(204, {
        ...headers,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-allow-private-network": "true",
        "access-control-max-age": "600"
      });
      outgoing.end();
      return;
    }
    if (incoming.method !== "POST") {
      send(405, JSON.stringify({ ok: false, message: "Method not allowed." }));
      return;
    }

    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          send(413, JSON.stringify({ ok: false, message: "That request is too large." }));
          return;
        }
        chunks.push(chunk);
      }
      const request = new Request("http://127.0.0.1/api/newsletter", {
        method: "POST",
        headers: {
          "content-type": incoming.headers["content-type"] || "application/json",
          "x-forwarded-for": incoming.socket.remoteAddress || "127.0.0.1"
        },
        body: Buffer.concat(chunks)
      });
      const response = await handler(request);
      const body = Buffer.from(await response.arrayBuffer());
      outgoing.writeHead(response.status, {
        ...headers,
        "content-type": response.headers.get("content-type") || headers["content-type"]
      });
      outgoing.end(body);
    } catch (error) {
      console.error("[local newsletter]", error?.message || error);
      if (!outgoing.headersSent) {
        send(500, JSON.stringify({ ok: false, message: "The local newsletter service could not complete this request." }));
      }
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = 8787;
  createLiveNewsletterServer().listen(port, "127.0.0.1", () => {
    console.log(`Newsletter API for Live Server: http://127.0.0.1:${port}/api/newsletter`);
    if (!process.env.BREVO_API_KEY) {
      console.log("Add BREVO_API_KEY to .env to enable real subscriptions.");
    }
  });
}
