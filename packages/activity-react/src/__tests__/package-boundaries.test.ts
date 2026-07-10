// @vitest-environment node

import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(path);
    return [path];
  }));
  return nested.flat().filter((path) => [".ts", ".tsx"].includes(extname(path)));
}

describe("activity React package boundaries", () => {
  it("keeps recursive production imports framework, server, database, and provider neutral", async () => {
    const forbidden = /(?:^next(?:\/|$)|vinext|drizzle|prisma|firebase|youtube|@ai-sdk|@vercel\/ai|packages\/(?:db|auth|domain|api))/i;
    for (const path of await sourceFiles(sourceRoot)) {
      const source = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true);
      const imports = source.statements
        .filter(ts.isImportDeclaration)
        .map((declaration) => declaration.moduleSpecifier)
        .filter(ts.isStringLiteral)
        .map((specifier) => specifier.text);
      expect(imports.filter((specifier) => forbidden.test(specifier)), path).toEqual([]);
    }
  });

  it("documents every exported declaration at the package boundary", async () => {
    const undocumented: string[] = [];
    for (const path of await sourceFiles(sourceRoot)) {
      const source = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true);
      for (const statement of source.statements) {
        const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
        const exported = modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
        const declaration = ts.isFunctionDeclaration(statement)
          || ts.isClassDeclaration(statement)
          || ts.isInterfaceDeclaration(statement)
          || ts.isTypeAliasDeclaration(statement);
        if (exported && declaration && ts.getJSDocCommentsAndTags(statement).length === 0) {
          undocumented.push(`${path}:${source.getLineAndCharacterOfPosition(statement.getStart(source)).line + 1}`);
        }
      }
    }
    expect(undocumented).toEqual([]);
  });

  it("cold-imports every built public entry point", async () => {
    const distRoot = join(sourceRoot, "..", "dist");
    for (const file of ["index.js", "controllers.js", "testing.js"]) {
      await expect(import(`${pathToFileURL(join(distRoot, file)).href}?cold=${file}`)).resolves.toBeDefined();
    }
  });
});
