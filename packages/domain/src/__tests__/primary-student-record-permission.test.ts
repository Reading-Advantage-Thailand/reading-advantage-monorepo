import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import { hasPermission, type UserContext } from "@reading-advantage/auth";
import { STARTER_SETS } from "@reading-advantage/avatar-kit";
import { createMockDb } from "./mock-db.js";
import { getAvatarState, purchaseAvatarItem, setLoadout } from "../primary-avatar/shop.js";
import { setAvatarProfile } from "../primary-avatar/avatar.js";
import { awardPowerUps } from "../primary-quest/goals.js";
import { postHeartbeat } from "../primary-quest/battle.js";
import { STUDENT_RECORD_WRITE } from "../primary-avatar/permissions.js";

const SCHOOL = "school-1";
const make = (role: string): UserContext => ({ id: `${role}-1`, username: role, name: role, role, schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" } as UserContext);
const db = (m: unknown) => m as DB;
const knight = STARTER_SETS.find((s) => s.id === "knight")!;
const profileRow = { schoolId: SCHOOL, userId: "x", classPreset: "knight", tints: { skin: "fair", hair: "brown", eyes: "blue", cloth: "sky" }, catalogVersion: "1.0.0", createdAt: new Date(), updatedAt: new Date() };
const beat = { questId: "11111111-1111-4111-8111-111111111111", runId: null, answered: 1, correct: 1, hp: 5, damage: 0, powerUpsUsed: [] };

const calls: Array<[string, (user: UserContext, mock: ReturnType<typeof createMockDb>) => Promise<unknown>]> = [
  ["setAvatarProfile", (user, m) => setAvatarProfile({ db: db(m), user, input: { classId: "knight", tints: profileRow.tints } as never })],
  ["purchaseAvatarItem", (user, m) => purchaseAvatarItem({ db: db(m), user, input: { itemId: knight.pieces[0]! } as never })],
  ["setLoadout", (user, m) => setLoadout({ db: db(m), user, input: { slot: "head", itemId: null } as never })],
  ["awardPowerUps", (user, m) => awardPowerUps({ db: db(m), user })],
  ["postHeartbeat", (user, m) => postHeartbeat({ db: db(m), user }, beat as never)],
];

describe("student-record write permission", () => {
  it("admits STUDENT only", () => {
    expect(hasPermission("STUDENT" as never, STUDENT_RECORD_WRITE as never)).toBe(true);
    for (const role of ["TEACHER", "ADMIN", "SYSTEM", "INTERN"]) {
      expect(hasPermission(role as never, STUDENT_RECORD_WRITE as never)).toBe(false);
    }
  });

  describe.each(["TEACHER", "ADMIN", "SYSTEM", "INTERN"])("as %s", (role) => {
    it.each(calls)("%s is refused before any read or write", async (_n, call) => {
      const mock = createMockDb({ selectResults: [profileRow] });
      await expect(call(make(role), mock)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mock.insert).not.toHaveBeenCalled();
      expect(mock.update).not.toHaveBeenCalled();
      expect(mock.delete).not.toHaveBeenCalled();
      expect(mock.select).not.toHaveBeenCalled();
    });

    it("getAvatarState reads without the starter-set write", async () => {
      const mock = createMockDb({ selectSequence: [[profileRow], [], [{ total: 0 }], []] });
      await getAvatarState({ db: db(mock), user: make(role) });
      expect(mock.insert).not.toHaveBeenCalled();
      expect(mock.update).not.toHaveBeenCalled();
      expect(mock.delete).not.toHaveBeenCalled();
    });
  });

  it("lets a student pass the permission check", async () => {
    const mock = createMockDb({ selectResults: [] });
    await expect(awardPowerUps({ db: db(mock), user: make("STUDENT") })).resolves.toEqual([]);
    expect(mock.select).toHaveBeenCalled();
  });
});
