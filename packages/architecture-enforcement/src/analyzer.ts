import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { z } from "zod";
import {
  architectureConfigSchema,
  architectureFindingSchema,
  findingKindSchema,
  type ArchitectureConfig,
  type ArchitectureFinding,
  type ArchitectureRule,
} from "./contracts.js";
import { createFindingIdentity } from "./finding-identity.js";
import { evaluateOwnership } from "./ownership-map.js";
import { compareStableStrings } from "./stable-order.js";
import {
  loadWorkspaceModuleTargets,
  type WorkspaceModuleTargets,
} from "./workspace-resolution.js";

const sourcePathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (path) =>
      !isAbsolute(path) &&
      !path.includes("\\") &&
      !path.includes("//") &&
      path.split("/").every((segment) => segment !== "." && segment !== ".."),
    "must be an exact repository-relative source path",
  );

/** Import-like syntax kinds resolved by the Phase 3 architecture loader. */
export type ImportEvidenceKind = Extract<
  z.infer<typeof findingKindSchema>,
  | "static-import"
  | "namespace-import"
  | "dynamic-import"
  | "commonjs-require"
  | "re-export"
>;

/** One secret-safe resolved import or re-export syntax fact. */
export interface ArchitectureImportEvidence {
  /** Version of the resolved evidence contract. */
  schemaVersion: 1;
  /** Exact logical source path relative to the analyzer repository root. */
  sourcePath: string;
  /** One-based source line containing the syntax evidence. */
  line: number;
  /** One-based source column containing the syntax evidence. */
  column: number;
  /** Import, re-export, require, or static dynamic-import syntax kind. */
  evidenceKind: ImportEvidenceKind;
  /** Literal module specifier from the syntax node. */
  importSpecifier: string;
  /** Exact repository source file or external module identity. */
  resolvedTarget: string;
}

/** Fail-closed source loading, parsing, or module-resolution diagnostic. */
export interface ArchitectureAnalyzerError {
  /** Version of the analyzer error contract. */
  schemaVersion: 1;
  /** Exact source or resolver-config path associated with the error. */
  sourcePath: string;
  /** One-based diagnostic line. */
  line: number;
  /** One-based diagnostic column. */
  column: number;
  /** Stable machine-readable analyzer error category. */
  code:
    | "FILE_READ_ERROR"
    | "TYPESCRIPT_PARSE_ERROR"
    | "RESOLVER_CONFIG_ERROR"
    | "MODULE_RESOLUTION_ERROR"
    | "WORKSPACE_RESOLUTION_ERROR";
}

/** Deterministic import-resolution result for an exact source set. */
export interface ArchitectureSourceLoadResult {
  /** Version of the source-load result contract. */
  schemaVersion: 1;
  /** Exact source paths considered in canonical order. */
  sourcePaths: string[];
  /** Canonically sorted resolved import and re-export facts. */
  evidence: ArchitectureImportEvidence[];
  /** Canonically sorted fail-closed diagnostics. */
  parseErrors: ArchitectureAnalyzerError[];
}

/** Options for loading and resolving an exact architecture source set. */
export interface LoadArchitectureSourcesOptions {
  /** Repository or isolated fixture root containing the logical source paths. */
  repoRoot: string;
  /** Exact logical TypeScript or JavaScript source paths to parse. */
  sourcePaths: readonly string[];
  /** Optional exact tsconfig path relative to repoRoot for path aliases. */
  resolverConfigPath?: string;
  /** Optional preloaded workspace export map for deterministic isolated tests. */
  workspaceTargets?: WorkspaceModuleTargets;
  /** Uses only tracked source and configuration bytes in an immutable projection. */
  trackedSourceOnly?: boolean;
}

/** Options for policy-driven architecture source analysis. */
export interface AnalyzeArchitectureSourcesOptions extends LoadArchitectureSourcesOptions {
  /** Strict ownership map used to select and authorize evidence. */
  config: ArchitectureConfig;
  /** Policy behavior used for compatibility or current analysis. */
  policyVersion?: "v1" | "v2";
}

/** Deterministic policy findings plus fail-closed analyzer diagnostics. */
export interface ArchitectureAnalysisResult {
  /** Version of the analysis result contract. */
  schemaVersion: 1;
  /** Exact source paths considered in canonical order. */
  sourcePaths: string[];
  /** Canonically sorted, validated, secret-safe architecture violations. */
  findings: ArchitectureFinding[];
  /** Canonically sorted fail-closed diagnostics. */
  parseErrors: ArchitectureAnalyzerError[];
}

interface ResolverConfiguration {
  baseDirectory: string;
  paths: Array<{
    pattern: string;
    targets: string[];
    baseDirectory: string;
  }>;
}

interface TrackedResolverConfig {
  extends?: unknown;
  compilerOptions?: {
    baseUrl?: unknown;
    paths?: unknown;
  };
}

type ResolverConfigurationResult =
  | { configuration?: ResolverConfiguration; error?: never }
  | { configuration?: never; error: ArchitectureAnalyzerError };

interface ArchitectureSourceLoadDetails extends ArchitectureSourceLoadResult {
  sourceFiles: ReadonlyMap<string, ts.SourceFile>;
  evidenceNodes: ReadonlyMap<string, ts.Node>;
  environmentNodes: readonly {
    sourcePath: string;
    node: ts.Node;
    resource: string;
  }[];
  executableNodesBySource: ReadonlyMap<
    string,
    readonly (ts.CallExpression | ts.NewExpression)[]
  >;
}

interface ResolvedModule {
  target: string;
  failed: boolean;
}

/**
 * Normalizes operating-system separators to canonical repository separators.
 * @param path Candidate path emitted by Node path utilities.
 * @returns POSIX-style path stable across supported operating systems.
 */
function toPosixPath(path: string): string {
  return sep === "/" ? path : path.split(sep).join("/");
}

/**
 * Tests whether one exact file path is accessible.
 * @param path Absolute file path to inspect.
 * @returns True when the file can be accessed.
 */
async function fileExists(
  path: string,
  cache?: Map<string, Promise<boolean>>,
): Promise<boolean> {
  const cached = cache?.get(path);
  if (cached) return cached;
  const pending = (async () => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  })();
  cache?.set(path, pending);
  return pending;
}

/**
 * Produces TypeScript and JavaScript candidates for an extensionless module path.
 * @param path Absolute base module path.
 * @returns Candidate file paths in deterministic resolver order.
 */
function moduleFileCandidates(path: string): string[] {
  if (path.endsWith(".mjs")) return [`${path.slice(0, -4)}.mts`, path];
  if (path.endsWith(".cjs")) return [`${path.slice(0, -4)}.cts`, path];
  if (path.endsWith(".jsx")) {
    return [`${path.slice(0, -4)}.tsx`, `${path.slice(0, -4)}.ts`, path];
  }
  if (path.endsWith(".js")) {
    return [`${path.slice(0, -3)}.ts`, `${path.slice(0, -3)}.tsx`, path];
  }
  if (/\.[cm]?tsx?$/.test(path) || /\.[^/]+$/.test(path)) return [path];
  return [
    path,
    `${path}.ts`,
    `${path}.tsx`,
    `${path}.mts`,
    `${path}.cts`,
    `${path}.d.ts`,
    `${path}.js`,
    `${path}.jsx`,
    resolve(path, "index.mts"),
    resolve(path, "index.cts"),
    resolve(path, "index.ts"),
    resolve(path, "index.tsx"),
    resolve(path, "index.js"),
  ];
}

/**
 * Resolves the first accessible file candidate to a logical repository path.
 * @param repoRoot Absolute repository root used for logical path projection.
 * @param absoluteBase Absolute extensionless or exact file candidate.
 * @returns Exact repository-relative source file or undefined.
 */
async function resolveSourceCandidate(
  repoRoot: string,
  absoluteBase: string,
  fileExistenceCache?: Map<string, Promise<boolean>>,
  candidateCache?: Map<string, Promise<string | undefined>>,
  trackedSourceOnly = false,
): Promise<string | undefined> {
  const cached = candidateCache?.get(absoluteBase);
  if (cached) return cached;
  const pending = (async () => {
    if (
      trackedSourceOnly &&
      !isSafeProjectedSourcePath(repoRoot, absoluteBase)
    ) {
      return undefined;
    }
    for (const candidate of moduleFileCandidates(absoluteBase)) {
      if (await fileExists(candidate, fileExistenceCache)) {
        return toPosixPath(relative(repoRoot, candidate));
      }
    }
    return undefined;
  })();
  candidateCache?.set(absoluteBase, pending);
  return pending;
}

/**
 * Resolves a package-local emitted JavaScript import back to its TypeScript source.
 * @param repoRoot Absolute repository root used for safe package projection.
 * @param sourcePath Repository-relative source containing the emitted-code import.
 * @param resolutionSpecifier Relative module specifier with query fragments removed.
 * @param fileExistenceCache Shared exact-path existence cache.
 * @param candidateCache Shared source-candidate resolution cache.
 * @returns Exact source target when the import stays in one package, otherwise undefined.
 */
async function resolvePackageBuildSource(
  repoRoot: string,
  sourcePath: string,
  resolutionSpecifier: string,
  fileExistenceCache: Map<string, Promise<boolean>>,
  candidateCache: Map<string, Promise<string | undefined>>,
  trackedSourceOnly = false,
): Promise<string | undefined> {
  const emittedTarget = toPosixPath(
    relative(
      repoRoot,
      resolve(repoRoot, dirname(sourcePath), resolutionSpecifier),
    ),
  );
  return resolvePackageBuildTarget(
    repoRoot,
    sourcePath,
    emittedTarget,
    fileExistenceCache,
    candidateCache,
    trackedSourceOnly,
  );
}

/** Resolves one emitted package target to an exact tracked package source. */
async function resolvePackageBuildTarget(
  repoRoot: string,
  sourcePath: string,
  emittedTarget: string,
  fileExistenceCache: Map<string, Promise<boolean>>,
  candidateCache: Map<string, Promise<string | undefined>>,
  trackedSourceOnly: boolean,
): Promise<string | undefined> {
  const sourceSegments = sourcePath.split("/");
  const packageRoot =
    sourceSegments[0] === "packages" && sourceSegments.length >= 3
      ? sourceSegments.slice(0, 2).join("/")
      : undefined;
  const emittedMatch = /^packages\/([^/]+)\/dist\/(.+)$/.exec(emittedTarget);
  if (
    !emittedMatch ||
    (!trackedSourceOnly &&
      (!packageRoot || !emittedTarget.startsWith(`${packageRoot}/dist/`)))
  ) {
    return undefined;
  }
  const sourceRelative = emittedMatch[2]
    .replace(/\.d\.[cm]?ts$/, ".ts")
    .replace(/\.[cm]?js$/, ".ts");
  const sourceTarget = `packages/${emittedMatch[1]}/src/${sourceRelative}`;
  const sourceTargetResult = await resolveSourceCandidate(
    repoRoot,
    resolve(repoRoot, sourceTarget),
    fileExistenceCache,
    candidateCache,
    trackedSourceOnly,
  );
  if (!sourceTargetResult) return undefined;
  return trackedSourceOnly ? emittedTarget : sourceTargetResult;
}

