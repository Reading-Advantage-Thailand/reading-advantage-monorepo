import { describe, expect, it } from "vitest";
import {
  generateTemporaryPassword,
  isInsideDirectory,
  selectForIssue,
  TEMPORARY_PASSWORD_ALPHABET,
  toHandoutCsv,
} from "./temporary-passwords";

describe("temporary passwords (cutover FR-5)", () => {
  it("makes three groups of four from the easy-to-read alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const password = generateTemporaryPassword();
      expect(password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/u);
      expect(password).not.toMatch(/[ilo01]/u);
    }
  });

  it("takes each character from the random source", () => {
    let next = 0;
    const password = generateTemporaryPassword(() => next++ % TEMPORARY_PASSWORD_ALPHABET.length);
    expect(password).toBe("abcd-efgh-jkmn");
  });

  it("finds a path in the repository and allows one outside it", () => {
    expect(isInsideDirectory("/repo/apps/x.csv", "/repo")).toBe(true);
    expect(isInsideDirectory("/repo", "/repo")).toBe(true);
    expect(isInsideDirectory("/repo/..handout.csv", "/repo")).toBe(true);
    expect(isInsideDirectory("/repo/../inputs/x.csv", "/repo")).toBe(false);
    expect(isInsideDirectory("/repo-inputs/x.csv", "/repo")).toBe(false);
  });

  it("gives a SYSTEM account a password only when the operator names it", () => {
    const staff = [
      { username: "teacher@x.th", role: "TEACHER", pendingSince: null },
      { username: "ceo", role: "SYSTEM", pendingSince: null },
      { username: "old-dev@x.th", role: "SYSTEM", pendingSince: null },
      { username: "admin@x.th", role: "ADMIN", pendingSince: new Date() },
    ];
    const none = selectForIssue(staff, { system: [], reissue: false });
    expect(none.selected.map((user) => user.username)).toEqual(["teacher@x.th"]);
    expect(none.unnamedSystem.map((user) => user.username)).toEqual(["ceo", "old-dev@x.th"]);
    const named = selectForIssue(staff, { system: ["ceo"], reissue: true });
    expect(named.selected.map((user) => user.username)).toEqual(["teacher@x.th", "ceo", "admin@x.th"]);
    expect(named.unnamedSystem.map((user) => user.username)).toEqual(["old-dev@x.th"]);
    expect(() => selectForIssue(staff, { system: ["teacher@x.th"], reissue: false })).toThrow("teacher@x.th");
  });

  it("writes CSV with quoted cells and no spreadsheet formulas", () => {
    const csv = toHandoutCsv([
      { school: "Boonyathat, Lampang", name: '=HYPERLINK("x")', role: "TEACHER", username: "t@x.th", temporaryPassword: "abcd-efgh-jkmn" },
    ]);
    expect(csv).toBe(
      'school,name,role,username,temporary password\n"Boonyathat, Lampang","\'=HYPERLINK(""x"")",TEACHER,t@x.th,abcd-efgh-jkmn\n',
    );
  });
});
