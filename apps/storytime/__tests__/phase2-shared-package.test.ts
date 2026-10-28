// @vitest-environment node
// The follow-ups of the Phase 1 acceptance (test strategy P2.3). The Tailwind @source test
// counts the shared packages before it checks them (A4). The app must depend on the shared
// read-along package, and the CSS and the Dockerfile must follow that dependency.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");
const readAlongDirectory = resolve(root, "packages/read-along");
const readAlongName = "@reading-advantage/read-along";

/**
 * Reads the manifest of the app.
 * @returns The parsed manifest.
 */
function appManifest(): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} {
  const path = resolve(app, "package.json");
  expect(existsSync(path), `Missing app manifest: ${relative(root, path)}`).toBe(true);
  return JSON.parse(readFileSync(path, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
}

/**
 * Lists the shared workspace packages of the app.
 * @returns The package names of the workspace scope.
 */
function sharedPackageNames(): string[] {
  const manifest = appManifest();
  return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).filter((name) =>
    name.startsWith("@reading-advantage/"),
  );
}

/**
 * Finds the directory of a workspace package.
 * @param name The package name.
 * @returns The directory of the package.
 */
function packageDirectory(name: string): string {
  const packages = resolve(root, "packages");
  const entry = readdirSync(packages).find((candidate) => {
    const manifest = resolve(packages, candidate, "package.json");
    return (
      existsSync(manifest) &&
      (JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name === name
    );
  });
  expect(entry, `Unknown workspace package ${name}`).toBeDefined();
  return resolve(packages, entry!);
}

/**
 * Lists the source files of a directory.
 * @param directory The directory to walk.
 * @returns The source file paths.
 */
function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", "dist", ".turbo", ".next"].includes(entry.name)) continue;
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (
        /\.[cm]?[jt]sx?$/.test(entry.name) &&
        !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name)
      ) {
        files.push(path);
      }
    }
  };
  walk(directory);
  return files;
}

/**
 * Lists the module references of a source file.
 * @param source The source text.
 * @param file The source path.
 * @returns The literal module references.
 */
function imports(source: string, file = "source.ts"): string[] {
  const result: string[] = [];
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      result.push(node.moduleSpecifier.text);
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      result.push(node.moduleReference.expression.text);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      result.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return result;
}

/**
 * Tells whether a path lies inside a directory.
 * @param path The path to test.
 * @param directory The directory.
 * @returns Whether the path lies inside the directory.
 */
function inside(path: string, directory: string): boolean {
  const suffix = relative(directory, path);
  return suffix === "" || (!suffix.startsWith("..") && !isAbsolute(suffix));
}

/**
 * Reads the pruner stage of the Dockerfile.
 * @returns The commands of the pruner stage.
 */
function prunerStage(): string {
  const path = resolve(app, "Dockerfile");
  expect(existsSync(path), `Missing Dockerfile: ${relative(root, path)}`).toBe(true);
  const lines = readFileSync(path, "utf8").split("\n");
  const start = lines.findIndex((line) => /^FROM\s+\S+\s+AS\s+pruner\s*$/i.test(line));
  expect(start, "The Dockerfile has no pruner stage (task 2.3)").toBeGreaterThan(-1);
  const stage: string[] = [];
  for (let index = start + 1; index < lines.length; index++) {
    if (/^FROM\s+/i.test(lines[index])) break;
    stage.push(lines[index]);
  }
  return stage.filter((line) => !line.trim().startsWith("#")).join("\n");
}

/**
 * Lists the Tailwind sources of the app CSS.
 * @returns The resolved source paths.
 */
function tailwindSources(): string[] {
  const path = resolve(app, "app/globals.css");
  expect(existsSync(path), `Missing Tailwind entry: ${relative(root, path)}`).toBe(true);
  const css = readFileSync(path, "utf8");
  return [...css.matchAll(/@source\s+["']([^"']+)["']/g)].map(([, source]) =>
    resolve(dirname(path), source),
  );
}

