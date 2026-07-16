import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve, sep } from "node:path";
import ts from "typescript";
import { z } from "zod";
import {
  architectureConfigSchema,
  findingKindSchema,
  policyResourceSchema,
  type ArchitectureConfig,
  type ArchitectureRule,
} from "./contracts.js";
import { compareStableStrings } from "./stable-order.js";

const SOURCE_FILE_PATTERN = /\.[cm]?[jt]sx?$/;
const GENERATED_WORKSPACE_DIRECTORIES = new Set([
  ".next",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "out",
  "playwright-report",
  "test-results",
]);
const DEFAULT_ROOTS = ["apps", "integrations", "packages", "services"] as const;
const QUERY_METHODS = new Set(["delete", "from", "insert", "update"]);

const inventoryFactSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePath: z.string().min(1),
    line: z.number().int().positive(),
    column: z.number().int().positive(),
    kind: findingKindSchema,
    importSpecifier: z.string().min(1).optional(),
    resource: policyResourceSchema.optional(),
  })
  .strict();

const inventoryParseErrorSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePath: z.string().min(1),
    line: z.number().int().positive(),
    column: z.number().int().positive(),
    code: z.enum(["FILE_READ_ERROR", "TYPESCRIPT_PARSE_ERROR"]),
  })
  .strict();

/** Runtime contract for deterministic architecture source inventory output. */
export const architectureInventorySchema = z
  .object({
    schemaVersion: z.literal(1),
    filesScanned: z.number().int().nonnegative(),
    facts: z.array(inventoryFactSchema),
    parseErrors: z.array(inventoryParseErrorSchema),
  })
  .strict();

/** Runtime contract for one direct violation awaiting baseline disposition. */
export const directViolationCandidateSchema = z
  .object({
    schemaVersion: z.literal(1),
    ruleId: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    domain: z.enum(["database", "provider"]),
    sourcePath: z.string().min(1),
    line: z.number().int().positive(),
    column: z.number().int().positive(),
    evidenceKind: findingKindSchema,
    importSpecifier: z.string().min(1).optional(),
    resource: policyResourceSchema.optional(),
    owner: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    rationale: z.string().trim().min(12),
    proposedDisposition: z.enum(["baseline-review", "exact-exception-review"]),
  })
  .strict();

/** One structured syntax fact discovered before architecture-rule evaluation. */
export type InventoryFact = z.infer<typeof inventoryFactSchema>;

/** Secret-safe source loading or TypeScript parsing failure. */
export type InventoryParseError = z.infer<typeof inventoryParseErrorSchema>;

/** Deterministic repository inventory inferred from its runtime contract. */
export type ArchitectureInventory = z.infer<typeof architectureInventorySchema>;

/** Direct architecture violation awaiting explicit baseline or exception review. */
export type DirectViolationCandidate = z.infer<
  typeof directViolationCandidateSchema
>;

/** Options for a deterministic repository inventory pass. */
export interface InventoryRepositoryOptions {
  /** Absolute or working-directory-relative repository root. */
  repoRoot: string;
  /** Exact top-level repository roots to include. */
  roots?: readonly string[];
  /** Exact tracked source files, primarily for isolated fixtures. */
  trackedFiles?: readonly string[];
}

/**
 * Normalizes a repository path to stable POSIX separators.
 * @param path Candidate repository-relative path.
 * @returns POSIX-normalized path used in diagnostics and stable sorting.
 */
function toPosixPath(path: string): string {
  return sep === "/" ? path : path.split(sep).join("/");
}

/**
 * Determines whether a path is an exact safe repository source path.
 * @param path Candidate tracked file path.
 * @returns True when the path is traversal-free and uses POSIX separators.
 */
function isSafeRepositoryFile(path: string): boolean {
  return (
    path.length > 0 &&
    !isAbsolute(path) &&
    !path.includes("\\") &&
    !path.includes("//") &&
    !path.endsWith("/") &&
    path.split("/").every((segment) => segment !== "." && segment !== "..")
  );
}

/**
 * Determines whether a source path belongs to one configured root.
 * @param path Safe repository-relative source path.
 * @param roots Exact top-level roots included by the inventory.
 * @returns True when the file is under an included root.
 */
function isIncludedRoot(path: string, roots: readonly string[]): boolean {
  return roots.some((root) => path === root || path.startsWith(`${root}/`));
}

/**
 * Determines whether generated or dependency directories own a source path.
 * @param path Safe repository-relative source path.
 * @returns True when the inventory must ignore the file.
 */
