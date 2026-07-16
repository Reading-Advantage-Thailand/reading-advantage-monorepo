import { createHash } from "node:crypto";
import {
  architectureBaselineSchema,
  architectureConfigSchema,
  exactExceptionSchema,
  type ArchitectureBaseline,
  type ArchitectureConfig,
  type BaselineEntry,
  type ExactException,
} from "./contracts.js";
import {
  directViolationCandidateSchema,
  type DirectViolationCandidate,
} from "./inventory.js";
import type { WorkspaceModuleTargets } from "./workspace-resolution.js";
import { compareStableStrings } from "./stable-order.js";

const EMPTY_WORKSPACE_TARGETS: WorkspaceModuleTargets = new Map();

/**
 * Hashes a stable architecture identity using SHA-256.
 * @param value Canonical JSON-compatible identity value.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

/**
 * Converts JSON-compatible data into key-sorted compact JSON.
 * @param value Value whose object keys require canonical ordering.
 * @returns Deterministic compact JSON representation.
 */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort(compareStableStrings)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Sorts exact or prefix matcher records by their stable identity.
 * @param matchers Rule matchers whose order is not semantically meaningful.
 * @returns Fresh canonically sorted matcher records.
 */
function sortedMatchers<T extends { kind: string; value: string }>(
  matchers: readonly T[],
): T[] {
  return [...matchers].sort(
    (left, right) =>
      compareStableStrings(left.kind, right.kind) ||
      compareStableStrings(left.value, right.value),
  );
}

/**
 * Produces the semantic policy projection used by a domain baseline.
 * @param config Validated architecture ownership configuration.
 * @param domain Baseline domain whose rule semantics are selected.
 * @returns Order-independent rule, root, and exception policy projection.
 */
function rulesetProjection(
  config: ArchitectureConfig,
  domain: ArchitectureBaseline["domain"],
): unknown {
  const validated = architectureConfigSchema.parse(config);
  const rules = validated.rules
    .filter((rule) => rule.domain === domain)
    .map((rule) => ({
      ...rule,
      findingKinds: [...rule.findingKinds].sort(),
      moduleMatchers: sortedMatchers(rule.moduleMatchers),
      resourceMatchers: sortedMatchers(rule.resourceMatchers),
      resolvedTargetRoots: [...rule.resolvedTargetRoots].sort(),
      ownershipRootIds: [...rule.ownershipRootIds].sort(),
    }))
    .sort((left, right) => compareStableStrings(left.id, right.id));
  const ruleIds = new Set(rules.map((rule) => rule.id));
  const ownershipRoots = validated.ownershipRoots
    .filter((root) => root.domain === domain)
    .map((root) => ({ ...root, ruleIds: [...root.ruleIds].sort() }))
    .sort((left, right) => compareStableStrings(left.id, right.id));
  const exactExceptions = validated.exactExceptions
    .filter((exception) => ruleIds.has(exception.ruleId))
    .sort(
      (left, right) =>
        compareStableStrings(left.ruleId, right.ruleId) ||
        compareStableStrings(left.sourcePath, right.sourcePath) ||
        compareStableStrings(left.id, right.id),
    );
  return { schemaVersion: 1, domain, rules, ownershipRoots, exactExceptions };
}

/**
 * Computes the canonical policy hash recorded by a domain baseline.
 * @param config Architecture rules, roots, and exact exceptions.
 * @param domain Database or provider policy domain.
 * @returns SHA-256 digest that changes when domain policy semantics change.
 */
export function computeRulesetHash(
  config: ArchitectureConfig,
  domain: ArchitectureBaseline["domain"],
): string {
  return sha256(rulesetProjection(config, domain));
}

/**
 * Maps direct review evidence to a stable resolved target identity.
 * @param candidate Reviewed direct architecture violation candidate.
 * @returns External module or resource namespace selected by the direct pass.
 */
