import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { schools } from "./users.js";

/** Durable Company Identity to Sales Mastery tenant binding. */
export const salesMasteryTenantMappings = pgTable(
  "sales_mastery_tenant_mappings",
  {
    applicationKey: text("application_key").notNull(),
    organizationId: uuid("organization_id").notNull(),
    organizationKey: text("organization_key").notNull(),
    masteryTenantKey: uuid("mastery_tenant_key").notNull(),
    sourceTenantKey: text("source_tenant_key").notNull(),
    provisionedBy: text("provisioned_by").notNull(),
    requestId: text("request_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("sales_mastery_tenant_mappings_application_organization_unique").on(
      table.applicationKey,
      table.organizationId,
    ),
    unique("sales_mastery_tenant_mappings_binding_unique").on(
      table.applicationKey,
      table.organizationId,
      table.organizationKey,
      table.masteryTenantKey,
    ),
    unique("sales_mastery_tenant_mappings_mastery_tenant_unique").on(
      table.masteryTenantKey,
    ),
    unique("sales_mastery_tenant_mappings_source_tenant_unique").on(
      table.sourceTenantKey,
    ),
    foreignKey({
      name: "sales_mastery_tenant_mappings_mastery_tenant_fk",
      columns: [table.masteryTenantKey],
      foreignColumns: [schools.id],
    }).onDelete("restrict"),
    check(
      "sales_mastery_tenant_mappings_application_key_check",
      sql`${table.applicationKey} = 'sales'`,
    ),
    check(
      "sales_mastery_tenant_mappings_source_tenant_key_check",
      sql`${table.sourceTenantKey} = 'sales:' || ${table.organizationId}::text`,
    ),
    check(
      "sales_mastery_tenant_mappings_namespace_check",
      sql`${table.masteryTenantKey} <> 'c0deca00-0000-4000-8000-000000000001'::uuid`,
    ),
    check(
      "sales_mastery_tenant_mappings_nonblank_check",
      sql`${table.organizationKey} ~ '[^[:space:]]' AND ${table.provisionedBy} ~ '[^[:space:]]' AND ${table.requestId} ~ '[^[:space:]]'`,
    ),
    index("sales_mastery_tenant_mappings_organization_idx").on(
      table.organizationId,
      table.organizationKey,
    ),
  ],
);

