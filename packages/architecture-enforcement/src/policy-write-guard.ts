/** Exact v2 destination set permitted by policy-aware reconciliation writes. */
export const V2_RECONCILIATION_DESTINATION_PATHS = [
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json",
  "packages/architecture-enforcement/src/config/ownership-map.v2.json",
  "packages/architecture-enforcement/src/config/baselines/database.v2.json",
  "packages/architecture-enforcement/src/config/baselines/provider.v2.json",
] as const;

/** Inputs accepted by the exact v2 write guard. */
export interface PolicyAwareWriteInput {
  /** Policy that authorizes the write. */
  policyVersion: unknown;
  /** Repository root containing the candidate artifacts. */
  repoRoot: string;
  /** Complete ordered destination set requested by the caller. */
  destinationPaths: readonly string[];
  /** Whether the request must remain mutation-free. */
  dryRun: boolean;
}

/** Result of exact destination validation before any bytes can be written. */
export interface PolicyAwareWriteResult {
  /** True only for the complete ordered v2 destination set. */
  allowed: boolean;
  /** True only when a non-dry request passes the destination guard. */
  applied: boolean;
}

/** Compares two destination arrays by exact order and complete byte identity. */
function hasExactDestinationSet(actual: readonly string[]): boolean {
  return (
    actual.length === V2_RECONCILIATION_DESTINATION_PATHS.length &&
    actual.every(
      (path, index) => path === V2_RECONCILIATION_DESTINATION_PATHS[index],
    )
  );
}

/** Authorizes only the complete ordered v2 write set before mutation. */
export async function applyArchitectureReconciliationForPolicy(
  input: PolicyAwareWriteInput,
): Promise<PolicyAwareWriteResult> {
  if (
    input.policyVersion !== "v2" ||
    !hasExactDestinationSet(input.destinationPaths)
  ) {
    return { allowed: false, applied: false };
  }
  return { allowed: true, applied: !input.dryRun };
}
