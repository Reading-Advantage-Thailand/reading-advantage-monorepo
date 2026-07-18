import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertExactRouteHandlerInventory,
  discoverRouteHandlers,
  extractExportedRouteMethods,
} from "./helpers/route-handler-inventory";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("Marketing route-handler inventory discovery", () => {
  it("recognizes every supported Next and vinext route export form", () => {
    const source = `
      export async function GET() {}
      export function POST() {}
      export const PATCH = async () => new Response(null);
      export const PUT = () => new Response(null);
      export const DELETE = namedHandler;
      export const OPTIONS = function optionsHandler() {};
      const HEAD = () => new Response(null);
      export { HEAD };
    `;

    expect(extractExportedRouteMethods(source)).toEqual(
      new Set(["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]),
    );
  });

  it("recursively discovers a nested route and fails the gate when it is unprotected", () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "marketing-route-inventory-"),
    );
    temporaryDirectories.push(fixtureRoot);
    const appRoot = resolve(fixtureRoot, "app");
    const nestedRoute = resolve(appRoot, "api", "reports", "daily", "route.ts");
    mkdirSync(resolve(nestedRoute, ".."), { recursive: true });
    writeFileSync(
      nestedRoute,
      "export const GET = async () => new Response('unprotected');\n",
      "utf8",
    );

    const discovered = discoverRouteHandlers(appRoot);

    expect(discovered).toEqual(new Set(["GET /api/reports/daily"]));
    expect(() =>
      assertExactRouteHandlerInventory(discovered, new Set()),
    ).toThrow(/Uninventoried route handlers: GET \/api\/reports\/daily/);
  });
});
