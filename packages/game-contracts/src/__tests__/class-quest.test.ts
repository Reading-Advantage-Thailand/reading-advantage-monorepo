import { describe, expect, it } from "vitest";
import {
  assignClassQuestInputSchema, classQuestSchema, questDashboardStateSchema, questGoalSchema,
  questHeartbeatInputSchema, questStatusSchema, questTemplateSchema, setQuestStatusInputSchema,
} from "../class-quest.js";

const QUEST = {
  id: "7d0b1b2e-1c2d-4e3f-8a9b-0c1d2e3f4a5b",
  classId: "828838c2-322e-435a-84b5-539dab1594e8",
  templateId: "goblin-raid",
  challengeId: "9a6c6b18-fc6f-4644-85e6-73fcecea9062",
  status: "open",
  statusAt: "2026-10-05T00:00:00.000Z",
  startsAt: "2026-10-04T17:00:00.000Z",
  battleAt: "2026-10-09T07:30:00.000Z",
  bossTarget: 350,
  createdAt: "2026-10-05T00:00:00.000Z",
};
const BOSS = { artKey: "goblin-king", name: { en: "The Goblin King", th: "ราชาก๊อบลิน" }, hpPerStudent: 20 };

describe("class quest contracts", () => {
  it("accepts a template and rejects an unknown goal kind", () => {
    const template = {
      id: "goblin-raid", title: { en: "The Goblin King's Raid", th: "การบุกของราชาก๊อบลิน" }, boss: BOSS,
      gameId: "wizard-vs-zombie", contentMode: "vocabulary",
      goals: [{ key: "read-3-days", kind: "reading-days", days: 3, powerUp: "shield" }],
    };
    expect(questTemplateSchema.safeParse(template).success).toBe(true);
    expect(questGoalSchema.safeParse({ key: "x", kind: "volume", count: 50, powerUp: "shield" }).success).toBe(false);
    expect(questGoalSchema.safeParse({ key: "x", kind: "reading-days", days: 8, powerUp: "shield" }).success).toBe(false);
  });
  it("has the five quest states and the four teacher transitions", () => {
    expect(questStatusSchema.options).toEqual(["open", "rally", "play", "result", "done"]);
    expect(setQuestStatusInputSchema.safeParse({ status: "open" }).success).toBe(false);
    expect(setQuestStatusInputSchema.safeParse({ status: "play" }).success).toBe(true);
  });
  it("parses an assignment with an optional start and rejects extra keys", () => {
    expect(assignClassQuestInputSchema.safeParse({ templateId: "goblin-raid", classId: QUEST.classId, battleAt: "2026-10-09T14:30:00+07:00" }).success).toBe(true);
    expect(assignClassQuestInputSchema.safeParse({ templateId: "goblin-raid", classId: QUEST.classId, battleAt: "2026-10-09T14:30:00+07:00", target: 9 }).success).toBe(false);
  });
  it("parses a stored quest", () => {
    expect(classQuestSchema.safeParse(QUEST).success).toBe(true);
    expect(classQuestSchema.safeParse({ ...QUEST, status: "battle" }).success).toBe(false);
  });
  it("rejects a heartbeat with more correct than answered answers", () => {
    const beat = { questId: QUEST.id, runId: QUEST.challengeId, answered: 4, correct: 3, hp: 4, damage: 6, powerUpsUsed: ["shield"] };
    expect(questHeartbeatInputSchema.safeParse(beat).success).toBe(true);
    expect(questHeartbeatInputSchema.safeParse({ ...beat, correct: 5 }).success).toBe(false);
    expect(questHeartbeatInputSchema.safeParse({ ...beat, powerUpsUsed: ["shield", "shield", "shield", "shield"] }).success).toBe(false);
  });
  it("keeps scores off the dashboard: a student carries HP and presence only", () => {
    const state = {
      quest: { ...QUEST, status: "play" }, title: { en: "t", th: "ท" }, boss: BOSS, target: 350, committed: 40, pending: 12,
      countdownEndsAt: "2026-10-09T07:36:00.000Z",
      students: [{ userId: "u1", name: "A", present: true, hp: 3, stale: false, profile: null, loadout: {} }],
      hits: [{ userId: "u1", name: "A", damage: 2, at: "2026-10-09T07:31:00.000Z" }],
      helpers: [], bossFallen: false,
    };
    expect(questDashboardStateSchema.safeParse(state).success).toBe(true);
    const scored = { ...state, students: [{ ...state.students[0], damage: 20 }] };
    expect(questDashboardStateSchema.safeParse(scored).success).toBe(false);
  });
});
