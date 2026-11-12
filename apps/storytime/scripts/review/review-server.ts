#!/usr/bin/env tsx
/**
 * The review copy server of the Phase 5 milestone week (plan tasks 5.6 and 5.7, spec FR-12).
 *
 * The server serves one page at `/review`. The page holds the five items of FR-12, each with its
 * routes on the milestone week (level 2, week 1) and four controls: Pass, Fail, a comment, and
 * Send. One answer lands at `POST /review/answer` as one JSON line in a plain file, so the page
 * needs no database. Every other path is proxied to the app review copy, which runs `next start`
 * with `STORYTIME_SHOW_DRAFT_MEDIA=1`. The proxy keeps the Host header of the browser, because the
 * app reads its own origin from that header and the sign-in then accepts the review origin.
 *
 * The module holds the page only. No file under `apps/storytime/app/` names the page, and the
 * page holds no app code. The server uses the Node standard library only.
 *
 * Each answer line also records the time of the answer and the Git commit of the review copy. The
 * read rule of the answers file: the last line per `itemId` wins, and an item with no line is open.
 *
 * The port is never 3005 and never 3099 (P5.8). The gate picks a free port and passes it in.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** One item of the review page (FR-12). */
export interface ReviewItem {
  /** The machine id of the item. */
  id: string;
  /** The text of the item on the page. */
  label: string;
  /** The routes of the item on the review copy. */
  paths: string[];
}

/** The five items of FR-12 on the milestone week (level 2, week 1). */
export const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "teacher-app",
    label: "The teacher app: the week view and one lesson day",
    paths: ["/th/teacher/2/1", "/th/teacher/2/1/1"],
  },
  { id: "home-entry", label: "The at-home entry page", paths: ["/th/st/2/1"] },
  { id: "read-along", label: "The read-along", paths: ["/th/st/2/1?part=book"] },
  { id: "decodable", label: "The decodable", paths: ["/th/st/2/1?part=decodable"] },
  { id: "song", label: "The song", paths: ["/th/st/2/1?part=song"] },
];

/** The name of the answers file of the review page. */
export const REVIEW_ANSWERS_FILE_NAME = "review-answers-p5.json";

/** The ports that the review server never uses (P5.8). */
export const FORBIDDEN_PORTS = [3005, 3099] as const;

/** One answer of one item. */
export interface ReviewAnswer {
  /** The id of the item. */
  itemId: string;
  /** The verdict of the item. */
  verdict: "pass" | "fail";
  /** The comment of the owner. */
  comment: string;
  /** The time the answer was written, as an ISO 8601 UTC text; the writer sets it. */
  answeredAt?: string;
  /** The Git commit of the review copy; the launch script sets it. */
  commit?: string;
}

/** The options of the review server. */
export interface ReviewServerOptions {
  /** The port to listen on. */
  port: number;
  /** The URL of the app review copy that the server proxies. */
  appUrl: string;
  /** The path of the answers file. */
  answersPath: string;
  /** The Git commit of the review copy, which every answer line then records. */
  commit?: string;
}

/** One running review server. */
export interface ReviewServer {
  /** The port the server listens on. */
  port: number;
  /** The URL of the review page. */
  url: string;
  /**
   * Stops the server.
   * @returns A promise that settles when the server closed.
   */
  close(): Promise<void>;
}

/**
 * Escapes one text for HTML.
 * @param text The text to escape.
 * @returns The text with the five markup characters escaped.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Gives the HTML of the review page.
 * @returns The page with the five items and the four controls of each item.
 */
