import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const moduleDirectory = resolve(fileURLToPath(new URL("..", import.meta.url)));
const foundationFileNames = [
  "contracts.ts",
  "authorization.ts",
  "audit.ts",
  "money.ts",
  "records.ts",
  "ports.ts",
  "port-contracts.ts",
  "index.ts",
] as const;
const foundationFilePaths = new Set(
  foundationFileNames.map((fileName) => resolve(moduleDirectory, fileName)),
);

/**
 * Classifies an import specifier against the Finance Operations foundation boundary.
 * @param specifier Module specifier found in a foundation source file.
 * @param importingFile Absolute path of the file that contains the import.
 * @returns A policy-violation message, or undefined when the specifier is allowed.
 */
function classifyImportSpecifier(
  specifier: string,
  importingFile: string,
): string | undefined {
  if (specifier === "zod") {
    return undefined;
  }

  if (!specifier.startsWith(".")) {
    if (specifier === "@reading-advantage/db") {
      return `forbidden database package import: ${specifier}`;
    }
    if (specifier.startsWith("@reading-advantage/")) {
      return `forbidden cross-package import: ${specifier}`;
    }
    if (specifier.startsWith("node:") || specifier === "fs") {
      return `forbidden filesystem, network, process, or environment import: ${specifier}`;
    }
    if (specifier.startsWith("/")) {
      return `forbidden absolute import: ${specifier}`;
    }
    return `forbidden provider or package import: ${specifier}`;
  }

  if (
    specifier === "../../jobs/contracts.js" ||
    specifier === "../../jobs/ports.js"
  ) {
    return undefined;
  }

  const target = resolve(dirname(importingFile), specifier);
  const pathFromModule = relative(moduleDirectory, target);
  if (
    pathFromModule === ".." ||
    pathFromModule.startsWith(`..${sep}`) ||
    isAbsolute(pathFromModule)
  ) {
    return `relative import escapes Finance Operations: ${specifier}`;
  }

  const sourceTarget = target.replace(/\.m?js$/u, ".ts");
  if (!foundationFilePaths.has(sourceTarget)) {
    return `relative import leaves the reviewed foundation: ${specifier}`;
  }

  return undefined;
}

/**
 * Collects import and runtime-boundary violations from one TypeScript source string.
 * @param fileName Absolute or illustrative path used to resolve relative imports.
 * @param sourceText TypeScript source to inspect without executing it.
 * @returns All policy violations found in the source.
 */
function collectBoundaryViolations(
  fileName: string,
  sourceText: string,
): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const violations: string[] = [];

  const inspectModuleSpecifier = (moduleSpecifier: ts.Expression): void => {
    if (!ts.isStringLiteral(moduleSpecifier)) {
      violations.push("module import must use a static string specifier");
      return;
    }
    const violation = classifyImportSpecifier(moduleSpecifier.text, fileName);
    if (violation !== undefined) {
      violations.push(violation);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      inspectModuleSpecifier(node.moduleSpecifier);
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      inspectModuleSpecifier(node.moduleSpecifier);
    }

    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression !== undefined
    ) {
      inspectModuleSpecifier(node.moduleReference.expression);
    }

    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const moduleSpecifier = node.arguments[0];
        if (moduleSpecifier === undefined) {
          violations.push("dynamic import must declare a module specifier");
        } else {
          inspectModuleSpecifier(moduleSpecifier);
        }
      }

      if (ts.isIdentifier(node.expression)) {
        if (node.expression.text === "require") {
          violations.push("forbidden runtime module loading through require");
        }
        if (node.expression.text === "fetch") {
          violations.push("forbidden network access through fetch");
        }
      }
    }

    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      if (
        node.expression.text === "XMLHttpRequest" ||
        node.expression.text === "WebSocket"
      ) {
        violations.push(
          `forbidden network access through ${node.expression.text}`,
        );
      }
    }

    if (ts.isPropertyAccessExpression(node)) {
      const access = node.getText(sourceFile);
      if (
        access.startsWith("process.") ||
        access === "globalThis.process" ||
        access.startsWith("globalThis.process.") ||
        access === "globalThis.fetch" ||
        access.startsWith("globalThis.fetch.") ||
        access === "Deno.env" ||
        access.startsWith("Deno.env.") ||
        access === "Bun.env" ||
        access.startsWith("Bun.env.") ||
        access === "Deno.readFile" ||
        access.startsWith("Deno.readFile.") ||
        access === "Bun.file" ||
        access.startsWith("Bun.file.")
      ) {
        violations.push(`forbidden runtime access: ${access}`);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

describe("Finance Operations policy-neutral architecture boundary", () => {
  it("permits only zod and imports that remain inside the foundation module", () => {
    const violations = foundationFileNames.flatMap((fileName) => {
      const filePath = resolve(moduleDirectory, fileName);
      return collectBoundaryViolations(
        filePath,
        readFileSync(filePath, "utf8"),
      ).map((violation) => `${fileName}: ${violation}`);
    });

    expect(violations).toEqual([]);
  });

  it("rejects database and provider imports in a compiler-parsed counterexample", () => {
    const counterexample = [
      'import { db } from "@reading-advantage/db";',
      'import Stripe from "stripe";',
      'import "./adapters/stripe.js";',
    ].join("\n");

    expect(
      collectBoundaryViolations(
        resolve(moduleDirectory, "counterexample.ts"),
        counterexample,
      ),
    ).toEqual(
      expect.arrayContaining([
        "forbidden database package import: @reading-advantage/db",
        "forbidden provider or package import: stripe",
        "relative import leaves the reviewed foundation: ./adapters/stripe.js",
      ]),
    );
  });
});
