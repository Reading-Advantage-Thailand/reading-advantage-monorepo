import { z } from "zod";
import ownershipMapData from "./config/ownership-map.v1.json";
import {
  architectureConfigSchema,
  findingKindSchema,
  policyResourceSchema,
  type ArchitectureConfig,
} from "./contracts.js";

const RULE_ID_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const GLOB_OR_PATH_CHARACTERS = new Set(["*", "?", "{", "}", "\\"]);

/**
 * Detects unsafe glob, path-separator, or control characters.
 * @param value Candidate path or module value.
 * @returns True when the value cannot participate in an exact policy match.
 */
function hasUnsafePolicyCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      codePoint <= 31 ||
      codePoint === 127 ||
      GLOB_OR_PATH_CHARACTERS.has(character)
    );
  });
}

const repositoryFileSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.endsWith("/") &&
      !value.includes("//") &&
      !hasUnsafePolicyCharacter(value) &&
      value.split("/").every((segment) => segment !== "." && segment !== ".."),
    "must be an exact normalized repository-relative file path",
  );

const resolvedTargetSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine(
    (value) =>
      value.startsWith("external:")
        ? value.length > "external:".length &&
          !hasUnsafePolicyCharacter(value.slice("external:".length))
        : repositoryFileSchema.safeParse(value).success,
    "must be an exact repository file or external module target",
  );

/** Runtime contract for a structured ownership decision candidate. */
export const ownershipCandidateSchema = z
  .object({
    ruleId: z.string().regex(RULE_ID_PATTERN),
    sourcePath: repositoryFileSchema,
    evidenceKind: findingKindSchema,
    importSpecifier: z
      .string()
      .trim()
      .min(1)
      .max(256)
      .refine((value) => !hasUnsafePolicyCharacter(value))
      .optional(),
    resource: policyResourceSchema.optional(),
    resolvedTarget: resolvedTargetSchema,
  })
  .strict();

/** Structured input used to evaluate one architecture ownership finding. */
export type OwnershipCandidate = z.infer<typeof ownershipCandidateSchema>;

/** Stable reason attached to an ownership decision. */
export type OwnershipReasonCode =
  | "approved-ownership-root"
  | "exact-exception"
  | "outside-approved-root"
  | "rule-not-applicable";

/** Allowed ownership decision with the matched policy evidence. */
export interface AllowedOwnershipDecision {
  /** Indicates that the candidate does not violate the selected rule. */
  status: "allowed";
  /** Stable machine-readable explanation for the allowance. */
  reasonCode: Exclude<OwnershipReasonCode, "outside-approved-root">;
  /** Rule used to make the decision. */
  ruleId: string;
  /** Named ownership root that approved the source, when applicable. */
  ownershipRootId?: string;
  /** Exact reviewed exception that approved the source, when applicable. */
  exceptionId?: string;
}

/** Denied ownership decision for a source outside every approved root. */
export interface ViolatingOwnershipDecision {
  /** Indicates that the candidate violates the selected rule. */
  status: "violation";
  /** Stable machine-readable explanation for the denial. */
  reasonCode: "outside-approved-root";
  /** Rule used to make the decision. */
  ruleId: string;
}

/** Result of evaluating one structured candidate against the ownership map. */
export type OwnershipDecision =
  | AllowedOwnershipDecision
  | ViolatingOwnershipDecision;

/**
 * Loads and validates the canonical version-one ownership map.
 * @returns A fresh validated ownership configuration.
 * @throws When the committed ownership map violates its strict runtime contract.
 */
export function loadOwnershipMap(): ArchitectureConfig {
  return architectureConfigSchema.parse(ownershipMapData);
}

/**
 * Tests whether a module specifier matches one exact or prefix selector.
 * @param kind Matcher behavior declared by the selected architecture rule.
 * @param expected Exact module name or slash-terminated package prefix.
 * @param actual Candidate module specifier.
 * @returns True when the candidate module is selected by the matcher.
 */
function matchesModule(
  kind: "exact" | "prefix",
  expected: string,
  actual: string,
): boolean {
  return kind === "exact" ? actual === expected : actual.startsWith(expected);
}

/**
 * Tests whether a repository file belongs to an exact directory root.
 * @param filePath Normalized repository-relative file path.
 * @param root Slash-terminated normalized repository directory.
 * @returns True when the file is a descendant of the directory.
 */
function belongsToRoot(filePath: string, root: string): boolean {
  return filePath.startsWith(root);
}

/**
 * Evaluates one analyzer candidate against a validated ownership map.
 * @param config Validated architecture ownership configuration.
 * @param input Untrusted structured analyzer candidate.
 * @returns A stable allowed or violation decision with matched evidence IDs.
 * @throws When the candidate is malformed or references an unknown rule.
 */
export function evaluateOwnership(
  config: ArchitectureConfig,
  input: OwnershipCandidate,
): OwnershipDecision {
  const validatedConfig = architectureConfigSchema.parse(config);
  const candidate = ownershipCandidateSchema.parse(input);
  const rule = validatedConfig.rules.find(
    (configuredRule) => configuredRule.id === candidate.ruleId,
  );
  if (!rule) {
    throw new Error(`Unknown architecture rule: ${candidate.ruleId}`);
  }

  const moduleSelected =
    candidate.importSpecifier !== undefined &&
    rule.moduleMatchers.some((matcher) =>
      matchesModule(matcher.kind, matcher.value, candidate.importSpecifier!),
    );
  const targetSelected =
    !candidate.resolvedTarget.startsWith("external:") &&
    rule.resolvedTargetRoots.some((root) =>
      belongsToRoot(candidate.resolvedTarget, root),
    );
  const resourceSelected =
    candidate.resource !== undefined &&
    rule.resourceMatchers.some((matcher) =>
      matchesModule(matcher.kind, matcher.value, candidate.resource!),
    );

  if (!moduleSelected && !targetSelected && !resourceSelected) {
    return {
      status: "allowed",
      reasonCode: "rule-not-applicable",
      ruleId: rule.id,
    };
  }

  const exception = validatedConfig.exactExceptions.find(
    (configuredException) =>
      configuredException.ruleId === rule.id &&
      configuredException.sourcePath === candidate.sourcePath,
  );
  if (exception) {
    return {
      status: "allowed",
      reasonCode: "exact-exception",
      ruleId: rule.id,
      exceptionId: exception.id,
    };
  }

  const root = rule.ownershipRootIds
    .map((rootId) =>
      validatedConfig.ownershipRoots.find(
        (configuredRoot) => configuredRoot.id === rootId,
      ),
    )
    .find(
      (configuredRoot) =>
        configuredRoot !== undefined &&
        belongsToRoot(candidate.sourcePath, configuredRoot.path),
    );
  if (root) {
    return {
      status: "allowed",
      reasonCode: "approved-ownership-root",
      ruleId: rule.id,
      ownershipRootId: root.id,
    };
  }

  return {
    status: "violation",
    reasonCode: "outside-approved-root",
    ruleId: rule.id,
  };
}
