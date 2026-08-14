import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { reviewJobs } from "./codecamp.js";

/** Tenant modes supported by durable jobs. */
export const durableJobTenantModeEnum = pgEnum("durable_job_tenant_mode", [
  "global",
  "tenant",
]);

/** Lifecycle states persisted for durable jobs. */
export const durableJobStateEnum = pgEnum("durable_job_state", [
  "pending",
  "running",
  "succeeded",
  "dead",
  "legacy-failed",
]);

/** Controlled modes for legacy-to-durable job adoption. */
export const durableJobAdoptionModeEnum = pgEnum("durable_job_adoption_mode", [
  "legacy",
  "shadow",
  "paused",
  "generic",
]);

/** Durable job row with tenant identity, lease state, retry state, and outcome data. */
export const durableJobs = pgTable(
  "durable_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobName: text("job_name").notNull(),
    queueName: text("queue_name").notNull(),
    tenantMode: durableJobTenantModeEnum("tenant_mode").notNull(),
    tenantId: text("tenant_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    payloadFingerprint: text("payload_fingerprint").notNull(),
    state: durableJobStateEnum("state").notNull().default("pending"),
    attempt: integer("attempt").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
    leaseTokenHash: text("lease_token_hash"),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    redeliverCurrentAttempt: boolean("redeliver_current_attempt")
      .notNull()
      .default(false),
    rerunRequested: boolean("rerun_requested").notNull().default(false),
    rerunQueueName: text("rerun_queue_name"),
    rerunPayloadJson: jsonb("rerun_payload_json"),
    rerunPayloadFingerprint: text("rerun_payload_fingerprint"),
    rerunMaxAttempts: integer("rerun_max_attempts"),
    rerunAvailableAt: timestamp("rerun_available_at", {
      withTimezone: true,
    }),
    resultJson: jsonb("result_json"),
    lastErrorCode: text("last_error_code"),
    lastErrorSummary: text("last_error_summary"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    generation: integer("generation").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "durable_jobs_tenant_scope_check",
      sql`(("tenant_mode" = 'global' AND "tenant_id" IS NULL) OR ("tenant_mode" = 'tenant' AND "tenant_id" IS NOT NULL AND char_length(btrim("tenant_id")) BETWEEN 1 AND 200))`,
    ),
    check(
      "durable_jobs_attempt_bounds_check",
      sql`("attempt" >= 0 AND "max_attempts" BETWEEN 1 AND 1000 AND "attempt" <= "max_attempts")`,
    ),
    check("durable_jobs_generation_check", sql`"generation" >= 1`),
    check(
      "durable_jobs_hash_format_check",
      sql`("payload_fingerprint" ~ '^[0-9a-f]{64}$' AND ("lease_token_hash" IS NULL OR "lease_token_hash" ~ '^[0-9a-f]{64}$') AND ("rerun_payload_fingerprint" IS NULL OR "rerun_payload_fingerprint" ~ '^[0-9a-f]{64}$'))`,
    ),
    check(
      "durable_jobs_idempotency_key_check",
      sql`char_length(btrim("idempotency_key")) BETWEEN 1 AND 500`,
    ),
    check(
      "durable_jobs_job_name_check",
      sql`"job_name" ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$'`,
    ),
    check(
      "durable_jobs_queue_name_check",
      sql`"queue_name" ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'`,
    ),
    check(
      "durable_jobs_worker_id_check",
      sql`("lease_owner" IS NULL OR char_length(btrim("lease_owner")) BETWEEN 1 AND 200)`,
    ),
    check(
      "durable_jobs_lease_tuple_check",
      sql`(("lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL) OR ("lease_token_hash" IS NOT NULL AND "lease_owner" IS NOT NULL AND "lease_expires_at" IS NOT NULL))`,
    ),
    check(
      "durable_jobs_safe_error_tuple_check",
      sql`(("last_error_code" IS NULL AND "last_error_summary" IS NULL) OR ("last_error_code" IS NOT NULL AND "last_error_summary" IS NOT NULL))`,
    ),
    check(
      "durable_jobs_safe_error_check",
      sql`(("last_error_code" IS NULL OR "last_error_code" ~ '^[A-Z][A-Z0-9_]+$') AND ("last_error_summary" IS NULL OR char_length("last_error_summary") BETWEEN 1 AND 1000))`,
    ),
    check(
      "durable_jobs_rerun_tuple_check",
      sql`(("rerun_queue_name" IS NULL AND "rerun_payload_json" IS NULL AND "rerun_payload_fingerprint" IS NULL AND "rerun_max_attempts" IS NULL AND "rerun_available_at" IS NULL) OR ("rerun_queue_name" IS NOT NULL AND "rerun_payload_json" IS NOT NULL AND "rerun_payload_fingerprint" IS NOT NULL AND "rerun_max_attempts" IS NOT NULL AND "rerun_available_at" IS NOT NULL))`,
    ),
    check(
      "durable_jobs_rerun_state_check",
      sql`(("rerun_requested" = false AND "rerun_queue_name" IS NULL AND "rerun_payload_json" IS NULL AND "rerun_payload_fingerprint" IS NULL AND "rerun_max_attempts" IS NULL AND "rerun_available_at" IS NULL) OR ("rerun_requested" = true AND "state" = 'running' AND "rerun_queue_name" IS NOT NULL AND "rerun_payload_json" IS NOT NULL AND "rerun_payload_fingerprint" IS NOT NULL AND "rerun_max_attempts" IS NOT NULL AND "rerun_available_at" IS NOT NULL))`,
    ),
    check(
      "durable_jobs_redelivery_state_check",
      sql`("redeliver_current_attempt" = false OR ("state" = 'pending' AND "attempt" >= 1 AND "attempt" <= "max_attempts"))`,
    ),
    check(
      "durable_jobs_state_truth_table_check",
      sql`(("state" = 'pending' AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NULL AND "completed_at" IS NULL) OR ("state" = 'running' AND "lease_token_hash" IS NOT NULL AND "lease_owner" IS NOT NULL AND "lease_expires_at" IS NOT NULL AND "result_json" IS NULL AND "completed_at" IS NULL AND "redeliver_current_attempt" = false) OR ("state" = 'succeeded' AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NOT NULL AND "completed_at" IS NOT NULL AND "last_error_code" IS NULL AND "last_error_summary" IS NULL) OR ("state" IN ('dead', 'legacy-failed') AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NULL AND "completed_at" IS NOT NULL AND "last_error_code" IS NOT NULL AND "last_error_summary" IS NOT NULL))`,
    ),
    uniqueIndex("durable_jobs_global_identity_unique")
      .on(table.jobName, table.idempotencyKey)
      .where(sql`${table.tenantMode} = 'global'`),
    uniqueIndex("durable_jobs_tenant_identity_unique")
      .on(table.jobName, table.tenantId, table.idempotencyKey)
      .where(sql`${table.tenantMode} = 'tenant'`),
    index("durable_jobs_global_due_claim_idx")
      .on(table.queueName, table.availableAt, table.id)
      .where(
        sql`${table.state} = 'pending' AND ${table.tenantMode} = 'global'`,
      ),
    index("durable_jobs_tenant_due_claim_idx")
      .on(table.tenantId, table.queueName, table.availableAt, table.id)
      .where(
        sql`${table.state} = 'pending' AND ${table.tenantMode} = 'tenant'`,
      ),
    index("durable_jobs_global_reclaim_queue_idx")
      .on(table.queueName, table.leaseExpiresAt, table.id)
      .where(
        sql`${table.state} = 'running' AND ${table.tenantMode} = 'global'`,
      ),
    index("durable_jobs_global_reclaim_idx")
      .on(table.leaseExpiresAt, table.id)
      .where(
        sql`${table.state} = 'running' AND ${table.tenantMode} = 'global'`,
      ),
    index("durable_jobs_tenant_reclaim_queue_idx")
      .on(table.tenantId, table.queueName, table.leaseExpiresAt, table.id)
      .where(
        sql`${table.state} = 'running' AND ${table.tenantMode} = 'tenant'`,
      ),
    index("durable_jobs_tenant_reclaim_idx")
      .on(table.tenantId, table.leaseExpiresAt, table.id)
      .where(
        sql`${table.state} = 'running' AND ${table.tenantMode} = 'tenant'`,
      ),
    index("durable_jobs_global_dead_list_idx")
      .on(table.queueName, table.updatedAt, table.id)
      .where(sql`${table.state} = 'dead' AND ${table.tenantMode} = 'global'`),
    index("durable_jobs_tenant_dead_list_idx")
      .on(table.tenantId, table.queueName, table.updatedAt, table.id)
      .where(sql`${table.state} = 'dead' AND ${table.tenantMode} = 'tenant'`),
  ],
);