/**
 * Recognizes the exact generated route-type import emitted by Next.js.
 * @param sourcePath Repository-relative source containing the import.
 * @param resolutionSpecifier Relative module specifier with fragments removed.
 * @returns Stable logical generated target, or undefined for every other import.
 */
function nextGeneratedRouteTypeTarget(
  sourcePath: string,
  resolutionSpecifier: string,
): string | undefined {
  if (
    !sourcePath.endsWith("/next-env.d.ts") ||
    !/^\.\/\.next\/(?:dev\/)?types\/routes\.d\.ts$/.test(resolutionSpecifier)
  ) {
    return undefined;
  }
  return toPosixPath(join(dirname(sourcePath), resolutionSpecifier));
}

/**
 * Parses an optional tsconfig into deterministic baseUrl and path mappings.
 * @param repoRoot Absolute repository or fixture root.
 * @param configPath Exact resolver-config path relative to repoRoot.
 * @returns Resolver configuration or a fail-closed config diagnostic.
 */
async function loadLegacyResolverConfiguration(
  repoRoot: string,
  configPath: string | undefined,
): Promise<ResolverConfigurationResult> {
  if (!configPath) return {};
  const validatedPath = sourcePathSchema.parse(configPath);
  try {
    const absoluteConfigPath = resolve(repoRoot, validatedPath);
    const source = await readFile(absoluteConfigPath, "utf8");
    const syntax = ts.parseConfigFileTextToJson(validatedPath, source);
    if (syntax.error || !syntax.config || typeof syntax.config !== "object") {
      throw new Error("invalid resolver config");
    }
    const parsed = ts.parseJsonConfigFileContent(
      syntax.config,
      {
        useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
        readDirectory: () => [],
      },
      dirname(absoluteConfigPath),
      {},
      absoluteConfigPath,
    );
    if (
      parsed.errors.some(
        (diagnostic) =>
          diagnostic.category === ts.DiagnosticCategory.Error &&
          diagnostic.code !== 18003,
      )
    ) {
      throw new Error("invalid resolver config");
    }
    const rawPaths = parsed.options.paths ?? {};
    const baseDirectory = parsed.options.baseUrl ?? dirname(absoluteConfigPath);
    const paths = Object.entries(rawPaths)
      .map(([pattern, targets]) => ({
        pattern,
        targets: [...targets],
        baseDirectory,
      }))
      .filter((entry) => entry.targets.length > 0)
      .sort((left, right) => compareStableStrings(left.pattern, right.pattern));
    return {
      configuration: {
        baseDirectory,
        paths,
      },
    };
  } catch {
    return {
      error: {
        schemaVersion: 1,
        sourcePath: validatedPath,
        line: 1,
        column: 1,
        code: "RESOLVER_CONFIG_ERROR",
      },
    };
  }
}

/** Tests whether one resolver path stays inside tracked source configuration. */
function isSafeTrackedResolverPath(path: string): boolean {
  const parsed = sourcePathSchema.safeParse(path);
  if (!parsed.success) return false;
  return !parsed.data
    .split("/")
    .some(
      (segment) =>
        segment === "node_modules" || segment === ".next" || segment === "dist",
    );
}

/** Tests whether one projected path belongs to an ignored generated directory. */
function isIgnoredProjectedPath(path: string): boolean {
  return path
    .split("/")
    .some(
      (segment) =>
        segment === "node_modules" || segment === ".next" || segment === "dist",
    );
}

/** Tests whether a projected source candidate stays inside tracked repository bytes. */
function isSafeProjectedSourcePath(
  repoRoot: string,
  absolutePath: string,
): boolean {
  const path = toPosixPath(relative(repoRoot, absolutePath));
  return (
    path.length > 0 &&
    !path.startsWith("../") &&
    path !== ".." &&
    !isIgnoredProjectedPath(path)
  );
}

/** Tests whether an explicit resolution target names an external node_modules path. */
function isExternalNodeModulesPath(absolutePath: string): boolean {
  return toPosixPath(absolutePath).split("/").includes("node_modules");
}

/** Converts one absolute path into a safe tracked repository path. */
function trackedResolverPath(
  repoRoot: string,
  absolutePath: string,
): string | undefined {
  const path = toPosixPath(relative(repoRoot, absolutePath));
  return isSafeTrackedResolverPath(path) ? path : undefined;
}

/** Resolves one tracked tsconfig extends value without consulting node_modules. */
async function resolveTrackedExtendsPath(
  repoRoot: string,
  configPath: string,
  extendsValue: unknown,
): Promise<string> {
  if (typeof extendsValue !== "string" || extendsValue.length === 0) {
    throw new Error("invalid tracked tsconfig extends value");
  }
  if (extendsValue.startsWith(".")) {
    const candidate = extendsValue.endsWith(".json")
      ? extendsValue
      : `${extendsValue}.json`;
    const resolved = trackedResolverPath(
      repoRoot,
      resolve(repoRoot, dirname(configPath), candidate),
    );
    if (!resolved) throw new Error("unsafe tracked tsconfig extends path");
    return resolved;
  }
  const packageManifestPath = "packages/config/package.json";
  if (extendsValue !== "@reading-advantage/config/tsconfig") {
    throw new Error("unresolved tracked package tsconfig extends value");
  }
  const packageManifest = JSON.parse(
    await readFile(resolve(repoRoot, packageManifestPath), "utf8"),
  ) as {
    name?: unknown;
    exports?: Record<string, unknown>;
  };
  if (packageManifest.name !== "@reading-advantage/config") {
    throw new Error("tracked config package name is invalid");
  }
  const target = packageManifest.exports?.["./tsconfig"];
  if (typeof target !== "string" || !target.startsWith("./")) {
    throw new Error("tracked config package tsconfig export is invalid");
  }
  const resolved = trackedResolverPath(
    repoRoot,
    resolve(repoRoot, "packages/config", target),
  );
  if (!resolved)
    throw new Error("unsafe tracked config package tsconfig export");
  return resolved;
}

/** Loads one tracked tsconfig chain and merges resolver options deterministically. */
async function loadTrackedResolverConfigurationChain(
  repoRoot: string,
  configPath: string,
  activePaths: ReadonlySet<string>,
): Promise<ResolverConfiguration> {
  if (!isSafeTrackedResolverPath(configPath) || activePaths.has(configPath)) {
    throw new Error("unsafe or cyclic tracked tsconfig chain");
  }
  const source = await readFile(resolve(repoRoot, configPath), "utf8");
  const syntax = ts.parseConfigFileTextToJson(configPath, source);
  if (syntax.error || !syntax.config || typeof syntax.config !== "object") {
    throw new Error("invalid tracked resolver config");
  }
  const config = syntax.config as TrackedResolverConfig;
  const nextActivePaths = new Set(activePaths).add(configPath);
  const parent =
    config.extends === undefined
      ? undefined
      : await loadTrackedResolverConfigurationChain(
          repoRoot,
          await resolveTrackedExtendsPath(repoRoot, configPath, config.extends),
          nextActivePaths,
        );
  const configDirectory = dirname(resolve(repoRoot, configPath));
  const compilerOptions = config.compilerOptions;
  if (compilerOptions !== undefined && typeof compilerOptions !== "object") {
    throw new Error("invalid tracked resolver compiler options");
  }
  let baseDirectory = parent?.baseDirectory ?? configDirectory;
  if (
    compilerOptions &&
    Object.prototype.hasOwnProperty.call(compilerOptions, "baseUrl")
  ) {
    if (typeof compilerOptions.baseUrl !== "string") {
      throw new Error("invalid tracked resolver baseUrl");
    }
    const resolvedBaseDirectory = resolve(
      configDirectory,
      compilerOptions.baseUrl,
    );
    if (!trackedResolverPath(repoRoot, resolvedBaseDirectory)) {
      throw new Error("unsafe tracked resolver baseUrl");
    }
    baseDirectory = resolvedBaseDirectory;
  }
  let paths = parent?.paths ?? [];
  if (
    compilerOptions &&
    Object.prototype.hasOwnProperty.call(compilerOptions, "paths")
  ) {
    if (
      compilerOptions.paths === null ||
      typeof compilerOptions.paths !== "object" ||
      Array.isArray(compilerOptions.paths)
    ) {
      throw new Error("invalid tracked resolver paths");
    }
    const pathsBaseDirectory = Object.prototype.hasOwnProperty.call(
      compilerOptions,
      "baseUrl",
    )
      ? baseDirectory
      : configDirectory;
    paths = Object.entries(compilerOptions.paths as Record<string, unknown>)
      .map(([pattern, targets]) => {
        if (
          !Array.isArray(targets) ||
          targets.length === 0 ||
          targets.some((target) => typeof target !== "string")
        ) {
          throw new Error("invalid tracked resolver path targets");
        }
        return {
          pattern,
          targets: targets as string[],
          baseDirectory: pathsBaseDirectory,
        };
      })
      .sort((left, right) => compareStableStrings(left.pattern, right.pattern));
  }
  return { baseDirectory, paths };
}

/** Loads resolver settings from tracked bytes and returns a fail-closed diagnostic. */
async function loadTrackedResolverConfiguration(
  repoRoot: string,
  configPath: string | undefined,
): Promise<ResolverConfigurationResult> {
  if (!configPath) return {};
  const validatedPath = sourcePathSchema.parse(configPath);
  try {
    return {
      configuration: await loadTrackedResolverConfigurationChain(
        repoRoot,
        validatedPath,
        new Set(),
      ),
    };
  } catch {
    return {
      error: {
        schemaVersion: 1,
        sourcePath: validatedPath,
        line: 1,
        column: 1,
        code: "RESOLVER_CONFIG_ERROR",
      },
    };
  }
}

/** Loads resolver settings using either tracked projection bytes or normal filesystem rules. */
async function loadResolverConfiguration(
  repoRoot: string,
  configPath: string | undefined,
  trackedSourceOnly = false,
): Promise<ResolverConfigurationResult> {
  return trackedSourceOnly
    ? loadTrackedResolverConfiguration(repoRoot, configPath)
    : loadLegacyResolverConfiguration(repoRoot, configPath);
}

