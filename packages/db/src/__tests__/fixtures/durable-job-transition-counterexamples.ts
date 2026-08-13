/** Accepted Task 5 finding identifiers exercised by Task 6 fixtures. */
export type DurableJobDesignFinding =
  | "T5-H1"
  | "T5-H2"
  | "T5-H3"
  | "T5-H4"
  | "T5-H5"
  | "T5-H6";

/** One database row mutation that the durable-jobs schema must reject. */
export interface DurableJobInvalidRowFixture {
  /** Stable fixture identifier used by later PostgreSQL execution tests. */
  readonly id: string;
  /** Task 5 finding whose remediation requires the rejection. */
  readonly finding: DurableJobDesignFinding;
  /** Starting state before applying the invalid column overrides. */
  readonly state: "pending" | "running" | "succeeded" | "dead" | "legacy-failed";
  /** Invalid column values layered over a canonical row for the starting state. */
  readonly overrides: Readonly<Record<string, unknown>>;
  /** Named database check expected to reject the resulting row. */
  readonly expectedConstraint: string;
  /** Security or lifecycle reason the tuple must fail closed. */
  readonly rationale: string;
}

/** Column names present in every canonical durable-job row. */
export const durableJobCanonicalColumns = [
  "id",
  "job_name",
  "queue_name",
  "tenant_mode",
  "tenant_id",
  "idempotency_key",
  "payload_json",
  "payload_fingerprint",
  "state",
  "attempt",
  "max_attempts",
  "available_at",
  "lease_token_hash",
  "lease_owner",
  "lease_expires_at",
  "redeliver_current_attempt",
  "rerun_requested",
  "rerun_queue_name",
  "rerun_payload_json",
  "rerun_payload_fingerprint",
  "rerun_max_attempts",
  "rerun_available_at",
  "result_json",
  "last_error_code",
  "last_error_summary",
  "completed_at",
  "generation",
  "created_at",
  "updated_at",
] as const;

/** Complete row shape used as the valid starting point for every fixture. */
export type DurableJobCanonicalRow = Readonly<Record<string, unknown>>;

const CANONICAL_LEASE_VALUES = {
  lease_token_hash: "5d964f1f0c009bc5d62e14cee19b81f1c61a082e249a9a6c6e4974808e0883a5",
  lease_owner: "worker-alpha",
  lease_expires_at: "2030-01-01T01:00:00.000Z",
} as const;

const CANONICAL_RERUN_VALUES = {
  rerun_queue_name: "review.follow-up",
  rerun_payload_json: { kind: "review-follow-up", pullRequest: 1 },
  rerun_payload_fingerprint:
    "3079e310e4a99ccc2e5b8a480913164d2fbd0392c51266647aa95c06ddb9bf54",
  rerun_max_attempts: 3,
  rerun_available_at: "2030-01-01T00:10:00.000Z",
} as const;

const CANONICAL_RERUN_OVERRIDES = {
  rerun_requested: true,
  ...CANONICAL_RERUN_VALUES,
} as const;

const canonicalBaseRow = {
  id: "00000000-0000-4000-8000-000000000001",
  job_name: "codecamp.review-pr",
  queue_name: "review.main",
  tenant_mode: "global",
  tenant_id: null,
  idempotency_key: "openai/example#1",
  payload_json: { kind: "review", pullRequest: 1 },
  payload_fingerprint:
    "b8059c7148c55b633353ad557b046fb7bdd6cddba44e3deef04b3032df453cde",
  max_attempts: 3,
  available_at: "2030-01-01T00:00:00.000Z",
  lease_token_hash: null,
  lease_owner: null,
  lease_expires_at: null,
  redeliver_current_attempt: false,
  rerun_requested: false,
  rerun_queue_name: null,
  rerun_payload_json: null,
  rerun_payload_fingerprint: null,
  rerun_max_attempts: null,
  rerun_available_at: null,
  result_json: null,
  last_error_code: null,
  last_error_summary: null,
  completed_at: null,
  generation: 1,
  created_at: "2029-12-31T23:00:00.000Z",
  updated_at: "2030-01-01T00:00:00.000Z",
} as const;

