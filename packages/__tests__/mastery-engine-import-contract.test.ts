import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const provenancePath = join(
  repositoryRoot,
  "measure/tracks/mastery_engine_v32_import_20260710/import-provenance.json",
);

const packages = [
  {
    directory: "knowledge-space-core",
    name: "@reading-advantage/knowledge-space-core",
    sourceTree: "59d65b7820bed92bfd81796369c4265d8e37b84f",
    exportKeys: [
      ".",
      "./types",
      "./schemas",
      "./validation",
      "./level-projection",
      "./progress-trend",
      "./adapters",
      "./fixtures",
    ],
  },
  {
    directory: "knowledge-space-practice",
    name: "@reading-advantage/knowledge-space-practice",
    sourceTree: "def1ea044552c026ee4a2bbb700068dab13e1bc5",
    exportKeys: [
      ".",
      "./misconception-loop",
      "./blueprints",
      "./planner/types",
      "./projections",
    ],
  },
  {
    directory: "srs-engine",
    name: "@reading-advantage/srs-engine",
    sourceTree: "30ee7d4533f0aaa5dffa0fb5cf4a292bc1f30901",
    exportKeys: [
      ".",
      "./contract",
      "./scheduler",
      "./review-processor",
      "./queue",
      "./adapters",
      "./submission-adapter",
    ],
  },
  {
    directory: "practice-core",
    name: "@reading-advantage/practice-core",
    sourceTree: "fa72f9313d35dda8ffc22c098fd62c3ad7f8ff19",
    exportKeys: [
      ".",
      "./contract",
      "./submission-schema",
      "./timing",
      "./timing-baseline",
      "./srs-rating",
      "./problem-family",
      "./practice-item",
      "./error-analysis",
      "./generator-qa",
    ],
  },
] as const;

const allowedProductionDependencies = new Set([
  "zod",
  "ts-fsrs",
  ...packages.map(({ name }) => name),
]);

const forbiddenImport =
  /^(?:react(?:\/|$)|next(?:\/|$)|vinext(?:\/|$)|vite(?:\/|$)|drizzle-orm(?:\/|$)|pg$|postgres(?:\/|$)|convex(?:\/|$)|@convex-dev\/|firebase(?:\/|$)|@prisma\/client(?:\/|$)|@trpc\/|hono(?:\/|$)|ai$|@ai-sdk\/|openai(?:\/|$)|@anthropic-ai\/sdk(?:\/|$)|@google\/generative-ai(?:\/|$)|@reading-advantage\/(?:auth|auth-client|storage|api|webhooks)(?:\/|$)|\.\.?\/(?:apps?|routes?|transport)(?:\/|$))/;

type PackageManifest = {
  name?: string;
  type?: string;
  exports?: Record<
    string,
    | string
    | {
        types?: string;
        import?: string;
      }
  >;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type ProvenanceArtifact = {
  source?: { repository?: string; commit?: string };
  transformations?: string[];
  packages?: Array<{
    sourcePath?: string;
    sourceTree?: string;
    destinationPath?: string;
    destinationName?: string;
  }>;
};

function readJson<T>(path: string): T {
  expect(
    existsSync(path),
    `Required contract artifact is missing: ${relative(repositoryRoot, path)}`,
  ).toBe(true);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function productionTypeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return /^(?:__tests__|test|tests|fixtures)$/.test(entry.name)
        ? []
        : productionTypeScriptFiles(path);
    }

    return /\.(?:ts|tsx)$/.test(entry.name) &&
      !/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name)
      ? [path]
      : [];
  });
}

