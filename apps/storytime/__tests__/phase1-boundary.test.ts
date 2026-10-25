// @vitest-environment node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");

/**
 * Detect whether a resolved import enters the other app.
 * @param path The resolved import path.
 * @param directory The other app directory.
 * @returns Whether the path enters the other app.
 */
function inside(path: string, directory: string): boolean {
  const suffix = relative(directory, path);
  return suffix === "" || (!suffix.startsWith("..") && !isAbsolute(suffix));
}

/**
 * Extract the module references with the TypeScript parser.
 * @param source The source text.
 * @param file The source path.
 * @returns The literal module references.
 */
function imports(source: string, file = "source.ts"): string[] {
  const result: string[] = [];
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier
      && ts.isStringLiteralLike(node.moduleSpecifier)) result.push(node.moduleSpecifier.text);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      result.push(node.moduleReference.expression.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(node.expression) && node.expression.text === "require"))
      && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) result.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return result;
}

describe("AC-1.3 bidirectional app boundary", () => {
  it("detects each import form without treating comments as imports", () => {
    expect(imports(`
      // import ignored from "comment";
      import value from "static";
      export { value } from "reexport";
      const a = import("dynamic");
      const b = require("commonjs");
      import c = require("equals");
    `)).toEqual(["static", "reexport", "dynamic", "commonjs", "equals"]);
    expect(inside(resolve(app, "page.tsx"), app)).toBe(true);
    expect(inside(`${app}-other/page.tsx`, app)).toBe(false);
  });

  it("has real app sources and no cross-app imports in either direction", () => {
    expect(existsSync(resolve(app, "package.json")), "Missing Storytime app; an empty scan cannot prove isolation").toBe(true);
    const violations: string[] = [];
    for (const [from, to] of [["storytime", "primary-advantage"], ["primary-advantage", "storytime"]]) {
      const directory = resolve(root, "apps", from);
      const other = resolve(root, "apps", to);
      const configPath = resolve(directory, "tsconfig.json");
      expect(existsSync(configPath), `Missing ${from} tsconfig`).toBe(true);
      const config = ts.readConfigFile(configPath, ts.sys.readFile);
      expect(config.error).toBeUndefined();
      const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, directory);
      // Include Green's new files. Preserve the unrelated untracked Primary files.
      const selection = from === "storytime" ? ["--cached", "--others", "--exclude-standard"] : [];
      const files = execFileSync("git", ["ls-files", "-z", ...selection, "--", `apps/${from}`], { cwd: root })
        .toString().split("\0").filter((path) => /\.[cm]?[jt]sx?$/.test(path)
          && !/(?:node_modules|\.next)\//.test(path));
      const production = files.filter((path) => !/(?:__tests__|tests)\//.test(path)
        && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path));
      expect(production.length, `No production sources in ${from}`).toBeGreaterThan(0);
      for (const file of files) {
        const absolute = resolve(root, file);
        for (const specifier of imports(readFileSync(absolute, "utf8"), file)) {
          const resolved = ts.resolveModuleName(specifier, absolute, options, ts.sys).resolvedModule?.resolvedFileName;
          const direct = specifier.startsWith(".") ? resolve(dirname(absolute), specifier)
            : resolve(root, specifier);
          if (inside(direct, other) || (resolved && inside(resolved, other))
            || specifier === to || specifier.startsWith(`${to}/`)) violations.push(`${file}: ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
