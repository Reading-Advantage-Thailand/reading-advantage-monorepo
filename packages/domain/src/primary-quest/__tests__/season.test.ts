import { describe, expect, it, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { questTemplateSchema } from "@reading-advantage/game-contracts";
import { createMockDb } from "../../__tests__/mock-db.js";
import { QuestError } from "../errors.js";
import { assignClassQuest, cancelClassQuest, daysLeft, getStudentQuestCard, getTeacherQuestCard, weekStart } from "../season.js";
import { QUEST_TEMPLATES } from "../templates.js";

const SCHOOL = "10000000-0000-4000-8000-000000000001";
const CLASS = "20000000-0000-4000-8000-000000000002";
const CHALLENGE = "30000000-0000-4000-8000-000000000003";
const QUEST = "40000000-0000-4000-8000-000000000004";
const now = new Date("2026-10-05T03:00:00.000Z");
const teacher: UserContext = { id: "t1", username: "t1", name: "Kru", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const student: UserContext = { id: "s1", username: "s1", name: "Som", role: "STUDENT", schoolId: SCHOOL, xp: 40, level: 1, cefrLevel: "A1" };
const classroom = { id: CLASS, schoolId: SCHOOL, teacherId: "t1" };
const battleAt = "2026-10-09T14:30:00+07:00";
const glossary = [
  { word: "puppy", thai: "ลูกสุนัข" },
  { word: "picture", thai: "รูปภาพ" },
  { word: "puppy", thai: "ลูกสุนัข" },
  { word: " ", thai: "x" },
  { pos: "noun" },
];
const definition = {
  id: CHALLENGE, schoolId: SCHOOL, classId: CLASS, createdByUserId: "t1", creationKey: null, title: "The Goblin King's Raid",
  gameId: "wizard-vs-zombie", gameVersion: "2026-09-09.1", contentMode: "vocabulary", contentLocale: "th",
  contentJson: { mode: "vocabulary", items: [{ term: "puppy", translation: "ลูกสุนัข" }, { term: "picture", translation: "รูปภาพ" }] },
  seed: 7, difficulty: "easy",
  modalityJson: { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
  startsAt: new Date("2026-10-04T17:00:00.000Z"), expiresAt: new Date("2026-10-10T07:30:00.000Z"), target: 350, teacherParticipationEnabled: false, createdAt: now,
};
const questRow = {
  id: QUEST, schoolId: SCHOOL, classId: CLASS, templateId: "goblin-raid", challengeId: CHALLENGE, status: "open", statusAt: now,
  startsAt: new Date("2026-10-04T17:00:00.000Z"), battleAt: new Date("2026-10-09T07:30:00.000Z"), bossTarget: 350, createdByUserId: "t1", createdAt: now,
};
const capability = vi.fn(async () => ({ version: "2026-09-09.1", inputMode: "vocabulary" as const, modalities: ["reading" as const] }));
const db = (mock: unknown) => mock as DB;
const insertValues = (mock: ReturnType<typeof createMockDb>) => mock.insert.mock.results[0]!.value.values.mock.calls.map((c: unknown[]) => c[0]);

describe("weekStart and daysLeft", () => {
  it("starts the week on Monday 00:00 Bangkok", () => {
    expect(weekStart(new Date("2026-10-08T10:00:00+07:00")).toISOString()).toBe("2026-10-04T17:00:00.000Z");
    expect(weekStart(new Date("2026-10-11T23:30:00+07:00")).toISOString()).toBe("2026-10-04T17:00:00.000Z");
    expect(weekStart(new Date("2026-10-05T00:30:00+07:00")).toISOString()).toBe("2026-10-04T17:00:00.000Z");
    expect(weekStart(new Date("2026-10-04T23:30:00+07:00")).toISOString()).toBe("2026-09-27T17:00:00.000Z");
  });
  it("counts whole days left and never goes negative", () => {
    expect(daysLeft(new Date("2026-10-09T07:30:00.000Z"), now)).toBe(5);
    expect(daysLeft(new Date("2026-10-05T02:00:00.000Z"), now)).toBe(0);
  });
});

describe("templates obey the contract", () => {
  it("parses every template with the contract schema", () => {
    for (const template of QUEST_TEMPLATES) expect(questTemplateSchema.safeParse(template).success).toBe(true);
  });
});

describe("assignClassQuest", () => {
  const input = { templateId: "goblin-raid", classId: CLASS, battleAt };

  it("creates the challenge and the quest with a fixed target from the roster", async () => {
    const mock = createMockDb({
      selectSequence: [[classroom], [], [{ total: 25 }], [{ bookId: "b1", currentLesson: 3 }], [{ package: { glossary } }], [{ teacherId: "t1" }]],
      insertReturning: [definition],
      conflictInsertReturning: [questRow],
    });
    const quest = await assignClassQuest({ db: db(mock), user: teacher, now }, input, capability);
    expect(quest).toMatchObject({ id: QUEST, status: "open", bossTarget: 350, challengeId: CHALLENGE });
    const [challengeValues, questValues] = insertValues(mock);
    expect(challengeValues).toMatchObject({ classId: CLASS, gameId: "hero-vs-zombie", gameVersion: "2026-09-09.1", target: 350, teacherParticipationEnabled: false, startsAt: new Date("2026-10-04T17:00:00.000Z") });
    expect(challengeValues.contentJson.items).toEqual([{ term: "puppy", translation: "ลูกสุนัข" }, { term: "picture", translation: "รูปภาพ" }]);
    expect(questValues).toMatchObject({ schoolId: SCHOOL, classId: CLASS, templateId: "goblin-raid", challengeId: CHALLENGE, bossTarget: 350, battleAt: new Date("2026-10-09T07:30:00.000Z") });
  });

  it("refuses an unknown template, a battle in the past, and a second quest in the week", async () => {
    await expect(assignClassQuest({ db: db(createMockDb()), user: teacher, now }, { ...input, templateId: "nope" }, capability)).rejects.toMatchObject({ code: "TEMPLATE_NOT_FOUND" });
    await expect(assignClassQuest({ db: db(createMockDb({ selectResults: [classroom] })), user: teacher, now }, { ...input, battleAt: "2026-10-01T10:00:00+07:00" }, capability)).rejects.toMatchObject({ code: "BAD_TIME" });
    const busy = createMockDb({ selectSequence: [[classroom], [questRow]] });
    await expect(assignClassQuest({ db: db(busy), user: teacher, now }, input, capability)).rejects.toMatchObject({ code: "ALREADY_OPEN", status: 409 });
    expect(busy.insert).not.toHaveBeenCalled();
  });

  it("refuses a game that is not installed and a lesson without a glossary", async () => {
    const missing = vi.fn(async () => undefined);
    await expect(assignClassQuest({ db: db(createMockDb({ selectResults: [classroom] })), user: teacher, now }, input, missing)).rejects.toMatchObject({ code: "GAME_UNAVAILABLE" });
    const empty = createMockDb({ selectSequence: [[classroom], [], [{ total: 25 }], [{ bookId: "b1", currentLesson: 3 }], [{ package: { glossary: [] } }]] });
    await expect(assignClassQuest({ db: db(empty), user: teacher, now }, input, capability)).rejects.toMatchObject({ code: "NO_CONTENT", status: 422 });
  });

  it("removes the challenge when a parallel assignment won the week", async () => {
    const mock = createMockDb({
      selectSequence: [[classroom], [], [{ total: 25 }], [{ bookId: "b1", currentLesson: 3 }], [{ package: { glossary } }], [{ teacherId: "t1" }]],
      insertReturning: [definition],
      conflictInsertReturning: [],
    });
    await expect(assignClassQuest({ db: db(mock), user: teacher, now }, input, capability)).rejects.toBeInstanceOf(QuestError);
    expect(mock.delete).toHaveBeenCalledTimes(1);
  });
});

describe("cancelClassQuest", () => {
  it("deletes the challenge of an open quest", async () => {
    const mock = createMockDb({ selectSequence: [[questRow], [classroom]] });
    await cancelClassQuest({ db: db(mock), user: teacher, now }, QUEST);
    expect(mock.delete).toHaveBeenCalledTimes(1);
  });
  it("refuses once the battle has started and refuses an unknown quest", async () => {
    await expect(cancelClassQuest({ db: db(createMockDb({ selectSequence: [[{ ...questRow, status: "play" }], [classroom]] })), user: teacher, now }, QUEST)).rejects.toMatchObject({ code: "BAD_STATE" });
    await expect(cancelClassQuest({ db: db(createMockDb({ selectResults: [] })), user: teacher, now }, QUEST)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("quest cards", () => {
  const powerUp = { id: "p1", schoolId: SCHOOL, questId: QUEST, userId: "s1", goalKey: "read-3-days", powerUp: "shield", earnedAt: now, usedAt: null };

  it("builds the student card with the class meter and the student's power-ups", async () => {
    const mock = createMockDb({ selectSequence: [[{ classId: CLASS }], [questRow], [{ userId: "s1", correct: 5 }, { userId: "s2", correct: 3 }], [{ userId: "s1" }], [powerUp]] });
    const card = await getStudentQuestCard({ db: db(mock), user: student, now });
    expect(card).toMatchObject({ title: { en: "The Goblin King's Raid" }, boss: { artKey: "goblin-king" }, daysLeft: 5, committed: 5 * 3 + 3 * 2 });
    expect(card?.powerUps).toEqual([{ goalKey: "read-3-days", powerUp: "shield", earnedAt: now.toISOString(), usedAt: null }]);
    expect(card?.goals).toHaveLength(3);
  });

  it("is null for a student with no class or no quest", async () => {
    await expect(getStudentQuestCard({ db: db(createMockDb({ selectResults: [] })), user: student, now })).resolves.toBeNull();
    await expect(getStudentQuestCard({ db: db(createMockDb({ selectSequence: [[{ classId: CLASS }], []] })), user: student, now })).resolves.toBeNull();
  });

  it("builds the teacher card with the roster and the power-up earners", async () => {
    const mock = createMockDb({ selectSequence: [[classroom], [questRow], [{ userId: "s1", correct: 4 }], [], [{ total: 25 }], [{ total: 7 }]] });
    const card = await getTeacherQuestCard({ db: db(mock), user: teacher, now }, CLASS);
    expect(card).toMatchObject({ committed: 8, rosterSize: 25, studentsWithPowerUps: 7, daysLeft: 5 });
    await expect(getTeacherQuestCard({ db: db(createMockDb({ selectSequence: [[classroom], []] })), user: teacher, now }, CLASS)).resolves.toBeNull();
  });
});
