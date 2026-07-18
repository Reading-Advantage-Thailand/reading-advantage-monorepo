import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Durable fingerprint-only ownership and replay state for backend capabilities. */
export const capabilityIdempotencyRecords = pgTable(
  "capability_idempotency_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    capabilityId: text("capability_id").notNull(),
    scope: text("scope").notNull(),
    tenantKey: text("tenant_key").notNull(),
    keyFingerprint: text("key_fingerprint").notNull(),
    inputFingerprint: text("input_fingerprint").notNull(),
    state: text("state").notNull(),
    ownershipToken: uuid("ownership_token"),
    outputJson: jsonb("output_json").$type<unknown>(),
    errorJson: jsonb("error_json").$type<Record<string, unknown>>(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("capability_idempotency_namespace_key_unique").on(
      table.capabilityId,
      table.scope,
      table.tenantKey,
      table.keyFingerprint,
    ),
    unique("capability_idempotency_ownership_token_unique").on(
      table.ownershipToken,
    ),
    check(
      "capability_idempotency_scope_check",
      sql`${table.scope} IN ('tenant-capability', 'global-capability')`,
    ),
    check(
      "capability_idempotency_state_check",
      sql`${table.state} IN ('owned', 'completed', 'retryable', 'terminal')`,
    ),
    check(
      "capability_idempotency_owner_state_check",
      sql`(${table.state} = 'owned' AND ${table.ownershipToken} IS NOT NULL AND ${table.outputJson} IS NULL AND ${table.errorJson} IS NULL) OR (${table.state} = 'completed' AND ${table.ownershipToken} IS NULL AND ${table.outputJson} IS NOT NULL AND ${table.errorJson} IS NULL) OR (${table.state} IN ('retryable', 'terminal') AND ${table.ownershipToken} IS NULL AND ${table.outputJson} IS NULL AND ${table.errorJson} IS NOT NULL)`,
    ),
    check(
      "capability_idempotency_tenant_key_check",
      sql`(${table.scope} = 'global-capability' AND ${table.tenantKey} = '__global__') OR (${table.scope} = 'tenant-capability' AND ${table.tenantKey} <> '__global__' AND length(${table.tenantKey}) > 0)`,
    ),
    index("capability_idempotency_expiry_idx").on(table.expiresAt),
  ],
);
