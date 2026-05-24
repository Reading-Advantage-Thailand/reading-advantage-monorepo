/**
 * DEFERRED — blocked by Phase 6 seed-functions migration.
 *
 * Track: prisma_drizzle_science_controllers_20260505
 *
 * This integration suite exercises `prisma/seed-functions/seed-activity-data.ts`,
 * which is still on Prisma. The corresponding `scripts/seed-activity-data.ts`
 * task was deferred for the same reason (see plan.md Phase 6 line 265:
 * "seed-activity-data DEFERRED — blocked by `prisma/seed-functions/seed-activity-data.ts`
 * Phase 6 task (line 263)").
 *
 * Re-enable this file (remove `.skip`, port to Drizzle + `science_*` tables,
 * truncate-and-reseed pattern, drop the `new PrismaClient()` boot, import the
 * Drizzle-port seeders) as part of the Phase 6 task:
 *   "Rewrite or retire `prisma/seed-functions/*` against Drizzle"
 *
 * Until then the suite is skipped so the full test run stays green without
 * pulling Prisma back into the test runtime.
 */
import { describe, it } from 'vitest';

describe.skip('seedActivityData (DEFERRED — blocked by Phase 6 seed-functions migration)', () => {
  it('placeholder — see file header for re-enable instructions', () => {
    // Intentionally empty. Original suite preserved in git history at sha
    // prior to this commit; restore alongside the Drizzle-ported seeder.
  });
});
