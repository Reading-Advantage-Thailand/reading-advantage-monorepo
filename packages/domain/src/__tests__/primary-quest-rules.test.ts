import { describe, expect, it } from "vitest";
import {
  EXPECTED_DAMAGE_PER_STUDENT, EXPECTED_PARTICIPATION, POWER_UPS, POWER_UP_CAP_PER_WEEK, STUDENT_HP,
  applyWrongAnswer, bossTarget, canEarnPowerUp, hitDamage,
} from "../primary-quest/rules.js";
import { QUEST_TEMPLATES, questTemplate } from "../primary-quest/templates.js";

describe("bossTarget", () => {
  it("is roster x expected damage x participation, rounded", () => {
    expect(bossTarget(25)).toBe(Math.round(25 * EXPECTED_DAMAGE_PER_STUDENT * EXPECTED_PARTICIPATION));
    expect(bossTarget(25)).toBe(350);
    expect(bossTarget(30)).toBe(420);
  });
  it("never drops below the minimum and ignores bad input", () => {
    expect(bossTarget(0)).toBe(1);
    expect(bossTarget(-4)).toBe(1);
    expect(bossTarget(Number.NaN)).toBe(1);
    expect(bossTarget(1.9)).toBe(14);
  });
});

describe("hitDamage", () => {
  it("is 2 per correct answer with no power-ups", () => {
    expect(hitDamage()).toBe(2);
  });
  it("adds the sharp blade and multiplies by the rally horn, rounding up", () => {
    expect(hitDamage({ sharpBlade: true })).toBe(3);
    expect(hitDamage({ rallyHorn: true })).toBe(3);
    expect(hitDamage({ sharpBlade: true, rallyHorn: true })).toBe(4);
  });
});

describe("applyWrongAnswer", () => {
  it("costs 1 HP of 5", () => {
    expect(applyWrongAnswer(STUDENT_HP)).toEqual({ hp: 4, shieldUsed: false, rests: false, restHp: 4 });
  });
  it("lets a shield absorb the loss once", () => {
    expect(applyWrongAnswer(5, true)).toEqual({ hp: 5, shieldUsed: true, rests: false, restHp: 5 });
  });
  it("rests at 0 HP and returns with half HP, rounded up", () => {
    expect(applyWrongAnswer(1)).toEqual({ hp: 0, shieldUsed: false, rests: true, restHp: 3 });
  });
  it("clamps the input to the HP range", () => {
    expect(applyWrongAnswer(9).hp).toBe(4);
    expect(applyWrongAnswer(-2)).toEqual({ hp: 0, shieldUsed: false, rests: true, restHp: 3 });
  });
});

describe("canEarnPowerUp", () => {
  it("caps the week at the configured count", () => {
    expect(canEarnPowerUp(0)).toBe(true);
    expect(canEarnPowerUp(POWER_UP_CAP_PER_WEEK - 1)).toBe(true);
    expect(canEarnPowerUp(POWER_UP_CAP_PER_WEEK)).toBe(false);
  });
});

describe("QUEST_TEMPLATES", () => {
  it("has at least three templates with unique ids and distinct bosses", () => {
    expect(QUEST_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    expect(new Set(QUEST_TEMPLATES.map((t) => t.id)).size).toBe(QUEST_TEMPLATES.length);
    expect(new Set(QUEST_TEMPLATES.map((t) => t.boss.artKey)).size).toBe(QUEST_TEMPLATES.length);
  });
  it("gives every template en and th copy and a challenge-capable game", () => {
    for (const template of QUEST_TEMPLATES) {
      expect(template.title.en.trim()).not.toBe("");
      expect(template.title.th.trim()).not.toBe("");
      expect(template.boss.name.th.trim()).not.toBe("");
      expect(["wizard-vs-zombie", "dragon-flight", "dragon-rider"]).toContain(template.gameId);
      expect(template.contentMode).toBe("vocabulary");
    }
  });
  it("gives every template one goal per power-up, within the weekly cap, with unique keys", () => {
    for (const template of QUEST_TEMPLATES) {
      expect(template.goals.length).toBeLessThanOrEqual(POWER_UP_CAP_PER_WEEK);
      expect(new Set(template.goals.map((g) => g.key)).size).toBe(template.goals.length);
      expect(new Set(template.goals.map((g) => g.powerUp))).toEqual(new Set(POWER_UPS));
    }
  });
  it("uses only goals over existing data, never raw volume", () => {
    const kinds = new Set(QUEST_TEMPLATES.flatMap((t) => t.goals.map((g) => g.kind)));
    expect([...kinds].sort()).toEqual(["accuracy", "lesson-steps", "reading-days", "streak"]);
  });
  it("finds a template by id", () => {
    expect(questTemplate("goblin-raid")?.boss.artKey).toBe("goblin-king");
    expect(questTemplate("nope")).toBeUndefined();
  });
});
