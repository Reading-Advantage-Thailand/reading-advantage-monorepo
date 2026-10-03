import { describe, it, expect, vi } from "vitest";
import { findLegacyDatabaseMarkers } from "../legacy-db-guard.js";

describe("findLegacyDatabaseMarkers", () => {
  it("passes a fresh empty database", async () => {
    const query = vi.fn().mockResolvedValue([]);
    expect(await findLegacyDatabaseMarkers(query)).toEqual([]);
  });

  it("flags public._prisma_migrations", async () => {
    const query = vi.fn().mockResolvedValue([{ table_name: "_prisma_migrations" }]);
    expect(await findLegacyDatabaseMarkers(query)).toEqual(["public._prisma_migrations"]);
  });

  it("flags public.article", async () => {
    const query = vi.fn().mockResolvedValue([{ table_name: "article" }]);
    expect(await findLegacyDatabaseMarkers(query)).toEqual(["public.article"]);
  });

  it("flags both markers and issues one read-only SELECT", async () => {
    const query = vi
      .fn()
      .mockResolvedValue([{ table_name: "article" }, { table_name: "_prisma_migrations" }]);
    expect(await findLegacyDatabaseMarkers(query)).toHaveLength(2);
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]![0]).trim()).toMatch(/^select/i);
  });
});