function isIgnoredPath(path: string): boolean {
  const segments = path.split("/");
  if (segments.includes("node_modules")) return true;
  const generatedDirectoryIndex =
    segments[0] === "packages" && segments[1] === "integrations" ? 3 : 2;
  const generatedDirectory = segments[generatedDirectoryIndex];
  return (
    generatedDirectory !== undefined &&
    GENERATED_WORKSPACE_DIRECTORIES.has(generatedDirectory)
  );
}

/**
 * Reads the repository's tracked files without scanning untracked build output.
 * @param repoRoot Absolute repository root used as the git working directory.
 * @param roots Exact top-level roots included by the inventory.
 * @returns Newline-delimited git paths normalized into a sorted array.
 * @throws When git cannot enumerate the repository.
 */
function listTrackedFiles(
  repoRoot: string,
  roots: readonly string[],
): string[] {
  const stdout = execFileSync("git", ["ls-files", "--", ...roots], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.split("\n").filter((path) => path.length > 0);
}

/**
 * Selects exact inventory source files in canonical order.
 * @param options Inventory roots and optional isolated tracked-file list.
 * @param repoRoot Absolute normalized repository root.
 * @returns Deduplicated, filtered, lexically sorted repository paths.
 */
function selectSourceFiles(
  options: InventoryRepositoryOptions,
  repoRoot: string,
): string[] {
  const roots = options.roots ?? DEFAULT_ROOTS;
  const candidates = options.trackedFiles
    ? [...options.trackedFiles]
    : listTrackedFiles(repoRoot, roots);
  return [...new Set(candidates.map(toPosixPath))]
    .filter(
      (path) =>
        isSafeRepositoryFile(path) &&
        isIncludedRoot(path, roots) &&
        !isIgnoredPath(path) &&
        SOURCE_FILE_PATTERN.test(path),
    )
    .sort(compareStableStrings);
}

/**
 * Maps a file extension to the TypeScript parser's script kind.
 * @param path Repository-relative source file path.
 * @returns TypeScript parser mode for the file extension.
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
 * Converts a TypeScript identifier into a stable PostgreSQL-style table name.
 * @param identifier Identifier used as a Drizzle query argument.
 * @returns Lowercase snake-case table resource name.
 */
function identifierToTableName(identifier: string): string {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/**
 * Returns the one static string literal argument of a call expression.
 * @param node Candidate TypeScript call expression.
 * @returns Literal value or undefined for computed calls.
 */
function staticStringArgument(node: ts.CallExpression): string | undefined {
  const argument = node.arguments[0];
  return argument && ts.isStringLiteralLike(argument)
    ? argument.text
    : undefined;
}

/**
 * Returns a node's stable one-based source location.
 * @param sourceFile Parsed TypeScript source file.
 * @param node Syntax node owning the inventory fact.
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
 * Determines whether a node is the `process.env` object.
 * @param node Candidate expression.
 * @returns True for a direct `process.env` property chain.
 */
function isProcessEnv(node: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "process" &&
    node.name.text === "env"
  );
}

/**
 * Extracts a static environment resource from property or element access.
 * @param node Candidate TypeScript syntax node.
 * @returns Namespaced environment resource or undefined.
 */
function environmentResource(node: ts.Node): string | undefined {
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

/**
 * Extracts a stable table identifier from a Drizzle-style query call.
 * @param node Candidate TypeScript call expression.
 * @returns Namespaced database-table resource or undefined.
 */
function queryResource(node: ts.CallExpression): string | undefined {
  if (
    !ts.isPropertyAccessExpression(node.expression) ||
    !QUERY_METHODS.has(node.expression.name.text)
  ) {
    return undefined;
  }
  const argument = node.arguments[0];
  if (!argument || !ts.isIdentifier(argument)) return undefined;
  return `database-table:${identifierToTableName(argument.text)}`;
}

/**
 * Extracts structured syntax facts from one parseable source file.
 * @param sourcePath Stable repository-relative path.
 * @param sourceFile Parsed TypeScript source file.
 * @returns Canonically sorted import, resource, and query facts.
 */
function extractFacts(
  sourcePath: string,
  sourceFile: ts.SourceFile,
): InventoryFact[] {
  const facts: InventoryFact[] = [];
  const keys = new Set<string>();

  /** Adds one deduplicated inventory fact at a syntax node. */
  function addFact(
    node: ts.Node,
    kind: InventoryFact["kind"],
    details: Pick<InventoryFact, "importSpecifier" | "resource">,
  ): void {
    const location = sourceLocation(sourceFile, node);
    const fact: InventoryFact = {
      schemaVersion: 1,
      sourcePath,
      ...location,
      kind,
      ...(details.importSpecifier
        ? { importSpecifier: details.importSpecifier }
        : {}),
      ...(details.resource ? { resource: details.resource } : {}),
    };
    const key = JSON.stringify(fact);
    if (!keys.has(key)) {
      keys.add(key);
      facts.push(fact);
    }
  }

  /** Visits a syntax subtree and records relevant structured facts. */
  function visit(node: ts.Node): void {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      const namedBindings = node.importClause?.namedBindings;
      const kind =
        namedBindings && ts.isNamespaceImport(namedBindings)
          ? "namespace-import"
          : "static-import";
      addFact(node, kind, { importSpecifier: node.moduleSpecifier.text });
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      addFact(node, "re-export", {
        importSpecifier: node.moduleSpecifier.text,
      });
    } else if (ts.isCallExpression(node)) {
      const specifier = staticStringArgument(node);
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && specifier) {
        addFact(node, "dynamic-import", { importSpecifier: specifier });
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require" &&
        specifier
      ) {
        addFact(node, "commonjs-require", { importSpecifier: specifier });
      }
      const resource = queryResource(node);
      if (resource) addFact(node, "query-call", { resource });
    }

    const resource = environmentResource(node);
    if (resource) addFact(node, "environment-read", { resource });
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return facts.sort(compareFacts);
}

/**
 * Compares inventory facts by stable identity fields.
 * @param left First inventory fact.
 * @param right Second inventory fact.
 * @returns Negative, zero, or positive lexical ordering result.
 */
function compareFacts(left: InventoryFact, right: InventoryFact): number {
  return (
    compareStableStrings(left.sourcePath, right.sourcePath) ||
    left.line - right.line ||
    left.column - right.column ||
    compareStableStrings(left.kind, right.kind) ||
    compareStableStrings(
      left.importSpecifier ?? "",
      right.importSpecifier ?? "",
    ) ||
    compareStableStrings(left.resource ?? "", right.resource ?? "")
  );
}

/**
 * Tests one inventory fact against a rule's direct module and resource selectors.
 * @param fact Structured syntax fact from the read-only inventory.
 * @param rule Architecture rule with exact or prefix selectors.
 * @returns True when direct evidence selects the rule without alias resolution.
 */
function directlySelectsRule(
  fact: InventoryFact,
  rule: ArchitectureRule,
): boolean {
  const moduleSelected =
    fact.importSpecifier !== undefined &&
    rule.moduleMatchers.some((matcher) =>
      matcher.kind === "exact"
        ? fact.importSpecifier === matcher.value
        : fact.importSpecifier!.startsWith(matcher.value),
    );
  const resourceSelected =
    fact.resource !== undefined &&
    rule.resourceMatchers.some((matcher) =>
      matcher.kind === "exact"
        ? fact.resource === matcher.value
        : fact.resource!.startsWith(matcher.value),
    );
  return moduleSelected || resourceSelected;
}

/**
 * Derives an accountable platform owner from a repository source path.
 * @param sourcePath Stable repository-relative path.
 * @returns Stable owner identifier suitable for reviewed baseline metadata.
 */
function ownerForPath(sourcePath: string): string {
  const [family, name] = sourcePath.split("/");
  if (family === "apps" && name) return `${name}-platform`;
  if (family === "packages" && name === "integrations") {
    const integration = sourcePath.split("/")[2];
    return integration
      ? `${integration}-integrations`
      : "integrations-platform";
  }
  if (family === "packages" && name === "db") return "database-platform";
  if (family === "packages" && name) return `${name}-platform`;
  if (family === "services" && name) return `${name}-service`;
  return "architecture-platform";
}

/**
 * Determines whether an exact path is an eligible test or fixture exception.
 * @param sourcePath Stable repository-relative source path.
 * @returns True when the path names a test or fixture file.
 */
function isTestOrFixturePath(sourcePath: string): boolean {
  const segments = sourcePath.split("/");
  const filename = segments.at(-1) ?? "";
  return (
    segments.includes("__tests__") ||
    segments.includes("fixtures") ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filename)
  );
}

