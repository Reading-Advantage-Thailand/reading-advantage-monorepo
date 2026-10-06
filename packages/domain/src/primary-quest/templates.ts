/**
 * The fixed Class Quest template list (track primary_class_quest_20261005, FR-1).
 * A template names the week's boss, the battle game, and the goal set that earns power-ups.
 * Boss art keys are Forge roster names (`advantage-forge/src/showcase/battle/roster.json`).
 * The list lives in code, not in the database; custom quests are a later track.
 */
import { EXPECTED_DAMAGE_PER_STUDENT, type PowerUp } from "./rules.js";

/** Copy in the two UI languages. */
export interface QuestCopy {
  en: string;
  th: string;
}

/** The goal kinds (FR-5): existing data only, never raw volume, never speed. */
export type QuestGoalKind = "reading-days" | "accuracy" | "streak" | "lesson-steps";

/** One goal of a template and the power-up it earns. */
export type QuestGoal =
  | { key: string; kind: "reading-days"; days: number; powerUp: PowerUp }
  | { key: string; kind: "accuracy"; percent: number; minQuestions: number; powerUp: PowerUp }
  | { key: string; kind: "streak"; days: number; powerUp: PowerUp }
  | { key: string; kind: "lesson-steps"; steps: number; powerUp: PowerUp };

/** One quest template. */
export interface QuestTemplate {
  id: string;
  title: QuestCopy;
  boss: {
    /** Forge roster name; also the art key of the boss portrait. */
    artKey: string;
    name: QuestCopy;
    /** The boss hit points per student; the season target multiplies it by the roster. */
    hpPerStudent: number;
  };
  /** The battle game: a 3D game whose manifest declares `challenge` (checked at assignment time). */
  gameId: string;
  contentMode: "vocabulary" | "sentence";
  goals: readonly QuestGoal[];
}

/** The UI name of the feature (FR-2 open item 4: the Thai name is a proposal for the owner). */
export const CLASS_QUEST_NAME: QuestCopy = { en: "Class Quest", th: "ภารกิจห้องเรียน" };

/** The first template list: four bosses with four goal sets. */
export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  {
    id: "goblin-raid",
    title: { en: "The Goblin King's Raid", th: "การบุกของราชาก๊อบลิน" },
    boss: { artKey: "goblin-king", name: { en: "The Goblin King", th: "ราชาก๊อบลิน" }, hpPerStudent: EXPECTED_DAMAGE_PER_STUDENT },
    gameId: "hero-vs-zombie",
    contentMode: "vocabulary",
    goals: [
      { key: "read-3-days", kind: "reading-days", days: 3, powerUp: "shield" },
      { key: "accuracy-80", kind: "accuracy", percent: 80, minQuestions: 20, powerUp: "sharp-blade" },
      { key: "streak-5", kind: "streak", days: 5, powerUp: "rally-horn" },
    ],
  },
  {
    id: "bone-hall",
    title: { en: "The Lich of the Bone Hall", th: "ลิชแห่งห้องโถงกระดูก" },
    boss: { artKey: "lich", name: { en: "The Lich", th: "ลิช" }, hpPerStudent: EXPECTED_DAMAGE_PER_STUDENT },
    gameId: "dragon-flight",
    contentMode: "vocabulary",
    goals: [
      { key: "read-4-days", kind: "reading-days", days: 4, powerUp: "shield" },
      { key: "lesson-steps-5", kind: "lesson-steps", steps: 5, powerUp: "sharp-blade" },
      { key: "accuracy-80", kind: "accuracy", percent: 80, minQuestions: 20, powerUp: "rally-horn" },
    ],
  },
  {
    id: "dragons-hall",
    title: { en: "Ember, the Fire Dragon", th: "เอมเบอร์ มังกรไฟ" },
    boss: { artKey: "dragon-fire", name: { en: "Ember, the Fire Dragon", th: "เอมเบอร์ มังกรไฟ" }, hpPerStudent: EXPECTED_DAMAGE_PER_STUDENT },
    gameId: "dragon-rider",
    contentMode: "vocabulary",
    goals: [
      { key: "streak-3", kind: "streak", days: 3, powerUp: "shield" },
      { key: "read-4-days", kind: "reading-days", days: 4, powerUp: "sharp-blade" },
      { key: "accuracy-85", kind: "accuracy", percent: 85, minQuestions: 30, powerUp: "rally-horn" },
    ],
  },
  {
    id: "iron-golem",
    title: { en: "The Iron Golem Awakes", th: "โกเลมเหล็กตื่นขึ้น" },
    boss: { artKey: "iron-golem", name: { en: "The Iron Golem", th: "โกเลมเหล็ก" }, hpPerStudent: EXPECTED_DAMAGE_PER_STUDENT },
    gameId: "hero-vs-zombie",
    contentMode: "vocabulary",
    goals: [
      { key: "lesson-steps-3", kind: "lesson-steps", steps: 3, powerUp: "shield" },
      { key: "streak-5", kind: "streak", days: 5, powerUp: "sharp-blade" },
      { key: "accuracy-80", kind: "accuracy", percent: 80, minQuestions: 20, powerUp: "rally-horn" },
    ],
  },
];

/**
 * Finds one quest template by id.
 * @param id The template id.
 * @returns The template, or undefined when no template has that id.
 */
export function questTemplate(id: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find((template) => template.id === id);
}
