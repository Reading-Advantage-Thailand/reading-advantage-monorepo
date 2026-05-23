# Legacy Materialized View SQL

These directories contain raw PostgreSQL `CREATE MATERIALIZED VIEW` SQL that originally lived
under `apps/reading-advantage/prisma/migrations/` and was applied via `prisma migrate deploy`.

The Prisma migration pipeline was removed by Track 2
(`prisma_drizzle_reading_controllers_20260505`, 2026-05-23). These matviews are still required by
the running app — services in `apps/reading-advantage/server/services/metrics/` and several
controllers (`enhanced-alignment-controller.ts`, `srs-health-service.ts`, etc.) read from them.

## Status

- The matviews already exist in the production and staging databases (applied by the original
  Prisma migrations before this track ran).
- For fresh database setups, this SQL must still be applied. Options:
  1. Manually `psql -f` each migration in order against the target database.
  2. Wrap the SQL in a Drizzle migration under `packages/db/drizzle/` (preferred follow-up).
  3. Run the file via a one-shot script.

## Order

Apply in this order (timestamps in directory names):
1. `20251009000001_add_dashboard_materialized_views`
2. `20251015000000_enhance_velocity_matviews`
3. `20251022000000_enhance_assignment_funnel_analytics`
4. `20251022000001_enhance_alignment_metrics`
5. `20251022000002_enhance_srs_health_metrics`
6. `20251022050000_enhance_activity_heatmap`
7. `20251022080000_genre_engagement_metrics`
8. `20251110000000_add_unique_index_activity_heatmap`

Each subdirectory contains a `migration.sql` (forward) and may contain a `rollback.sql`.

## Tech-debt entry

Tracked in `measure/tech-debt.md` (created by Track 2) — the follow-up to fold these into a
proper Drizzle migration belongs to a future maintenance task.
