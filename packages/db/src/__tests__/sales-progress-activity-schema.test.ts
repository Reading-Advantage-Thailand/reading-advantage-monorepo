import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sentinelProbes } from "../sentinels.js";

const packageRoot = resolve(import.meta.dirname, "../..");
const migrationTag = "0039_sales_progress_activity_timestamp";

describe("Sales progress activity migration", () => {
  it("adds a non-null updated_at timestamp through the governed ledger", () => {
    const sql = readFileSync(
      resolve(packageRoot, `drizzle/${migrationTag}.sql`),
      "utf8",
    );
    const journal = JSON.parse(
      readFileSync(resolve(packageRoot, "drizzle/meta/_journal.json"), "utf8"),
    ) as { entries: Array<{ idx: number; tag: string }> };

    expect(sql).toMatch(
      /ALTER TABLE "sales_progress" ADD COLUMN "updated_at" timestamp DEFAULT now\(\) NOT NULL/,
    );
    expect(journal.entries.at(-1)).toMatchObject({
      idx: 39,
      tag: migrationTag,
    });
    expect(sentinelProbes[migrationTag]).toEqual({
      tag: migrationTag,
      kind: "column",
      target: "sales_progress.updated_at",
    });
  });
});