/** Returns whether an unresolved internal specifier denotes executable source. */
function requiresInternalCodeResolution(specifier: string): boolean {
  const path = specifier.split(/[?#]/, 1)[0] ?? specifier;
  const fileName = path.slice(path.lastIndexOf("/") + 1);
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return true;
  return /\.[cm]?[jt]sx?$/.test(fileName.slice(dot));
}

/** Finds the nearest tsconfig at or above one source directory. */
async function nearestResolverConfiguration(
  repoRoot: string,
  sourcePath: string,
  fileExistenceCache: Map<string, Promise<boolean>>,
  nearestConfigCache: Map<string, Promise<string | undefined>>,
  resolverConfigCache: Map<string, Promise<ResolverConfigurationResult>>,
  trackedSourceOnly = false,
): Promise<ResolverConfigurationResult> {
  const sourceDirectory = dirname(sourcePath);
  let nearest = nearestConfigCache.get(sourceDirectory);
  if (!nearest) {
    nearest = (async () => {
      let directory = sourceDirectory;
      while (true) {
        const configPath =
          directory === "." ? "tsconfig.json" : `${directory}/tsconfig.json`;
        if (
          await fileExists(resolve(repoRoot, configPath), fileExistenceCache)
        ) {
          return configPath;
        }
        const parent = dirname(directory);
        if (parent === directory || directory === ".") return undefined;
        directory = parent;
      }
    })();
    nearestConfigCache.set(sourceDirectory, nearest);
  }
  const configPath = await nearest;
  if (!configPath) return {};
  let loaded = resolverConfigCache.get(configPath);
  if (!loaded) {
    loaded = loadResolverConfiguration(repoRoot, configPath, trackedSourceOnly);
    resolverConfigCache.set(configPath, loaded);
  }
  return loaded;
}

/**
 * Matches one tsconfig paths pattern and returns its star substitution.
 * @param pattern Exact or single-star tsconfig path pattern.
 * @param specifier Literal module specifier from source.
 * @returns Empty or captured substitution, or undefined when unmatched.
 */
function pathPatternSubstitution(
  pattern: string,
  specifier: string,
): string | undefined {
  const starIndex = pattern.indexOf("*");
  if (starIndex < 0) return pattern === specifier ? "" : undefined;
  if (pattern.indexOf("*", starIndex + 1) >= 0) return undefined;
  const prefix = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);
  return specifier.startsWith(prefix) && specifier.endsWith(suffix)
    ? specifier.slice(prefix.length, specifier.length - suffix.length)
    : undefined;
}

/**
 * Resolves one import specifier through relative, tsconfig, workspace, or external rules.
 * @param repoRoot Absolute repository root.
 * @param sourcePath Logical source containing the import.
 * @param specifier Literal module specifier.
 * @param resolver Optional parsed tsconfig path configuration.
 * @param workspaceTargets Exact workspace export targets.
 * @returns Stable resolved target and whether an internal resolution failed.
 */
async function resolveModule(
  repoRoot: string,
  sourcePath: string,
  specifier: string,
  resolver: ResolverConfiguration | undefined,
  workspaceTargets: WorkspaceModuleTargets,
  fileExistenceCache: Map<string, Promise<boolean>>,
  candidateCache: Map<string, Promise<string | undefined>>,
  trackedSourceOnly = false,
): Promise<ResolvedModule> {
  const resolutionSpecifier = specifier.replace(/[?#].*$/, "");
  if (resolutionSpecifier.startsWith(".")) {
    const absoluteTarget = resolve(
      repoRoot,
      dirname(sourcePath),
      resolutionSpecifier,
    );
    if (trackedSourceOnly && isExternalNodeModulesPath(absoluteTarget)) {
      return { target: `external:${specifier}`, failed: false };
    }
    const target = await resolveSourceCandidate(
      repoRoot,
      absoluteTarget,
      fileExistenceCache,
      candidateCache,
      trackedSourceOnly,
    );
    const generatedTypeTarget = nextGeneratedRouteTypeTarget(
      sourcePath,
      resolutionSpecifier,
    );
    const packageBuildSource = target
      ? undefined
      : await resolvePackageBuildSource(
          repoRoot,
          sourcePath,
          resolutionSpecifier,
          fileExistenceCache,
          candidateCache,
          trackedSourceOnly,
        );
    const resolvedTarget = target ?? generatedTypeTarget ?? packageBuildSource;
    return resolvedTarget
      ? { target: resolvedTarget, failed: false }
      : {
          target: `external:${specifier}`,
          failed: requiresInternalCodeResolution(specifier),
        };
  }
  for (const mapping of resolver?.paths ?? []) {
    const substitution = pathPatternSubstitution(
      mapping.pattern,
      resolutionSpecifier,
    );
    if (substitution === undefined) continue;
    for (const targetPattern of mapping.targets) {
      const absoluteTarget = resolve(
        mapping.baseDirectory,
        targetPattern.replaceAll("*", substitution),
      );
      if (trackedSourceOnly && isExternalNodeModulesPath(absoluteTarget)) {
        return { target: `external:${specifier}`, failed: false };
      }
      const target = await resolveSourceCandidate(
        repoRoot,
        absoluteTarget,
        fileExistenceCache,
        candidateCache,
        trackedSourceOnly,
      );
      if (target) return { target, failed: false };
      if (trackedSourceOnly) {
        const packageBuildSource = await resolvePackageBuildTarget(
          repoRoot,
          sourcePath,
          toPosixPath(relative(repoRoot, absoluteTarget)),
          fileExistenceCache,
          candidateCache,
          true,
        );
        if (packageBuildSource) {
          return { target: packageBuildSource, failed: false };
        }
      }
    }
    return {
      target: `external:${specifier}`,
      failed: requiresInternalCodeResolution(specifier),
    };
  }
  const workspaceTarget = workspaceTargets.get(resolutionSpecifier);
  return workspaceTarget
    ? { target: workspaceTarget, failed: false }
    : { target: `external:${specifier}`, failed: false };
}

/**
 * Returns the TypeScript parser mode for an exact source path.
 * @param path Logical TypeScript or JavaScript source path.
 * @returns TypeScript script kind matching the file extension.
 */
function scriptKindFor(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

/**
 * Returns a syntax node's stable one-based source location.
 * @param sourceFile Parsed TypeScript source file.
 * @param node Syntax node owning evidence.
 * @returns One-based line and column coordinates.
 */
function sourceLocation(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): { line: number; column: number } {
  const location = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return { line: location.line + 1, column: location.character + 1 };
}

/**
 * Reads the one literal module argument accepted by import or require calls.
 * @param node Candidate call expression.
 * @returns Literal module specifier or undefined for computed calls.
 */
function literalCallSpecifier(node: ts.CallExpression): string | undefined {
  const argument = node.arguments[0];
  return argument && ts.isStringLiteralLike(argument)
    ? argument.text
    : undefined;
}

/**
 * Compares resolved evidence by stable source and syntax identity.
 * @param left First resolved evidence fact.
 * @param right Second resolved evidence fact.
 * @returns Locale-independent canonical ordering result.
 */
function compareEvidence(
  left: ArchitectureImportEvidence,
  right: ArchitectureImportEvidence,
): number {
  return (
    compareStableStrings(left.sourcePath, right.sourcePath) ||
    left.line - right.line ||
    left.column - right.column ||
    compareStableStrings(left.evidenceKind, right.evidenceKind) ||
    compareStableStrings(left.importSpecifier, right.importSpecifier) ||
    compareStableStrings(left.resolvedTarget, right.resolvedTarget)
  );
}

/**
 * Loads and resolves exact TypeScript/JavaScript sources without running rule detection.
 * @param options Repository root, exact source set, and optional resolver configuration.
 * @returns Deterministic evidence plus fail-closed parser and resolver diagnostics.
 */
async function loadArchitectureSourceDetails(
  options: LoadArchitectureSourcesOptions,
): Promise<ArchitectureSourceLoadDetails> {
  const repoRoot = resolve(options.repoRoot);
  const sourcePaths = [
    ...new Set(options.sourcePaths.map((path) => sourcePathSchema.parse(path))),
  ].sort(compareStableStrings);
  const evidence: ArchitectureImportEvidence[] = [];
  const parseErrors: ArchitectureAnalyzerError[] = [];
  const sourceFiles = new Map<string, ts.SourceFile>();
  const evidenceNodes = new Map<string, ts.Node>();
  const environmentNodes: Array<{
    sourcePath: string;
    node: ts.Node;
    resource: string;
  }> = [];
  const executableNodesBySource = new Map<
    string,
    Array<ts.CallExpression | ts.NewExpression>
  >();
  const fileExistenceCache = new Map<string, Promise<boolean>>();
  const candidateCache = new Map<string, Promise<string | undefined>>();
  const nearestConfigCache = new Map<string, Promise<string | undefined>>();
  const resolverConfigCache = new Map<
    string,
    Promise<ResolverConfigurationResult>
  >();
  const explicitResolver = options.resolverConfigPath
    ? await loadResolverConfiguration(
        repoRoot,
        options.resolverConfigPath,
        options.trackedSourceOnly,
      )
    : undefined;
  if (explicitResolver?.error) parseErrors.push(explicitResolver.error);

  let workspaceTargets: WorkspaceModuleTargets =
    options.workspaceTargets ?? new Map();
  if (!options.workspaceTargets) {
    try {
      workspaceTargets = await loadWorkspaceModuleTargets(repoRoot);
    } catch {
      parseErrors.push({
        schemaVersion: 1,
        sourcePath: "package.json",
        line: 1,
        column: 1,
        code: "WORKSPACE_RESOLUTION_ERROR",
      });
    }
  }

  /** Reads, parses, and resolves one exact source without mutating shared order. */
  const processSource = async (sourcePath: string): Promise<void> => {
    const resolverResult =
      explicitResolver ??
      (await nearestResolverConfiguration(
        repoRoot,
        sourcePath,
        fileExistenceCache,
        nearestConfigCache,
        resolverConfigCache,
        options.trackedSourceOnly,
      ));
    if (resolverResult.error) parseErrors.push(resolverResult.error);
    let source: string;
    try {
      source = await readFile(resolve(repoRoot, sourcePath), "utf8");
    } catch {
      parseErrors.push({
        schemaVersion: 1,
        sourcePath,
        line: 1,
        column: 1,
        code: "FILE_READ_ERROR",
      });
      return;
    }
    const sourceFile = ts.createSourceFile(
      sourcePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(sourcePath),
    );
    const diagnostics = (
      sourceFile as ts.SourceFile & {
        parseDiagnostics: readonly ts.Diagnostic[];
      }
    ).parseDiagnostics;
    if (diagnostics.length > 0) {
      const start = diagnostics[0]?.start ?? 0;
      const location = sourceFile.getLineAndCharacterOfPosition(start);
      parseErrors.push({
        schemaVersion: 1,
        sourcePath,
        line: location.line + 1,
        column: location.character + 1,
        code: "TYPESCRIPT_PARSE_ERROR",
      });
      return;
    }
    sourceFiles.set(sourcePath, sourceFile);

    /** Resolves and records one import-like syntax fact. */
    const record = async (
      node: ts.Node,
      evidenceKind: ImportEvidenceKind,
      importSpecifier: string,
    ): Promise<void> => {
      const location = sourceLocation(sourceFile, node);
      const resolvedModule = await resolveModule(
        repoRoot,
        sourcePath,
        importSpecifier,
        resolverResult.configuration,
        workspaceTargets,
        fileExistenceCache,
        candidateCache,
        options.trackedSourceOnly,
      );
      const resolvedEvidence: ArchitectureImportEvidence = {
        schemaVersion: 1,
        sourcePath,
        ...location,
        evidenceKind,
        importSpecifier,
        resolvedTarget: resolvedModule.target,
      };
      evidence.push(resolvedEvidence);
      evidenceNodes.set(evidenceKey(resolvedEvidence), node);
      if (resolvedModule.failed) {
        parseErrors.push({
          schemaVersion: 1,
          sourcePath,
          ...location,
          code: "MODULE_RESOLUTION_ERROR",
        });
      }
    };

    const pending: Promise<void>[] = [];
    const executableNodes: Array<ts.CallExpression | ts.NewExpression> = [];
    /** Visits a syntax subtree and queues import-like evidence resolution. */
    const visit = (node: ts.Node): void => {
      const resource = environmentResource(node);
      if (resource) environmentNodes.push({ sourcePath, node, resource });
      if (ts.isNewExpression(node) || ts.isCallExpression(node)) {
        executableNodes.push(node);
      }
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        const namedBindings = node.importClause?.namedBindings;
        pending.push(
          record(
            node,
            namedBindings && ts.isNamespaceImport(namedBindings)
              ? "namespace-import"
              : "static-import",
            node.moduleSpecifier.text,
          ),
        );
      } else if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        pending.push(record(node, "re-export", node.moduleSpecifier.text));
      } else if (ts.isCallExpression(node)) {
        const specifier = literalCallSpecifier(node);
        if (specifier && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          pending.push(record(node, "dynamic-import", specifier));
        } else if (
          specifier &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require"
        ) {
          pending.push(record(node, "commonjs-require", specifier));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    if (executableNodes.length > 0) {
      executableNodesBySource.set(sourcePath, executableNodes);
    }
    await Promise.all(pending);
  };

  const concurrency = 64;
  for (let offset = 0; offset < sourcePaths.length; offset += concurrency) {
    await Promise.all(
      sourcePaths.slice(offset, offset + concurrency).map(processSource),
    );
  }

  const uniqueErrors = new Map<string, ArchitectureAnalyzerError>();
  for (const error of parseErrors) {
    uniqueErrors.set(
      [error.sourcePath, error.line, error.column, error.code].join("\0"),
      error,
    );
  }

  return {
    schemaVersion: 1,
    sourcePaths,
    evidence: evidence.sort(compareEvidence),
    parseErrors: [...uniqueErrors.values()].sort(
      (left, right) =>
        compareStableStrings(left.sourcePath, right.sourcePath) ||
        left.line - right.line ||
        left.column - right.column ||
        compareStableStrings(left.code, right.code),
    ),
    sourceFiles,
    evidenceNodes,
    environmentNodes,
    executableNodesBySource,
  };
}

/**
 * Loads and resolves exact TypeScript/JavaScript sources without running rule detection.
 * @param options Repository root, exact source set, and optional resolver configuration.
 * @returns Deterministic evidence plus fail-closed parser and resolver diagnostics.
 */
export async function loadArchitectureSources(
  options: LoadArchitectureSourcesOptions,
): Promise<ArchitectureSourceLoadResult> {
  const details = await loadArchitectureSourceDetails(options);
  return {
    schemaVersion: details.schemaVersion,
    sourcePaths: details.sourcePaths,
    evidence: details.evidence,
    parseErrors: details.parseErrors,
  };
}

interface RuleOrigin {
  ruleId: string;
  importSpecifier?: string;
  resource?: string;
  resolvedTarget: string;
}

interface ImportBinding {
  evidence: ArchitectureImportEvidence;
  node: ts.ImportDeclaration;
  localName?: string;
  importedName: string;
  inferredResource?: string;
}

interface ReexportBinding {
  evidence: ArchitectureImportEvidence;
  node: ts.ExportDeclaration;
  exportedName: string;
  importedName: string;
  inferredResource?: string;
}

interface LocalExportBinding {
  exportedName: string;
  localName: string;
}
interface ParsedArchitectureModule {
  sourcePath: string;
  sourceFile: ts.SourceFile;
  evidence: readonly ArchitectureImportEvidence[];
  imports: ImportBinding[];
  reexports: ReexportBinding[];
  localExports: LocalExportBinding[];
}

type TableExportsByModule = ReadonlyMap<string, ReadonlySet<string>>;

const QUERY_METHODS = new Set([
  "delete",
  "execute",
  "from",
  "insert",
  "query",
  "select",
  "unsafe",
  "update",
]);

/** Converts a TypeScript identifier into a stable PostgreSQL table name. */
function identifierToTableName(identifier: string): string {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/** Returns whether one exact or prefix policy matcher selects a value. */
function matchesPolicyValue(
  matcher: { kind: "exact" | "prefix"; value: string },
  value: string,
): boolean {
  return matcher.kind === "exact"
    ? matcher.value === value
    : value.startsWith(matcher.value);
}

/** Returns whether direct import evidence selects one rule. */
function directlySelectsImport(
  rule: ArchitectureRule,
  evidence: ArchitectureImportEvidence,
): boolean {
  return (
    rule.moduleMatchers.some((matcher) =>
      matchesPolicyValue(matcher, evidence.importSpecifier),
    ) ||
    (!evidence.resolvedTarget.startsWith("external:") &&
      rule.resolvedTargetRoots.some((root) =>
        evidence.resolvedTarget.startsWith(root),
      ))
  );
}

/** Returns whether one namespaced resource selects a rule. */
function directlySelectsResource(
  rule: ArchitectureRule,
  resource: string,
): boolean {
  return rule.resourceMatchers.some((matcher) =>
    matchesPolicyValue(matcher, resource),
  );
}

/** Infers an exact configured table resource from one named import. */
function configuredTableResource(
  config: ArchitectureConfig,
  importedName: string,
  tableExports?: ReadonlySet<string>,
): string | undefined {
  if (importedName === "*" || importedName === "default") return undefined;
  if (tableExports && !tableExports.has(importedName)) return undefined;
  const resource = `database-table:${identifierToTableName(importedName)}`;
  return config.rules.some(
    (rule) =>
      rule.domain === "database" && directlySelectsResource(rule, resource),
  )
    ? resource
    : undefined;
}

/** Builds a stable key for resolved import evidence. */
function evidenceKey(evidence: ArchitectureImportEvidence): string {
  return [
    evidence.sourcePath,
    evidence.line,
    evidence.column,
    evidence.evidenceKind,
    evidence.importSpecifier,
  ].join("\0");
}

/** Looks up loader evidence corresponding to one parsed syntax node. */
function resolvedEvidenceFor(
  sourceFile: ts.SourceFile,
  sourcePath: string,
  node: ts.Node,
  kind: ImportEvidenceKind,
  specifier: string,
  evidenceByKey: ReadonlyMap<string, ArchitectureImportEvidence>,
): ArchitectureImportEvidence | undefined {
  const location = sourceLocation(sourceFile, node);
  return evidenceByKey.get(
    [sourcePath, location.line, location.column, kind, specifier].join("\0"),
  );
}

/** Parses import, re-export, and local-export bindings for taint propagation. */
function parseArchitectureModule(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  evidenceByKey: ReadonlyMap<string, ArchitectureImportEvidence>,
  config: ArchitectureConfig,
  policyVersion?: "v1" | "v2",
  tableExportsByModule: TableExportsByModule = new Map(),
): ParsedArchitectureModule {
  const imports: ImportBinding[] = [];
  const reexports: ReexportBinding[] = [];
  const localExports: LocalExportBinding[] = [];
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      const namedBindings = statement.importClause?.namedBindings;
      const kind: ImportEvidenceKind =
        namedBindings && ts.isNamespaceImport(namedBindings)
          ? "namespace-import"
          : "static-import";
      const evidence = resolvedEvidenceFor(
        sourceFile,
        sourcePath,
        statement,
        kind,
        statement.moduleSpecifier.text,
        evidenceByKey,
      );
      if (!evidence) continue;
      const defaultName = statement.importClause?.name?.text;
      if (defaultName)
        imports.push({
          evidence,
          node: statement,
          localName: defaultName,
          importedName: "default",
        });
      if (namedBindings && ts.isNamespaceImport(namedBindings)) {
        imports.push({
          evidence,
          node: statement,
          localName: namedBindings.name.text,
          importedName: "*",
        });
      } else if (namedBindings) {
        for (const element of namedBindings.elements) {
          const importedName = element.propertyName?.text ?? element.name.text;
          const inferredResource =
            policyVersion !== "v2"
              ? configuredTableResource(config, importedName)
              : configuredTableResource(
                  config,
                  importedName,
                  tableExportsByModule.get(evidence.resolvedTarget) ??
                    new Set(),
                );
          imports.push({
            evidence,
            node: statement,
            localName: element.name.text,
            importedName,
            ...(inferredResource ? { inferredResource } : {}),
          });
        }
      }
      if (!statement.importClause)
        imports.push({ evidence, node: statement, importedName: "*" });
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      if (
        statement.moduleSpecifier &&
        ts.isStringLiteralLike(statement.moduleSpecifier)
      ) {
        const evidence = resolvedEvidenceFor(
          sourceFile,
          sourcePath,
          statement,
          "re-export",
          statement.moduleSpecifier.text,
          evidenceByKey,
        );
        if (!evidence) continue;
        if (
          statement.exportClause &&
          ts.isNamedExports(statement.exportClause)
        ) {
          for (const element of statement.exportClause.elements) {
            const importedName =
              element.propertyName?.text ?? element.name.text;
            const inferredResource =
              policyVersion !== "v2"
                ? configuredTableResource(config, importedName)
                : configuredTableResource(
                    config,
                    importedName,
                    tableExportsByModule.get(evidence.resolvedTarget) ??
                      new Set(),
                  );
            reexports.push({
              evidence,
              node: statement,
              exportedName: element.name.text,
              importedName,
              ...(inferredResource ? { inferredResource } : {}),
            });
          }
        } else
          reexports.push({
            evidence,
            node: statement,
            exportedName: "*",
            importedName: "*",
          });
      } else if (
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        for (const element of statement.exportClause.elements)
          localExports.push({
            exportedName: element.name.text,
            localName: element.propertyName?.text ?? element.name.text,
          });
      }
      continue;
    }
    if (
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          ts.isIdentifier(declaration.initializer)
        )
          localExports.push({
            exportedName: declaration.name.text,
            localName: declaration.initializer.text,
          });
      }
    }
  }
  return {
    sourcePath,
    sourceFile,
    evidence: [...evidenceByKey.values()].filter(
      (evidence) => evidence.sourcePath === sourcePath,
    ),
    imports,
    reexports,
    localExports,
  };
}

/** Adds one rule origin to a binding-origin map. */
function addOrigin(
  origins: Map<string, RuleOrigin>,
  origin: RuleOrigin,
): boolean {
  const identity = [
    origin.ruleId,
    origin.importSpecifier ?? "",
    origin.resource ?? "",
    origin.resolvedTarget,
  ].join("\0");
  if (origins.has(identity)) return false;
  origins.set(identity, origin);
  return true;
}

/** Returns binding-specific origins exported by an internal module. */
function targetExportOrigins(
  exportsByModule: ReadonlyMap<
    string,
    ReadonlyMap<string, ReadonlyMap<string, RuleOrigin>>
  >,
  target: string,
  importedName: string,
): RuleOrigin[] {
  const targetExports = exportsByModule.get(target);
  if (!targetExports) return [];
  const selected = new Map<string, RuleOrigin>();
  const collect = (
    origins: ReadonlyMap<string, RuleOrigin> | undefined,
  ): void => {
    for (const origin of origins?.values() ?? []) addOrigin(selected, origin);
  };
  collect(targetExports.get("*"));
  if (importedName === "*") {
    for (const origins of targetExports.values()) collect(origins);
  } else {
    collect(targetExports.get(importedName));
  }
  return [...selected.values()];
}

/** Derives direct module, root, and resource origins for one binding. */
function directBindingOrigins(
  binding: ImportBinding | ReexportBinding,
  rules: readonly ArchitectureRule[],
): RuleOrigin[] {
  const origins: RuleOrigin[] = [];
  for (const rule of rules) {
    if (!rule.findingKinds.includes(binding.evidence.evidenceKind)) continue;
    if (directlySelectsImport(rule, binding.evidence)) {
      origins.push({
        ruleId: rule.id,
        importSpecifier: binding.evidence.importSpecifier,
        resolvedTarget: binding.evidence.resolvedTarget,
      });
    }
    if (
      binding.inferredResource &&
      directlySelectsResource(rule, binding.inferredResource)
    ) {
      origins.push({
        ruleId: rule.id,
        resource: binding.inferredResource,
        resolvedTarget: "external:database-table",
      });
    }
  }
  return origins;
}

/** Computes local and exported policy origins to a binding-aware fixed point. */
function computeBindingOrigins(
  modules: readonly ParsedArchitectureModule[],
  config: ArchitectureConfig,
): {
  localsByModule: Map<string, Map<string, Map<string, RuleOrigin>>>;
  exportsByModule: Map<string, Map<string, Map<string, RuleOrigin>>>;
} {
  const localsByModule = new Map<
    string,
    Map<string, Map<string, RuleOrigin>>
  >();
  const exportsByModule = new Map<
    string,
    Map<string, Map<string, RuleOrigin>>
  >();
  for (const module of modules) {
    localsByModule.set(module.sourcePath, new Map());
    exportsByModule.set(module.sourcePath, new Map());
  }

  const edges = new Map<
    Map<string, RuleOrigin>,
    Set<Map<string, RuleOrigin>>
  >();
  const connect = (
    source: Map<string, RuleOrigin> | undefined,
    target: Map<string, RuleOrigin>,
  ): void => {
    if (!source || source === target) return;
    const targets = edges.get(source) ?? new Set<Map<string, RuleOrigin>>();
    targets.add(target);
    edges.set(source, targets);
  };
  const exportSources = (
    target: string,
    importedName: string,
  ): Map<string, RuleOrigin>[] => {
    const targetExports = exportsByModule.get(target);
    if (!targetExports) return [];
    const sources = new Set<Map<string, RuleOrigin>>();
    const wildcard = targetExports.get("*");
    if (wildcard) sources.add(wildcard);
    if (importedName === "*") {
      for (const origins of targetExports.values()) sources.add(origins);
    } else {
      const named = targetExports.get(importedName);
      if (named) sources.add(named);
    }
    return [...sources];
  };

  for (const module of modules) {
    const locals = localsByModule.get(module.sourcePath)!;
    const exports = exportsByModule.get(module.sourcePath)!;
    for (const binding of module.imports) {
      if (!binding.localName) continue;
      const origins = locals.get(binding.localName) ?? new Map();
      locals.set(binding.localName, origins);
      for (const origin of directBindingOrigins(binding, config.rules)) {
        addOrigin(origins, origin);
      }
    }
    for (const binding of module.reexports) {
      const origins = exports.get(binding.exportedName) ?? new Map();
      exports.set(binding.exportedName, origins);
      for (const origin of directBindingOrigins(binding, config.rules)) {
        if (
          binding.evidence.resolvedTarget.startsWith("external:") ||
          origin.resource
        ) {
          addOrigin(origins, origin);
        }
      }
    }
    for (const binding of module.localExports) {
      if (!locals.has(binding.localName)) {
        locals.set(binding.localName, new Map());
      }
      if (!exports.has(binding.exportedName)) {
        exports.set(binding.exportedName, new Map());
      }
    }
  }

  let exportNamesChanged = true;
  while (exportNamesChanged) {
    exportNamesChanged = false;
    for (const module of modules) {
      const exports = exportsByModule.get(module.sourcePath)!;
      for (const binding of module.reexports) {
        if (
          binding.exportedName !== "*" ||
          binding.evidence.resolvedTarget.startsWith("external:")
        ) {
          continue;
        }
        const targetExports = exportsByModule.get(
          binding.evidence.resolvedTarget,
        );
        for (const exportName of targetExports?.keys() ?? []) {
          if (!exports.has(exportName)) {
            exports.set(exportName, new Map());
            exportNamesChanged = true;
          }
        }
      }
    }
  }

  for (const module of modules) {
    const locals = localsByModule.get(module.sourcePath)!;
    const exports = exportsByModule.get(module.sourcePath)!;
    for (const binding of module.imports) {
      if (
        !binding.localName ||
        binding.evidence.resolvedTarget.startsWith("external:")
      ) {
        continue;
      }
      const target = locals.get(binding.localName)!;
      for (const source of exportSources(
        binding.evidence.resolvedTarget,
        binding.importedName,
      )) {
        connect(source, target);
      }
    }
    for (const binding of module.reexports) {
      if (binding.evidence.resolvedTarget.startsWith("external:")) continue;
      if (binding.exportedName === "*") {
        const targetExports = exportsByModule.get(
          binding.evidence.resolvedTarget,
        );
        for (const [exportName, source] of targetExports ?? []) {
          connect(source, exports.get(exportName)!);
        }
        continue;
      }
      const target = exports.get(binding.exportedName)!;
      for (const source of exportSources(
        binding.evidence.resolvedTarget,
        binding.importedName,
      )) {
        connect(source, target);
      }
    }
    for (const binding of module.localExports) {
      connect(
        locals.get(binding.localName),
        exports.get(binding.exportedName)!,
      );
    }
  }

  const allOriginMaps = new Set<Map<string, RuleOrigin>>();
  for (const bindings of [
    ...localsByModule.values(),
    ...exportsByModule.values(),
  ]) {
    for (const origins of bindings.values()) allOriginMaps.add(origins);
  }
  const queue = [...allOriginMaps].filter((origins) => origins.size > 0);
  const queued = new Set(queue);
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const source = queue[queueIndex++]!;
    queued.delete(source);
    for (const target of edges.get(source) ?? []) {
      let changed = false;
      for (const origin of source.values()) {
        changed = addOrigin(target, origin) || changed;
      }
      if (changed && !queued.has(target)) {
        queue.push(target);
        queued.add(target);
      }
    }
  }

  for (const bindings of [
    ...localsByModule.values(),
    ...exportsByModule.values(),
  ]) {
    for (const [name, origins] of bindings) {
      if (origins.size === 0) bindings.delete(name);
    }
  }
  return { localsByModule, exportsByModule };
}

/** Returns the left-most identifier owning a call or property chain. */
function rootIdentifier(expression: ts.Expression): ts.Identifier | undefined {
  if (ts.isIdentifier(expression)) return expression;
  if (
    ts.isPropertyAccessExpression(expression) ||
    ts.isElementAccessExpression(expression)
  ) {
    return rootIdentifier(expression.expression);
  }
  if (ts.isCallExpression(expression) || ts.isNewExpression(expression)) {
    return rootIdentifier(expression.expression);
  }
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isAwaitExpression(expression)
  ) {
    return rootIdentifier(expression.expression);
  }
  return undefined;
}

