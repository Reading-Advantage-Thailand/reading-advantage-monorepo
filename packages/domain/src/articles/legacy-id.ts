import { and, eq } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import { primaryLegacyIdMap } from "@reading-advantage/db/schema";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";
import { LEGACY_ARTICLE_TABLE } from "../primary-mastery/backfill.js";

/**
 * A legacy Primary article id: a Prisma cuid such as `cmgqx8v6602p3t79btatvfjuw`, as the printed
 * Origins 2 and 3.1 QR codes carry it. A uuid never matches (it has dashes).
 */
export const legacyArticleIdSchema = z.string().regex(/^[a-z0-9]{20,40}$/u);

/** The input of `resolveLegacyArticleId`. */
export const resolveLegacyArticleIdInputSchema = z.object({ legacyId: z.string() });

/** The migrated article uuid, or null when the id is not a legacy id or the map does not know it. */
export const resolveLegacyArticleIdOutputSchema = z.string().uuid().nullable();

/**
 * Finds the migrated article of a legacy Primary article id through `primary_legacy_id_map`, so
 * that an old link (a printed QR code) opens the same article after the cutover (spec D3, FR-4).
 * @param args Authenticated tenant context and the id from the URL.
 * @returns The article uuid, or null when the id is not a legacy id or the map does not know it.
 * @throws When authorization fails.
 */
export async function resolveLegacyArticleId({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: z.input<typeof resolveLegacyArticleIdInputSchema>;
}): Promise<string | null> {
  assertCan(user, "article:read", tenant);
  const legacyId = legacyArticleIdSchema.safeParse(resolveLegacyArticleIdInputSchema.parse(input).legacyId);
  if (!legacyId.success) return null;
  const [row] = await db
    .select({ newId: primaryLegacyIdMap.newId })
    .from(primaryLegacyIdMap)
    .where(and(eq(primaryLegacyIdMap.tableName, LEGACY_ARTICLE_TABLE), eq(primaryLegacyIdMap.legacyId, legacyId.data)))
    .limit(1);
  return resolveLegacyArticleIdOutputSchema.parse(row?.newId ?? null);
}
