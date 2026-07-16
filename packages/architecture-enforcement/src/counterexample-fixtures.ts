import { readFile } from "node:fs/promises";
import { posix, resolve } from "node:path";
import ts from "typescript";
import { z } from "zod";
import databaseCounterexampleData from "./config/database-counterexamples.v1.json";
import providerCounterexampleData from "./config/provider-counterexamples.v1.json";
import { findingKindSchema } from "./contracts.js";
import { compareStableStrings } from "./stable-order.js";

const exactFixturePathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (path) =>
      !path.startsWith("/") &&
      !path.includes("\\") &&
      !path.includes("//") &&
      !/[*!?{}]/.test(path) &&
      path.split("/").every((segment) => segment !== "." && segment !== ".."),
    "must be an exact traversal-free repository path",
  );

/** Runtime contract for one named architecture counterexample fixture. */
export const architectureCounterexampleSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    ruleId: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    expected: z.enum(["violation", "allowed"]),
    fixtureRoot: exactFixturePathSchema,
    sourcePath: exactFixturePathSchema,
    supportPaths: z.array(exactFixturePathSchema),
    resolverConfigPath: exactFixturePathSchema.optional(),
    expectedEvidenceKinds: z.array(findingKindSchema).min(1),
    rationale: z.string().trim().min(12),
  })
  .strict()
  .superRefine((fixture, context) => {
    if (new Set(fixture.supportPaths).size !== fixture.supportPaths.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "support paths must be unique",
        path: ["supportPaths"],
      });
    }
    if (fixture.supportPaths.includes(fixture.sourcePath)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "the primary source cannot also be a support path",
        path: ["supportPaths"],
      });
    }
  });

const counterexampleManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    cases: z.array(architectureCounterexampleSchema).min(1),
  })
  .strict()
  .superRefine((manifest, context) => {
    const ids = manifest.cases.map((fixture) => fixture.id);
    const paths = manifest.cases.map((fixture) =>
      posix.join(fixture.fixtureRoot, fixture.sourcePath),
    );
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "counterexample identifiers must be unique",
        path: ["cases"],
      });
    }
    if (new Set(paths).size !== paths.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "counterexample source paths must be unique",
        path: ["cases"],
      });
    }
  });

/** Named positive or negative architecture fixture inferred from its contract. */
export type ArchitectureCounterexample = z.infer<
  typeof architectureCounterexampleSchema
>;

/** Secret-safe syntax or resolver-config error found in a fixture source set. */
export interface CounterexampleParseError {
  /** Exact repository-relative fixture or resolver path. */
  sourcePath: string;
  /** Stable failure category without source bodies. */
  code: "FILE_READ_ERROR" | "TYPESCRIPT_PARSE_ERROR" | "RESOLVER_CONFIG_ERROR";
}

/** Result of validating fixture readability and TypeScript syntax. */
export interface CounterexampleSourceValidation {
  /** Number of unique TypeScript fixture files inspected. */
  filesChecked: number;
  /** Canonically sorted secret-safe fixture errors. */
  parseErrors: CounterexampleParseError[];
}

/**
 * Loads the canonical database positive and negative fixture matrix.
 * @returns Fresh strictly validated cases in stable identifier order.
 */
export function loadDatabaseCounterexamples(): ArchitectureCounterexample[] {
  return loadCounterexamples(databaseCounterexampleData);
}

/**
 * Loads one strict counterexample manifest in stable identifier order.
 * @param data Untrusted versioned manifest data.
 * @returns Fresh strictly validated counterexample cases.
 */
function loadCounterexamples(data: unknown): ArchitectureCounterexample[] {
  return counterexampleManifestSchema
    .parse(data)
    .cases.sort((left, right) => compareStableStrings(left.id, right.id));
}

/**
 * Loads the canonical provider positive and negative fixture matrix.
 * @returns Fresh strictly validated cases in stable identifier order.
 */
export function loadProviderCounterexamples(): ArchitectureCounterexample[] {
  return loadCounterexamples(providerCounterexampleData);
}

/**
 * Validates exact fixture paths without type-checking intentionally unresolved imports.
 * @param repoRoot Repository root containing the top-level test-fixtures directory.
 * @param fixtures Strict named fixture cases to inspect.
 * @returns File count and stable secret-safe read, parse, or resolver errors.
 */
export async function validateCounterexampleSources(
  repoRoot: string,
  fixtures: readonly ArchitectureCounterexample[],
): Promise<CounterexampleSourceValidation> {
  const validated = fixtures.map((fixture) =>
    architectureCounterexampleSchema.parse(fixture),
  );
  const paths = [
    ...new Set(
      validated.flatMap((fixture) =>
        [fixture.sourcePath, ...fixture.supportPaths].map((path) =>
          posix.join(fixture.fixtureRoot, path),
        ),
      ),
    ),
  ].sort(compareStableStrings);
  const parseErrors: CounterexampleParseError[] = [];
  for (const sourcePath of paths) {
    try {
      const source = await readFile(resolve(repoRoot, sourcePath), "utf8");
      const sourceFile = ts.createSourceFile(
        sourcePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const diagnostics = (
        sourceFile as ts.SourceFile & {
          parseDiagnostics: readonly ts.Diagnostic[];
        }
      ).parseDiagnostics;
      if (diagnostics.length > 0) {
        parseErrors.push({ sourcePath, code: "TYPESCRIPT_PARSE_ERROR" });
      }
    } catch {
      parseErrors.push({ sourcePath, code: "FILE_READ_ERROR" });
    }
  }
  for (const configPath of [
    ...new Set(
      validated.flatMap((fixture) =>
        fixture.resolverConfigPath
          ? [posix.join(fixture.fixtureRoot, fixture.resolverConfigPath)]
          : [],
      ),
    ),
  ].sort(compareStableStrings)) {
    try {
      JSON.parse(await readFile(resolve(repoRoot, configPath), "utf8"));
    } catch {
      parseErrors.push({
        sourcePath: configPath,
        code: "RESOLVER_CONFIG_ERROR",
      });
    }
  }
  return {
    filesChecked: paths.length,
    parseErrors: parseErrors.sort(
      (left, right) =>
        compareStableStrings(left.sourcePath, right.sourcePath) ||
        compareStableStrings(left.code, right.code),
    ),
  };
}