function importSpecifiers(source: string, fileName: string): string[] {
  const specifiers: string[] = [];
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function topLevelPackage(specifier: string): string {
  return specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
}

describe("Mastery engine v2 mechanical import contract", () => {
  it.each(packages)(
    "discovers $name with its approved name and export surface",
    (pkg) => {
      const manifestPath = join(
        repositoryRoot,
        "packages",
        pkg.directory,
        "package.json",
      );
      const manifest = readJson<PackageManifest>(manifestPath);

      expect(manifest.name).toBe(pkg.name);
      expect(manifest.type).toBe("module");
      expect(Object.keys(manifest.exports ?? {}).sort()).toEqual(
        [...pkg.exportKeys].sort(),
      );
      expect(manifest.exports?.["."]).toBeDefined();

      for (const [dependency, version] of Object.entries(
        manifest.dependencies ?? {},
      )) {
        expect(
          allowedProductionDependencies.has(dependency),
          `${pkg.name} has non-neutral dependency ${dependency}`,
        ).toBe(true);
        if (dependency.startsWith("@reading-advantage/"))
          expect(version).toBe("workspace:*");
      }
    },
  );

  it("records frozen source provenance and normalized mechanical transformations", () => {
    const provenance = readJson<ProvenanceArtifact>(provenancePath);

    expect(provenance.source).toEqual({
      repository: "/home/daniel-bo/Desktop/ra-math-advantage",
      commit: "3e0b3517c42cfe0b603295a1ec48548505617169",
    });
    expect(provenance.transformations).toEqual(
      expect.arrayContaining([
        "package-scope",
        "workspace-dependency-syntax",
        "import-specifiers",
        "build-output-and-exports",
        "workspace-configuration",
      ]),
    );
    expect(provenance.packages).toHaveLength(packages.length);

    for (const pkg of packages) {
      expect(provenance.packages).toContainEqual(
        expect.objectContaining({
          sourcePath: `packages/${pkg.directory}`,
          sourceTree: pkg.sourceTree,
          destinationPath: `packages/${pkg.directory}`,
          destinationName: pkg.name,
        }),
      );
    }
  });

  it(
    "builds every package export and loads each runtime target",
    async () => {
      for (const pkg of packages) {
        execFileSync("pnpm", ["--filter", pkg.name, "build"], {
          cwd: repositoryRoot,
          stdio: "pipe",
        });

        const packageRoot = join(repositoryRoot, "packages", pkg.directory);
        const manifest = readJson<PackageManifest>(
          join(packageRoot, "package.json"),
        );

        for (const [exportKey, target] of Object.entries(
          manifest.exports ?? {},
        )) {
          const runtimeTarget =
            typeof target === "string" ? target : target.import;
          const typesTarget =
            typeof target === "string" ? undefined : target.types;

          expect(
            runtimeTarget,
            `${pkg.name} ${exportKey} must define an import target`,
          ).toBeTruthy();
          if (!runtimeTarget) continue;

          const runtimePath = join(packageRoot, runtimeTarget);
          expect(
            existsSync(runtimePath),
            `${pkg.name} ${exportKey} runtime target is missing after build: ${runtimeTarget}`,
          ).toBe(true);

          if (typesTarget) {
            expect(
              existsSync(join(packageRoot, typesTarget)),
              `${pkg.name} ${exportKey} types target is missing after build: ${typesTarget}`,
            ).toBe(true);
          }

          await import(pathToFileURL(runtimePath).href);
        }
      }
    },
    60_000,
  );

  it.each(packages)(
    "keeps $name production imports framework and provider neutral",
    (pkg) => {
      const packageRoot = join(repositoryRoot, "packages", pkg.directory);
      const manifest = readJson<PackageManifest>(
        join(packageRoot, "package.json"),
      );
      const declaredProductionDependencies = new Set([
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.peerDependencies ?? {}),
      ]);
      expect(
        existsSync(packageRoot),
        `Destination package is missing: packages/${pkg.directory}`,
      ).toBe(true);

      for (const path of productionTypeScriptFiles(join(packageRoot, "src"))) {
        const source = readFileSync(path, "utf8");
        expect(source).not.toMatch(/\bprocess\.env\b|\bimport\.meta\.env\b/);

        for (const specifier of importSpecifiers(source, path)) {
          expect(
            forbiddenImport.test(specifier),
            `${relative(repositoryRoot, path)} imports forbidden module ${specifier}`,
          ).toBe(false);
          if (specifier.startsWith(".")) {
            expect(
              extname(specifier),
              `${relative(repositoryRoot, path)} must use a .js ESM import for ${specifier}`,
            ).toBe(".js");
          } else if (!specifier.startsWith("node:")) {
            const dependency = topLevelPackage(specifier);
            expect(
              declaredProductionDependencies.has(dependency),
              `${relative(repositoryRoot, path)} imports undeclared production dependency ${dependency}`,
            ).toBe(true);
          }
        }
      }
    },
  );
});
