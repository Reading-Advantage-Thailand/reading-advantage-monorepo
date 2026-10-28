// @vitest-environment node
// The programSchema of packages/types keeps the storytime value (spec FR-3, plan task 2.2).
// The test reads the source of the schema, so it needs no build of the package.
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");

/**
 * Reads the program names of the programSchema of packages/types.
 * @returns The program names of the enum.
 */
function programNames(): string[] {
  const path = resolve(root, "packages/types/src/index.ts");
  expect(existsSync(path), `Missing program schema source: ${relative(root, path)}`).toBe(true);
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === "programSchema" &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      node.initializer.arguments.length === 1 &&
      ts.isArrayLiteralExpression(node.initializer.arguments[0])
    ) {
      for (const element of node.initializer.arguments[0].elements) {
        if (ts.isStringLiteral(element)) names.push(element.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

describe("the shared program schema keeps storytime", () => {
  it("lists the program names of the enum", () => {
    const names = programNames();
    expect(names.length, "The programSchema of packages/types holds no program name").toBeGreaterThan(
      0,
    );
    expect(names).toContain("storytime");
  });
});