/**
 * Compares direct violation candidates by stable review identity.
 * @param left First direct violation candidate.
 * @param right Second direct violation candidate.
 * @returns Negative, zero, or positive canonical ordering result.
 */
function compareDirectViolationCandidates(
  left: DirectViolationCandidate,
  right: DirectViolationCandidate,
): number {
  return (
    compareStableStrings(left.ruleId, right.ruleId) ||
    compareStableStrings(left.sourcePath, right.sourcePath) ||
    left.line - right.line ||
    left.column - right.column ||
    compareStableStrings(left.evidenceKind, right.evidenceKind) ||
    compareStableStrings(
      left.importSpecifier ?? "",
      right.importSpecifier ?? "",
    ) ||
    compareStableStrings(left.resource ?? "", right.resource ?? "")
  );
}

/**
 * Projects direct inventory matches outside approved roots into review candidates.
 * @param inventory Deterministic repository source inventory.
 * @param config Validated architecture ownership configuration.
 * @returns Canonically sorted baseline or exact-exception review candidates.
 */
export function proposeDirectViolations(
  inventory: ArchitectureInventory,
  config: ArchitectureConfig,
): DirectViolationCandidate[] {
  const candidates: DirectViolationCandidate[] = [];
  const validatedConfig = architectureConfigSchema.parse(config);
  for (const fact of architectureInventorySchema.parse(inventory).facts) {
    for (const rule of validatedConfig.rules) {
      if (!directlySelectsRule(fact, rule)) continue;
      const isApprovedRoot = rule.ownershipRootIds.some((rootId) => {
        const root = validatedConfig.ownershipRoots.find(
          (candidate) => candidate.id === rootId,
        );
        return root !== undefined && fact.sourcePath.startsWith(root.path);
      });
      if (isApprovedRoot) continue;
      const isExactException = validatedConfig.exactExceptions.some(
        (exception) =>
          exception.ruleId === rule.id &&
          exception.sourcePath === fact.sourcePath,
      );
      if (isExactException) continue;

      candidates.push(
        directViolationCandidateSchema.parse({
          schemaVersion: 1,
          ruleId: rule.id,
          domain: rule.domain,
          sourcePath: fact.sourcePath,
          line: fact.line,
          column: fact.column,
          evidenceKind: fact.kind,
          ...(fact.importSpecifier
            ? { importSpecifier: fact.importSpecifier }
            : {}),
          ...(fact.resource ? { resource: fact.resource } : {}),
          owner: ownerForPath(fact.sourcePath),
          rationale: `Reviewed direct ${rule.domain} match selected by ${rule.id}; migrate it into an approved ownership root.`,
          proposedDisposition: isTestOrFixturePath(fact.sourcePath)
            ? "exact-exception-review"
            : "baseline-review",
        }),
      );
    }
  }
  return candidates.sort(compareDirectViolationCandidates);
}

