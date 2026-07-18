import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/drizzle/0041_marketing_past_topic_normalized_key.sql",
  ),
  "utf8",
);

const oldSchema = `
  CREATE TABLE past_topics (
    id uuid PRIMARY KEY,
    app text NOT NULL,
    topic text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  );
`;

let client: PGlite | null = null;

afterEach(async () => {
  await client?.close();
  client = null;
});

describe("Marketing migration 0041 live compatibility", () => {
  it("derives canonical keys for predecessor inserts and topic updates", async () => {
    client = new PGlite();
    await client.exec(oldSchema);
    await client.exec(`BEGIN; ${migration} COMMIT;`);

    const inserted = await client.query<{ normalized_key: string }>(`
      INSERT INTO past_topics (id, app, topic)
      VALUES (
        '11111111-1111-4111-8111-111111111111',
        'reading-advantage',
        '  Reading   Advantage สำหรับเด็ก  '
      )
      RETURNING normalized_key;
    `);
    expect(inserted.rows[0]?.normalized_key).toBe(
      "reading advantageสำหรับเด็ก",
    );

    const updated = await client.query<{ normalized_key: string }>(`
      UPDATE past_topics
      SET topic = '  NEW   Topic  '
      WHERE id = '11111111-1111-4111-8111-111111111111'
      RETURNING normalized_key;
    `);
    expect(updated.rows[0]?.normalized_key).toBe("new topic");

    const functionMetadata = await client.query<{ provolatile: string }>(`
      SELECT provolatile
      FROM pg_proc
      WHERE proname = 'marketing_normalize_topic';
    `);
    expect(functionMetadata.rows).toEqual([{ provolatile: "i" }]);
  }, 60_000);

  it("raises on canonical duplicates and leaves every original row intact", async () => {
    client = new PGlite();
    await client.exec(oldSchema);
    await client.exec(`
      INSERT INTO past_topics (id, app, topic) VALUES
        ('22222222-2222-4222-8222-222222222222', 'reading-advantage', 'Hello Topic'),
        ('33333333-3333-4333-8333-333333333333', 'reading-advantage', '  hello   topic  ');
    `);

    let migrationError: unknown;
    try {
      await client.exec(`BEGIN; ${migration} COMMIT;`);
    } catch (error) {
      migrationError = error;
      await client.exec("ROLLBACK;");
    }

    expect(String(migrationError)).toMatch(/duplicate app\/topic groups/i);
    const rows = await client.query<{ topic: string }>(`
      SELECT topic FROM past_topics ORDER BY id;
    `);
    expect(rows.rows.map((row) => row.topic)).toEqual([
      "Hello Topic",
      "  hello   topic  ",
    ]);
  }, 60_000);
});