/** Removes transparent expression wrappers before policy inspection. */
function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isAwaitExpression(expression)
  ) {
    return unwrapExpression(expression.expression);
  }
  return expression;
}

/** Returns the local names bound to Drizzle's PostgreSQL table factory. */
function drizzleTableFactoryBindings(sourceFile: ts.SourceFile): {
  direct: ReadonlySet<string>;
  namespaces: ReadonlySet<string>;
} {
  const direct = new Set<string>();
  const namespaces = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== "drizzle-orm/pg-core"
    ) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings) continue;
    if (ts.isNamespaceImport(namedBindings)) {
      namespaces.add(namedBindings.name.text);
      continue;
    }
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === "pgTable") direct.add(element.name.text);
    }
  }
  return { direct, namespaces };
}

/** Returns whether one initializer calls a bound Drizzle PostgreSQL table factory. */
function isDrizzleTableInitializer(
  initializer: ts.Expression,
  factories: {
    direct: ReadonlySet<string>;
    namespaces: ReadonlySet<string>;
  },
): boolean {
  const expression = unwrapExpression(initializer);
  if (!ts.isCallExpression(expression)) return false;
  if (
    ts.isIdentifier(expression.expression) &&
    factories.direct.has(expression.expression.text)
  ) {
    return true;
  }
  return (
    ts.isPropertyAccessExpression(expression.expression) &&
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.name.text === "pgTable" &&
    factories.namespaces.has(expression.expression.expression.text)
  );
}

