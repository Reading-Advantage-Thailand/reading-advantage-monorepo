// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const route = resolve(app, "app/[locale]/st/[level]/[week]/page.tsx");

describe("Phase 3 public entry route", () => {
  it("loads, parses, and gates the published week before rendering", () => {
    expect(existsSync(route), "Missing at-home entry route").toBe(true);
    const source = readFileSync(route, "utf8");
    expect(source).toMatch(/export\s+default\s+(async\s+)?function/);
    expect(source).toMatch(/parse/);
    expect(source).toMatch(/published/);
    expect(source).toMatch(/notFound/);
  });

  it("supports canonical route numbers and all supported part query values", () => {
    expect(existsSync(route), "Missing at-home entry route").toBe(true);
    const source = readFileSync(route, "utf8");
    expect(source).toMatch(/searchParams/);
    for (const part of ["book", "decodable", "song"]) expect(source).toContain(part);
    expect(source).toMatch(/safe|canonical|positive|^[\s\S]*[1-9]/i);
  });

  it("serves public metadata with noindex and the no-cookie route configuration", () => {
    expect(existsSync(route), "Missing at-home entry route").toBe(true);
    const source = readFileSync(route, "utf8");
    expect(source).toMatch(/noindex/i);
    const routing = readFileSync(resolve(app, "i18n/routing.ts"), "utf8");
    expect(routing).toMatch(/localeCookie\s*:\s*false/);
  });

  it("provides a same-origin Thai redirect for paths without a locale", () => {
    const middleware = ["proxy.ts", "middleware.ts"].map((name) => resolve(app, name)).find(existsSync);
    expect(middleware, "Missing locale redirect entry").toBeDefined();
    const source = readFileSync(middleware!, "utf8");
    expect(source).toMatch(/\/th/);
    expect(source).toMatch(/redirect/i);
  });
});
