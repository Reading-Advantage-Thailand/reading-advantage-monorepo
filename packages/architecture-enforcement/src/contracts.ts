import { z } from "zod";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const RULE_ID_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const STABLE_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const OWNER_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const GLOB_CHARACTERS = new Set(["*", "?", "[", "]", "{", "}", "!"]);

/** Architecture boundary domain supported by the first enforcement ruleset. */
export const architectureDomainSchema = z.enum(["database", "provider"]);

/** Evidence shapes emitted by the architecture inventory and analyzer. */
export const findingKindSchema = z.enum([
  "static-import",
  "namespace-import",
  "dynamic-import",
  "commonjs-require",
  "re-export",
  "client-construction",
  "query-call",
  "environment-read",
  "policy-reference",
]);

/**
 * Detects control characters that would make diagnostics unstable or unsafe.
 * @param value Candidate configuration or diagnostic string.
 * @returns True when the value contains C0 or DEL control characters.
 */
function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

/**
 * Determines whether a path is an exact normalized repository-relative path.
 * @param value Candidate path from configuration or analyzer output.
 * @param directory Whether the path must identify a directory root.
 * @returns True when the path is exact, POSIX-normalized, and traversal-free.
 */
function isExactRepositoryPath(value: string, directory: boolean): boolean {
  if (
    value.length === 0 ||
    value !== value.trim() ||
    hasControlCharacter(value) ||
    value.startsWith("/") ||
    value.includes("\\") ||
    [...value].some((character) => GLOB_CHARACTERS.has(character)) ||
    value.includes("//")
  ) {
    return false;
  }
  if (directory !== value.endsWith("/")) return false;
  const withoutTrailingSlash = directory ? value.slice(0, -1) : value;
  const segments = withoutTrailingSlash.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

const directoryPathSchema = z
  .string()
  .max(512)
  .refine((value) => isExactRepositoryPath(value, true), {
    message:
      "must be an exact normalized repository-relative directory ending in /",
  });

const filePathSchema = z
  .string()
  .max(512)
  .refine((value) => isExactRepositoryPath(value, false), {
    message: "must be an exact normalized repository-relative file path",
  });

const ruleIdSchema = z.string().regex(RULE_ID_PATTERN);
const stableIdSchema = z.string().regex(STABLE_ID_PATTERN);
const ownerSchema = z.string().min(1).max(120).regex(OWNER_PATTERN);
const rationaleSchema = z.string().trim().min(12).max(1_000);
const sha256Schema = z.string().regex(SHA256_PATTERN);
const moduleSpecifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .refine(
    (value) =>
      !hasControlCharacter(value) &&
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !value.includes("://"),
    { message: "must be a stable single-line module specifier" },
  );

/** Namespaced resource identifier used for table and credential policy matches. */
export const policyResourceSchema = z
  .string()
  .trim()
  .min(3)
  .max(256)
  .regex(/^[a-z][a-z0-9-]*:[A-Za-z0-9._/-]+$/)
  .refine(
    (value) =>
      !hasControlCharacter(value) &&
      !value.includes("\\") &&
      ![...value].some((character) => GLOB_CHARACTERS.has(character)),
    { message: "must be an exact namespaced resource without glob syntax" },
  );
const resolvedTargetSchema = z
  .string()
  .max(512)
  .refine(
    (value) => {
      if (value.startsWith("external:")) {
        return moduleSpecifierSchema.safeParse(value.slice("external:".length))
          .success;
      }
      return isExactRepositoryPath(value, false);
    },
    {
      message:
        "must be a normalized repository file or an external: module reference",
    },
  );

const moduleMatcherSchema = z
  .object({
    kind: z.enum(["exact", "prefix"]),
    value: moduleSpecifierSchema,
  })
  .strict()
  .superRefine((matcher, context) => {
    if (
      [...matcher.value].some((character) => GLOB_CHARACTERS.has(character)) ||
      matcher.value.includes("\\")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "module matchers must use exact or prefix semantics, not globs",
        path: ["value"],
      });
    }
    if (matcher.kind === "prefix" && !matcher.value.endsWith("/")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "prefix module matchers must end in /",
        path: ["value"],
      });
    }
    if (matcher.kind === "exact" && matcher.value.endsWith("/")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "exact module matchers must not end in /",
        path: ["value"],
      });
    }
  });

