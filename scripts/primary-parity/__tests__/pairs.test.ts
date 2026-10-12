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
