import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { posix, resolve } from "node:path";
import { z } from "zod";
import { compareStableStrings } from "./stable-order.js";

const packageManifestSchema = z
  .object({
    name: z.string().min(1),
    exports: z
      .record(z.union([z.string().min(1), z.record(z.string().min(1))]))
      .optional(),
  })
  .passthrough();

/** Exact workspace import specifiers mapped to repository source files. */
export type WorkspaceModuleTargets = ReadonlyMap<string, string>;

/**
 * Tests whether an exact repository file exists.
 * @param path Absolute file path to inspect.
 * @returns True when the path is accessible.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Chooses the stable build target declared by one package export.
 * @param value String or condition map declared in package.json exports.
 * @returns Preferred types or import target, when statically declared.
 */
function exportTarget(
  value: string | Record<string, string>,
): string | undefined {
  if (typeof value === "string") return value;
  return value.types ?? value.import ?? value.default;
}

/**
 * Maps a package build export to its repository TypeScript source target.
 * @param packageDirectory Repository-relative package directory.
 * @param target Static package export target.
 * @returns Repository-relative source candidate or undefined.
 */
function sourceCandidate(
  packageDirectory: string,
  target: string,
): string | undefined {
  if (!target.startsWith("./")) return undefined;
  const relative = target.slice(2);
  const sourceRelative = relative.startsWith("dist/")
    ? `src/${relative.slice("dist/".length)}`
    : relative;
  const typescriptRelative = sourceRelative
    .replace(/\.d\.[cm]?ts$/, ".ts")
    .replace(/\.[cm]?js$/, ".ts");
  return posix.join(packageDirectory, typescriptRelative);
}

/**
 * Converts a package export key into its exact module specifier.
 * @param packageName Canonical workspace package name.
 * @param exportKey Exact package export key such as dot or dot-slash-schema.
 * @returns Exact import specifier, excluding wildcard export keys.
 */
function exportSpecifier(
  packageName: string,
  exportKey: string,
): string | undefined {
  if (exportKey === ".") return packageName;
  if (!exportKey.startsWith("./") || /[*?{}]/.test(exportKey)) {
    return undefined;
  }
  return `${packageName}/${exportKey.slice(2)}`;
}

/**
 * Loads exact workspace package exports as repository source-file targets.
 * @param repoRoot Repository root whose tracked package manifests are read.
 * @returns Exact import-specifier map suitable for baseline identities.
 * @throws When manifests are invalid or exact source resolutions collide.
 */
export async function loadWorkspaceModuleTargets(
  repoRoot: string,
): Promise<WorkspaceModuleTargets> {
  const stdout = execFileSync(
    "git",
    [
      "ls-files",
      "--",
      "packages/*/package.json",
      "packages/integrations/*/package.json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const manifestPaths = stdout
    .split("\n")
    .filter((path) => path.length > 0)
    .sort(compareStableStrings);
  const targets = new Map<string, string>();
  for (const manifestPath of manifestPaths) {
    const manifest = packageManifestSchema.parse(
      JSON.parse(await readFile(resolve(repoRoot, manifestPath), "utf8")),
    );
    const packageDirectory = posix.dirname(manifestPath);
    const exports = manifest.exports ?? { ".": "./dist/index.js" };
    for (const [exportKey, value] of Object.entries(exports).sort(
      ([left], [right]) => compareStableStrings(left, right),
    )) {
      const specifier = exportSpecifier(manifest.name, exportKey);
      const declaredTarget = exportTarget(value);
      const candidate =
        declaredTarget && sourceCandidate(packageDirectory, declaredTarget);
      if (!specifier || !candidate) continue;
      if (!(await fileExists(resolve(repoRoot, candidate)))) {
        continue;
      }
      const existing = targets.get(specifier);
      if (existing && existing !== candidate) {
        throw new Error(
          `Workspace export ${specifier} resolves to both ${existing} and ${candidate}`,
        );
      }
      targets.set(specifier, candidate);
    }
  }
  return new Map(
    [...targets].sort(([left], [right]) => compareStableStrings(left, right)),
  );
}
