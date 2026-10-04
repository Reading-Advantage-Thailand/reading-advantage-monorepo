/** Schema-qualified targets for table sentinels (used by the tutor_compat views probe). */
import { describe, it, expect, vi } from "vitest";
import { checkTableSentinel } from "../sentinel-evaluation.js";
import { sentinelProbes } from "../sentinels.js";

const client = (rows: unknown[]) => ({ unsafe: vi.fn().mockResolvedValue(rows) });

describe("checkTableSentinel schema targets", () => {
  it("defaults to the public schema", async () => {
    const c = client([{}]);
    expect(await checkTableSentinel(c as never, "table", "users")).toBe(true);
    expect(c.unsafe.mock.calls[0]![1]).toEqual(["public", "users"]);
  });
  it("splits a schema-qualified target", async () => {
    const c = client([]);
    expect(await checkTableSentinel(c as never, "table", "tutor_compat.article")).toBe(false);
    expect(c.unsafe.mock.calls[0]![1]).toEqual(["tutor_compat", "article"]);
  });
  it("has probes for 0060 and 0061", () => {
    expect(sentinelProbes["0060_primary_legacy_id_map"]).toBeDefined();
    expect(sentinelProbes["0061_tutor_compat_views"]).toBeDefined();
  });
});