/** Append-only audit record for durable job operations. */
export const durableJobAuditEvents = pgTable(
  "durable_job_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestedJobId: uuid("requested_job_id").notNull(),
    tenantMode: durableJobTenantModeEnum("tenant_mode").notNull(),
    tenantId: text("tenant_id"),
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    priorState: durableJobStateEnum("prior_state"),
    actor: text("actor").notNull(),
    authorizationDecisionId: text("authorization_decision_id").notNull(),
    authorizationDecidedAt: timestamp("authorization_decided_at", {
      withTimezone: true,
    }).notNull(),
    reason: text("reason").notNull(),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "durable_job_audit_events_actor_check",
      sql`${table.actor} IS NOT NULL AND char_length(btrim(${table.actor})) BETWEEN 1 AND 200`,
    ),
    check(
      "durable_job_audit_events_authorization_decision_check",
      sql`${table.authorizationDecisionId} IS NOT NULL AND char_length(btrim(${table.authorizationDecisionId})) BETWEEN 1 AND 200`,
    ),
    check(
      "durable_job_audit_events_reason_check",
      sql`${table.reason} IS NOT NULL AND char_length(${table.reason}) BETWEEN 1 AND 500`,
    ),
    check(
      "durable_job_audit_events_correlation_check",
      sql`${table.correlationId} IS NOT NULL AND char_length(btrim(${table.correlationId})) BETWEEN 1 AND 200`,
    ),
  ],
);