const resourceMatcherSchema = z
  .object({
    kind: z.enum(["exact", "prefix"]),
    value: policyResourceSchema,
  })
  .strict()
  .superRefine((matcher, context) => {
    if (
      matcher.kind === "prefix" &&
      ![":", "/", "_", "-", "."].some((delimiter) =>
        matcher.value.endsWith(delimiter),
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "resource prefixes must end at a namespace or token boundary",
        path: ["value"],
      });
    }
  });

/** Strict version-one architecture rule contract. */
export const architectureRuleSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: ruleIdSchema,
    domain: architectureDomainSchema,
    description: z.string().trim().min(12).max(500),
    severity: z.literal("error"),
    findingKinds: z.array(findingKindSchema).min(1),
    moduleMatchers: z.array(moduleMatcherSchema),
    resourceMatchers: z.array(resourceMatcherSchema),
    resolvedTargetRoots: z.array(directoryPathSchema),
    ownershipRootIds: z.array(stableIdSchema),
  })
  .strict()
  .superRefine((rule, context) => {
    if (
      rule.moduleMatchers.length === 0 &&
      rule.resourceMatchers.length === 0 &&
      rule.resolvedTargetRoots.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "a rule must declare at least one module matcher or resolved target root",
        path: ["moduleMatchers"],
      });
    }
    for (const [field, values] of [
      ["findingKinds", rule.findingKinds],
      ["ownershipRootIds", rule.ownershipRootIds],
      ["resolvedTargetRoots", rule.resolvedTargetRoots],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} must not contain duplicates`,
          path: [field],
        });
      }
    }
    const matcherKeys = rule.moduleMatchers.map(
      (matcher) => `${matcher.kind}:${matcher.value}`,
    );
    if (new Set(matcherKeys).size !== matcherKeys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "moduleMatchers must not contain duplicates",
        path: ["moduleMatchers"],
      });
    }
    const resourceMatcherKeys = rule.resourceMatchers.map(
      (matcher) => `${matcher.kind}:${matcher.value}`,
    );
    if (new Set(resourceMatcherKeys).size !== resourceMatcherKeys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "resourceMatchers must not contain duplicates",
        path: ["resourceMatchers"],
      });
    }
  });

/** Strict version-one approved ownership-root contract. */
export const ownershipRootSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: stableIdSchema,
    domain: architectureDomainSchema,
    path: directoryPathSchema,
    kind: z.enum([
      "database",
      "domain",
      "adapter",
      "migration",
      "integration",
      "test",
    ]),
    ruleIds: z.array(ruleIdSchema).min(1),
    owner: ownerSchema,
    rationale: rationaleSchema,
  })
  .strict()
  .superRefine((root, context) => {
    if (new Set(root.ruleIds).size !== root.ruleIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ruleIds must not contain duplicates",
        path: ["ruleIds"],
      });
    }
  });

/** Strict version-one exact exception contract with no wildcard support. */
export const exactExceptionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: stableIdSchema,
    ruleId: ruleIdSchema,
    sourcePath: filePathSchema,
    owner: ownerSchema,
    rationale: rationaleSchema,
  })
  .strict()
  .superRefine((exception, context) => {
    const segments = exception.sourcePath.split("/");
    const filename = segments.at(-1) ?? "";
    const isTestOrFixture =
      segments.includes("__tests__") ||
      segments.includes("fixtures") ||
      /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filename);
    if (!isTestOrFixture) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "exact exceptions are limited to test and fixture files",
        path: ["sourcePath"],
      });
    }
  });

const findingIdentityShape = {
  schemaVersion: z.literal(1),
  ruleId: ruleIdSchema,
  domain: architectureDomainSchema,
  sourcePath: filePathSchema,
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  evidenceKind: findingKindSchema,
  importSpecifier: moduleSpecifierSchema.optional(),
  resource: policyResourceSchema.optional(),
  resolvedTarget: resolvedTargetSchema,
  semanticKey: sha256Schema,
  instanceKey: sha256Schema,
} as const;

/** Strict secret-safe architecture finding contract. */
export const architectureFindingSchema = z
  .object(findingIdentityShape)
  .strict();

/** Strict reviewed baseline-entry contract with accountable ownership. */
export const baselineEntrySchema = z
  .object({
    ...findingIdentityShape,
    owner: ownerSchema,
    rationale: rationaleSchema,
  })
  .strict();

/** Strict version-one domain baseline with canonical entry ordering. */
export const architectureBaselineSchema = z
  .object({
    schemaVersion: z.literal(1),
    domain: architectureDomainSchema,
    rulesetHash: sha256Schema,
    entries: z.array(baselineEntrySchema),
  })
  .strict()
  .superRefine((baseline, context) => {
    const keys = baseline.entries.map((entry) => entry.instanceKey);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "baseline instance keys must be unique",
        path: ["entries"],
      });
    }
    const sortedKeys = [...keys].sort((left, right) =>
      left.localeCompare(right),
    );
    if (keys.some((key, index) => key !== sortedKeys[index])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "baseline entries must be sorted by instanceKey",
        path: ["entries"],
      });
    }
    baseline.entries.forEach((entry, index) => {
      if (entry.domain !== baseline.domain) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "baseline entry domain must match baseline domain",
          path: ["entries", index, "domain"],
        });
      }
    });
  });

/** Strict version-one architecture configuration contract. */
export const architectureConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    rules: z.array(architectureRuleSchema).min(1),
    ownershipRoots: z.array(ownershipRootSchema).min(1),
    exactExceptions: z.array(exactExceptionSchema),
    baselineFiles: z
      .object({
        database: filePathSchema,
        provider: filePathSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((config, context) => {
    const ruleIds = config.rules.map((rule) => rule.id);
    const rootIds = config.ownershipRoots.map((root) => root.id);
    const exceptionIds = config.exactExceptions.map(
      (exception) => exception.id,
    );
    for (const [field, ids] of [
      ["rules", ruleIds],
      ["ownershipRoots", rootIds],
      ["exactExceptions", exceptionIds],
    ] as const) {
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} identifiers must be unique`,
          path: [field],
        });
      }
    }

    const rulesById = new Map(config.rules.map((rule) => [rule.id, rule]));
    const rootsById = new Map(
      config.ownershipRoots.map((root) => [root.id, root]),
    );
    config.rules.forEach((rule, ruleIndex) => {
      rule.ownershipRootIds.forEach((rootId) => {
        const root = rootsById.get(rootId);
        if (!root) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `unknown ownership root ${rootId}`,
            path: ["rules", ruleIndex, "ownershipRootIds"],
          });
        } else {
          if (root.domain !== rule.domain) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `ownership root ${rootId} has a different domain`,
              path: ["rules", ruleIndex, "ownershipRootIds"],
            });
          }
          if (!root.ruleIds.includes(rule.id)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `ownership root ${rootId} does not reference rule ${rule.id}`,
              path: ["rules", ruleIndex, "ownershipRootIds"],
            });
          }
        }
      });
    });
    config.ownershipRoots.forEach((root, rootIndex) => {
      root.ruleIds.forEach((ruleId) => {
        const rule = rulesById.get(ruleId);
        if (!rule) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `unknown rule ${ruleId}`,
            path: ["ownershipRoots", rootIndex, "ruleIds"],
          });
        } else {
          if (rule.domain !== root.domain) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `rule ${ruleId} has a different domain`,
              path: ["ownershipRoots", rootIndex, "ruleIds"],
            });
          }
          if (!rule.ownershipRootIds.includes(root.id)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `rule ${ruleId} does not reference ownership root ${root.id}`,
              path: ["ownershipRoots", rootIndex, "ruleIds"],
            });
          }
        }
      });
    });
    config.exactExceptions.forEach((exception, exceptionIndex) => {
      if (!rulesById.has(exception.ruleId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `unknown rule ${exception.ruleId}`,
          path: ["exactExceptions", exceptionIndex, "ruleId"],
        });
      }
    });
  });

/** Version-one architecture rule inferred from its runtime schema. */
export type ArchitectureRule = z.infer<typeof architectureRuleSchema>;

/** Approved ownership root inferred from its runtime schema. */
export type OwnershipRoot = z.infer<typeof ownershipRootSchema>;

/** Exact exception inferred from its runtime schema. */
export type ExactException = z.infer<typeof exactExceptionSchema>;

/** Secret-safe architecture finding inferred from its runtime schema. */
export type ArchitectureFinding = z.infer<typeof architectureFindingSchema>;

/** Reviewed architecture baseline entry inferred from its runtime schema. */
export type BaselineEntry = z.infer<typeof baselineEntrySchema>;

/** Version-one domain baseline inferred from its runtime schema. */
export type ArchitectureBaseline = z.infer<typeof architectureBaselineSchema>;

/** Architecture enforcement configuration inferred from its runtime schema. */
export type ArchitectureConfig = z.infer<typeof architectureConfigSchema>;
