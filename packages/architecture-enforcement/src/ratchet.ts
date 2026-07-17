import {
  architectureBaselineSchema,
  architectureFindingSchema,
  type ArchitectureBaseline,
  type ArchitectureFinding,
  type BaselineEntry,
} from "./contracts.js";
import { compareStableStrings } from "./stable-order.js";

/** Outcome returned by the architecture debt comparison. */
export type ArchitectureComparisonStatus =
  | "new-debt"
  | "baseline-reduction-required"
  | "baseline-update-required"
  | "clean";

/** Stable identity transition for one moved architecture violation. */
export interface ArchitectureRename {
  /** Semantic violation identity that remained unresolved. */
  semanticKey: string;
  /** Reviewed instance identity recorded by the baseline. */
  previousInstanceKey: string;
  /** Current instance identity emitted after the move. */
  currentInstanceKey: string;
}

/** Deterministic, secret-safe result of comparing current debt to baselines. */
export interface ArchitectureComparison {
  /** Version of the comparison output contract. */
  schemaVersion: 1;
  /** Highest-precedence action required by the comparison. */
  status: ArchitectureComparisonStatus;
  /** Current findings that have no reviewed baseline instance. */
  additions: ArchitectureFinding[];
  /** Reviewed findings that no longer exist in the current analyzer output. */
  removals: ArchitectureFinding[];
  /** Same-semantic findings whose per-instance identity moved. */
  renames: ArchitectureRename[];
}

/** Required database and provider baselines for one ratchet comparison. */
export interface ArchitectureBaselines {
  /** Reviewed database-boundary debt. */
  database: ArchitectureBaseline;
  /** Reviewed provider-boundary debt. */
  provider: ArchitectureBaseline;
}

/** Inputs accepted by the architecture debt ratchet. */
export interface CompareArchitectureDebtInput {
  /** Strict reviewed baselines keyed by their architecture domain. */
  baselines: ArchitectureBaselines;
  /** Current strict findings emitted by the architecture analyzer. */
  findings: readonly ArchitectureFinding[];
}

const FINDING_FIELDS = [
  "schemaVersion",
  "ruleId",
  "domain",
  "sourcePath",
  "line",
  "column",
  "evidenceKind",
  "importSpecifier",
  "resource",
  "resolvedTarget",
  "semanticKey",
  "instanceKey",
] as const;

/**
 * Projects a reviewed entry onto the public secret-safe finding contract.
 * @param entry Reviewed baseline entry with ownership metadata.
 * @returns Finding identity without owner or rationale review fields.
 */
function findingFromBaseline(entry: BaselineEntry): ArchitectureFinding {
  return architectureFindingSchema.parse(
    Object.fromEntries(
      FINDING_FIELDS.flatMap((field) =>
        entry[field] === undefined ? [] : [[field, entry[field]]],
      ),
    ),
  );
}

/**
 * Builds the hash-relevant semantic identity used to detect key collisions.
 * @param finding Current or reviewed architecture finding.
 * @returns Stable comparison string excluding presentation-only import spelling.
 */
function semanticIdentity(finding: ArchitectureFinding): string {
  return JSON.stringify([
    finding.ruleId,
    finding.domain,
    finding.evidenceKind,
    finding.resource ?? null,
    finding.resolvedTarget,
  ]);
}

/**
 * Builds the hash-relevant instance identity used to validate exact matches.
 * @param finding Current or reviewed architecture finding.
 * @returns Stable instance comparison string.
 */
function instanceIdentity(finding: ArchitectureFinding): string {
  return JSON.stringify([
    semanticIdentity(finding),
    finding.sourcePath,
    finding.line,
    finding.column,
  ]);
}

/**
 * Sorts findings by their stable instance identity.
 * @param findings Findings whose traversal order is not semantically meaningful.
 * @returns Fresh canonically ordered array.
 */
function sortFindings(
  findings: readonly ArchitectureFinding[],
): ArchitectureFinding[] {
  return [...findings].sort((left, right) =>
    compareStableStrings(left.instanceKey, right.instanceKey),
  );
}

/**
 * Sorts rename records by semantic and per-instance identities.
 * @param renames Rename records whose discovery order is not meaningful.
 * @returns Fresh canonically ordered array.
 */
