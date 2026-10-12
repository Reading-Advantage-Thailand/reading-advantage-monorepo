import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TenantDB } from "../db-contract.js";
import { resolveLegacyChapter, resolveLegacyStoryId } from "../stories/legacy-id.js";
import { createMockDb } from "./mock-db.js";

const assertCan = vi.hoisted(() => vi.fn());

vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  assertCan,
}));

const user = { id: "student-1", username: "student1", name: "Student", role: "STUDENT" as const, schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1" };
const tenant = { schoolId: "school-1" };
const NEW_ID = "f52e7c27-7030-459a-859a-c3a28a4accbd";
const CUID = "cmgqx8v6602p3t79btatvfjuw";

describe("resolveLegacyStoryId", () => {
  beforeEach(() => assertCan.mockClear());

  it("finds the migrated story of a legacy cuid", async () => {
    const db = createMockDb({ selectSequence: [[{ newId: NEW_ID }]] });
    const result = await resolveLegacyStoryId({ db: db as unknown as TenantDB, user, tenant, input: { legacyId: CUID } });
    expect(assertCan).toHaveBeenCalledWith(user, "story:read", tenant);
    expect(result).toBe(NEW_ID);
  });

  it("returns null for a cuid the map does not know", async () => {
    const db = createMockDb({ selectSequence: [[]] });
    expect(await resolveLegacyStoryId({ db: db as unknown as TenantDB, user, tenant, input: { legacyId: CUID } })).toBeNull();
  });

  it("reads nothing for a uuid or a text that is not a legacy id", async () => {
    const db = createMockDb({ selectSequence: [[{ newId: NEW_ID }]] });
    expect(await resolveLegacyStoryId({ db: db as unknown as TenantDB, user, tenant, input: { legacyId: NEW_ID } })).toBeNull();
    expect(await resolveLegacyStoryId({ db: db as unknown as TenantDB, user, tenant, input: { legacyId: "../etc" } })).toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("resolveLegacyChapter", () => {
  it("keeps a positive whole chapter number", () => {
    expect(resolveLegacyChapter("3")).toBe(3);
  });

  it("returns null for zero, a negative, a fraction, or text", () => {
    for (const bad of ["0", "-1", "1.5", "abc", "", "2x"]) expect(resolveLegacyChapter(bad)).toBeNull();
  });
});