/** Returns exported names whose declarations call Drizzle's PostgreSQL table factory. */
function directDrizzleTableExports(sourceFile: ts.SourceFile): Set<string> {
  const factories = drizzleTableFactoryBindings(sourceFile);
  const tableBindings = new Set<string>();
  const aliases = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        continue;
      }
      if (isDrizzleTableInitializer(declaration.initializer, factories)) {
        tableBindings.add(declaration.name.text);
      } else {
        const aliasSource = unwrapExpression(declaration.initializer);
        if (ts.isIdentifier(aliasSource)) {
          aliases.set(declaration.name.text, aliasSource.text);
        }
      }
    }
  }
  let aliasesChanged = true;
  while (aliasesChanged) {
    aliasesChanged = false;
    for (const [alias, source] of aliases) {
      if (tableBindings.has(alias) || !tableBindings.has(source)) continue;
      tableBindings.add(alias);
      aliasesChanged = true;
    }
  }

  const exports = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          tableBindings.has(declaration.name.text)
        ) {
          exports.add(declaration.name.text);
        }
      }
    }
    if (
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        const localName = element.propertyName?.text ?? element.name.text;
        if (tableBindings.has(localName)) exports.add(element.name.text);
      }
    }
  }
  return exports;
}

interface TableExportLink {
  sourcePath: string;
  target: string;
  exportedName: string;
  importedName: string;
}