function sortRenames(renames: readonly ArchitectureRename[]): ArchitectureRename[] {
  return [...renames].sort(
    (left, right) =>
      compareStableStrings(left.semanticKey, right.semanticKey) ||
      compareStableStrings(
        left.previousInstanceKey,
        right.previousInstanceKey,
      ) ||
      compareStableStrings(left.currentInstanceKey, right.currentInstanceKey),
  );
}

/**
 * Rejects duplicate instance identities before comparison.
 * @param findings Validated findings to index.
 * @param label Input label used in the diagnostic.
 * @returns Findings indexed by unique instance key.
 * @throws When an instance key appears more than once.
 */
function indexUniqueInstances(
  findings: readonly ArchitectureFinding[],
  label: string,
): Map<string, ArchitectureFinding> {
  const indexed = new Map<string, ArchitectureFinding>();
  for (const finding of findings) {
    if (indexed.has(finding.instanceKey)) {
      throw new Error(
        `${label} contains duplicate instanceKey ${finding.instanceKey}`,
      );
    }
    indexed.set(finding.instanceKey, finding);
  }
  return indexed;
}

/**
 * Verifies that a semantic hash never represents contradictory evidence.
 * @param findings Validated current and reviewed findings.
 * @throws When one semantic key maps to more than one semantic identity.
 */
function assertConsistentSemanticKeys(
  findings: readonly ArchitectureFinding[],
): void {
  const identities = new Map<string, string>();
  for (const finding of findings) {
    const identity = semanticIdentity(finding);
    const previous = identities.get(finding.semanticKey);
    if (previous !== undefined && previous !== identity) {
      throw new Error(
        `semanticKey ${finding.semanticKey} represents contradictory findings`,
      );
    }
    identities.set(finding.semanticKey, identity);
  }
}

/**
 * Groups unmatched findings by domain, rule, and semantic identity.
 * @param findings Findings remaining after exact instance matching.
 * @returns Stable grouping used for many-instance rename pairing.
 */
function groupBySemanticIdentity(
  findings: readonly ArchitectureFinding[],
): Map<string, ArchitectureFinding[]> {
  const groups = new Map<string, ArchitectureFinding[]>();
  for (const finding of findings) {
    const key = `${finding.domain}\0${finding.ruleId}\0${finding.semanticKey}`;
    const group = groups.get(key) ?? [];
    group.push(finding);
    groups.set(key, group);
  }
  for (const [key, group] of groups) groups.set(key, sortFindings(group));
  return groups;
}

/**
 * Selects the required result status using fail-closed precedence.
 * @param additions Unreviewed current debt.
 * @param removals Stale reviewed debt.
 * @param renames Moved reviewed debt.
 * @returns Highest-priority action required for the comparison.
 */
function comparisonStatus(
  additions: readonly ArchitectureFinding[],
  removals: readonly ArchitectureFinding[],
  renames: readonly ArchitectureRename[],
): ArchitectureComparisonStatus {
  if (additions.length > 0) return "new-debt";
  if (removals.length > 0) return "baseline-reduction-required";
  if (renames.length > 0) return "baseline-update-required";
  return "clean";
}

/**
 * Compares current analyzer findings to strict reviewed baselines.
 * @param input Domain baselines and current architecture findings.
 * @returns Deterministic additions, removals, renames, and required status.
 * @throws When inputs are malformed, duplicated, domain-mismatched, or contradictory.
 */
