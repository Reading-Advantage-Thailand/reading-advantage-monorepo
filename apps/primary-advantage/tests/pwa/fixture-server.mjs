// Fixture server for the takeover test (track primary_parity_pwa_20261011).
// It serves a test page, the worker at /serwist/sw.js (the legacy copy first, the new worker after
// POST /__switch), /offline.html from public/, and 200 for every legacy precache URL.
// POST /__offline drops every non-control socket so a navigation fails like a dead network;
// POST /__reset returns the server to the legacy mode. It needs no Next build.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const legacyWorker = readFileSync(path.join(here, "fixtures/legacy-sw.js"));
const newWorkerPath = path.join(here, "../../public/serwist/sw.js");
const offlinePagePath = path.join(here, "../../public/offline.html");
const precacheUrls = new Set(
  readFileSync(path.join(here, "fixtures/legacy-precache-urls.txt"), "utf8").split("\n").filter(Boolean),
);
const port = Number(process.env.PWA_FIXTURE_PORT ?? 3111);

const page = `<!doctype html><html><head><meta charset="utf-8"><title>PWA fixture</title></head><body>
<p id="state">fixture</p>
<script>
  sessionStorage.setItem("loads", String(Number(sessionStorage.getItem("loads") ?? "0") + 1));
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/serwist/sw.js", { scope: "/", type: "module" });
  }
</script></body></html>`;

let mode = "legacy";
let pings = 0;
let offline = false;

/** Control endpoints stay up in offline mode; every other request loses its socket. */
const controlPaths = new Set(["/__switch", "/__offline", "/__online", "/__reset", "/__pings"]);

const types = { ".js": "application/javascript", ".css": "text/css", ".json": "application/json" };

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (offline && !controlPaths.has(url.pathname)) {
    req.socket.destroy();
  } else if (url.pathname === "/serwist/sw.js") {
    const body = mode === "legacy" ? legacyWorker : readFileSync(newWorkerPath);
    const headers = { "Content-Type": "application/javascript", "Service-Worker-Allowed": "/" };
    if (mode === "new") headers["Cache-Control"] = "no-cache";
    res.writeHead(200, headers).end(body);
  } else if (url.pathname === "/offline.html") {
    res.writeHead(200, { "Content-Type": "text/html" }).end(readFileSync(offlinePagePath));
  } else if (url.pathname === "/__switch") {
    mode = "new";
    res.writeHead(200).end("new");
  } else if (url.pathname === "/__offline") {
    offline = true;
    res.writeHead(200).end("offline");
  } else if (url.pathname === "/__online") {
    offline = false;
    res.writeHead(200).end("online");
  } else if (url.pathname === "/__reset") {
    mode = "legacy";
    pings = 0;
    offline = false;
    res.writeHead(200).end("legacy");
  } else if (url.pathname === "/__ping") {
    pings += 1;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ pings }));
  } else if (url.pathname === "/__pings") {
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ pings }));
  } else if (precacheUrls.has(url.pathname)) {
    const type = types[path.extname(url.pathname)] ?? "text/html";
    res.writeHead(200, { "Content-Type": type }).end(type === "text/html" ? page : "");
  } else {
    res.writeHead(200, { "Content-Type": "text/html" }).end(page);
  }
}).listen(port, "127.0.0.1", () => console.log(`pwa fixture server on ${port}`));