describe("the Tailwind source test of the shared packages (A4)", () => {
  it("finds at least one shared workspace package", () => {
    const names = sharedPackageNames();
    expect(names.length, "The app depends on no shared workspace package (A4)").toBeGreaterThan(0);
  });

  it("scans every shared workspace package of the app", () => {
    const names = sharedPackageNames();
    expect(names.length, "The app depends on no shared workspace package (A4)").toBeGreaterThan(0);
    const sources = tailwindSources();
    for (const name of names) {
      const directory = packageDirectory(name);
      expect(
        sources.some((source) => inside(source, directory)),
        `Missing Tailwind @source for ${name}`,
      ).toBe(true);
    }
  });
});

describe("the app depends on the shared read-along package", () => {
  it("names the shared read-along package in the app manifest", () => {
    const manifest = appManifest();
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    expect(
      dependencies[readAlongName],
      `Missing ${readAlongName} in apps/storytime/package.json (task 2.3)`,
    ).toBe("workspace:*");
  });

  it("scans the shared read-along package in Tailwind", () => {
    const manifest = appManifest();
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    expect(
      dependencies[readAlongName],
      `Missing ${readAlongName} in apps/storytime/package.json (task 2.3)`,
    ).toBe("workspace:*");
    const sources = tailwindSources();
    expect(
      sources.some((source) => inside(source, readAlongDirectory)),
      "Missing Tailwind @source for packages/read-along in apps/storytime/app/globals.css (task 2.3)",
    ).toBe(true);
  });

  it("copies the shared read-along package in the Docker pruner stage", () => {
    const manifest = appManifest();
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    expect(
      dependencies[readAlongName],
      `Missing ${readAlongName} in apps/storytime/package.json (task 2.3)`,
    ).toBe("workspace:*");
    const stage = prunerStage();
    expect(
      /COPY\s+packages\/read-along\s+\.\/packages\/read-along\b/.test(stage),
      "Missing pruner-stage COPY for packages/read-along in apps/storytime/Dockerfile (task 2.3)",
    ).toBe(true);
  });

  it("copies every shared workspace package of the app in the Docker pruner stage", () => {
    const names = sharedPackageNames();
    expect(names.length, "The app depends on no shared workspace package (A4)").toBeGreaterThan(0);
    const stage = prunerStage();
    for (const name of names) {
      const directory = packageDirectory(name);
      const relativePath = relative(root, directory);
      expect(
        stage.includes(relativePath),
        `The pruner stage of the Dockerfile copies no ${relativePath} (task 2.3)`,
      ).toBe(true);
    }
  });
});

describe("the shared read-along package keeps the app boundary", () => {
  it("holds source files and imports nothing from an app", () => {
    expect(
      existsSync(readAlongDirectory),
      "Missing shared package directory: packages/read-along (task 2.3)",
    ).toBe(true);
    const files = sourceFiles(readAlongDirectory);
    expect(
      files.length,
      "The shared package holds no source file (task 2.3, A4)",
    ).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      for (const specifier of imports(readFileSync(file, "utf8"), file)) {
        if (!specifier.startsWith(".")) continue;
        const resolved = resolve(dirname(file), specifier);
        if (inside(resolved, resolve(root, "apps"))) {
          violations.push(`${relative(root, file)}: ${specifier}`);
        }
      }
    }
    expect(violations, "The shared package imports a file of an app").toEqual([]);
  });

  it("keeps the app sources free of a relative path into the shared package", () => {
    expect(
      existsSync(readAlongDirectory),
      "Missing shared package directory: packages/read-along (task 2.3)",
    ).toBe(true);
    const files = sourceFiles(app);
    expect(files.length, "The app holds no source file (A4)").toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      for (const specifier of imports(readFileSync(file, "utf8"), file)) {
        if (!specifier.startsWith(".")) continue;
        const resolved = resolve(dirname(file), specifier);
        if (inside(resolved, readAlongDirectory)) {
          violations.push(`${relative(root, file)}: ${specifier}`);
        }
      }
    }
    expect(violations, "An app source imports the shared package by a relative path").toEqual([]);
  });
});
