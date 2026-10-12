import { and, eq } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import { primaryLegacyIdMap } from "@reading-advantage/db/schema";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";

/** The `primary_legacy_id_map.table_name` value of a migrated story (the ETL writes it). */
export const LEGACY_STORY_TABLE = "stories";

/** A legacy Primary story id: a Prisma cuid. A uuid never matches (it has dashes). */
export const legacyStoryIdSchema = z.string().regex(/^[a-z0-9]{20,40}$/u);

/** The input of `resolveLegacyStoryId`. */
export const resolveLegacyStoryIdInputSchema = z.object({ legacyId: z.string() });

/** The migrated story uuid, or null when the id is not a legacy id or the map does not know it. */
export const resolveLegacyStoryIdOutputSchema = z.string().uuid().nullable();

/**
 * Finds the migrated story of a legacy Primary story id through `primary_legacy_id_map`, so that an
 * old link opens the same story after the cutover (spec S7).
 * @param args Authenticated tenant context and the id from the URL.
 * @returns The story uuid, or null when the id is not a legacy id or the map does not know it.
 * @throws When authorization fails.
 */
export async function resolveLegacyStoryId({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: z.input<typeof resolveLegacyStoryIdInputSchema>;
}): Promise<string | null> {
  assertCan(user, "story:read", tenant);
  const legacyId = legacyStoryIdSchema.safeParse(resolveLegacyStoryIdInputSchema.parse(input).legacyId);
  if (!legacyId.success) return null;
  const [row] = await db
    .select({ newId: primaryLegacyIdMap.newId })
    .from(primaryLegacyIdMap)
    .where(and(eq(primaryLegacyIdMap.tableName, LEGACY_STORY_TABLE), eq(primaryLegacyIdMap.legacyId, legacyId.data)))
    .limit(1);
  return resolveLegacyStoryIdOutputSchema.parse(row?.newId ?? null);
}

/**
 * Reads the chapter number of a legacy chapter URL. The legacy URL carries the chapter number, not
 * an id, and the new chapter route uses the same number, so no map lookup is needed.
 * @param text The last URL segment.
 * @returns The chapter number, or null when the text is not a positive whole number.
 */
export function resolveLegacyChapter(text: string): number | null {
  return /^[1-9][0-9]{0,5}$/u.test(text) ? Number(text) : null;
}
