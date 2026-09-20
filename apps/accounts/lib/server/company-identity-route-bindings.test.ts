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

interface RouteProvenance {
  readonly operation: string;
  readonly capabilityId: string;
}

const OPERATION_BY_BINDING_ID: Readonly<Record<string, string>> = {
  "company-identity.employees.list": "employeesList",
  "company-identity.employees.create": "employeesCreate",
  "company-identity.employees.set-status": "employeeStatus",
  "company-identity.employees.set-application-roles": "employeeApplicationRoles",
  "company-identity.employees.set-company-roles": "employeeCompanyRoles",
  "company-identity.employees.reset-credential": "employeeCredential",
  "company-identity.employees.revoke-sessions": "employeeSessions",
  "accounts.discovery.openid-configuration": "discovery",
  "accounts.health": "health",
  "accounts.ready": "ready",
  "accounts.oidc.authorize": "authorize",
  "accounts.oidc.introspect": "introspect",
  "accounts.oidc.jwks": "jwks",
  "accounts.oidc.logout": "oidcLogout",
  "accounts.oidc.token": "token",
  "accounts.session.login": "login",
  "accounts.session.logout": "sessionLogout",
};

const CAPABILITY_BY_OPERATION: Readonly<Record<string, string>> = {
  employeesList: "listEmployees",
  employeesCreate: "createEmployee",
  employeeStatus: "setEmployeeStatus",
  employeeApplicationRoles: "setApplicationRoles",
  employeeCompanyRoles: "setCompanyRoles",
  employeeCredential: "resetCredential",
  employeeSessions: "revokeSessions",
  discovery: "discovery",
  health: "health",
  ready: "ready",
  authorize: "authorize",
  introspect: "introspect",
  jwks: "jwks",
  oidcLogout: "oidcLogout",
  token: "token",
  login: "login",
  sessionLogout: "sessionLogout",
};
function routeProvenance(
  source: string,
  filePath: string,
  method: HttpMethod,
): RouteProvenance[] {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const results: RouteProvenance[] = [];
  const root = sourceFile.statements.find((statement) => {
    if (ts.isFunctionDeclaration(statement)) return statement.name?.text === method;
    if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.some((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === method);
    return false;
  });
  if (!root) return results;
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "companyIdentityRouteHandlers") {
      const operation = node.name.text;
      let capabilityId = "";
      let parent: ts.Node = node;
      while (parent.parent && parent.parent !== sourceFile) parent = parent.parent;
      const text = parent.getText(sourceFile);
      const capabilityMatch = text.match(/companyIdentityCapabilityIds\.([A-Za-z0-9_]+)/);
      if (capabilityMatch) capabilityId = capabilityMatch[1];
      if (!capabilityId) capabilityId = CAPABILITY_BY_OPERATION[operation.replace(/(Head|Options)$/, "")] ?? "";
      results.push({ operation, capabilityId });
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return results;
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

  it("binds every source method to its exact named operation and capability", () => {
    const bindingsByRoute = new Map(
      companyIdentityRouteBindings.map((binding) => [
        `${binding.method} ${binding.path}`,
        binding,
      ]),
    );
    for (const route of routeSources(APP_ROOT)) {
      for (const method of route.methods) {
        const binding = bindingsByRoute.get(`${method} ${route.path}`);
        expect(binding, `${method} ${route.path} has a binding`).toBeDefined();
        const baseOperation = OPERATION_BY_BINDING_ID[binding!.bindingId.replace(/\.(head|options)$/, "")];
        const expectedOperation = `${baseOperation ?? ""}${method === "OPTIONS" ? "Options" : method === "HEAD" ? "Head" : ""}`;
        const candidates = routeProvenance(readFileSync(route.filePath, "utf8"), route.filePath, method)
          .filter(({ operation }) => method === "OPTIONS" ? operation.endsWith("Options") : method === "HEAD" ? operation.endsWith("Head") : !operation.endsWith("Options") && !operation.endsWith("Head"));
        expect(candidates).toEqual([{ operation: expectedOperation, capabilityId: CAPABILITY_BY_OPERATION[baseOperation] }]);
      }
    }
  });

  it("rejects a paired operation and capability swap in the route source", () => {
    const fixturePath = join(ROUTE_DENOMINATOR_FIXTURE_ROOT, "paired-swap-route.ts");
    const [provenance] = routeProvenance(readFileSync(fixturePath, "utf8"), fixturePath, "PATCH");
    const expected = { operation: "employeeStatus", capabilityId: "set-status" };
    expect(provenance).not.toEqual(expected);
    expect(provenance).toEqual({ operation: "employeeCompanyRoles", capabilityId: "setCompanyRoles" });
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

  it("imports the route adapter through the backend package boundary", async () => {
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "company-identity-route-bindings.ts"),
      "utf8",
    );

    expect(source).toContain(
      '@reading-advantage/backend/company-identity/accounts-route-adapter',
    );
    expect(source).not.toMatch(/from\s+"\.\..*packages\/backend/);
  });
});