/** Canonical valid durable-job rows keyed by each persisted state. */
export const durableJobCanonicalRows: Readonly<
  Record<DurableJobInvalidRowFixture["state"], DurableJobCanonicalRow>
> = {
  pending: {
    ...canonicalBaseRow,
    state: "pending",
    attempt: 0,
  },
  running: {
    ...canonicalBaseRow,
    ...CANONICAL_LEASE_VALUES,
    ...CANONICAL_RERUN_OVERRIDES,
    state: "running",
    attempt: 1,
  },
  succeeded: {
    ...canonicalBaseRow,
    state: "succeeded",
    attempt: 1,
    result_json: { accepted: true },
    completed_at: "2030-01-01T00:05:00.000Z",
  },
  dead: {
    ...canonicalBaseRow,
    state: "dead",
    attempt: 1,
    last_error_code: "PERMANENT",
    last_error_summary: "Permanent failure.",
    completed_at: "2030-01-01T00:05:00.000Z",
  },
  "legacy-failed": {
    ...canonicalBaseRow,
    state: "legacy-failed",
    attempt: 0,
    last_error_code: "LEGACY_FAILURE",
    last_error_summary: "Legacy failure.",
    completed_at: "2030-01-01T00:05:00.000Z",
  },
};

/** Applies one fixture's targeted cell changes to its canonical state row.
 * @param fixture Invalid fixture whose overrides must be applied.
 * @returns The row with the fixture's targeted changes.
 */
export function durableJobRowFromFixture(
  fixture: DurableJobInvalidRowFixture,
): DurableJobCanonicalRow {
  return { ...durableJobCanonicalRows[fixture.state], ...fixture.overrides };
}

/** Restores every targeted cell to prove the fixture starts from a valid row.
 * @param fixture Invalid fixture whose overrides must be removed.
 * @returns The canonical row for the fixture state.
 */
export function durableJobRowWithoutFixtureOverrides(
  fixture: DurableJobInvalidRowFixture,
): DurableJobCanonicalRow {
  const canonicalRow = durableJobCanonicalRows[fixture.state];
  const restoredRow: Record<string, unknown> = { ...durableJobRowFromFixture(fixture) };
  for (const column of Object.keys(fixture.overrides)) {
    restoredRow[column] = canonicalRow[column];
  }
  return restoredRow;
}

/** One accepted transition scenario frozen for later adapter race tests. */
export interface DurableJobTransitionScenarioFixture {
  /** Stable scenario identifier. */
  readonly id: string;
  /** Task 5 finding whose remediation requires the scenario. */
  readonly finding: "T5-H1" | "T5-H3";
  /** Ordered transition steps whose result must remain atomic. */
  readonly steps: readonly string[];
  /** Complete expected durable state after all steps commit. */
  readonly expected: Readonly<Record<string, unknown>>;
}

const LEASE_COLUMNS = [
  "lease_token_hash",
  "lease_owner",
  "lease_expires_at",
] as const;

const RERUN_COLUMNS = [
  "rerun_queue_name",
  "rerun_payload_json",
  "rerun_payload_fingerprint",
  "rerun_max_attempts",
  "rerun_available_at",
] as const;

/**
 * Builds every non-empty proper subset of a column tuple.
 * @param columns Ordered nullable columns participating in an all-or-none check.
 * @param populatedValues Canonical values for every tuple column.
 * @returns Every partial tuple in deterministic bit-mask order.
 */
