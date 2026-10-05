import type { QuestCopy, QuestGoal } from "@reading-advantage/game-contracts";

/**
 * Picks the copy of a locale: Thai for `th`, English otherwise.
 * @param copy The en and th copy.
 * @param locale The UI locale.
 * @returns The text.
 */
export const questText = (copy: QuestCopy, locale: string): string => (locale === "th" ? copy.th : copy.en);

/**
 * The translation values of a goal line: the goal's number fields.
 * @param goal The goal.
 * @returns The values for the `Quest.goal.<kind>` message.
 */
export function goalValues(goal: QuestGoal): Record<string, number> {
  switch (goal.kind) {
    case "reading-days":
    case "streak":
      return { days: goal.days };
    case "accuracy":
      return { percent: goal.percent, minQuestions: goal.minQuestions };
    case "lesson-steps":
      return { steps: goal.steps };
  }
}