/** Computes actual Drizzle table exports through source-level re-export chains. */
function collectDrizzleTableExports(
  sourceFiles: ReadonlyMap<string, ts.SourceFile>,
  evidenceByKey: ReadonlyMap<string, ArchitectureImportEvidence>,
): Map<string, Set<string>> {
  const exportsByModule = new Map<string, Set<string>>();
  const links: TableExportLink[] = [];
  for (const [sourcePath, sourceFile] of sourceFiles) {
    const exports = directDrizzleTableExports(sourceFile);
    exportsByModule.set(sourcePath, exports);
    for (const statement of sourceFile.statements) {
      if (
        !ts.isExportDeclaration(statement) ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteralLike(statement.moduleSpecifier)
      ) {
        continue;
      }
      const evidence = resolvedEvidenceFor(
        sourceFile,
        sourcePath,
        statement,
        "re-export",
        statement.moduleSpecifier.text,
        evidenceByKey,
      );
      if (!evidence || evidence.resolvedTarget.startsWith("external:")) {
        continue;
      }
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          links.push({
            sourcePath,
            target: evidence.resolvedTarget,
            exportedName: element.name.text,
            importedName: element.propertyName?.text ?? element.name.text,
          });
        }
      } else {
        links.push({
          sourcePath,
          target: evidence.resolvedTarget,
          exportedName: "*",
          importedName: "*",
        });
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const link of links) {
      const sourceExports = exportsByModule.get(link.sourcePath);
      const targetExports = exportsByModule.get(link.target);
      if (!sourceExports || !targetExports) continue;
      if (link.importedName === "*") {
        for (const name of targetExports) {
          if (sourceExports.has(name)) continue;
          sourceExports.add(name);
          changed = true;
        }
      } else if (
        targetExports.has(link.importedName) &&
        !sourceExports.has(link.exportedName)
      ) {
        sourceExports.add(link.exportedName);
        changed = true;
      }
    }
  }
  return exportsByModule;
}

/** Finds a static module specifier assigned to one local binding. */
function moduleSpecifierForBinding(
  sourceFile: ts.SourceFile,
  bindingName: string,
): string | undefined {
  let moduleSpecifier: string | undefined;
  const visit = (node: ts.Node): void => {
    if (moduleSpecifier) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === bindingName &&
      node.initializer
    ) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isCallExpression(initializer)) {
        const argument = initializer.arguments[0];
        if (
          argument &&
          ts.isStringLiteralLike(argument) &&
          (initializer.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(initializer.expression) &&
              initializer.expression.text === "require"))
        ) {
          moduleSpecifier = argument.text;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return moduleSpecifier;
}

/** Returns whether a module specifier selects a configured database module. */
function selectsDatabaseModule(
  config: ArchitectureConfig,
  moduleSpecifier: string,
): boolean {
  return config.rules.some(
    (rule) =>
      rule.domain === "database" &&
      rule.moduleMatchers.some((matcher) =>
        matchesPolicyValue(matcher, moduleSpecifier),
      ),
  );
}

/** Infers one configured table resource from a static expression. */
function configuredTableResourceForExpression(
  config: ArchitectureConfig,
  module: ParsedArchitectureModule,
  expression: ts.Expression,
  policyVersion: "v1" | "v2" | undefined,
  tableExportsByModule: TableExportsByModule,
): string | undefined {
  const unwrapped = unwrapExpression(expression);
  if (ts.isIdentifier(unwrapped)) {
    return module.imports.find(
      (binding) =>
        binding.localName === unwrapped.text && binding.inferredResource,
    )?.inferredResource;
  }

  let memberName: string | undefined;
  if (ts.isPropertyAccessExpression(unwrapped)) {
    memberName = unwrapped.name.text;
  } else if (
    ts.isElementAccessExpression(unwrapped) &&
    unwrapped.argumentExpression &&
    ts.isStringLiteralLike(unwrapped.argumentExpression)
  ) {
    memberName = unwrapped.argumentExpression.text;
  }
  if (!memberName) return undefined;

  const root = rootIdentifier(unwrapped);
  if (!root) return undefined;
  const namespaceBinding = module.imports.find(
    (binding) =>
      binding.localName === root.text &&
      binding.importedName === "*" &&
      (policyVersion !== "v2"
        ? selectsDatabaseModule(config, binding.evidence.importSpecifier)
        : tableExportsByModule.has(binding.evidence.resolvedTarget)),
  );
  const assignedModule = moduleSpecifierForBinding(
    module.sourceFile,
    root.text,
  );
  if (policyVersion !== "v2") {
    if (
      !namespaceBinding &&
      (!assignedModule || !selectsDatabaseModule(config, assignedModule))
    ) {
      return undefined;
    }
    return configuredTableResource(config, memberName);
  }
  const assignedTarget = assignedModule
    ? module.evidence.find(
        (evidence) =>
          (evidence.evidenceKind === "dynamic-import" ||
            evidence.evidenceKind === "commonjs-require") &&
          evidence.importSpecifier === assignedModule,
      )?.resolvedTarget
    : undefined;
  const tableExports = tableExportsByModule.get(
    namespaceBinding?.evidence.resolvedTarget ?? assignedTarget ?? "",
  );
  return tableExports
    ? configuredTableResource(config, memberName, tableExports)
    : undefined;
}

/** Resolves a statically known string expression without evaluating code. */
function staticStringValue(
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  seen = new Set<string>(),
): string | undefined {
  const unwrapped = unwrapExpression(expression);
  if (ts.isStringLiteralLike(unwrapped)) return unwrapped.text;
  if (
    ts.isBinaryExpression(unwrapped) &&
    unwrapped.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = staticStringValue(sourceFile, unwrapped.left, seen);
    const right = staticStringValue(sourceFile, unwrapped.right, seen);
    return left !== undefined && right !== undefined ? left + right : undefined;
  }
  if (!ts.isIdentifier(unwrapped) || seen.has(unwrapped.text)) return undefined;
  const nextSeen = new Set(seen).add(unwrapped.text);
  let value: string | undefined;
  const visit = (node: ts.Node): void => {
    if (value !== undefined) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === unwrapped.text &&
      node.initializer
    ) {
      value = staticStringValue(sourceFile, node.initializer, nextSeen);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return value;
}

/** Masks SQL comments and string values while preserving quoted identifiers. */
function maskSqlNonRelations(sql: string): string {
  let output = "";
  let index = 0;
  while (index < sql.length) {
    if (sql.startsWith("--", index)) {
      while (index < sql.length && !/[\r\n]/.test(sql[index]!)) {
        output += " ";
        index += 1;
      }
      continue;
    }
    if (sql.startsWith("/*", index)) {
      output += "  ";
      index += 2;
      while (index < sql.length && !sql.startsWith("*/", index)) {
        output += /[\r\n]/.test(sql[index]!) ? sql[index]! : " ";
        index += 1;
      }
      if (index < sql.length) {
        output += "  ";
        index += 2;
      }
      continue;
    }
    if (sql[index] === "'") {
      output += " ";
      index += 1;
      while (index < sql.length) {
        if (sql[index] === "\\" && index + 1 < sql.length) {
          output += "  ";
          index += 2;
          continue;
        }
        if (sql[index] === "'" && sql[index + 1] === "'") {
          output += "  ";
          index += 2;
          continue;
        }
        if (sql[index] === "'") {
          output += " ";
          index += 1;
          break;
        }
        output += /[\r\n]/.test(sql[index]!) ? sql[index]! : " ";
        index += 1;
      }
      continue;
    }
    output += sql[index]!;
    index += 1;
  }
  return output;
}

/** Extracts configured table resources from SQL relation positions only. */
function configuredSqlResources(
  config: ArchitectureConfig,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): string[] {
  const sql = staticStringValue(sourceFile, expression);
  if (sql === undefined) return [];
  const relationNames = new Set<string>();
  const relationPattern =
    /\b(?:from|join|update|into|delete\s+from)\s+(?:(?:"?[A-Za-z_][A-Za-z0-9_]*"?)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi;
  for (const match of maskSqlNonRelations(sql).matchAll(relationPattern)) {
    relationNames.add(match[1]!.toLowerCase());
  }
  const resources = new Set<string>();
  for (const rule of config.rules) {
    if (rule.domain !== "database") continue;
    for (const matcher of rule.resourceMatchers) {
      if (
        matcher.kind === "exact" &&
        matcher.value.startsWith("database-table:") &&
        relationNames.has(matcher.value.slice("database-table:".length))
      ) {
        resources.add(matcher.value);
      }
    }
  }
  return [...resources];
}

/** Extracts configured table resources from a query or constructor argument. */
function configuredResourcesForExpression(
  config: ArchitectureConfig,
  module: ParsedArchitectureModule,
  expression: ts.Expression,
  policyVersion: "v1" | "v2" | undefined,
  tableExportsByModule: TableExportsByModule,
): string[] {
  const resources = new Set<string>();
  const tableResource = configuredTableResourceForExpression(
    config,
    module,
    expression,
    policyVersion,
    tableExportsByModule,
  );
  if (tableResource) resources.add(tableResource);
  for (const resource of configuredSqlResources(
    config,
    module.sourceFile,
    expression,
  )) {
    resources.add(resource);
  }
  return [...resources];
}

interface LexicalScope {
  id: number;
  parent?: LexicalScope;
  functionBoundary: boolean;
  bindings: Map<string, string>;
}

interface LexicalBindingAnalysis {
  originsByBinding: Map<string, Map<string, RuleOrigin>>;
  importBindings: ReadonlyMap<string, string>;
  clientFactoryBindings: ReadonlySet<string>;
  queryClientBindings: ReadonlySet<string>;
  resolveIdentifier(identifier: ts.Identifier): string | undefined;
}

type BindingInitializerKind = "alias" | "call" | "new";

/** Classifies a simple binding initializer without conflating arbitrary calls with client construction. */
function bindingInitializer(
  expression: ts.Expression,
): { source: ts.Identifier; kind: BindingInitializerKind } | undefined {
  if (ts.isIdentifier(expression)) return { source: expression, kind: "alias" };
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isAwaitExpression(expression)
  ) {
    return bindingInitializer(expression.expression);
  }
  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression)
  ) {
    return { source: expression.expression, kind: "call" };
  }
  if (
    ts.isNewExpression(expression) &&
    ts.isIdentifier(expression.expression)
  ) {
    return { source: expression.expression, kind: "new" };
  }
  return undefined;
}