/** Append-only audit record for review-job adoption transitions. */
export const reviewJobAdoptionAuditEvents = pgTable(
  "review_job_adoption_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromMode: durableJobAdoptionModeEnum("from_mode").notNull(),
    toMode: durableJobAdoptionModeEnum("to_mode").notNull(),
    priorGeneration: integer("prior_generation").notNull(),
    newGeneration: integer("new_generation").notNull(),
    actor: text("actor").notNull(),
    authorizationDecisionId: text("authorization_decision_id").notNull(),
    authorizationDecidedAt: timestamp("authorization_decided_at", {
      withTimezone: true,
    }).notNull(),
    reason: text("reason").notNull(),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "review_job_adoption_audit_events_actor_check",
      sql`${table.actor} IS NOT NULL AND char_length(btrim(${table.actor})) BETWEEN 1 AND 200`,
    ),
    check(
      "review_job_adoption_audit_events_authorization_decision_check",
      sql`${table.authorizationDecisionId} IS NOT NULL AND char_length(btrim(${table.authorizationDecisionId})) BETWEEN 1 AND 200`,
    ),
    check(
      "review_job_adoption_audit_events_reason_check",
      sql`${table.reason} IS NOT NULL AND char_length(${table.reason}) BETWEEN 1 AND 500`,
    ),
    check(
      "review_job_adoption_audit_events_correlation_check",
      sql`${table.correlationId} IS NOT NULL AND char_length(btrim(${table.correlationId})) BETWEEN 1 AND 200`,
    ),
    check(
      "review_job_adoption_generation_check",
      sql`${table.priorGeneration} >= 1 AND ${table.newGeneration} = ${table.priorGeneration} + 1`,
    ),
    check(
      "review_job_adoption_audit_events_new_generation_positive_check",
      sql`${table.newGeneration} >= 1`,
    ),
    check(
      "review_job_adoption_edge_check",
      sql`(${table.fromMode}::text || ':' || ${table.toMode}::text) IN ('legacy:shadow', 'shadow:legacy', 'shadow:paused', 'paused:shadow', 'paused:generic', 'generic:paused', 'paused:legacy')`,
    ),
  ],
);

