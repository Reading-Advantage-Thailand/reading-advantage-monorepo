// @vitest-environment jsdom
import { readdirSync } from "node:fs";
import path from "node:path";
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UnknownPathPage from "../app/[locale]/[...not-found]/page";
import { ServiceWorkerRegister } from "../components/pwa/service-worker-register";
import { SERVICE_WORKER_SCOPE, SERVICE_WORKER_TYPE, SERVICE_WORKER_URL } from "../lib/pwa/constants";

const currentUser = vi.fn();
vi.mock("../lib/session", () => ({ currentUser: () => currentUser() }));
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null) }));

import middleware from "../proxy";

/** The app folder that owns the routes and the proxy. */
const APP_DIR = path.resolve(__dirname, "..");

/** Folders that add no route segment. */
const GROUP_PATTERN = /^\(.+\)$/;

/** The two host header forms that the printed QR codes and a mixed-case client can send. */
const QR_HOSTS = ["storytime.reading-advantage.com", "Storytime.Reading-Advantage.com:443"];

/** The location descriptor of the jsdom window, saved so each case can move the host. */
const SAVED_LOCATION = Object.getOwnPropertyDescriptor(window, "location") as PropertyDescriptor;

/**
 * Lists every route page file under the app folder, as `app/`-relative paths.
 * Route group folders add no segment and test folders hold no route.
 * @returns The relative path of each `page.tsx` or `page.ts` file.
 */
function listRoutePages(): string[] {
  const appDir = path.join(APP_DIR, "app");
  const pages: string[] = [];
  const walk = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.name === "__tests__") continue;
      const fullPath = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        pages.push(path.relative(appDir, fullPath));
      }
    }
  };
  walk(appDir);
  return pages.sort((left, right) => left.localeCompare(right));
}

/**
 * Turns a page path into its route pattern. Each folder becomes one segment;
 * route groups are dropped.
 * @param pagePath The `app/`-relative page path.
 * @returns The segment pattern of the route.
 */
function patternOf(pagePath: string): string[] {
  return path
    .dirname(pagePath)
    .split(path.sep)
    .filter((segment) => !GROUP_PATTERN.test(segment));
}

/**
 * Tells whether a route pattern matches the request segments, the way the App
 * Router files match a URL: a static segment equals its file name, `[x]`
 * matches one segment, `[...x]` matches one or more, and `[[...x]]` matches
 * zero or more.
 * @param pattern The route pattern segments.
 * @param segments The request path segments.
 * @returns True when the route answers the path.
 */
function routeMatches(pattern: string[], segments: string[]): boolean {
  let index = 0;
  for (const part of pattern) {
    if (part.startsWith("[[...")) return true;
    if (part.startsWith("[...")) return segments.length - index >= 1;
    if (index >= segments.length) return false;
    const isDynamic = part.startsWith("[") && part.endsWith("]");
    if (!isDynamic && part !== segments[index]) return false;
    index += 1;
  }
  return index === segments.length;
}

/**
 * Moves the jsdom window to a host, so a case can render under that host.
 * @param url The URL the window reports.
 */
function moveWindowTo(url: string): void {
  Object.defineProperty(window, "location", {
    value: new URL(url),
    configurable: true,
    writable: true,
  });
}

/** Restores the jsdom window location, the DOM, and the navigator stubs. */
function restoreWindow(): void {
  cleanup();
  Object.defineProperty(window, "location", SAVED_LOCATION);
  Reflect.deleteProperty(navigator, "serviceWorker");
}

/**
 * Runs the real proxy for a path with a host header.
 * @param host The `Host` header value.
 * @param requestPath The path of the request.
 * @returns The proxy response.
 */
async function proxyResponse(host: string, requestPath: string): Promise<Response> {
  return middleware(new NextRequest(`http://localhost:8080${requestPath}`, { headers: { host } }));
}

afterEach(restoreWindow);

describe("the storytime removal, probed from outside", () => {
  beforeEach(() => currentUser.mockReset().mockResolvedValue(null));

  it("answers a path under /st/ with the Primary 404 and not a 500", async () => {
    const pages = listRoutePages();
    expect(pages.length, "the route walk covers the app folder").toBeGreaterThanOrEqual(50);
    expect(pages, "the walk sees the catch-all page").toContain("[locale]/[...not-found]/page.tsx");
    expect(pages, "the walk sees the sign-in page").toContain("[locale]/auth/signin/page.tsx");

    const matches = pages.filter((page) => routeMatches(patternOf(page), ["th", "st", "2", "1"]));
    expect(
      matches,
      `match_count=${matches.length} pages=${matches.join(",")}`,
    ).toEqual(["[locale]/[...not-found]/page.tsx"]);

    let thrown: unknown;
    try {
      UnknownPathPage();
    } catch (error) {
      thrown = error;
    }
    expect(thrown, "the catch-all page throws the Next not-found error").toBeInstanceOf(Error);
    expect(String((thrown as { digest?: string }).digest), "digest holds 404").toContain("404");

    for (const requestPath of ["/th/st/2/1", "/st/2/1"]) {
      const response = await proxyResponse("primary.reading-advantage.com", requestPath);
      expect(response.headers.get("location"), `${requestPath} sets no location`).toBeNull();
      expect(
        response.status,
        `${requestPath} answers no redirect status`,
      ).toBeLessThan(300);
    }
  });

  it("rewrites nothing when a storytime host header reaches the proxy", async () => {
    const requestPaths = ["/th/about", "/th/auth/signin", "/", "/th/st/2/1"];
    const redirects: string[] = [];
    for (const host of QR_HOSTS) {
      for (const requestPath of requestPaths) {
        const response = await proxyResponse(host, requestPath);
        const location = response.headers.get("location");
        const isRedirectStatus = response.status >= 300 && response.status < 400;
        if (location !== null || isRedirectStatus) {
          redirects.push(`${host}${requestPath} -> ${location ?? response.status}`);
        }
      }
    }
    expect(
      redirects,
      `redirects=${redirects.length} requests=${QR_HOSTS.length * requestPaths.length} sites=${redirects.join(",")}`,
    ).toEqual([]);
  });

  it("registers the service worker on each normal host with no exemption", () => {
    const hosts: Array<[string, string]> = [
      ["primary.reading-advantage.com", "http://primary.reading-advantage.com/"],
      ["localhost:3000", "http://localhost:3000/"],
    ];
    for (const [host, url] of hosts) {
      restoreWindow();
      moveWindowTo(url);
      const register = vi.fn(() => Promise.resolve({}));
      Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
      const view = render(React.createElement(ServiceWorkerRegister));
      view.rerender(React.createElement(ServiceWorkerRegister));
      expect(
        register,
        `host=${host} register_calls=${register.mock.calls.length}`,
      ).toHaveBeenCalledTimes(1);
      expect(register).toHaveBeenCalledWith(SERVICE_WORKER_URL, {
        scope: SERVICE_WORKER_SCOPE,
        type: SERVICE_WORKER_TYPE,
      });
    }
  });
});