/** Builds scope-aware binding origins for imports, aliases, and client factories. */
function analyzeLexicalBindings(
  module: ParsedArchitectureModule,
  importedOrigins: ReadonlyMap<string, Map<string, RuleOrigin>>,
): LexicalBindingAnalysis {
  let nextScopeId = 1;
  const sourceScope: LexicalScope = {
    id: 0,
    functionBoundary: true,
    bindings: new Map(),
  };
  const scopeByNode = new WeakMap<ts.Node, LexicalScope>();

  const bindingKey = (scope: LexicalScope, name: string): string =>
    `${scope.id}\0${name}`;
  const register = (scope: LexicalScope, name: string): string => {
    const existing = scope.bindings.get(name);
    if (existing) return existing;
    const key = bindingKey(scope, name);
    scope.bindings.set(name, key);
    return key;
  };
  const nearestFunctionScope = (scope: LexicalScope): LexicalScope => {
    let current = scope;
    while (!current.functionBoundary && current.parent) {
      current = current.parent;
    }
    return current;
  };
  const createsScope = (node: ts.Node): boolean =>
    ts.isFunctionLike(node) ||
    ts.isBlock(node) ||
    ts.isCatchClause(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isClassLike(node);

  const buildScopes = (node: ts.Node, parentScope: LexicalScope): void => {
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name
    ) {
      register(parentScope, node.name.text);
    }
    let scope = parentScope;
    if (node !== module.sourceFile && createsScope(node)) {
      scope = {
        id: nextScopeId++,
        parent: parentScope,
        functionBoundary: ts.isFunctionLike(node),
        bindings: new Map(),
      };
      if (
        (ts.isFunctionExpression(node) || ts.isClassExpression(node)) &&
        node.name
      ) {
        register(scope, node.name.text);
      }
    }
    scopeByNode.set(node, scope);

    if (ts.isImportDeclaration(node) && node.importClause) {
      if (node.importClause.name)
        register(sourceScope, node.importClause.name.text);
      const named = node.importClause.namedBindings;
      if (named && ts.isNamespaceImport(named)) {
        register(sourceScope, named.name.text);
      } else if (named) {
        for (const element of named.elements) {
          register(sourceScope, element.name.text);
        }
      }
    }
    if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      register(scope, node.name.text);
    }
    if (
      ts.isCatchClause(node) &&
      node.variableDeclaration &&
      ts.isIdentifier(node.variableDeclaration.name)
    ) {
      register(scope, node.variableDeclaration.name.text);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const declarationList = node.parent;
      const blockScoped =
        ts.isVariableDeclarationList(declarationList) &&
        (declarationList.flags & ts.NodeFlags.BlockScoped) !== 0;
      register(
        blockScoped ? scope : nearestFunctionScope(scope),
        node.name.text,
      );
    }
    ts.forEachChild(node, (child) => buildScopes(child, scope));
  };
  buildScopes(module.sourceFile, sourceScope);

  const resolveIdentifier = (identifier: ts.Identifier): string | undefined => {
    let scope = scopeByNode.get(identifier);
    while (scope) {
      const key = scope.bindings.get(identifier.text);
      if (key) return key;
      scope = scope.parent;
    }
    return undefined;
  };

  const originsByBinding = new Map<string, Map<string, RuleOrigin>>();
  const importBindings = new Map<string, string>();
  for (const [name, origins] of importedOrigins) {
    const key = sourceScope.bindings.get(name);
    if (!key) continue;
    originsByBinding.set(key, new Map(origins));
    importBindings.set(name, key);
  }

  const clientFactoryBindings = new Set<string>();
  for (const binding of module.imports) {
    if (!binding.localName || binding.evidence.importSpecifier !== "postgres") {
      continue;
    }
    const key = importBindings.get(binding.localName);
    if (key) clientFactoryBindings.add(key);
  }

  const aliasConsumers = new Map<string, Set<string>>();
  const initializers: Array<{
    sourceKey: string;
    targetKey: string;
    kind: BindingInitializerKind;
  }> = [];
  const collectAliases = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const initializer = bindingInitializer(node.initializer);
      const sourceKey = initializer
        ? resolveIdentifier(initializer.source)
        : undefined;
      const targetKey = resolveIdentifier(node.name);
      if (sourceKey && targetKey && sourceKey !== targetKey && initializer) {
        const consumers = aliasConsumers.get(sourceKey) ?? new Set<string>();
        consumers.add(targetKey);
        aliasConsumers.set(sourceKey, consumers);
        initializers.push({ sourceKey, targetKey, kind: initializer.kind });
      }
    }
    ts.forEachChild(node, collectAliases);
  };
  collectAliases(module.sourceFile);

  const queue = [...originsByBinding.keys()];
  const queued = new Set(queue);
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const sourceKey = queue[queueIndex++]!;
    queued.delete(sourceKey);
    const sourceOrigins = originsByBinding.get(sourceKey);
    if (!sourceOrigins) continue;
    for (const targetKey of aliasConsumers.get(sourceKey) ?? []) {
      const targetOrigins =
        originsByBinding.get(targetKey) ?? new Map<string, RuleOrigin>();
      let changed = false;
      for (const origin of sourceOrigins.values()) {
        changed = addOrigin(targetOrigins, origin) || changed;
      }
      originsByBinding.set(targetKey, targetOrigins);
      if (changed && !queued.has(targetKey)) {
        queue.push(targetKey);
        queued.add(targetKey);
      }
    }
  }

  const queryClientBindings = new Set<string>();
  let bindingKindsChanged = true;
  while (bindingKindsChanged) {
    bindingKindsChanged = false;
    for (const initializer of initializers) {
      if (
        initializer.kind === "alias" &&
        clientFactoryBindings.has(initializer.sourceKey) &&
        !clientFactoryBindings.has(initializer.targetKey)
      ) {
        clientFactoryBindings.add(initializer.targetKey);
        bindingKindsChanged = true;
      }
      const createsClient =
        (initializer.kind === "alias" &&
          queryClientBindings.has(initializer.sourceKey)) ||
        (initializer.kind === "new" &&
          originsByBinding.has(initializer.sourceKey)) ||
        (initializer.kind === "call" &&
          clientFactoryBindings.has(initializer.sourceKey));
      if (createsClient && !queryClientBindings.has(initializer.targetKey)) {
        queryClientBindings.add(initializer.targetKey);
        bindingKindsChanged = true;
      }
    }
  }

  return {
    originsByBinding,
    importBindings,
    clientFactoryBindings,
    queryClientBindings,
    resolveIdentifier,
  };
}

/** Extracts one static process environment resource. */
function environmentResource(node: ts.Node): string | undefined {
  const isProcessEnv = (expression: ts.Expression): boolean =>
    (ts.isPropertyAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === "process" &&
      expression.name.text === "env") ||
    (ts.isElementAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === "process" &&
      expression.argumentExpression !== undefined &&
      ts.isStringLiteralLike(expression.argumentExpression) &&
      expression.argumentExpression.text === "env");
  if (ts.isPropertyAccessExpression(node) && isProcessEnv(node.expression)) {
    return `environment:${node.name.text}`;
  }
  if (
    ts.isElementAccessExpression(node) &&
    isProcessEnv(node.expression) &&
    node.argumentExpression &&
    ts.isStringLiteralLike(node.argumentExpression)
  ) {
    return `environment:${node.argumentExpression.text}`;
  }
  return undefined;
}

/** Compares findings by frozen source-instance identity. */
function compareFindings(
  left: ArchitectureFinding,
  right: ArchitectureFinding,
): number {
  return compareStableStrings(left.instanceKey, right.instanceKey);
}

