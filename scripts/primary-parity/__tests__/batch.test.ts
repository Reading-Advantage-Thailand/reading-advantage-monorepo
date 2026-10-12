import { describe, expect, it } from "vitest";
import { pickCandidate } from "../accounts.js";
import { PairList, rolesNeeded } from "../pairs.js";

const pair = (id: string, role: string) => ({ id, rows: ["R"], role, legacyPath: "/en/x", newPath: "/en/x", checks: [{ id: "c", behavior: "b" }] });
const list = (member: string, roles: string[]) => PairList.parse({ member, pairs: roles.map((r, i) => pair(`p${i}`, r)) });

describe("rolesNeeded", () => {
  it("joins the roles of several lists without PUBLIC or duplicates", () => {
    const roles = rolesNeeded([list("a", ["ADMIN", "PUBLIC"]), list("b", ["ADMIN", "SYSTEM"])], "legacy");
    expect(roles.sort()).toEqual(["ADMIN", "SYSTEM"]);
  });
  it("adds TEACHER for a STUDENT pair on the new app only", () => {
    expect(rolesNeeded([list("a", ["STUDENT"])], "new").sort()).toEqual(["STUDENT", "TEACHER"]);
    expect(rolesNeeded([list("a", ["STUDENT"])], "legacy")).toEqual(["STUDENT"]);
  });
});

describe("pickCandidate with named ids", () => {
  const c1 = { teacher: "t1", admin: "a1", student: "s1", classroom: "k1" };
  const c2 = { teacher: "t2", admin: "a2", student: "s2", classroom: "k2" };
  const roles = new Map([["t1", "TEACHER"], ["a1", "ADMIN"], ["s1", "STUDENT"], ["t2", "TEACHER"], ["a2", "ADMIN"], ["s2", "STUDENT"]]);
  it("takes the set of the student alone", () => {
    expect(pickCandidate([c1, c2], roles, { student: "s2" })).toBe(c2);
  });
  it("takes the set of the teacher alone", () => {
    expect(pickCandidate([c1, c2], roles, { teacher: "t2" })).toBe(c2);
  });
  it("takes the set of the admin alone", () => {
    expect(pickCandidate([c1, c2], roles, { admin: "a2" })).toBe(c2);
  });
  it("returns undefined when the named ids do not fit one set", () => {
    expect(pickCandidate([c1, c2], roles, { teacher: "t1", student: "s2" })).toBeUndefined();
  });
});
