import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

describe("0032 tutorial snapshot submission binding migration", () => {
  let client: PGlite | undefined;
  afterEach(async () => client?.close());

  it("backfills multiple legacy snapshots in one session with distinct submission identities", async () => {
    client = new PGlite();
    await client.exec(`CREATE TABLE activity_tutorial_repository_states (
      id text PRIMARY KEY, tenant_key text NOT NULL, learner_id text NOT NULL, session_id uuid NOT NULL
    );`);
    await client.exec(`INSERT INTO activity_tutorial_repository_states (id, tenant_key, learner_id, session_id) VALUES
      ('snapshot-1', 'codecamp', 'learner-1', '00000000-0000-4000-8000-000000000001'),
      ('snapshot-2', 'codecamp', 'learner-1', '00000000-0000-4000-8000-000000000001');`);
    const migration = await readFile(resolve(process.cwd(), "drizzle/0032_tutorial_snapshot_submission_binding.sql"), "utf8");
    await expect(client.exec(migration)).resolves.toBeDefined();
    const result = await client.query<{ submission_id: string }>("SELECT submission_id FROM activity_tutorial_repository_states ORDER BY id");
    expect(result.rows).toEqual([{ submission_id: "legacy:snapshot-1" }, { submission_id: "legacy:snapshot-2" }]);
    await expect(client.exec(`INSERT INTO activity_tutorial_repository_states (id, tenant_key, learner_id, session_id, submission_id, step_id) VALUES ('snapshot-3', 'codecamp', 'learner-1', '00000000-0000-4000-8000-000000000001', 'legacy:snapshot-1', 'legacy');`)).rejects.toThrow();
  }, 30_000);
});