/** Immutable Sales Mastery projection intent awaiting a delivery receipt. */
export const salesMasteryProjectionOutbox = pgTable(
  "sales_mastery_projection_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationKey: text("application_key").notNull(),
    organizationId: uuid("organization_id").notNull(),
    organizationKey: text("organization_key").notNull(),
    masteryTenantKey: uuid("mastery_tenant_key").notNull(),
    sourceTenantKey: text("source_tenant_key").notNull(),
    learnerPrincipalId: text("learner_principal_id").notNull(),
    sourceApplication: text("source_application").notNull(),
    sourceAttemptId: text("source_attempt_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    graphRelease: text("graph_release").notNull(),
    bindingsDigest: text("bindings_digest").notNull(),
    rubricVersion: text("rubric_version").notNull(),
    requestId: text("request_id").notNull(),
    correlationId: text("correlation_id").notNull(),
    payloadDigest: text("payload_digest").notNull(),
    payloadJson: jsonb("payload_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("sales_mastery_projection_outbox_tenant_idempotency_unique").on(
      table.masteryTenantKey,
      table.idempotencyKey,
    ),
    unique("sales_mastery_projection_outbox_tenant_attempt_unique").on(
      table.masteryTenantKey,
      table.sourceAttemptId,
    ),
    unique("sales_mastery_projection_outbox_idempotency_unique").on(
      table.idempotencyKey,
    ),
    unique("sales_mastery_projection_outbox_source_attempt_unique").on(
      table.sourceAttemptId,
    ),
    unique("sales_mastery_projection_outbox_receipt_integrity_unique").on(
      table.id,
      table.masteryTenantKey,
      table.organizationId,
      table.learnerPrincipalId,
      table.idempotencyKey,
    ),
    foreignKey({
      name: "sales_mastery_projection_outbox_mastery_tenant_fk",
      columns: [table.masteryTenantKey],
      foreignColumns: [schools.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "sales_mastery_projection_outbox_mapping_fk",
      columns: [
        table.applicationKey,
        table.organizationId,
        table.organizationKey,
        table.masteryTenantKey,
      ],
      foreignColumns: [
        salesMasteryTenantMappings.applicationKey,
        salesMasteryTenantMappings.organizationId,
        salesMasteryTenantMappings.organizationKey,
        salesMasteryTenantMappings.masteryTenantKey,
      ],
    }).onDelete("restrict"),
    check(
      "sales_mastery_projection_outbox_application_key_check",
      sql`${table.applicationKey} = 'sales'`,
    ),
    check(
      "sales_mastery_projection_outbox_source_application_check",
      sql`${table.sourceApplication} = 'sales-advantage'`,
    ),
    check(
      "sales_mastery_projection_outbox_graph_release_check",
      sql`${table.graphRelease} = 'knowledge-space-sales-mastery-v1.0.0'`,
    ),
    check(
      "sales_mastery_projection_outbox_bindings_digest_check",
      sql`${table.bindingsDigest} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "sales_mastery_projection_outbox_payload_digest_check",
      sql`${table.payloadDigest} ~ '^sha256:[0-9a-f]{64}$'`,
    ),
    check(
      "sales_mastery_projection_outbox_nonblank_check",
      sql`${table.organizationKey} ~ '[^[:space:]]' AND ${table.sourceTenantKey} ~ '[^[:space:]]' AND ${table.learnerPrincipalId} ~ '[^[:space:]]' AND ${table.sourceAttemptId} ~ '[^[:space:]]' AND ${table.idempotencyKey} ~ '[^[:space:]]' AND ${table.rubricVersion} ~ '[^[:space:]]' AND ${table.requestId} ~ '[^[:space:]]' AND ${table.correlationId} ~ '[^[:space:]]'`,
    ),
    index("sales_mastery_projection_outbox_organization_idx").on(
      table.organizationId,
      table.learnerPrincipalId,
      table.createdAt,
    ),
  ],
);

/** Immutable receipt proving one Sales Mastery projection was committed. */
export const salesMasteryProjectionReceipts = pgTable(
  "sales_mastery_projection_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outboxId: uuid("outbox_id").notNull(),
    masteryTenantKey: uuid("mastery_tenant_key").notNull(),
    organizationId: uuid("organization_id").notNull(),
    learnerPrincipalId: text("learner_principal_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    commitId: text("commit_id").notNull(),
    resultJson: jsonb("result_json").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("sales_mastery_projection_receipts_outbox_unique").on(
      table.outboxId,
    ),
    unique("sales_mastery_projection_receipts_tenant_idempotency_unique").on(
      table.masteryTenantKey,
      table.idempotencyKey,
    ),
    foreignKey({
      name: "sales_mastery_projection_receipts_outbox_fk",
      columns: [table.outboxId],
      foreignColumns: [salesMasteryProjectionOutbox.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "sales_mastery_projection_receipts_outbox_integrity_fk",
      columns: [
        table.outboxId,
        table.masteryTenantKey,
        table.organizationId,
        table.learnerPrincipalId,
        table.idempotencyKey,
      ],
      foreignColumns: [
        salesMasteryProjectionOutbox.id,
        salesMasteryProjectionOutbox.masteryTenantKey,
        salesMasteryProjectionOutbox.organizationId,
        salesMasteryProjectionOutbox.learnerPrincipalId,
        salesMasteryProjectionOutbox.idempotencyKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "sales_mastery_projection_receipts_mastery_tenant_fk",
      columns: [table.masteryTenantKey],
      foreignColumns: [schools.id],
    }).onDelete("restrict"),
    index("sales_mastery_projection_receipts_organization_idx").on(
      table.organizationId,
      table.learnerPrincipalId,
    ),
  ],
);