function partialTuples(
  columns: readonly string[],
  populatedValues: Readonly<Record<string, unknown>>,
): ReadonlyArray<Readonly<Record<string, unknown>>> {
  const tuples: Array<Readonly<Record<string, unknown>>> = [];
  const finalMask = (1 << columns.length) - 1;
  for (let mask = 1; mask < finalMask; mask += 1) {
    const tuple: Record<string, unknown> = {};
    for (const [index, column] of columns.entries()) {
      if (populatedValues[column] === undefined) {
        throw new Error(`Missing canonical value for ${column}.`);
      }
      if ((mask & (1 << index)) === 0) {
        tuple[column] = null;
      } else {
        tuple[column] = populatedValues[column];
      }
    }
    tuples.push(tuple);
  }
  return tuples;
}

const leasePartialFixtures: readonly DurableJobInvalidRowFixture[] = partialTuples(
  LEASE_COLUMNS,
  CANONICAL_LEASE_VALUES,
).map((overrides, index) => ({
  id: `lease-partial-${String(index + 1).padStart(2, "0")}`,
  finding: "T5-H2",
  state: "running",
  overrides,
  expectedConstraint: "durable_jobs_lease_tuple_check",
  rationale: "A lease digest, owner, and expiry form one indivisible ownership tuple.",
}));

const rerunPartialFixtures: readonly DurableJobInvalidRowFixture[] = partialTuples(
  RERUN_COLUMNS,
  CANONICAL_RERUN_VALUES,
).map((overrides, index) => ({
  id: `rerun-partial-${String(index + 1).padStart(2, "0")}`,
  finding: "T5-H2",
  state: "running",
  overrides,
  expectedConstraint: "durable_jobs_rerun_tuple_check",
  rationale: "A coalesced rerun must persist the complete five-field request snapshot.",
}));

/**
 * Invalid durable-job rows covering every Task 5 truth-table exclusion and
 * every partial lease, safe-error, and rerun tuple.
 */
