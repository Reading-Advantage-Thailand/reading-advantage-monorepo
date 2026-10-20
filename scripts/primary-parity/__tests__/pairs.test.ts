import { describe, expect, it } from "vitest";
import { PairList } from "../pairs.js";
import * as pairs from "../pairs.js";

const check = { id: "C1", behavior: "The page shows the metric cards." };
const pair = {
  id: "SYS-01",
  rows: ["SYS-01"],
  role: "SYSTEM",
  legacyPath: "/en/system/dashboard",
  newPath: "/en/system/dashboard",
  checks: [check],
};
const valid = { member: "primary_parity_acceptance_20261011", pairs: [pair] };

/** API that Phase 3 adds to pairs.ts: resolvePlaceholders(path, context). */
const resolve = (path: string, context: unknown): string =>
  (pairs as unknown as { resolvePlaceholders: (p: string, c: unknown) => string }).resolvePlaceholders(path, context);

const context = {
  map: (table: string, legacyId: string) => (table === "article" && legacyId === "abc123" ? "new-id-9" : undefined),
  users: { STUDENT: "user-stu-1", TEACHER: "user-tea-1" },
};

describe("PairList schema", () => {
  it("parses a valid file", () => {
    expect(PairList.safeParse(valid).success).toBe(true);
  });

  it("applies the defaults for widths and colorSchemes", () => {
    const parsed = PairList.parse(valid);
    expect(parsed.pairs[0].widths).toEqual([375, 1280]);
    expect(parsed.pairs[0].colorSchemes).toEqual(["light"]);
  });

  it("fails when checks is missing", () => {
    const { checks: _checks, ...noChecks } = pair;
    expect(PairList.safeParse({ ...valid, pairs: [noChecks] }).success).toBe(false);
  });

  it("fails when checks is empty", () => {
    expect(PairList.safeParse({ ...valid, pairs: [{ ...pair, checks: [] }] }).success).toBe(false);
  });

  it("refuses a password-like field on a pair", () => {
    expect(PairList.safeParse({ ...valid, pairs: [{ ...pair, password: "k7mq-x3ra-p9vd" }] }).success).toBe(false);
  });

  it("refuses a password-like field at the top level", () => {
    expect(PairList.safeParse({ ...valid, classCode: "ABC123" }).success).toBe(false);
  });

  it("refuses a password-like field on a check", () => {
    const bad = { ...pair, checks: [{ ...check, password: "x" }] };
    expect(PairList.safeParse({ ...valid, pairs: [bad] }).success).toBe(false);
  });

  it("refuses a path that carries a password-like query value", () => {
    const bad = { ...pair, legacyPath: "/en/system/dashboard?password=secret" };
    expect(PairList.safeParse({ ...valid, pairs: [bad] }).success).toBe(false);
  });

  it("refuses duplicate pair ids", () => {
    expect(PairList.safeParse({ ...valid, pairs: [pair, pair] }).success).toBe(false);
  });
});

describe("resolvePlaceholders", () => {
  it("resolves a map placeholder through the fake map", () => {
    expect(resolve("/en/student/read/{map:article:abc123}", context)).toBe("/en/student/read/new-id-9");
  });

  it("resolves a user placeholder", () => {
    expect(resolve("/en/teacher/students/{user:STUDENT}", context)).toBe("/en/teacher/students/user-stu-1");
  });

  it("resolves several placeholders in one path", () => {
    expect(resolve("/en/{user:TEACHER}/{map:article:abc123}", context)).toBe("/en/user-tea-1/new-id-9");
  });

  it("returns a path with no placeholder unchanged", () => {
    expect(resolve("/en/system/dashboard", context)).toBe("/en/system/dashboard");
  });

  it("throws on an unknown placeholder kind", () => {
    expect(() => resolve("/en/x/{foo:bar}", context)).toThrow(/unknown placeholder.*foo/i);
  });

  it("throws when the map has no row for the legacy id", () => {
    expect(() => resolve("/en/x/{map:article:missing}", context)).toThrow(/missing/);
  });

  it("throws when the user role has no matched user", () => {
    expect(() => resolve("/en/x/{user:ADMIN}", context)).toThrow(/ADMIN/);
  });

  it("throws on an unknown role in a user placeholder", () => {
    expect(() => resolve("/en/x/{user:WIZARD}", context)).toThrow(/WIZARD/);
  });
});

describe("pair requires (M-23)", () => {
  const api = pairs as unknown as {
    checkRequires: (
      pair: { id: string; role: string; requires?: { userId?: string; classroomId?: string } },
      entries: Record<string, { userId: string; new: { classroomId?: string } }>,
    ) => string | undefined;
  };
  const entries = { TEACHER: { userId: "u-1", new: { classroomId: "c-1" } }, STUDENT: { userId: "u-2", new: { classroomId: "c-1" } } };

  it("parses an optional requires with a userId and a classroomId", () => {
    const withRequires = { ...pair, role: "TEACHER", requires: { userId: "u-1", classroomId: "c-1" } };
    expect(PairList.safeParse({ ...valid, pairs: [withRequires] }).success).toBe(true);
  });

  it("refuses an unknown field in requires", () => {
    expect(PairList.safeParse({ ...valid, pairs: [{ ...pair, requires: { password: "x" } }] }).success).toBe(false);
  });

  it("returns nothing when the pair has no requires or the accounts match", () => {
    expect(api.checkRequires({ id: "P", role: "TEACHER" }, entries)).toBeUndefined();
    expect(api.checkRequires({ id: "P", role: "TEACHER", requires: { userId: "u-1", classroomId: "c-1" } }, entries)).toBeUndefined();
  });

  it("names the pair when the user does not match", () => {
    expect(api.checkRequires({ id: "P-7", role: "TEACHER", requires: { userId: "u-9" } }, entries)).toMatch(/P-7.*TEACHER.*u-9/);
  });

  it("names the pair when the class does not match", () => {
    expect(api.checkRequires({ id: "P-8", role: "STUDENT", requires: { classroomId: "c-5" } }, entries)).toMatch(/P-8.*c-5/);
  });
});

describe("final path check (M-23)", () => {
  const api = pairs as unknown as { pathMismatch: (requested: string, finalUrl: string) => boolean };

  it("accepts the same path and ignores the query and the host", () => {
    expect(api.pathMismatch("/en/teacher/home", "http://localhost:3005/en/teacher/home?x=1")).toBe(false);
  });

  it("flags a redirect to another path", () => {
    expect(api.pathMismatch("/en/teacher/home", "http://localhost:3005/en/auth/signin")).toBe(true);
  });

  it("matches a placeholder against one path segment", () => {
    expect(api.pathMismatch("/en/student/read/{map:article:abc}", "http://localhost:3005/en/student/read/zz9")).toBe(false);
    expect(api.pathMismatch("/en/student/read/{map:article:abc}", "http://localhost:3005/en/auth/signin")).toBe(true);
  });
});