export function compareArchitectureDebt(
  input: CompareArchitectureDebtInput,
): ArchitectureComparison {
  const database = architectureBaselineSchema.parse(input.baselines.database);
  const provider = architectureBaselineSchema.parse(input.baselines.provider);
  if (database.domain !== "database") {
    throw new Error("database baseline must declare the database domain");
  }
  if (provider.domain !== "provider") {
    throw new Error("provider baseline must declare the provider domain");
  }

  const baselineFindings = [
    ...database.entries.map(findingFromBaseline),
    ...provider.entries.map(findingFromBaseline),
  ];
  const currentFindings = input.findings.map((finding) =>
    architectureFindingSchema.parse(finding),
  );
  const baselineByInstance = indexUniqueInstances(
    baselineFindings,
    "architecture baselines",
  );
  const currentByInstance = indexUniqueInstances(
    currentFindings,
    "current findings",
  );
  assertConsistentSemanticKeys([...baselineFindings, ...currentFindings]);

  const unmatchedBaseline = new Map(baselineByInstance);
  const unmatchedCurrent = new Map(currentByInstance);
  for (const [instanceKey, current] of currentByInstance) {
    const reviewed = baselineByInstance.get(instanceKey);
    if (!reviewed) continue;
    if (instanceIdentity(reviewed) !== instanceIdentity(current)) {
      throw new Error(
        `instanceKey ${instanceKey} represents contradictory findings`,
      );
    }
    unmatchedBaseline.delete(instanceKey);
    unmatchedCurrent.delete(instanceKey);
  }

  const baselineGroups = groupBySemanticIdentity([
    ...unmatchedBaseline.values(),
  ]);
  const currentGroups = groupBySemanticIdentity([...unmatchedCurrent.values()]);
  const groupKeys = [...new Set([...baselineGroups.keys(), ...currentGroups.keys()])]
    .sort(compareStableStrings);
  const additions: ArchitectureFinding[] = [];
  const removals: ArchitectureFinding[] = [];
  const renames: ArchitectureRename[] = [];

  for (const groupKey of groupKeys) {
    const reviewed = baselineGroups.get(groupKey) ?? [];
    const current = currentGroups.get(groupKey) ?? [];
    const pairedCount = Math.min(reviewed.length, current.length);
    for (let index = 0; index < pairedCount; index += 1) {
      const previous = reviewed[index];
      const next = current[index];
      if (!previous || !next) continue;
      renames.push({
        semanticKey: previous.semanticKey,
        previousInstanceKey: previous.instanceKey,
        currentInstanceKey: next.instanceKey,
      });
    }
    additions.push(...current.slice(pairedCount));
    removals.push(...reviewed.slice(pairedCount));
  }

  const stableAdditions = sortFindings(additions);
  const stableRemovals = sortFindings(removals);
  const stableRenames = sortRenames(renames);
  return {
    schemaVersion: 1,
    status: comparisonStatus(
      stableAdditions,
      stableRemovals,
      stableRenames,
    ),
    additions: stableAdditions,
    removals: stableRemovals,
    renames: stableRenames,
  };
}

/**
 * Serializes a comparison to deterministic pretty JSON.
 * @param comparison Ratchet result returned by compareArchitectureDebt.
 * @returns Byte-stable JSON with one trailing newline.
 */
export function serializeArchitectureComparison(
  comparison: ArchitectureComparison,
): string {
  const normalized: ArchitectureComparison = {
    schemaVersion: 1,
    status: comparison.status,
    additions: sortFindings(
      comparison.additions.map((finding) =>
        architectureFindingSchema.parse(finding),
      ),
    ),
    removals: sortFindings(
      comparison.removals.map((finding) =>
        architectureFindingSchema.parse(finding),
      ),
    ),
    renames: sortRenames(comparison.renames),
  };
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

/**
 * Formats concise secret-safe diagnostics for command-line users.
 * @param comparison Ratchet result returned by compareArchitectureDebt.
 * @returns Stable line-oriented summary without source bodies or review metadata.
 */
export function formatArchitectureComparison(
  comparison: ArchitectureComparison,
): string {
  const normalized = JSON.parse(
    serializeArchitectureComparison(comparison),
  ) as ArchitectureComparison;
  const lines = [
    `architecture debt: ${normalized.status} (additions=${normalized.additions.length}, removals=${normalized.removals.length}, renames=${normalized.renames.length})`,
  ];
  for (const finding of normalized.additions) {
    lines.push(
      `+ ${finding.ruleId} ${finding.evidenceKind} ${finding.sourcePath}:${finding.line}:${finding.column} -> ${finding.resolvedTarget} [${finding.instanceKey.slice(0, 12)}]`,
    );
  }
  for (const finding of normalized.removals) {
    lines.push(
      `- ${finding.ruleId} ${finding.evidenceKind} ${finding.sourcePath}:${finding.line}:${finding.column} -> ${finding.resolvedTarget} [${finding.instanceKey.slice(0, 12)}]`,
    );
  }
  for (const rename of normalized.renames) {
    lines.push(
      `~ ${rename.semanticKey.slice(0, 12)} ${rename.previousInstanceKey.slice(0, 12)} -> ${rename.currentInstanceKey.slice(0, 12)}`,
    );
  }
  return `${lines.join("\n")}\n`;
}
