import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import ts from "typescript";

/** HTTP methods supported by Next and vinext route modules. */
export type RouteHandlerMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS";

/** Canonical method-and-path key used by the route inventory gate. */
export type RouteHandlerKey = `${RouteHandlerMethod} ${string}`;

const ROUTE_HANDLER_METHODS = new Set<RouteHandlerMethod>([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
]);

/**
 * Determines whether a declaration has an export modifier.
 * @param node The TypeScript declaration to inspect.
 * @returns Whether the declaration is exported directly from its module.
 */
function isExported(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node)?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) ?? false)
    : false;
}

/**
 * Narrows a declaration name to a supported route-handler method.
 * @param name The exported declaration name.
 * @returns Whether the name is a supported HTTP method.
 */
function isRouteHandlerMethod(name: string): name is RouteHandlerMethod {
  return ROUTE_HANDLER_METHODS.has(name as RouteHandlerMethod);
}

/**
 * Extracts directly exported route-handler methods from TypeScript source.
 * @param source TypeScript source for one Next or vinext route module.
 * @returns The supported HTTP methods exported by the route module.
 * @throws When a non-type-only wildcard re-export prevents exact inventory.
 */
export function extractExportedRouteMethods(
  source: string,
): ReadonlySet<RouteHandlerMethod> {
  const sourceFile = ts.createSourceFile(
    "route.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const methods = new Set<RouteHandlerMethod>();

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;
      if (!statement.exportClause) {
        throw new Error(
          "Wildcard route re-exports are not inventory-safe; use named HTTP method exports.",
        );
      }
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          if (!element.isTypeOnly && isRouteHandlerMethod(element.name.text)) {
            methods.add(element.name.text);
          }
        }
      }
      continue;
    }

    if (
      ts.isFunctionDeclaration(statement) &&
      isExported(statement) &&
      statement.name &&
      isRouteHandlerMethod(statement.name.text)
    ) {
      methods.add(statement.name.text);
      continue;
    }

    if (!ts.isVariableStatement(statement) || !isExported(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        declaration.initializer &&
        ts.isIdentifier(declaration.name) &&
        isRouteHandlerMethod(declaration.name.text)
      ) {
        methods.add(declaration.name.text);
      }
    }
  }

  return methods;
}

/**
 * Recursively discovers every exported API route handler under an app root.
 * @param appRoot Absolute path to the application's `app` directory.
 * @returns Canonical handler keys for every nested API `route.ts` file.
 */
export function discoverRouteHandlers(
  appRoot: string,
): ReadonlySet<RouteHandlerKey> {
  const apiRoot = resolve(appRoot, "api");
  const routeFiles: string[] = [];

  const collectRouteFiles = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) collectRouteFiles(absolute);
      if (entry.isFile() && entry.name === "route.ts") routeFiles.push(absolute);
    }
  };
  collectRouteFiles(apiRoot);

  const handlers = new Set<RouteHandlerKey>();
  for (const routeFile of routeFiles) {
    const relativeFile = relative(appRoot, routeFile).split(sep).join("/");
    const routePath = "/" + relativeFile.slice(0, relativeFile.lastIndexOf("/route.ts"));
    const source = readFileSync(routeFile, "utf8");
    for (const method of extractExportedRouteMethods(source)) {
      handlers.add(`${method} ${routePath}`);
    }
  }

  return handlers;
}

/**
 * Enforces an exact match between discovered and reviewed route handlers.
 * @param discovered Handlers found recursively in the application tree.
 * @param inventoried Public and protected handlers reviewed for release.
 * @throws When a discovered handler is absent or an inventory entry is stale.
 */
export function assertExactRouteHandlerInventory(
  discovered: ReadonlySet<RouteHandlerKey>,
  inventoried: ReadonlySet<RouteHandlerKey>,
): void {
  const missing = [...discovered].filter((handler) => !inventoried.has(handler));
  const stale = [...inventoried].filter((handler) => !discovered.has(handler));
  const failures = [
    missing.length > 0 ? `Uninventoried route handlers: ${missing.sort().join(", ")}` : "",
    stale.length > 0 ? `Stale route inventory entries: ${stale.sort().join(", ")}` : "",
  ].filter(Boolean);

  if (failures.length > 0) throw new Error(failures.join("; "));
}
