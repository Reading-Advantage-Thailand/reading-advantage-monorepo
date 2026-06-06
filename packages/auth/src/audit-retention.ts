import { sql } from "drizzle-orm";
import { createPrivilegedDb } from "@reading-advantage/db";
import type { DB } from "@reading-advantage/db/client";
import type postgres from "postgres";
import { recordAuditEvent } from "./audit.js";
import { getRetentionDays } from "./audit-retention-config.js";

const BATCH_SIZE = 5000;

interface PrivilegedConnection {
  db: DB;
  client: postgres.Sql;
}

/**
 * Calculates the UTC cutoff date before which audit events are expired.
 * @param now - The reference date (defaults to current time)
 * @param retentionDays - Number of days to retain (defaults to configured value)
 * @returns The cutoff Date; rows with created_at < this date are expired
 */
export function getRetentionCutoff(now: Date, retentionDays?: number): Date {
  const days = retentionDays ?? getRetentionDays();
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Deletes expired audit_events rows in batches using a privileged database
 * connection. The app role cannot DELETE from audit_events (append-only
 * REVOKE), so this function uses DIRECT_DATABASE_URL via createPrivilegedDb.
 *
 * After all batches complete, records an `audit:retention_purge` event
 * with the total deleted count.
 *
 * @param now - The reference date for calculating the retention window
 * @param conn - Optional shared privileged connection (for advisory lock hold)
 * @returns An object with the total number of deleted rows
 */
export async function purgeExpiredAuditEvents(
  now: Date = new Date(),
  conn?: PrivilegedConnection
): Promise<{ deleted: number }> {
  const retentionDays = getRetentionDays();
  const cutoff = getRetentionCutoff(now, retentionDays);

  const owned = conn ? null : createPrivilegedDb();
  const privilegedDb = conn?.db ?? owned!.db;
  const client = conn?.client ?? owned!.client;

  const cutoffIso = cutoff.toISOString();
  let totalDeleted = 0;

  try {
    while (true) {
      const result = await privilegedDb.execute(sql`
        DELETE FROM audit_events
        WHERE id IN (
          SELECT id FROM audit_events
          WHERE created_at < ${cutoffIso}
          LIMIT ${BATCH_SIZE}
        )
        RETURNING id
      `);

      const batchCount = Array.isArray(result) ? result.length : 0;
      totalDeleted += batchCount;

      if (batchCount < BATCH_SIZE) {
        break;
      }
    }

    if (totalDeleted > 0) {
      await recordAuditEvent(
        {
          actorUserId: null,
          actorRole: "SYSTEM",
          ipAddress: null,
          userAgent: null,
        },
        {
          action: "audit:retention_purge",
          metadata: {
            deletedCount: totalDeleted,
            retentionDays,
            cutoff: cutoff.toISOString(),
          },
        }
      );
    }
  } finally {
    if (owned) {
      await client.end();
    }
  }

  return { deleted: totalDeleted };
}