/** One-to-one bridge between a legacy review job and a durable job. */
export const reviewJobDurableBindings = pgTable(
  "review_job_durable_bindings",
  {
    reviewJobId: uuid("review_job_id").primaryKey(),
    durableJobId: uuid("durable_job_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    correlationId: text("correlation_id").notNull(),
  },
  (table) => [
    check(
      "review_job_durable_bindings_created_by_check",
      sql`${table.createdBy} IS NOT NULL AND char_length(btrim(${table.createdBy})) BETWEEN 1 AND 200`,
    ),
    check(
      "review_job_durable_bindings_correlation_check",
      sql`${table.correlationId} IS NOT NULL AND char_length(btrim(${table.correlationId})) BETWEEN 1 AND 200`,
    ),
    foreignKey({
      columns: [table.reviewJobId],
      foreignColumns: [reviewJobs.id],
      name: "review_job_durable_bindings_review_job_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.durableJobId],
      foreignColumns: [durableJobs.id],
      name: "review_job_durable_bindings_durable_job_id_fk",
    }).onDelete("cascade"),
    unique("review_job_durable_bindings_durable_job_id_unique").on(
      table.durableJobId,
    ),
  ],
);

/** Singleton control row for the legacy-to-durable adoption mode. */
export const reviewJobDurableAdoption = pgTable(
  "review_job_durable_adoption",
  {
    controlKey: text("control_key").primaryKey(),
    mode: durableJobAdoptionModeEnum("mode").notNull(),
    generation: integer("generation").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    check(
      "review_job_durable_adoption_updated_by_check",
      sql`${table.updatedBy} IS NOT NULL AND char_length(btrim(${table.updatedBy})) BETWEEN 1 AND 200`,
    ),
    check(
      "review_job_durable_adoption_control_key_check",
      sql`${table.controlKey} = 'review_jobs' AND 'singleton' = 'singleton'`,
    ),
    check(
      "review_job_durable_adoption_generation_check",
      sql`${table.generation} >= 1`,
    ),
  ],
);

/** Secret-safe migration issue recorded for one legacy review job. */
export const reviewJobMigrationIssues = pgTable(
  "review_job_migration_issues",
  {
    reviewJobId: uuid("review_job_id").notNull(),
    preflightRunId: uuid("preflight_run_id").notNull(),
    code: text("code").notNull(),
    fieldGroup: text("field_group").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolutionStatus: text("resolution_status").notNull(),
    resolutionCode: text("resolution_code"),
    resolverSubject: text("resolver_subject"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "review_job_migration_issues_code_check",
      sql`${table.code} IS NOT NULL AND char_length(btrim(${table.code})) BETWEEN 1 AND 200`,
    ),
    check(
      "review_job_migration_issues_field_group_check",
      sql`${table.fieldGroup} IS NOT NULL AND char_length(btrim(${table.fieldGroup})) BETWEEN 1 AND 200`,
    ),
    check(
      "review_job_migration_issues_resolution_code_check",
      sql`${table.resolutionCode} IS NULL OR char_length(btrim(${table.resolutionCode})) BETWEEN 1 AND 200`,
    ),
    check(
      "review_job_migration_issues_resolver_subject_check",
      sql`${table.resolverSubject} IS NULL OR char_length(btrim(${table.resolverSubject})) BETWEEN 1 AND 200`,
    ),
    foreignKey({
      columns: [table.reviewJobId],
      foreignColumns: [reviewJobs.id],
      name: "review_job_migration_issues_review_job_id_fk",
    }).onDelete("cascade"),
    unique("review_job_migration_issues_review_job_code_unique").on(
      table.reviewJobId,
      table.code,
    ),
  ],
);
