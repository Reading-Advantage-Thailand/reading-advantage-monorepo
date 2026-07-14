import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

describe("0035 tutorial capture fleet lease migration", () => {
  let client: PGlite | undefined;
  afterEach(async () => client?.close());

  it("creates token-fenced lease rows with nonnegative durable rate counters", async () => {
    client = new PGlite();
    const migration = await readFile(resolve(process.cwd(), "drizzle/0035_activity_tutorial_capture_leases.sql"), "utf8");
    await expect(client.exec(migration)).resolves.toBeDefined();
    await expect(client.exec(`INSERT INTO activity_tutorial_capture_leases (lease_key, window_started_at, attempt_count, lease_until) VALUES ('learner:one', now(), 1, now());`)).resolves.toBeDefined();
    await expect(client.exec(`INSERT INTO activity_tutorial_capture_leases (lease_key, window_started_at, attempt_count, lease_until) VALUES ('learner:two', now(), -1, now());`)).rejects.toThrow();
    const indexes = await client.query<{ indexname: string }>("SELECT indexname FROM pg_indexes WHERE tablename = 'activity_tutorial_capture_leases'");
    expect(indexes.rows.map(({ indexname }) => indexname)).toContain("activity_tutorial_capture_leases_expiry_idx");
  }, 30_000);
});
