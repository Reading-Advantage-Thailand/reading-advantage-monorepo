// @vitest-environment node
/**
 * PR found on 2026-10-21 (J6) that lesson step 12 showed "ไม่สามารถโหลดกิจกรรมได้" when the student had
 * no article activity row: the model threw "Assignment activity not found" and the route gave 500.
 */
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("@/lib/session", () => ({ currentUser: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock("@reading-advantage/db", async (importOriginal) => ({
  // The real tables stay: the domain and auth modules register them when they load.
  ...(await importOriginal<typeof import("@reading-advantage/db")>()),
  db: { select: mocks.select },
}));

import { getAssignmentActivityById } from "../assignmentModel";

/**
 * Builds a chainable Drizzle stub resolving to rows.
 * @param value The rows returned when awaited.
 * @returns A stub with the select chain methods.
 */
function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "where", "limit"]) stub[method] = () => stub;
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) => Promise.resolve(value).then(resolve);
  return stub;
}

describe("getAssignmentActivityById", () => {
  it("returns no activity done when the student has no activity row", async () => {
    mocks.select.mockReturnValueOnce(chain([]));
    await expect(getAssignmentActivityById("article-1", "student-1")).resolves.toEqual({
      isSentenceMatchingCompleted: false,
      isSentenceOrderingCompleted: false,
      isSentenceWordOrderingCompleted: false,
      isSentenceClozeTestCompleted: false,
    });
  });

  it("returns the saved flags when the row exists", async () => {
    const row = { isSentenceMatchingCompleted: true, isSentenceOrderingCompleted: false, isSentenceWordOrderingCompleted: true, isSentenceClozeTestCompleted: false };
    mocks.select.mockReturnValueOnce(chain([row]));
    await expect(getAssignmentActivityById("article-1", "student-1")).resolves.toEqual(row);
  });
});
