import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users, type roleEnum } from "./users.js";

/**
 * Append-only audit event log. Enforced at the DB level via
 * REVOKE UPDATE, DELETE (see migration 0018_audit_events.sql).
 *
 * Every security-sensitive action (login, logout, password change,
 * destructive action) writes a row here. The application code can be
 * audited, but a permission error from the DB is a hard guarantee.
 */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorRole: text("actor_role").$type<string>(),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("audit_events_actor_idx").on(t.actorUserId, t.createdAt),
    index("audit_events_action_idx").on(t.action, t.createdAt),
    index("audit_events_target_idx").on(t.targetType, t.targetId),
  ]
);