export const durableJobInvalidRowFixtures: readonly DurableJobInvalidRowFixture[] = [
  {
    id: "global-with-tenant-id",
    finding: "T5-H2",
    state: "pending",
    overrides: { tenant_id: "school-1" },
    expectedConstraint: "durable_jobs_tenant_scope_check",
    rationale: "Global identities cannot carry a tenant key.",
  },
  {
    id: "tenant-with-null-id",
    finding: "T5-H2",
    state: "pending",
    overrides: { tenant_mode: "tenant" },
    expectedConstraint: "durable_jobs_tenant_scope_check",
    rationale: "Tenant identities require a trusted tenant key.",
  },
  {
    id: "tenant-with-empty-id",
    finding: "T5-H2",
    state: "pending",
    overrides: { tenant_mode: "tenant", tenant_id: "" },
    expectedConstraint: "durable_jobs_tenant_scope_check",
    rationale: "An empty tenant key must not collapse identities.",
  },
  {
    id: "tenant-id-over-bound",
    finding: "T5-H2",
    state: "pending",
    overrides: { tenant_mode: "tenant", tenant_id: "t".repeat(201) },
    expectedConstraint: "durable_jobs_tenant_scope_check",
    rationale: "Tenant keys repeat the Task 4 200-character database bound.",
  },
  {
    id: "negative-attempt",
    finding: "T5-H2",
    state: "pending",
    overrides: { attempt: -1 },
    expectedConstraint: "durable_jobs_attempt_bounds_check",
    rationale: "Attempt ordinals never become negative.",
  },
  {
    id: "attempt-over-maximum",
    finding: "T5-H2",
    state: "pending",
    overrides: { attempt: 3, max_attempts: 2 },
    expectedConstraint: "durable_jobs_attempt_bounds_check",
    rationale: "No transition may create max plus one.",
  },
  {
    id: "zero-maximum",
    finding: "T5-H2",
    state: "pending",
    overrides: { max_attempts: 0 },
    expectedConstraint: "durable_jobs_attempt_bounds_check",
    rationale: "A durable generation permits at least one business attempt.",
  },
  {
    id: "maximum-over-bound",
    finding: "T5-H2",
    state: "pending",
    overrides: { max_attempts: 1_001 },
    expectedConstraint: "durable_jobs_attempt_bounds_check",
    rationale: "The database repeats the Task 4 1000-attempt bound.",
  },
  {
    id: "zero-generation",
    finding: "T5-H2",
    state: "pending",
    overrides: { generation: 0 },
    expectedConstraint: "durable_jobs_generation_check",
    rationale: "Durable generation numbers are one-based and monotonic.",
  },
  ...leasePartialFixtures,
  {
    id: "safe-error-code-only",
    finding: "T5-H2",
    state: "pending",
    overrides: { last_error_code: "RETRYABLE" },
    expectedConstraint: "durable_jobs_safe_error_tuple_check",
    rationale: "Safe error code and summary are persisted together.",
  },
  {
    id: "safe-error-summary-only",
    finding: "T5-H2",
    state: "pending",
    overrides: { last_error_summary: "Retry later." },
    expectedConstraint: "durable_jobs_safe_error_tuple_check",
    rationale: "Safe error code and summary are persisted together.",
  },
  ...rerunPartialFixtures,
  {
    id: "rerun-columns-with-flag-false",
    finding: "T5-H2",
    state: "running",
    overrides: { rerun_requested: false },
    expectedConstraint: "durable_jobs_rerun_tuple_check",
    rationale: "The flag is equivalent to the complete snapshot being present.",
  },
  {
    id: "rerun-flag-with-null-columns",
    finding: "T5-H2",
    state: "running",
    overrides: {
      rerun_queue_name: null,
      rerun_payload_json: null,
      rerun_payload_fingerprint: null,
      rerun_max_attempts: null,
      rerun_available_at: null,
    },
    expectedConstraint: "durable_jobs_rerun_tuple_check",
    rationale: "A true rerun flag cannot stand in for a lost request snapshot.",
  },
  {
    id: "rerun-maximum-under-bound",
    finding: "T5-H3",
    state: "running",
    overrides: { rerun_max_attempts: 0 },
    expectedConstraint: "durable_jobs_rerun_tuple_check",
    rationale: "Follow-up maximum attempts repeat the current-generation bound.",
  },
  {
    id: "rerun-maximum-over-bound",
    finding: "T5-H3",
    state: "running",
    overrides: { rerun_max_attempts: 1_001 },
    expectedConstraint: "durable_jobs_rerun_tuple_check",
    rationale: "Follow-up maximum attempts repeat the current-generation bound.",
  },
  {
    id: "pending-at-maximum-without-redelivery",
    finding: "T5-H1",
    state: "pending",
    overrides: { attempt: 3 },
    expectedConstraint: "durable_jobs_redelivery_state_check",
    rationale: "An ordinary pending row at max would be permanently unclaimable.",
  },
  {
    id: "pending-zero-with-redelivery",
    finding: "T5-H1",
    state: "pending",
    overrides: { redeliver_current_attempt: true },
    expectedConstraint: "durable_jobs_redelivery_state_check",
    rationale: "Only an already-started ordinal may be redelivered.",
  },
  {
    id: "pending-with-lease",
    finding: "T5-H2",
    state: "pending",
    overrides: CANONICAL_LEASE_VALUES,
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "Pending work owns no active lease.",
  },
  {
    id: "pending-with-result",
    finding: "T5-H2",
    state: "pending",
    overrides: { result_json: {} },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "Pending work has no successful result.",
  },
  {
    id: "pending-with-completion",
    finding: "T5-H2",
    state: "pending",
    overrides: { completed_at: "2030-01-01T00:00:00.000Z" },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "Pending work is not terminal.",
  },
  {
    id: "pending-with-rerun",
    finding: "T5-H2",
    state: "pending",
    overrides: CANONICAL_RERUN_OVERRIDES,
    expectedConstraint: "durable_jobs_rerun_state_check",
    rationale: "Only a running generation may hold a follow-up snapshot.",
  },
  {
    id: "running-attempt-zero",
    finding: "T5-H2",
    state: "running",
    overrides: { attempt: 0 },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "A running row represents an already-started attempt.",
  },
  {
    id: "running-without-lease",
    finding: "T5-H2",
    state: "running",
    overrides: { lease_token_hash: null, lease_owner: null, lease_expires_at: null },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "Running work must have a complete ownership tuple.",
  },
  {
    id: "running-with-result",
    finding: "T5-H2",
    state: "running",
    overrides: { result_json: {} },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "A result is admitted only after successful settlement.",
  },
  {
    id: "running-with-completion",
    finding: "T5-H2",
    state: "running",
    overrides: { completed_at: "2030-01-01T00:00:00.000Z" },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "A live lease cannot also be terminal.",
  },
  {
    id: "running-with-redelivery-marker",
    finding: "T5-H2",
    state: "running",
    overrides: { redeliver_current_attempt: true },
    expectedConstraint: "durable_jobs_redelivery_state_check",
    rationale: "Claim clears the pending-only redelivery marker.",
  },
  {
    id: "succeeded-without-result",
    finding: "T5-H2",
    state: "succeeded",
    overrides: { result_json: null },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "SQL null means no result; JSON null remains a non-null JSONB result.",
  },
  {
    id: "succeeded-with-error",
    finding: "T5-H2",
    state: "succeeded",
    overrides: { last_error_code: "OLD_ERROR", last_error_summary: "Old error." },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "Successful terminal state clears prior error metadata.",
  },
  {
    id: "succeeded-without-completion",
    finding: "T5-H2",
    state: "succeeded",
    overrides: { completed_at: null },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "Successful terminal state requires a completion timestamp.",
  },
  {
    id: "succeeded-with-lease",
    finding: "T5-H2",
    state: "succeeded",
    overrides: CANONICAL_LEASE_VALUES,
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "Terminal state clears lease ownership.",
  },
  {
    id: "succeeded-with-rerun",
    finding: "T5-H2",
    state: "succeeded",
    overrides: CANONICAL_RERUN_OVERRIDES,
    expectedConstraint: "durable_jobs_rerun_state_check",
    rationale: "Terminal state cannot retain an unpromoted follow-up snapshot.",
  },
  {
    id: "succeeded-with-redelivery",
    finding: "T5-H2",
    state: "succeeded",
    overrides: { redeliver_current_attempt: true },
    expectedConstraint: "durable_jobs_redelivery_state_check",
    rationale: "Terminal state cannot be marked for lease redelivery.",
  },
  ...(["dead", "legacy-failed"] as const).flatMap((state) => [
    ...(state === "dead" ? [{
      id: "dead-attempt-zero",
      finding: "T5-H2" as const,
      state,
      overrides: { attempt: 0 },
      expectedConstraint: "durable_jobs_state_truth_table_check",
      rationale: "Persisted dead-list rows are one-based even though legacy envelopes decode zero.",
    }] : []),
    {
      id: `${state}-with-result`,
      finding: "T5-H2" as const,
      state,
      overrides: { result_json: {} },
      expectedConstraint: "durable_jobs_state_truth_table_check",
      rationale: "Failed terminal states cannot contain a successful result.",
    },
    {
      id: `${state}-without-error`,
      finding: "T5-H2" as const,
      state,
      overrides: { last_error_code: null, last_error_summary: null },
      expectedConstraint: "durable_jobs_state_truth_table_check",
      rationale: "Failed terminal states require classified safe error metadata.",
    },
    {
      id: `${state}-without-completion`,
      finding: "T5-H2" as const,
      state,
      overrides: { completed_at: null },
      expectedConstraint: "durable_jobs_state_truth_table_check",
      rationale: "Failed terminal states require a completion timestamp.",
    },
    {
      id: `${state}-with-lease`,
      finding: "T5-H2" as const,
      state,
      overrides: CANONICAL_LEASE_VALUES,
      expectedConstraint: "durable_jobs_state_truth_table_check",
      rationale: "Terminal state clears lease ownership.",
    },
    {
      id: `${state}-with-rerun`,
      finding: "T5-H2" as const,
      state,
      overrides: CANONICAL_RERUN_OVERRIDES,
      expectedConstraint: "durable_jobs_rerun_state_check",
      rationale: "Terminal state cannot retain a follow-up snapshot.",
    },
    {
      id: `${state}-with-redelivery`,
      finding: "T5-H2" as const,
      state,
      overrides: { redeliver_current_attempt: true },
      expectedConstraint: "durable_jobs_redelivery_state_check",
      rationale: "Terminal state cannot be marked for lease redelivery.",
    },
  ]),
];