export function renderReviewPage(): string {
  const blocks = REVIEW_ITEMS.map((item) => {
    const links = item.paths
      .map(
        (path) =>
          `<a data-review-path="${escapeHtml(path)}" href="${escapeHtml(path)}" ` +
          `target="_blank" rel="noopener">${escapeHtml(path)}</a>`,
      )
      .join("\n        ");
    const signIn =
      item.id === "teacher-app"
        ? '        <p class="signin" data-review-signin>Sign in at /th/sign-in with the teacher ' +
          "account that the orchestrator gives.</p>"
        : "";
    return [
      `<section class="item" data-review-item="${escapeHtml(item.id)}">`,
      `        <h2>${escapeHtml(item.label)}</h2>`,
      `        <p class="routes">${links}</p>`,
      ...(signIn === "" ? [] : [signIn]),
      '        <div class="controls">',
      '          <button type="button" data-review-action="pass" aria-pressed="false">Pass</button>',
      '          <button type="button" data-review-action="fail" aria-pressed="false">Fail</button>',
      '          <textarea data-review-comment rows="2" placeholder="Comment"></textarea>',
      '          <button type="button" data-review-action="send">Send</button>',
      '          <span class="status" data-review-status role="status" aria-live="polite"></span>',
      "        </div>",
      "      </section>",
    ].join("\n");
  }).join("\n      ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Storytime milestone review</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 1.5rem; line-height: 1.5; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
      .note { color: #444; margin: 0 0 1.5rem; }
      .item { border: 1px solid #ccc; border-radius: 8px; margin: 0 0 1rem; padding: 1rem; }
      h2 { font-size: 1.1rem; margin: 0 0 0.5rem; }
      .routes a { margin-right: 1rem; }
      .controls { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
      textarea { flex: 1 1 16rem; min-height: 2.5rem; }
      button { min-height: 44px; min-width: 44px; padding: 0 1rem; }
      button[aria-pressed="true"] { outline: 3px solid #333; outline-offset: 2px; font-weight: 700; }
      .status { color: #444; }
      .signin { background: #f4f4f4; border-radius: 6px; padding: 0.5rem 0.75rem; }
    </style>
  </head>
  <body>
    <h1>Storytime milestone review</h1>
    <p class="note">Open each item, then press Pass or Fail, write a comment, and press Send.</p>
    <p class="signin" data-review-signin-all>Sign in once at /th/sign-in with the teacher account that the orchestrator gives: one sign-in opens all five items.</p>
    <main>
      ${blocks}
    </main>
    <script>
      (function () {
        var blocks = document.querySelectorAll('[data-review-item]');
        Array.prototype.forEach.call(blocks, function (block) {
          var verdict = '';
          var comment = block.querySelector('[data-review-comment]');
          var status = block.querySelector('[data-review-status]');
          var pass = block.querySelector('[data-review-action="pass"]');
          var fail = block.querySelector('[data-review-action="fail"]');
          function choose(value) {
            verdict = value;
            status.textContent = '';
            block.setAttribute('data-review-choice', value);
            pass.setAttribute('aria-pressed', String(value === 'pass'));
            fail.setAttribute('aria-pressed', String(value === 'fail'));
          }
          pass.addEventListener('click', function () {
            choose('pass');
          });
          fail.addEventListener('click', function () {
            choose('fail');
          });
          block.querySelector('[data-review-action="send"]').addEventListener('click', function () {
            if (!verdict) {
              status.textContent = 'Choose Pass or Fail first.';
              return;
            }
            var text = comment ? comment.value.trim() : '';
            if (verdict === 'fail' && text.length === 0) {
              status.textContent = 'Write a comment for a fail.';
              return;
            }
            var answer = {
              itemId: block.getAttribute('data-review-item'),
              verdict: verdict,
              comment: text
            };
            fetch('/review/answer', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(answer)
            }).then(function (response) {
              if (!response.ok) throw new Error('status ' + response.status);
              block.setAttribute('data-review-answer', verdict);
              status.textContent = 'Answer sent: ' + verdict + '.';
            }).catch(function (error) {
              status.textContent = 'The answer was not sent: ' + error.message;
            });
          });
        });
      })();
    </script>
  </body>
</html>
`;
}

/**
 * Appends one answer to the answers file.
 * @param answersPath The path of the answers file.
 * @param answer The answer to append.
 * @throws When the folder or the file cannot be written.
 */
export function appendReviewAnswer(answersPath: string, answer: ReviewAnswer): void {
  const line = JSON.stringify({
    itemId: answer.itemId,
    verdict: answer.verdict,
    comment: answer.comment,
    answeredAt: answer.answeredAt ?? new Date().toISOString(),
    ...(answer.commit === undefined ? {} : { commit: answer.commit }),
  });
  mkdirSync(dirname(answersPath), { recursive: true });
  appendFileSync(answersPath, `${line}\n`, "utf8");
}

/**
 * Gives the answer of one request body.
 * @param text The JSON text of the request body.
 * @returns The answer.
 * @throws When the text holds no known item, no verdict, or no comment text.
 */
function answerOf(text: string): ReviewAnswer {
  const value = JSON.parse(text) as {
    itemId?: unknown;
    verdict?: unknown;
    comment?: unknown;
  };
  if (typeof value.itemId !== "string" || !REVIEW_ITEMS.some((item) => item.id === value.itemId)) {
    throw new Error("the answer names no known item");
  }
  if (value.verdict !== "pass" && value.verdict !== "fail") {
    throw new Error("the answer holds no verdict of pass or fail");
  }
  if (typeof value.comment !== "string") throw new Error("the answer holds no comment text");
  return { itemId: value.itemId, verdict: value.verdict, comment: value.comment };
}

/**
 * Reads the body of one request.
 * @param request The incoming request.
 * @param limit The largest body that the server accepts in bytes.
 * @returns The body text.
 * @throws When the body is larger than the limit.
 */
function readBody(request: IncomingMessage, limit: number): Promise<string> {
  return new Promise((settle, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("the answer is larger than the limit"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => settle(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

/**
 * Sends one short response.
 * @param response The response to write.
 * @param status The HTTP status code.
 * @param text The body text.
 */
function sendText(response: ServerResponse, status: number, text: string): void {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(text);
}

/**
 * Proxies one request to the app review copy.
 *
 * The proxy keeps the Host header of the browser. The app reads its own origin from that header
 * (`lib/auth/same-origin.ts`), so the sign-in accepts the review origin for the Origin header of
 * the browser. The host of the app goes to `x-forwarded-host`, and the scheme goes to
 * `x-forwarded-proto`.
 * @param request The incoming request.
 * @param response The response to write.
 * @param appUrl The URL of the app review copy.
 */
function proxyToApp(request: IncomingMessage, response: ServerResponse, appUrl: string): void {
  const target = new URL(appUrl);
  const host = request.headers.host ?? target.host;
  const upstream = httpRequest(
    {
      hostname: target.hostname,
      port: target.port === "" ? 80 : Number(target.port),
      path: request.url ?? "/",
      method: request.method,
      headers: {
        ...request.headers,
        host,
        "x-forwarded-host": host,
        "x-forwarded-proto": "http",
      },
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );
  upstream.on("error", (error: Error) => {
    if (!response.headersSent) {
      sendText(response, 502, `the review copy cannot reach the app: ${error.message}`);
      return;
    }
    response.destroy(error);
  });
  request.pipe(upstream);
}

/**
 * Gives a port that the review server may use.
 * @param port The requested port.
 * @returns The port.
 * @throws When the port is no whole number, sits outside 1024 to 65535, or is 3005 or 3099.
 */
export function checkedPort(port: number): number {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`the review server cannot use the port ${port}`);
  }
  if ((FORBIDDEN_PORTS as readonly number[]).includes(port)) {
    throw new Error(`the review server never uses the port ${port}`);
  }
  return port;
}

/**
 * Handles one request of the review server.
 * @param request The incoming request.
 * @param response The response to write.
 * @param options The port, the app URL, and the answers path.
 */
async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: ReviewServerOptions,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/review" && (request.method === "GET" || request.method === "HEAD")) {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : renderReviewPage());
    return;
  }
  if (url.pathname === "/review/answer") {
    if (request.method !== "POST") {
      response.writeHead(405, { allow: "POST", "content-type": "text/plain; charset=utf-8" });
      response.end("the answer endpoint takes POST only");
      return;
    }
    let answer: ReviewAnswer;
    try {
      answer = answerOf(await readBody(request, 64 * 1024));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendText(response, 400, message);
      return;
    }
    appendReviewAnswer(options.answersPath, { ...answer, commit: options.commit });
    response.writeHead(204, { "cache-control": "no-store" });
    response.end();
    return;
  }
  proxyToApp(request, response, options.appUrl);
}

/**
 * Starts the review server.
 * @param options The port, the app URL, and the answers path.
 * @returns The running server with its port, its URL, and its close function.
 * @throws When the port is refused, the app URL is no http URL, or the port is in use.
 */
export async function startReviewServer(options: ReviewServerOptions): Promise<ReviewServer> {
  const port = checkedPort(options.port);
  const target = new URL(options.appUrl);
  if (target.protocol !== "http:") {
    throw new Error(`the review server proxies an http app URL only: ${options.appUrl}`);
  }
  const server = createServer((request, response) => {
    void handleRequest(request, response, options).catch((error: Error) => {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      sendText(response, 500, `the review server failed: ${error.message}`);
    });
  });
  await new Promise<void>((settle, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      settle();
    });
  });
  const address = server.address();
  const boundPort = address !== null && typeof address === "object" ? address.port : port;
  return {
    port: boundPort,
    url: `http://127.0.0.1:${boundPort}/review`,
    close: () =>
      new Promise<void>((settle, reject) => {
        server.close((error) => (error ? reject(error) : settle()));
      }),
  };
}

/**
 * Gives the value of one named argument.
 * @param argv The arguments of the script.
 * @param name The name of the argument, for example `--port`.
 * @returns The value that follows the name.
 * @throws When the arguments hold no value for the name.
 */
function valueOf(argv: string[], name: string): string {
  const value = optionalValueOf(argv, name);
  if (value === undefined) throw new Error(`the arguments hold no ${name} value`);
  return value;
}

/**
 * Gives the value of one optional named argument.
 * @param argv The arguments of the script.
 * @param name The name of the argument, for example `--commit`.
 * @returns The value that follows the name, or undefined when the arguments hold no name.
 */
function optionalValueOf(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value === undefined || value === "" ? undefined : value;
}

/**
 * Runs the review server as a program.
 * @param argv The arguments, which hold `--port`, `--app-url`, and `--answers`, and may hold
 *   `--commit`.
 * @returns 0 when the server started, and 2 when an argument is missing or refused.
 */
export async function main(argv: string[]): Promise<number> {
  try {
    const server = await startReviewServer({
      port: Number(valueOf(argv, "--port")),
      appUrl: valueOf(argv, "--app-url"),
      answersPath: resolve(valueOf(argv, "--answers")),
      commit: optionalValueOf(argv, "--commit"),
    });
    console.log(`review_port=${server.port}`);
    console.log(`review_url=${server.url}`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}

const invoked = process.argv[1];
if (invoked !== undefined && pathToFileURL(resolve(invoked)).href === import.meta.url) {
  void main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: Error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