function directResolvedTarget(
  candidate: DirectViolationCandidate,
  workspaceTargets: WorkspaceModuleTargets,
): string {
  if (candidate.importSpecifier) {
    const workspaceTarget = workspaceTargets.get(candidate.importSpecifier);
    if (workspaceTarget) return workspaceTarget;
    if (candidate.importSpecifier.startsWith("@reading-advantage/")) {
      throw new Error(
        `Workspace import ${candidate.importSpecifier} has no exact source resolution`,
      );
    }
    return `external:${candidate.importSpecifier}`;
  }
  const namespace = candidate.resource?.split(":", 1)[0];
  if (namespace) return `external:${namespace}`;
  throw new Error(
    `${candidate.sourcePath}:${candidate.line}:${candidate.column} has no direct target evidence`,
  );
}

/**
 * Creates one reviewed per-instance baseline entry from direct evidence.
 * @param input Untrusted direct violation review candidate.
 * @returns Strict baseline entry with stable semantic and instance hashes.
 */
function createBaselineEntry(
  input: DirectViolationCandidate,
  workspaceTargets: WorkspaceModuleTargets,
): BaselineEntry {
  const candidate = directViolationCandidateSchema.parse(input);
  if (candidate.proposedDisposition !== "baseline-review") {
    throw new Error(
      `${candidate.ruleId} ${candidate.sourcePath} still requires exact exception review`,
    );
  }
  const resolvedTarget = directResolvedTarget(candidate, workspaceTargets);
  const semanticKey = sha256({
    schemaVersion: 1,
    ruleId: candidate.ruleId,
    domain: candidate.domain,
    evidenceKind: candidate.evidenceKind,
    resource: candidate.resource ?? null,
    resolvedTarget,
  });
  const instanceKey = sha256({
    semanticKey,
    sourcePath: candidate.sourcePath,
    line: candidate.line,
    column: candidate.column,
  });
  return {
    schemaVersion: 1,
    ruleId: candidate.ruleId,
    domain: candidate.domain,
    sourcePath: candidate.sourcePath,
    line: candidate.line,
    column: candidate.column,
    evidenceKind: candidate.evidenceKind,
    ...(candidate.importSpecifier
      ? { importSpecifier: candidate.importSpecifier }
      : {}),
    ...(candidate.resource ? { resource: candidate.resource } : {}),
    resolvedTarget,
    semanticKey,
    instanceKey,
    owner: candidate.owner,
    rationale: candidate.rationale,
  };
}

/**
 * Freezes reviewed production candidates into one canonical domain baseline.
 * @param candidates Reviewed direct violation candidates from the inventory.
 * @param config Validated architecture policy used to compute the ruleset hash.
 * @param domain Database or provider baseline domain.
 * @param workspaceTargets Exact workspace imports resolved to repository source files.
 * @returns Strict deterministic baseline sorted by per-instance identity.
 * @throws When a selected candidate still requires exact exception review.
 */
export function createArchitectureBaseline(
  candidates: readonly DirectViolationCandidate[],
  config: ArchitectureConfig,
  domain: ArchitectureBaseline["domain"],
  workspaceTargets: WorkspaceModuleTargets = EMPTY_WORKSPACE_TARGETS,
): ArchitectureBaseline {
  const entries = candidates
    .map((candidate) => directViolationCandidateSchema.parse(candidate))
    .filter((candidate) => candidate.domain === domain)
    .map((candidate) => createBaselineEntry(candidate, workspaceTargets))
    .sort((left, right) =>
      compareStableStrings(left.instanceKey, right.instanceKey),
    );
  return architectureBaselineSchema.parse({
    schemaVersion: 1,
    domain,
    rulesetHash: computeRulesetHash(config, domain),
    entries,
  });
}

/**
 * Converts reviewed test and fixture candidates into exact per-rule exceptions.
 * @param candidates Reviewed direct violation candidates from the inventory.
 * @param config Validated architecture policy that owns candidate rules.
 * @returns Deduplicated exact exceptions sorted by rule and source path.
 */
