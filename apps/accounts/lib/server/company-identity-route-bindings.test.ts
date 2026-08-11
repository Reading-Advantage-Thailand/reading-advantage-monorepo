import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import { httpMethodSchema } from "@reading-advantage/backend";

import {
  companyIdentityRouteBindings,
  companyIdentityRouteHandlers,
} from "./company-identity-route-bindings";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../app");
const ROUTE_DENOMINATOR_FIXTURE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__/company-identity-route-denominator",
);
const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const);
type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

interface RouteSource {
  readonly filePath: string;
  readonly path: string;
  readonly methods: readonly HttpMethod[];
}

function isExported(statement: ts.Statement): boolean {
  const modifiers: readonly ts.Modifier[] = ts.canHaveModifiers(statement)
    ? (ts.getModifiers(statement) ?? [])
    : [];
  return modifiers.some(
    (modifier: ts.Modifier): boolean =>
      modifier.kind === ts.SyntaxKind.ExportKeyword,
  );
}

function methodFromName(name: string | undefined): HttpMethod | undefined {
  return name !== undefined && HTTP_METHODS.has(name as HttpMethod)
    ? (name as HttpMethod)
    : undefined;
}

/** Parses function and const Next handler exports from one route source file. */
function explicitRouteMethods(source: string, filePath: string): HttpMethod[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const methods: HttpMethod[] = [];
  for (const statement of sourceFile.statements) {
    if (!isExported(statement)) continue;
    if (ts.isFunctionDeclaration(statement)) {
      const method = methodFromName(statement.name?.text);
      if (method !== undefined) methods.push(method);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const method = methodFromName(declaration.name.text);
        if (method !== undefined) methods.push(method);
      }
    }
  }
  return methods;
}

/** Finds route files and their explicit exported methods using the TypeScript AST. */
function routeSources(
  directory: string,
  segments: readonly string[] = [],
): RouteSource[] {
  const routes: RouteSource[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      routes.push(
        ...routeSources(entryPath, [
          ...segments,
          entry.name.replace(/^\[([^\]]+)\]$/, ":$1"),
        ]),
      );
      continue;
    }
    if (!entry.isFile() || entry.name !== "route.ts") continue;
    routes.push({
      filePath: entryPath,
      path: `/${segments.join("/")}`,
      methods: explicitRouteMethods(readFileSync(entryPath, "utf8"), entryPath),
    });
  }
  return routes;
}

/** Adds Next's automatic HEAD and OPTIONS obligations to explicit route exports. */
function effectiveRouteMethods(methods: readonly HttpMethod[]): HttpMethod[] {
  const effective = new Set(methods);
  if (effective.has("GET")) effective.add("HEAD");
  effective.add("OPTIONS");
  return [...effective].sort();
}

function sortedRouteMethods(routes: readonly RouteSource[]) {
  return routes
    .flatMap((route) =>
      effectiveRouteMethods(route.methods).map(
        (method) => [method, route.path] as const,
      ),
    )
    .sort(([leftMethod, leftPath], [rightMethod, rightPath]) =>
      `${leftMethod} ${leftPath}`.localeCompare(`${rightMethod} ${rightPath}`),
    );
}

function hasRouteHandlerIdentifier(source: string, filePath: string): boolean {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let found = false;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "companyIdentityRouteHandlers") {
      found = true;
    }
    if (!found) ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

describe("Accounts company-identity route registry", () => {
  it("matches the backend-owned denominator to every actual route and framework method", () => {
    const routes = routeSources(APP_ROOT);
    const actualRoutes = sortedRouteMethods(routes);
    const declaredRoutes = companyIdentityRouteBindings
      .map((binding) => [binding.method, binding.path] as const)
      .sort(([leftMethod, leftPath], [rightMethod, rightPath]) =>
        `${leftMethod} ${leftPath}`.localeCompare(
          `${rightMethod} ${rightPath}`,
        ),
      );

    expect(companyIdentityRouteBindings).toHaveLength(actualRoutes.length);
    expect(Object.isFrozen(companyIdentityRouteBindings)).toBe(true);
    expect(declaredRoutes).toEqual(actualRoutes);
    expect(
      new Set(declaredRoutes.map(([method, path]) => `${method} ${path}`)).size,
    ).toBe(declaredRoutes.length);
    for (const route of routes) {
      expect(
        hasRouteHandlerIdentifier(
          readFileSync(route.filePath, "utf8"),
          route.filePath,
        ),
      ).toBe(true);
    }
  });

  it("accounts for Next automatic HEAD and OPTIONS on function and const fixtures", () => {
    const fixtureRoutes = sortedRouteMethods(
      routeSources(ROUTE_DENOMINATOR_FIXTURE_ROOT),
    );

    expect(fixtureRoutes).toEqual([
      ["GET", "/function-handler"],
      ["HEAD", "/function-handler"],
      ["OPTIONS", "/const-handler"],
      ["OPTIONS", "/function-handler"],
      ["POST", "/const-handler"],
    ]);
    expect(
      fixtureRoutes.every(
        ([method]) => httpMethodSchema.safeParse(method).success,
      ),
    ).toBe(true);
  });

  it("keeps HEAD factual and isolates explicit OPTIONS context", () => {
    const headContext = companyIdentityRouteHandlers.discoveryHead(
      (context) => context,
    );
    const optionsContext = companyIdentityRouteHandlers.discoveryOptions(
      (context) => context,
    );

    expect(headContext).toMatchObject({
      method: "HEAD",
      path: "/.well-known/openid-configuration",
    });
    expect(optionsContext).toMatchObject({
      method: "OPTIONS",
      path: "/.well-known/openid-configuration",
    });
  });

  it("labels HEAD and OPTIONS with their true runtime exposure", () => {
    const frameworkBindings = companyIdentityRouteBindings.filter(
      ({ method }) => method === "HEAD" || method === "OPTIONS",
    );

    expect({ "Framework method bindings": frameworkBindings.length }).toEqual({
      "Framework method bindings": 22,
    });
    for (const binding of frameworkBindings) {
      expect(binding.exposure).toBe("public");
    }
  });

  it("does not expose a generic Accounts runner or binding IDs from the backend package", async () => {
    const backendPublicApi = await import("@reading-advantage/backend");
    expect(backendPublicApi).not.toHaveProperty("runWithCompanyIdentityRoute");
    expect(backendPublicApi).not.toHaveProperty(
      "companyIdentityRouteBindingIds",
    );
    expect(backendPublicApi).not.toHaveProperty("getCapabilityRequestContext");
    expect(companyIdentityRouteHandlers).not.toHaveProperty("run");
  });
});
