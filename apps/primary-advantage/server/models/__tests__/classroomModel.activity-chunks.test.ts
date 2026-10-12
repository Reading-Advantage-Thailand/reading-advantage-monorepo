// @vitest-environment node
/** getLastActivityByStudent sends at most 5000 ids in each IN list (Postgres limit: 65535 parameters). */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ inArray: vi.fn(), select: vi.fn() }));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    inArray: (...args: unknown[]) => {
      mocks.inArray(...args);
      return (actual.inArray as (...a: unknown[]) => unknown)(...args);
    },
    db: { select: mocks.select },
  };
});

import { getLastActivityByStudent } from "../classroomModel";

/** A select chain that resolves to the given rows. */
function chain(rows: unknown[]) {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "groupBy"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown) => Promise.resolve(rows).then(res);
  return c;
}

beforeEach(() => {
  mocks.inArray.mockClear();
  mocks.select.mockReset();
  mocks.select.mockImplementation(() => chain([]));
});

describe("getLastActivityByStudent chunking", () => {
  it("splits 12000 ids into 3 chunks of at most 5000 for each of the 2 tables", async () => {
    const ids = Array.from({ length: 12_000 }, (_, i) => `s${i}`);
    await getLastActivityByStudent(ids);
    const sizes = mocks.inArray.mock.calls.map((call) => (call[1] as string[]).length);
    expect(sizes).toHaveLength(6);
    expect(Math.max(...sizes)).toBe(5000);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(24_000);
  });

  it("merges the newest time over the chunks", async () => {
    const early = new Date("2026-10-01T00:00:00Z");
    const late = new Date("2026-10-05T00:00:00Z");
    mocks.select
      .mockImplementationOnce(() => chain([{ userId: "s0", last: early }]))
      .mockImplementationOnce(() => chain([]))
      .mockImplementationOnce(() => chain([{ userId: "s0", last: late }]))
      .mockImplementationOnce(() => chain([]));
    const ids = Array.from({ length: 5001 }, (_, i) => `s${i}`);
    const result = await getLastActivityByStudent(ids);
    expect(result.get("s0")).toEqual(late);
  });

  it("runs no query for an empty list", async () => {
    await getLastActivityByStudent([]);
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