export function createExactExceptions(
  candidates: readonly DirectViolationCandidate[],
  config: ArchitectureConfig,
): ExactException[] {
  const validatedConfig = architectureConfigSchema.parse(config);
  const ruleIds = new Set(validatedConfig.rules.map((rule) => rule.id));
  const unique = new Map<string, DirectViolationCandidate>();
  for (const input of candidates) {
    const candidate = directViolationCandidateSchema.parse(input);
    if (candidate.proposedDisposition !== "exact-exception-review") continue;
    if (!ruleIds.has(candidate.ruleId)) {
      throw new Error(`Unknown architecture rule: ${candidate.ruleId}`);
    }
    const key = `${candidate.ruleId}\0${candidate.sourcePath}`;
    const existing = unique.get(key);
    if (existing && existing.owner !== candidate.owner) {
      throw new Error(`Conflicting owners for exact exception ${key}`);
    }
    unique.set(key, existing ?? candidate);
  }
  return [...unique.values()]
    .map((candidate) =>
      exactExceptionSchema.parse({
        schemaVersion: 1,
        id: `reviewed-${sha256({
          ruleId: candidate.ruleId,
          sourcePath: candidate.sourcePath,
        }).slice(0, 16)}`,
        ruleId: candidate.ruleId,
        sourcePath: candidate.sourcePath,
        owner: candidate.owner,
        rationale: `Reviewed exact test or fixture exception for ${candidate.ruleId}; production code remains subject to the rule.`,
      }),
    )
    .sort(
      (left, right) =>
        compareStableStrings(left.ruleId, right.ruleId) ||
        compareStableStrings(left.sourcePath, right.sourcePath),
    );
}

/**
 * Serializes a strict baseline as stable human-reviewable JSON.
 * @param baseline Architecture baseline to validate and serialize.
 * @returns Pretty-printed JSON with one trailing newline.
 */
export function serializeArchitectureBaseline(
  baseline: ArchitectureBaseline,
): string {
  return `${JSON.stringify(architectureBaselineSchema.parse(baseline), null, 2)}\n`;
}

/**
 * Validates a committed baseline against current policy and reviewed candidates.
 * @param input Untrusted committed baseline data.
 * @param candidates Current reviewed direct violation candidates.
 * @param config Current validated architecture ownership configuration.
 * @param expectedDomain Domain assigned to the configured baseline file.
 * @param workspaceTargets Exact workspace imports resolved to repository source files.
 * @returns The strict canonical baseline when policy and snapshot match.
 * @throws When schema, ruleset hash, ordering, or snapshot content has drifted.
 */
export function validateArchitectureBaseline(
  input: unknown,
  candidates: readonly DirectViolationCandidate[],
  config: ArchitectureConfig,
  expectedDomain: ArchitectureBaseline["domain"],
  workspaceTargets: WorkspaceModuleTargets = EMPTY_WORKSPACE_TARGETS,
): ArchitectureBaseline {
  const baseline = architectureBaselineSchema.parse(input);
  if (baseline.domain !== expectedDomain) {
    throw new Error(
      `Expected ${expectedDomain} baseline but received ${baseline.domain}`,
    );
  }
  const rulesetHash = computeRulesetHash(config, baseline.domain);
  if (baseline.rulesetHash !== rulesetHash) {
    throw new Error(
      `${baseline.domain} baseline ruleset hash does not match current policy`,
    );
  }
  const expected = createArchitectureBaseline(
    candidates,
    config,
    baseline.domain,
    workspaceTargets,
  );
  if (
    serializeArchitectureBaseline(baseline) !==
    serializeArchitectureBaseline(expected)
  ) {
    throw new Error(
      `${baseline.domain} baseline snapshot does not match reviewed direct violations`,
    );
  }
  return baseline;
}
