/**
 * FR-1 (primary_legacy_data_migration_20261004): the legacy ID map table.
 * Pins the column shape, the primary key, the reverse-lookup index, and the
 * EXEMPT tenant classification.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { primaryLegacyIdMap } from "../schema/primary.js";
import * as schema from "../schema/index.js";

const REGISTRY = readFileSync(
  new URL("../../../domain/src/tenant-registry.ts", import.meta.url),
  "utf8",
);

describe("primary_legacy_id_map schema", () => {
  const cfg = getTableConfig(primaryLegacyIdMap);

  it("is exported from the schema barrel", () => {
    expect(schema.primaryLegacyIdMap).toBe(primaryLegacyIdMap);
  });

  it("has table_name, legacy_id (text) and new_id (uuid), all NOT NULL", () => {
    const cols = Object.fromEntries(cfg.columns.map((c) => [c.name, c]));
    expect(cfg.name).toBe("primary_legacy_id_map");
    expect(Object.keys(cols).sort()).toEqual(["legacy_id", "new_id", "table_name"]);
    expect(cols.table_name!.getSQLType()).toBe("text");
    expect(cols.legacy_id!.getSQLType()).toBe("text");
    expect(cols.new_id!.getSQLType()).toBe("uuid");
    for (const c of Object.values(cols)) expect(c.notNull).toBe(true);
  });

  it("uses (table_name, legacy_id) as the primary key", () => {
    expect(cfg.primaryKeys).toHaveLength(1);
    expect(cfg.primaryKeys[0]!.columns.map((c) => c.name)).toEqual(["table_name", "legacy_id"]);
  });

  it("has a reverse-lookup index on (table_name, new_id)", () => {
    const idx = cfg.indexes.find((i) => i.config.name === "primary_legacy_id_map_new_id_idx");
    expect(idx).toBeDefined();
    expect(idx!.config.columns.map((c) => (c as { name: string }).name)).toEqual([
      "table_name",
      "new_id",
    ]);
  });

  it("is classified EXEMPT in the tenant registry", () => {
    expect(REGISTRY).toMatch(/register\(primaryLegacyIdMap, "EXEMPT"\)/);
  });
});