/**
 * Accepted attempt, rerun, and lock-order scenarios that Task 9 must execute
 * against the PostgreSQL adapter without weakening the Task 6 schema checks.
 */
export const durableJobTransitionScenarioFixtures: readonly DurableJobTransitionScenarioFixture[] = [
  {
    id: "fresh-claim-increments-once",
    finding: "T5-H1",
    steps: ["enqueue attempt 0", "claim fresh"],
    expected: { state: "running", attempt: 1, redeliver_current_attempt: false, token_rotated: true },
  },
  {
    id: "business-retry-starts-next-ordinal",
    finding: "T5-H1",
    steps: ["fail retryable at attempt 1", "claim fresh"],
    expected: { state: "running", attempt: 2, redeliver_current_attempt: false, token_rotated: true },
  },
  {
    id: "max-attempt-crash-redelivers-same-ordinal",
    finding: "T5-H1",
    steps: ["expire running at max", "reclaim", "claim redelivery"],
    expected: { state: "running", attempt: "max_attempts", redeliver_current_attempt: false, token_rotated: true },
  },
  {
    id: "repeated-expiry-retains-ordinal",
    finding: "T5-H1",
    steps: ["expire", "reclaim", "claim redelivery", "expire", "reclaim", "claim redelivery"],
    expected: { attempt: "unchanged", token_rotated_each_claim: true },
  },
  {
    id: "replay-resets-generation",
    finding: "T5-H1",
    steps: ["replay terminal"],
    expected: { state: "pending", attempt: 0, redeliver_current_attempt: false, generation_delta: 1 },
  },
  {
    id: "rerun-promotion-resets-generation",
    finding: "T5-H1",
    steps: ["enqueue while running", "settle current"],
    expected: { state: "pending", attempt: 0, redeliver_current_attempt: false, generation_delta: 1 },
  },
  {
    id: "active-enqueue-queue-move-and-lower-maximum",
    finding: "T5-H3",
    steps: ["claim queue old max 9", "enqueue queue new max 2"],
    expected: { current_queue: "old", current_max_attempts: 9, rerun_queue: "new", rerun_max_attempts: 2 },
  },
  {
    id: "active-enqueue-raises-maximum",
    finding: "T5-H3",
    steps: ["claim max 2", "enqueue max 8"],
    expected: { current_max_attempts: 2, rerun_max_attempts: 8 },
  },
  {
    id: "active-enqueue-last-commit-wins-complete-snapshot",
    finding: "T5-H3",
    steps: ["enqueue follow-up A", "enqueue follow-up B commits last"],
    expected: { rerun_snapshot: "all fields from B", mixed_fields: false },
  },
  ...(["settle", "fail", "reclaim"] as const).flatMap((transition) => [
    {
      id: `${transition}-then-enqueue-lock-order`,
      finding: "T5-H3" as const,
      steps: [`${transition} commits`, "enqueue commits"],
      expected: { state: "pending", snapshot: "complete enqueue request", mixed_fields: false },
    },
    {
      id: `enqueue-then-${transition}-lock-order`,
      finding: "T5-H3" as const,
      steps: ["enqueue commits", `${transition} commits`],
      expected: { state: "pending", snapshot: "complete promoted rerun", mixed_fields: false },
    },
  ]),
];
