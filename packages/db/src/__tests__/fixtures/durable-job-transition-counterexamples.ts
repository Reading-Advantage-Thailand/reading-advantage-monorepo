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
 * @param populatedValue Value assigned to selected columns.
 * @returns Every partial tuple in deterministic bit-mask order.
 */
function partialTuples(
  columns: readonly string[],
  populatedValue: unknown,
): ReadonlyArray<Readonly<Record<string, unknown>>> {
  const tuples: Array<Readonly<Record<string, unknown>>> = [];
  const finalMask = (1 << columns.length) - 1;
  for (let mask = 1; mask < finalMask; mask += 1) {
    const tuple: Record<string, unknown> = {};
    for (const [index, column] of columns.entries()) {
      tuple[column] = (mask & (1 << index)) === 0 ? null : populatedValue;
    }
    tuples.push(tuple);
  }
  return tuples;
}

const leasePartialFixtures: readonly DurableJobInvalidRowFixture[] = partialTuples(
  LEASE_COLUMNS,
  "present",
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
  "present",
).map((overrides, index) => ({
  id: `rerun-partial-${String(index + 1).padStart(2, "0")}`,
  finding: "T5-H2",
  state: "running",
  overrides: { rerun_requested: true, ...overrides },
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
    overrides: { tenant_mode: "global", tenant_id: "school-1" },
    expectedConstraint: "durable_jobs_tenant_scope_check",
    rationale: "Global identities cannot carry a tenant key.",
  },
  {
    id: "tenant-with-null-id",
    finding: "T5-H2",
    state: "pending",
    overrides: { tenant_mode: "tenant", tenant_id: null },
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
    overrides: { last_error_code: "RETRYABLE", last_error_summary: null },
    expectedConstraint: "durable_jobs_safe_error_tuple_check",
    rationale: "Safe error code and summary are persisted together.",
  },
  {
    id: "safe-error-summary-only",
    finding: "T5-H2",
    state: "pending",
    overrides: { last_error_code: null, last_error_summary: "Retry later." },
    expectedConstraint: "durable_jobs_safe_error_tuple_check",
    rationale: "Safe error code and summary are persisted together.",
  },
  ...rerunPartialFixtures,
  {
    id: "rerun-columns-with-flag-false",
    finding: "T5-H2",
    state: "running",
    overrides: {
      rerun_requested: false,
      rerun_queue_name: "review.follow-up",
      rerun_payload_json: {},
      rerun_payload_fingerprint: "a".repeat(64),
      rerun_max_attempts: 3,
      rerun_available_at: "2030-01-01T00:00:00.000Z",
    },
    expectedConstraint: "durable_jobs_rerun_tuple_check",
    rationale: "The flag is equivalent to the complete snapshot being present.",
  },
  {
    id: "rerun-flag-with-null-columns",
    finding: "T5-H2",
    state: "running",
    overrides: { rerun_requested: true },
    expectedConstraint: "durable_jobs_rerun_tuple_check",
    rationale: "A true rerun flag cannot stand in for a lost request snapshot.",
  },
  {
    id: "rerun-maximum-under-bound",
    finding: "T5-H3",
    state: "running",
    overrides: { rerun_requested: true, rerun_max_attempts: 0 },
    expectedConstraint: "durable_jobs_rerun_tuple_check",
    rationale: "Follow-up maximum attempts repeat the current-generation bound.",
  },
  {
    id: "rerun-maximum-over-bound",
    finding: "T5-H3",
    state: "running",
    overrides: { rerun_requested: true, rerun_max_attempts: 1_001 },
    expectedConstraint: "durable_jobs_rerun_tuple_check",
    rationale: "Follow-up maximum attempts repeat the current-generation bound.",
  },
  {
    id: "pending-at-maximum-without-redelivery",
    finding: "T5-H1",
    state: "pending",
    overrides: { attempt: 3, max_attempts: 3, redeliver_current_attempt: false },
    expectedConstraint: "durable_jobs_redelivery_state_check",
    rationale: "An ordinary pending row at max would be permanently unclaimable.",
  },
  {
    id: "pending-zero-with-redelivery",
    finding: "T5-H1",
    state: "pending",
    overrides: { attempt: 0, redeliver_current_attempt: true },
    expectedConstraint: "durable_jobs_redelivery_state_check",
    rationale: "Only an already-started ordinal may be redelivered.",
  },
  {
    id: "pending-with-lease",
    finding: "T5-H2",
    state: "pending",
    overrides: { lease_token_hash: "a".repeat(64), lease_owner: "worker", lease_expires_at: "2030-01-01T00:00:00.000Z" },
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
    overrides: { rerun_requested: true },
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
    overrides: { lease_token_hash: "a".repeat(64), lease_owner: "worker", lease_expires_at: "2030-01-01T00:00:00.000Z" },
    expectedConstraint: "durable_jobs_state_truth_table_check",
    rationale: "Terminal state clears lease ownership.",
  },
  {
    id: "succeeded-with-rerun",
    finding: "T5-H2",
    state: "succeeded",
    overrides: { rerun_requested: true },
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
      overrides: { lease_token_hash: "a".repeat(64), lease_owner: "worker", lease_expires_at: "2030-01-01T00:00:00.000Z" },
      expectedConstraint: "durable_jobs_state_truth_table_check",
      rationale: "Terminal state clears lease ownership.",
    },
    {
      id: `${state}-with-rerun`,
      finding: "T5-H2" as const,
      state,
      overrides: { rerun_requested: true },
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
