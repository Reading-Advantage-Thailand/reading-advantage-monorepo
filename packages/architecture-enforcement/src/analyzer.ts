import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { z } from "zod";
import { findingKindSchema } from "./contracts.js";
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
}

interface ResolverConfiguration {
  baseDirectory: string;
  paths: Array<{ pattern: string; targets: string[] }>;
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
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Produces TypeScript and JavaScript candidates for an extensionless module path.
 * @param path Absolute base module path.
 * @returns Candidate file paths in deterministic resolver order.
 */
function moduleFileCandidates(path: string): string[] {
  if (/\.[cm]?[jt]sx?$/.test(path)) return [path];
  return [
    path,
    `${path}.ts`,
    `${path}.tsx`,
    `${path}.mts`,
    `${path}.cts`,
    `${path}.js`,
    `${path}.jsx`,
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
): Promise<string | undefined> {
  for (const candidate of moduleFileCandidates(absoluteBase)) {
    if (await fileExists(candidate)) {
      return toPosixPath(relative(repoRoot, candidate));
    }
  }
  return undefined;
}

/**
 * Parses an optional tsconfig into deterministic baseUrl and path mappings.
 * @param repoRoot Absolute repository or fixture root.
 * @param configPath Exact resolver-config path relative to repoRoot.
 * @returns Resolver configuration or a fail-closed config diagnostic.
 */
async function loadResolverConfiguration(
  repoRoot: string,
  configPath: string | undefined,
): Promise<
  | { configuration?: ResolverConfiguration; error?: never }
  | { configuration?: never; error: ArchitectureAnalyzerError }
> {
  if (!configPath) return {};
  const validatedPath = sourcePathSchema.parse(configPath);
  try {
    const source = await readFile(resolve(repoRoot, validatedPath), "utf8");
    const parsed = ts.parseConfigFileTextToJson(validatedPath, source);
    if (parsed.error || !parsed.config || typeof parsed.config !== "object") {
      throw new Error("invalid resolver config");
    }
    const compilerOptions = (
      parsed.config as {
        compilerOptions?: {
          baseUrl?: unknown;
          paths?: unknown;
        };
      }
    ).compilerOptions;
    const baseUrl =
      typeof compilerOptions?.baseUrl === "string"
        ? compilerOptions.baseUrl
        : ".";
    const rawPaths =
      compilerOptions?.paths && typeof compilerOptions.paths === "object"
        ? (compilerOptions.paths as Record<string, unknown>)
        : {};
    const paths = Object.entries(rawPaths)
      .map(([pattern, targets]) => ({
        pattern,
        targets: Array.isArray(targets)
          ? targets.filter(
              (target): target is string => typeof target === "string",
            )
          : [],
      }))
      .filter((entry) => entry.targets.length > 0)
      .sort((left, right) => compareStableStrings(left.pattern, right.pattern));
    return {
      configuration: {
        baseDirectory: resolve(repoRoot, dirname(validatedPath), baseUrl),
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
): Promise<ResolvedModule> {
  if (specifier.startsWith(".")) {
    const target = await resolveSourceCandidate(
      repoRoot,
      resolve(repoRoot, dirname(sourcePath), specifier),
    );
    return target
      ? { target, failed: false }
      : { target: `external:${specifier}`, failed: true };
  }
  for (const mapping of resolver?.paths ?? []) {
    const substitution = pathPatternSubstitution(mapping.pattern, specifier);
    if (substitution === undefined) continue;
    for (const targetPattern of mapping.targets) {
      const absoluteTarget = resolve(
        resolver!.baseDirectory,
        targetPattern.replaceAll("*", substitution),
      );
      const target = await resolveSourceCandidate(repoRoot, absoluteTarget);
      if (target) return { target, failed: false };
    }
    return { target: `external:${specifier}`, failed: true };
  }
  const workspaceTarget = workspaceTargets.get(specifier);
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
export async function loadArchitectureSources(
  options: LoadArchitectureSourcesOptions,
): Promise<ArchitectureSourceLoadResult> {
  const repoRoot = resolve(options.repoRoot);
  const sourcePaths = [
    ...new Set(options.sourcePaths.map((path) => sourcePathSchema.parse(path))),
  ].sort(compareStableStrings);
  const evidence: ArchitectureImportEvidence[] = [];
  const parseErrors: ArchitectureAnalyzerError[] = [];
  const resolverResult = await loadResolverConfiguration(
    repoRoot,
    options.resolverConfigPath,
  );
  if (resolverResult.error) parseErrors.push(resolverResult.error);

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

  for (const sourcePath of sourcePaths) {
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
      continue;
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
      continue;
    }

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
      );
      evidence.push({
        schemaVersion: 1,
        sourcePath,
        ...location,
        evidenceKind,
        importSpecifier,
        resolvedTarget: resolvedModule.target,
      });
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
    /** Visits a syntax subtree and queues import-like evidence resolution. */
    const visit = (node: ts.Node): void => {
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
    await Promise.all(pending);
  }

  return {
    schemaVersion: 1,
    sourcePaths,
    evidence: evidence.sort(compareEvidence),
    parseErrors: parseErrors.sort(
      (left, right) =>
        compareStableStrings(left.sourcePath, right.sourcePath) ||
        left.line - right.line ||
        left.column - right.column ||
        compareStableStrings(left.code, right.code),
    ),
  };
}
