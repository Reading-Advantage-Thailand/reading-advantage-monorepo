/**
 * In-process PostgreSQL test harness (PGlite) for apps/marketing.
 *
 * Boots a real Postgres engine (compiled to WASM) inside the test process so
 * the video-project route handlers run against genuine SQL semantics — real
 * INSERT/SELECT, real FK enforcement, and real JSONB persistence — with no
 * server, Docker, or DATABASE_URL.
 *
 * TEST-ONLY. PGlite is a devDependency and is imported only from test helpers.
 * Production continues to use the managed Postgres via @reading-advantage/db.
 *
 * Usage:
 *   vi.mock("@reading-advantage/db", async (importOriginal) => {
 *     const actual = await importOriginal<typeof import("@reading-advantage/db")>();
 *     return { ...actual, db: (globalThis as any).__TEST_DB__ };
 *   });
 *   const h = await createTestDb();
 *   await h.reset(); // truncate between tests
 *   ...
 *   await h.close();
 *
 * The DDL below is intentionally scoped to the tables the marketing video
 * project routes touch. It mirrors the column names and types in
 * packages/db/src/schema/marketing.ts so Drizzle query building works against
 * the in-process database.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@reading-advantage/db";

const DDL = `
CREATE TYPE campaign_type AS ENUM ('video', 'infocard');
CREATE TYPE campaign_status AS ENUM ('draft', 'in-progress', 'complete', 'archived');
CREATE TYPE app AS ENUM (
  'reading-advantage',
  'primary-advantage',
  'storytime',
  'math-advantage',
  'science-advantage',
  'stem-advantage',
  'zhongwen-advantage',
  'tutor-advantage'
);
CREATE TYPE video_project_status AS ENUM ('draft', 'in-progress', 'complete');

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type campaign_type NOT NULL,
  app app NOT NULL,
  name text NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  topic text NOT NULL,
  script jsonb,
  status video_project_status NOT NULL DEFAULT 'draft',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS past_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app app NOT NULL,
  topic text NOT NULL,
  normalized_key text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS past_topics_app_normalized_key_unique
  ON past_topics (app, normalized_key);
`;

const TABLES = ["video_projects", "past_topics", "campaigns"];

export interface TestDb {
  /** Drizzle instance bound to the in-process PGlite database. */
  db: ReturnType<typeof drizzle>;
  /** Truncate all harness tables (run between tests for isolation). */
  reset: () => Promise<void>;
  /** Tear down the PGlite instance. */
  close: () => Promise<void>;
}

/**
 * Boots a fresh in-process Postgres with the focused marketing schema applied
 * and publishes the drizzle instance on globalThis.__TEST_DB__ so a hoisted
 * vi.mock("@reading-advantage/db") factory can pick it up.
 */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await client.exec(DDL);
  (globalThis as Record<string, unknown>).__TEST_DB__ = db;

  return {
    db,
    reset: async () => {
      await db.execute(
        sql.raw(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE;`),
      );
    },
    close: async () => {
      (globalThis as Record<string, unknown>).__TEST_DB__ = undefined;
      await client.close();
    },
  };
}
