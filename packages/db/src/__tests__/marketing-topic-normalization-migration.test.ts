import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { pastTopics } from "../schema/marketing.js";

const migration = readFileSync(
  join(process.cwd(), "drizzle/0041_marketing_past_topic_normalized_key.sql"),
  "utf8",
);

describe("Marketing past-topic normalized-key migration", () => {
  it("adds, backfills, deduplicates, and requires normalized_key before uniqueness", () => {
    expect(migration).toContain(
      'ALTER TABLE "past_topics" ADD COLUMN "normalized_key" text',
    );
    expect(migration).toMatch(/UPDATE "past_topics"[\s\S]+normalized_key/i);
    expect(migration).toMatch(/DELETE FROM "past_topics"[\s\S]+normalized_key/i);
    expect(migration).toContain(
      'ALTER TABLE "past_topics" ALTER COLUMN "normalized_key" SET NOT NULL',
    );
    expect(migration.indexOf("UPDATE \"past_topics\"")).toBeLessThan(
      migration.indexOf("SET NOT NULL"),
    );
    expect(migration.indexOf("SET NOT NULL")).toBeLessThan(
      migration.indexOf("CREATE UNIQUE INDEX"),
    );
  });

  it("declares the app plus normalized-key unique index in Drizzle", () => {
    const config = getTableConfig(pastTopics);
    const normalizedKey = config.columns.find(
      (column) => column.name === "normalized_key",
    );
    expect(normalizedKey?.notNull).toBe(true);

    const uniqueIndex = config.indexes.find(
      (index) => index.config.name === "past_topics_app_normalized_key_unique",
    );
    expect(uniqueIndex?.config.unique).toBe(true);
    expect(
      uniqueIndex?.config.columns.map((column) =>
        "name" in column ? column.name : null,
      ),
    ).toEqual(["app", "normalized_key"]);
  });
});
