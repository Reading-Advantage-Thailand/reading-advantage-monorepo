import { describe, expect, it, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { countdownEndsAt, getBattleState, getQuestDashboard, pendingDamage, postHeartbeat, setQuestStatus } from "../battle.js";
import { BATTLE_GP, BOSS_FALLEN_GP } from "../rules.js";

vi.mock("../../primary-avatar/shop.js", () => ({
  getClassAvatars: vi.fn(async () => [
    { userId: "s1", name: "Ann", profile: null, loadout: {} },
    { userId: "s2", name: "Bo", profile: null, loadout: {} },
  ]),
}));

const SCHOOL = "10000000-0000-4000-8000-000000000001";
const CLASS = "20000000-0000-4000-8000-000000000002";
const CHALLENGE = "30000000-0000-4000-8000-000000000003";
const QUEST = "40000000-0000-4000-8000-000000000004";
const RUN = "50000000-0000-4000-8000-000000000005";
const now = new Date("2026-10-09T07:31:00.000Z");
const teacher: UserContext = { id: "t1", username: "t1", name: "Kru", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const student: UserContext = { id: "s1", username: "s1", name: "Ann", role: "STUDENT", schoolId: SCHOOL, xp: 40, level: 1, cefrLevel: "A1" };
const classroom = { id: CLASS, schoolId: SCHOOL, teacherId: "t1" };
const quest = (status: string, statusAt = now) => ({
  id: QUEST, schoolId: SCHOOL, classId: CLASS, templateId: "goblin-raid", challengeId: CHALLENGE, status, statusAt,
  startsAt: new Date("2026-10-04T17:00:00.000Z"), battleAt: new Date("2026-10-09T07:30:00.000Z"), bossTarget: 40, createdByUserId: "t1", createdAt: now,
});
const beat = (userId: string, over: Partial<{ hp: number; damage: number; present: boolean; updatedAt: Date }> = {}) => ({
  schoolId: SCHOOL, questId: QUEST, userId, runId: RUN, present: true, answered: 4, correct: 3, hp: 4, damage: 6, powerUpsUsed: [], updatedAt: now, ...over,
});
const db = (mock: unknown) => mock as DB;
const insertValues = (mock: ReturnType<typeof createMockDb>) => mock.insert.mock.results[0]!.value.values.mock.calls.map((c: unknown[]) => c[0]);

describe("countdownEndsAt and pendingDamage", () => {
  it("counts down the battle states only", () => {
    expect(countdownEndsAt(quest("rally"))?.toISOString()).toBe("2026-10-09T07:32:00.000Z");
    expect(countdownEndsAt(quest("play"))?.toISOString()).toBe("2026-10-09T07:36:00.000Z");
    expect(countdownEndsAt(quest("result"))?.toISOString()).toBe("2026-10-09T07:33:00.000Z");
    expect(countdownEndsAt(quest("open"))).toBeNull();
    expect(countdownEndsAt(quest("done"))).toBeNull();
  });
  it("previews the heartbeat damage of students without a committed hit", () => {
    expect(pendingDamage([beat("s1", { damage: 6 }), beat("s2", { damage: 4 })], new Set(["s1"]))).toBe(4);
  });
});

describe("setQuestStatus", () => {
  it("moves one step forward and repeats a state as a no-op", async () => {
    const mock = createMockDb({ selectSequence: [[quest("open")], [classroom]], updateReturning: [quest("rally")] });
    await expect(setQuestStatus({ db: db(mock), user: teacher, now }, QUEST, { status: "rally" })).resolves.toMatchObject({ status: "rally" });
    expect(mock.update).toHaveBeenCalledTimes(1);
    const same = createMockDb({ selectSequence: [[quest("rally")], [classroom]] });
    await expect(setQuestStatus({ db: db(same), user: teacher, now }, QUEST, { status: "rally" })).resolves.toMatchObject({ status: "rally" });
    expect(same.update).not.toHaveBeenCalled();
  });
  it("refuses a skip and a step back", async () => {
    await expect(setQuestStatus({ db: db(createMockDb({ selectSequence: [[quest("open")], [classroom]] })), user: teacher, now }, QUEST, { status: "play" })).rejects.toMatchObject({ code: "BAD_STATE" });
    await expect(setQuestStatus({ db: db(createMockDb({ selectSequence: [[quest("play")], [classroom]] })), user: teacher, now }, QUEST, { status: "rally" })).rejects.toMatchObject({ code: "BAD_STATE" });
  });
  it("posts the rewards once when the result opens, with the boss bonus when the boss fell", async () => {
    const mock = createMockDb({
      selectSequence: [[quest("play")], [classroom], [{ userId: "s1" }, { userId: "s2" }], [{ userId: "s1", correct: 20, at: now }], []],
      updateReturning: [quest("result")],
    });
    await setQuestStatus({ db: db(mock), user: teacher, now }, QUEST, { status: "result" });
    const [rows] = insertValues(mock);
    expect(rows).toEqual([
      { schoolId: SCHOOL, userId: "s1", delta: BATTLE_GP + BOSS_FALLEN_GP, reason: "battle", sourceKey: `quest:${QUEST}`, createdAt: now },
      { schoolId: SCHOOL, userId: "s2", delta: BATTLE_GP + BOSS_FALLEN_GP, reason: "battle", sourceKey: `quest:${QUEST}`, createdAt: now },
    ]);
    const held = createMockDb({ selectSequence: [[quest("play")], [classroom], [{ userId: "s1" }], [{ userId: "s1", correct: 5, at: now }], []], updateReturning: [quest("result")] });
    await setQuestStatus({ db: db(held), user: teacher, now }, QUEST, { status: "result" });
    expect(insertValues(held)[0][0]).toMatchObject({ delta: BATTLE_GP });
  });
});

describe("postHeartbeat", () => {
  const input = { questId: QUEST, runId: RUN, answered: 4, correct: 3, hp: 4, damage: 6, powerUpsUsed: ["shield" as const] };

  it("upserts the latest heartbeat and marks the used power-ups", async () => {
    const mock = createMockDb({ selectSequence: [[quest("play")], [{ classId: CLASS }]] });
    await postHeartbeat({ db: db(mock), user: student, now }, input);
    expect(insertValues(mock)[0]).toMatchObject({ schoolId: SCHOOL, questId: QUEST, userId: "s1", runId: RUN, present: true, hp: 4, damage: 6, powerUpsUsed: ["shield"], updatedAt: now });
    expect(mock.update).toHaveBeenCalledTimes(1);
    const noPower = createMockDb({ selectSequence: [[quest("rally")], [{ classId: CLASS }]] });
    await postHeartbeat({ db: db(noPower), user: student, now }, { ...input, runId: null, powerUpsUsed: [] });
    expect(noPower.update).not.toHaveBeenCalled();
  });
  it("refuses a student outside the class and a quest that is not in battle", async () => {
    await expect(postHeartbeat({ db: db(createMockDb({ selectSequence: [[quest("play")], []] })), user: student, now }, input)).rejects.toMatchObject({ code: "NOT_IN_CLASS", status: 403 });
    await expect(postHeartbeat({ db: db(createMockDb({ selectSequence: [[quest("open")], [{ classId: CLASS }]] })), user: student, now }, input)).rejects.toMatchObject({ code: "BAD_STATE" });
  });
});

describe("getBattleState", () => {
  it("returns the meter, the preview, the countdown, the power-ups, and the run", async () => {
    const power = { id: "p1", schoolId: SCHOOL, questId: QUEST, userId: "s1", goalKey: "read-3-days", powerUp: "shield", earnedAt: now, usedAt: null };
    const mock = createMockDb({ selectSequence: [[{ classId: CLASS }], [quest("play")], [{ userId: "s2", correct: 5, at: now }], [], [beat("s1", { damage: 6 }), beat("s2", { damage: 10 })], [power], [{ id: RUN }]] });
    const state = await getBattleState({ db: db(mock), user: student, now });
    expect(state).toMatchObject({ target: 40, committed: 10, pending: 6, countdownEndsAt: "2026-10-09T07:36:00.000Z", runId: RUN });
    expect(state?.powerUps).toEqual([{ goalKey: "read-3-days", powerUp: "shield", earnedAt: now.toISOString(), usedAt: null }]);
    await expect(getBattleState({ db: db(createMockDb({ selectResults: [] })), user: student, now })).resolves.toBeNull();
  });
});

describe("getQuestDashboard", () => {
  it("shows every student with an HP bar, the hit feed in play order, and no score per student", async () => {
    const stale = new Date(now.getTime() - 61_000);
    const mock = createMockDb({
      selectSequence: [[quest("play")], [beat("s1", { hp: 3 }), beat("s2", { hp: 5, updatedAt: stale })], [{ userId: "s2", correct: 5, at: new Date("2026-10-09T07:33:00.000Z") }, { userId: "s1", correct: 2, at: new Date("2026-10-09T07:34:00.000Z") }], [{ userId: "s1" }]],
    });
    const state = await getQuestDashboard({ db: db(mock), user: teacher, now }, QUEST);
    expect(state.students).toEqual([
      { userId: "s1", name: "Ann", present: true, hp: 3, stale: false, profile: null, loadout: {} },
      { userId: "s2", name: "Bo", present: true, hp: 5, stale: true, profile: null, loadout: {} },
    ]);
    expect(state.hits.map((h) => [h.name, h.damage])).toEqual([["Bo", 10], ["Ann", 6]]);
    expect(state.helpers.map((h) => h.name)).toEqual(["Bo", "Ann"]);
    expect(state).toMatchObject({ committed: 16, pending: 0, bossFallen: false, target: 40 });
    expect(JSON.stringify(state.students)).not.toContain("damage");
  });
  it("marks the boss fallen at the target", async () => {
    const mock = createMockDb({ selectSequence: [[quest("result")], [], [{ userId: "s1", correct: 20, at: now }], []] });
    await expect(getQuestDashboard({ db: db(mock), user: teacher, now }, QUEST)).resolves.toMatchObject({ bossFallen: true, committed: 40 });
  });
});
