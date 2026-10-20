// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@reading-advantage/domain/primary-avatar", () => ({ grantGpForXp: vi.fn() }));

import { awardQuestionXp, type QuestionXpTx } from "../award-question-xp";

/**
 * Builds a fake transaction that records the `set` argument of each update.
 * @param currentXp The XP that a stale read returns.
 * @param totalAfter The XP total that the increment returns.
 * @returns The fake transaction and the recorded updates.
 */
function fakeTx(currentXp: number, totalAfter?: number) {
  const sets: Record<string, unknown>[] = [];
  const selectChain = { from: () => selectChain, where: () => selectChain, limit: async () => [{ xp: currentXp }] };
  const tx = {
    select: () => selectChain,
    insert: () => ({
      values: () => {
        const w: Record<string, unknown> = {
          returning: async () => [{ id: "act1" }],
          onConflictDoUpdate: () => w,
        };
        w.then = (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve);
        return w;
      },
    }),
    update: () => ({
      set: (v: Record<string, unknown>) => {
        sets.push(v);
        const w: Record<string, unknown> = { returning: async () => [{ xp: totalAfter ?? currentXp }] };
        w.then = (resolve: (v: unknown) => unknown) => Promise.resolve(undefined).then(resolve);
        return { where: () => w };
      },
    }),
  };
  return { tx: tx as unknown as QuestionXpTx, sets };
}

describe("awardQuestionXp", () => {
  it("adds the XP in SQL so a parallel award is not lost", async () => {
    const { tx, sets } = fakeTx(100);
    const res = await awardQuestionXp(tx, {
      userId: "u1",
      schoolId: "s1",
      activityType: "ARTICLE_MCQ",
      targetId: "a1",
      details: {},
      xpEarned: 5,
    });
    expect(res).toEqual({ status: "saved", activityId: "act1" });
    // An absolute value (stale read + 5) would overwrite a parallel award.
    expect(typeof sets[0].xp).not.toBe("number");
  });

  it("sets the level from the XP total after the increment (F-2)", async () => {
    const { tx, sets } = fakeTx(4998, 5003);
    await awardQuestionXp(tx, {
      userId: "u1",
      schoolId: "s1",
      activityType: "ARTICLE_MCQ",
      targetId: "a1",
      details: {},
      xpEarned: 5,
    });
    const levelSet = sets.find((s) => "level" in s);
    expect(levelSet).toMatchObject({ level: 2, cefrLevel: "A0" });
  });
});
