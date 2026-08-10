import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Mutable working state for a workbook being prepared for publication. */
export const workbookDrafts = pgTable(
  "workbook_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    status: text("status").notNull(),
    sourceApp: text("source_app").notNull(),
    sourceId: text("source_id").notNull(),
    sourceRevision: text("source_revision").notNull(),
    contentHash: text("content_hash").notNull(),
    snapshotJson: jsonb("snapshot_json").$type<unknown>().notNull(),
    revision: integer("revision").notNull().default(0),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("workbook_drafts_tenant_idx").on(table.tenantId),
    index("workbook_drafts_source_idx").on(table.sourceApp, table.sourceId),
    check(
      "workbook_drafts_status_check",
      sql`${table.status} in ('draft','in_review','published','superseded','revoked')`,
    ),
    check("workbook_drafts_revision_check", sql`${table.revision} >= 0`),
  ],
);

/** Append-only immutable snapshot of a published workbook edition. */
export const workbookEditions = pgTable(
  "workbook_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => workbookDrafts.id),
    tenantId: text("tenant_id").notNull(),
    version: integer("version").notNull(),
    snapshotJson: jsonb("snapshot_json").$type<unknown>().notNull(),
    contentHash: text("content_hash").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    publishedBy: text("published_by").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    /**
     * Intentionally NOT a foreign key to avoid a circular self-reference in the
     * generated migration; this edition's successor is tracked by id only.
     */
    supersededByEditionId: uuid("superseded_by_edition_id"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    unique("workbook_editions_draft_version_unique").on(
      table.draftId,
      table.version,
    ),
    unique("workbook_editions_idempotency_unique").on(
      table.tenantId,
      table.idempotencyKey,
    ),
    index("workbook_editions_tenant_idx").on(table.tenantId),
    check("workbook_editions_version_check", sql`${table.version} >= 1`),
  ],
);

/** Append-only audit trail of workbook publication actions. */
export const workbookPublicationEvents = pgTable(
  "workbook_publication_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    draftId: uuid("draft_id").notNull(),
    editionId: uuid("edition_id"),
    eventType: text("event_type").notNull(),
    actorId: text("actor_id").notNull(),
    detailJson: jsonb("detail_json").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("workbook_publication_events_tenant_idx").on(table.tenantId),
    index("workbook_publication_events_draft_idx").on(table.draftId),
    check(
      "workbook_publication_events_type_check",
      sql`${table.eventType} in ('draft_created','submitted_for_review','returned_to_draft','published','superseded','revoked')`,
    ),
  ],
);