/**
 * Serializes direct violation candidates for deterministic owner review.
 * @param candidates Direct candidates produced from a repository inventory.
 * @returns Stable pretty-printed JSON with one trailing newline.
 */
export function serializeDirectViolationReview(
  candidates: readonly DirectViolationCandidate[],
): string {
  const validated = candidates
    .map((candidate) => directViolationCandidateSchema.parse(candidate))
    .sort(compareDirectViolationCandidates);
  return `${JSON.stringify({ schemaVersion: 1, candidates: validated }, null, 2)}\n`;
}

/**
 * Inventories tracked repository source without modifying files or baselines.
 * @param options Repository root, source roots, and optional fixture file list.
 * @returns Deterministic structured facts and secret-safe parse failures.
 */
export async function inventoryRepository(
  options: InventoryRepositoryOptions,
): Promise<ArchitectureInventory> {
  const repoRoot = resolve(options.repoRoot);
  const sourcePaths = selectSourceFiles(options, repoRoot);
  const facts: InventoryFact[] = [];
  const parseErrors: InventoryParseError[] = [];

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
    facts.push(...extractFacts(sourcePath, sourceFile));
  }

  return architectureInventorySchema.parse({
    schemaVersion: 1,
    filesScanned: sourcePaths.length,
    facts: facts.sort(compareFacts),
    parseErrors: parseErrors.sort((left, right) =>
      compareStableStrings(left.sourcePath, right.sourcePath),
    ),
  });
}

/**
 * Serializes an inventory in canonical human-reviewable JSON form.
 * @param inventory Structured architecture inventory.
 * @returns Stable pretty-printed JSON with one trailing newline.
 */
export function serializeInventory(inventory: ArchitectureInventory): string {
  return `${JSON.stringify(architectureInventorySchema.parse(inventory), null, 2)}\n`;
}