/** Analyzes exact sources using resolved, binding-aware architecture policy evidence. */
export async function analyzeArchitectureSources(
  options: AnalyzeArchitectureSourcesOptions,
): Promise<ArchitectureAnalysisResult> {
  const config = architectureConfigSchema.parse(options.config);
  const loaded = await loadArchitectureSourceDetails(options);
  const evidenceByKey = new Map(
    loaded.evidence.map((evidence) => [evidenceKey(evidence), evidence]),
  );
  const tableExportsByModule = collectDrizzleTableExports(
    loaded.sourceFiles,
    evidenceByKey,
  );
  const executableEvidenceBySource = new Map<
    string,
    ArchitectureImportEvidence[]
  >();
  for (const evidence of loaded.evidence) {
    if (
      evidence.evidenceKind !== "dynamic-import" &&
      evidence.evidenceKind !== "commonjs-require"
    ) {
      continue;
    }
    const sourceEvidence = executableEvidenceBySource.get(evidence.sourcePath);
    if (sourceEvidence) sourceEvidence.push(evidence);
    else executableEvidenceBySource.set(evidence.sourcePath, [evidence]);
  }
  const environmentNodesBySource = new Map<
    string,
    Array<{ node: ts.Node; resource: string }>
  >();
  for (const evidence of loaded.environmentNodes) {
    const sourceEvidence = environmentNodesBySource.get(evidence.sourcePath);
    const entry = { node: evidence.node, resource: evidence.resource };
    if (sourceEvidence) sourceEvidence.push(entry);
    else environmentNodesBySource.set(evidence.sourcePath, [entry]);
  }
  const modules: ParsedArchitectureModule[] = [];
  for (const sourcePath of loaded.sourcePaths) {
    const sourceFile = loaded.sourceFiles.get(sourcePath);
    if (!sourceFile) continue;
    modules.push(
      parseArchitectureModule(
        sourcePath,
        sourceFile,
        evidenceByKey,
        config,
        options.policyVersion,
        tableExportsByModule,
      ),
    );
  }
  const { localsByModule, exportsByModule } = computeBindingOrigins(
    modules,
    config,
  );
  const findingsByKey = new Map<string, ArchitectureFinding>();
  const rulesById = new Map(config.rules.map((rule) => [rule.id, rule]));
  const ownershipDecisionCache = new Map<string, boolean>();
  const rawFindingKeys = new Set<string>();

  /** Adds one selected origin only when exact ownership policy denies it. */
  const addFinding = (
    sourcePath: string,
    node: ts.Node,
    sourceFile: ts.SourceFile,
    evidenceKind: ArchitectureFinding["evidenceKind"],
    origin: RuleOrigin,
    immediateImportSpecifier?: string,
  ): void => {
    const rule = rulesById.get(origin.ruleId);
    if (!rule || !rule.findingKinds.includes(evidenceKind)) return;
    const importSpecifier = immediateImportSpecifier ?? origin.importSpecifier;
    const policyImportSpecifier =
      origin.importSpecifier ?? immediateImportSpecifier;
    const decisionKey = [
      sourcePath,
      rule.id,
      evidenceKind,
      policyImportSpecifier ?? "",
      origin.resource ?? "",
      origin.resolvedTarget,
    ].join("\0");
    let violates = ownershipDecisionCache.get(decisionKey);
    if (violates === undefined) {
      violates =
        evaluateOwnership(config, {
          ruleId: rule.id,
          sourcePath,
          evidenceKind,
          ...(policyImportSpecifier
            ? { importSpecifier: policyImportSpecifier }
            : {}),
          ...(origin.resource ? { resource: origin.resource } : {}),
          resolvedTarget: origin.resolvedTarget,
        }).status === "violation";
      ownershipDecisionCache.set(decisionKey, violates);
    }
    if (!violates) return;
    const location = sourceLocation(sourceFile, node);
    const rawFindingKey = [
      rule.id,
      rule.domain,
      sourcePath,
      location.line,
      location.column,
      evidenceKind,
      origin.resource ?? "",
      origin.resolvedTarget,
    ].join("\0");
    if (rawFindingKeys.has(rawFindingKey)) return;
    rawFindingKeys.add(rawFindingKey);
    const identityInput = {
      ruleId: rule.id,
      domain: rule.domain,
      sourcePath,
      ...location,
      evidenceKind,
      ...(origin.resource ? { resource: origin.resource } : {}),
      resolvedTarget: origin.resolvedTarget,
    };
    const finding = architectureFindingSchema.parse({
      schemaVersion: 1,
      ...identityInput,
      ...(importSpecifier ? { importSpecifier } : {}),
      ...createFindingIdentity(identityInput),
    });
    findingsByKey.set(finding.instanceKey, finding);
  };

  for (const module of modules) {
    const locals =
      localsByModule.get(module.sourcePath) ??
      new Map<string, Map<string, RuleOrigin>>();
    for (const binding of module.imports) {
      if (
        !binding.localName ||
        binding.evidence.resolvedTarget.startsWith("external:")
      ) {
        continue;
      }
      const origins = locals.get(binding.localName);
      if (!origins) continue;
      for (const origin of targetExportOrigins(
        exportsByModule,
        binding.evidence.resolvedTarget,
        binding.importedName,
      )) {
        addOrigin(origins, origin);
      }
    }
    const lexicalBindings = analyzeLexicalBindings(module, locals);
    for (const binding of module.imports) {
      const origins = new Map<string, RuleOrigin>();
      for (const origin of directBindingOrigins(binding, config.rules))
        addOrigin(origins, origin);
      if (
        origins.size === 0 &&
        !binding.evidence.resolvedTarget.startsWith("external:")
      ) {
        for (const origin of targetExportOrigins(
          exportsByModule,
          binding.evidence.resolvedTarget,
          binding.importedName,
        ))
          addOrigin(origins, origin);
      }
      if (origins.size === 0) continue;
      for (const origin of origins.values())
        addFinding(
          module.sourcePath,
          binding.node,
          module.sourceFile,
          binding.evidence.evidenceKind,
          origin,
          binding.evidence.importSpecifier,
        );
    }
    for (const binding of module.reexports) {
      const origins = new Map<string, RuleOrigin>();
      for (const origin of directBindingOrigins(binding, config.rules))
        addOrigin(origins, origin);
      if (
        origins.size === 0 &&
        !binding.evidence.resolvedTarget.startsWith("external:")
      ) {
        for (const origin of targetExportOrigins(
          exportsByModule,
          binding.evidence.resolvedTarget,
          binding.importedName,
        ))
          addOrigin(origins, origin);
      }
      if (origins.size === 0) continue;
      for (const origin of origins.values())
        addFinding(
          module.sourcePath,
          binding.node,
          module.sourceFile,
          "re-export",
          origin,
          binding.evidence.importSpecifier,
        );
    }

    for (const evidence of executableEvidenceBySource.get(module.sourcePath) ??
      []) {
      const origins = new Map<string, RuleOrigin>();
      for (const rule of config.rules)
        if (
          rule.findingKinds.includes(evidence.evidenceKind) &&
          directlySelectsImport(rule, evidence)
        )
          addOrigin(origins, {
            ruleId: rule.id,
            importSpecifier: evidence.importSpecifier,
            resolvedTarget: evidence.resolvedTarget,
          });
      if (
        origins.size === 0 &&
        !evidence.resolvedTarget.startsWith("external:")
      )
        for (const origin of targetExportOrigins(
          exportsByModule,
          evidence.resolvedTarget,
          "*",
        ))
          addOrigin(origins, origin);
      if (origins.size === 0) continue;
      const node = loaded.evidenceNodes.get(evidenceKey(evidence));
      if (!node) {
        throw new Error(
          `Architecture evidence node not found at ${evidence.sourcePath}:${evidence.line}:${evidence.column}`,
        );
      }
      for (const origin of origins.values())
        addFinding(
          module.sourcePath,
          node,
          module.sourceFile,
          evidence.evidenceKind,
          origin,
          evidence.importSpecifier,
        );
    }

    for (const evidence of environmentNodesBySource.get(module.sourcePath) ??
      []) {
      for (const rule of config.rules) {
        if (
          rule.findingKinds.includes("environment-read") &&
          directlySelectsResource(rule, evidence.resource)
        ) {
          addFinding(
            module.sourcePath,
            evidence.node,
            module.sourceFile,
            "environment-read",
            {
              ruleId: rule.id,
              resource: evidence.resource,
              resolvedTarget: "external:environment",
            },
          );
        }
      }
    }

    if (options.policyVersion === "v2") {
      for (const node of loaded.executableNodesBySource.get(
        module.sourcePath,
      ) ?? []) {
        const root = rootIdentifier(node.expression);
        const rootBinding = root
          ? lexicalBindings.resolveIdentifier(root)
          : undefined;
        const origins = rootBinding
          ? lexicalBindings.originsByBinding.get(rootBinding)
          : undefined;
        const isConstruction =
          ts.isNewExpression(node) ||
          (ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            rootBinding !== undefined &&
            lexicalBindings.clientFactoryBindings.has(rootBinding));
        if (isConstruction) {
          for (const origin of origins?.values() ?? []) {
            addFinding(
              module.sourcePath,
              node,
              module.sourceFile,
              "client-construction",
              origin,
            );
          }
          for (const argument of node.arguments ?? []) {
            const unwrappedArgument = unwrapExpression(argument);
            if (
              ts.isIdentifier(unwrappedArgument) &&
              lexicalBindings.importBindings.has(unwrappedArgument.text) &&
              lexicalBindings.resolveIdentifier(unwrappedArgument) !==
                lexicalBindings.importBindings.get(unwrappedArgument.text)
            ) {
              continue;
            }
            const resources = configuredResourcesForExpression(
              config,
              module,
              argument,
              options.policyVersion,
              tableExportsByModule,
            );
            for (const resource of resources) {
              for (const rule of config.rules) {
                if (
                  rule.findingKinds.includes("client-construction") &&
                  directlySelectsResource(rule, resource)
                ) {
                  addFinding(
                    module.sourcePath,
                    node,
                    module.sourceFile,
                    "client-construction",
                    {
                      ruleId: rule.id,
                      resource,
                      resolvedTarget: "external:database-table",
                    },
                  );
                }
              }
            }
          }
        }
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          QUERY_METHODS.has(node.expression.name.text)
        ) {
          if (
            rootBinding !== undefined &&
            lexicalBindings.queryClientBindings.has(rootBinding)
          ) {
            for (const origin of origins?.values() ?? []) {
              if (rulesById.get(origin.ruleId)?.domain === "database") {
                addFinding(
                  module.sourcePath,
                  node,
                  module.sourceFile,
                  "query-call",
                  origin,
                );
              }
            }
          }
          for (const argument of node.arguments) {
            const unwrappedArgument = unwrapExpression(argument);
            if (
              ts.isIdentifier(unwrappedArgument) &&
              lexicalBindings.importBindings.has(unwrappedArgument.text) &&
              lexicalBindings.resolveIdentifier(unwrappedArgument) !==
                lexicalBindings.importBindings.get(unwrappedArgument.text)
            ) {
              continue;
            }
            if (ts.isIdentifier(unwrappedArgument)) {
              const argumentBinding =
                lexicalBindings.resolveIdentifier(unwrappedArgument);
              for (const origin of (argumentBinding
                ? lexicalBindings.originsByBinding.get(argumentBinding)
                : undefined
              )?.values() ?? []) {
                if (
                  origin.resource &&
                  rulesById.get(origin.ruleId)?.domain === "database"
                ) {
                  addFinding(
                    module.sourcePath,
                    node,
                    module.sourceFile,
                    "query-call",
                    origin,
                  );
                }
              }
            }
            for (const resource of configuredResourcesForExpression(
              config,
              module,
              argument,
              options.policyVersion,
              tableExportsByModule,
            )) {
              for (const rule of config.rules) {
                if (
                  rule.findingKinds.includes("query-call") &&
                  directlySelectsResource(rule, resource)
                ) {
                  addFinding(
                    module.sourcePath,
                    node,
                    module.sourceFile,
                    "query-call",
                    {
                      ruleId: rule.id,
                      resource,
                      resolvedTarget: "external:database-table",
                    },
                  );
                }
              }
            }
          }
        }
      }
    } else if (locals.size > 0) {
      for (const node of loaded.executableNodesBySource.get(
        module.sourcePath,
      ) ?? []) {
        const root = rootIdentifier(node.expression);
        const rootBinding = root
          ? lexicalBindings.resolveIdentifier(root)
          : undefined;
        const origins = rootBinding
          ? lexicalBindings.originsByBinding.get(rootBinding)
          : undefined;
        const isConstruction =
          ts.isNewExpression(node) ||
          (ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            rootBinding !== undefined &&
            lexicalBindings.clientFactoryBindings.has(rootBinding));
        if (isConstruction) {
          for (const origin of origins?.values() ?? []) {
            addFinding(
              module.sourcePath,
              node,
              module.sourceFile,
              "client-construction",
              origin,
            );
          }
        }
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          QUERY_METHODS.has(node.expression.name.text)
        ) {
          if (
            rootBinding !== undefined &&
            lexicalBindings.queryClientBindings.has(rootBinding)
          ) {
            for (const origin of origins?.values() ?? []) {
              if (rulesById.get(origin.ruleId)?.domain === "database") {
                addFinding(
                  module.sourcePath,
                  node,
                  module.sourceFile,
                  "query-call",
                  origin,
                );
              }
            }
          }
          const argument = node.arguments[0];
          if (argument && ts.isIdentifier(argument)) {
            const argumentBinding = lexicalBindings.resolveIdentifier(argument);
            const importedBinding = lexicalBindings.importBindings.get(
              argument.text,
            );
            if (argumentBinding && argumentBinding === importedBinding) {
              const imported = module.imports.find(
                (binding) => binding.localName === argument.text,
              );
              if (imported?.inferredResource) {
                for (const rule of config.rules) {
                  if (
                    rule.findingKinds.includes("query-call") &&
                    directlySelectsResource(rule, imported.inferredResource)
                  ) {
                    addFinding(
                      module.sourcePath,
                      node,
                      module.sourceFile,
                      "query-call",
                      {
                        ruleId: rule.id,
                        resource: imported.inferredResource,
                        resolvedTarget: "external:database-table",
                      },
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return {
    schemaVersion: 1,
    sourcePaths: loaded.sourcePaths,
    findings: [...findingsByKey.values()].sort(compareFindings),
    parseErrors: loaded.parseErrors,
  };
}
