/** Class Quest: the season numbers and the template list (track primary_class_quest_20261005). */
export {
  BATTLE_GP, BOSS_FALLEN_GP, DAMAGE_PER_CORRECT, DASHBOARD_POLL_SECONDS, EXPECTED_DAMAGE_PER_STUDENT,
  EXPECTED_PARTICIPATION, HEARTBEAT_SECONDS, HEARTBEAT_STALE_SECONDS, HP_LOSS_PER_WRONG, MIN_BOSS_TARGET,
  PLAY_MINUTES, POWER_UPS, POWER_UP_CAP_PER_WEEK, RALLY_HORN_BONUS, RALLY_HORN_SECONDS, RALLY_MINUTES,
  REST_SECONDS, RESULT_MINUTES, SHARP_BLADE_BONUS, STUDENT_HP,
  applyWrongAnswer, bossTarget, canEarnPowerUp, hitDamage,
  type PowerUp, type WrongAnswerResult,
} from "./rules.js";
export {
  CLASS_QUEST_NAME, QUEST_TEMPLATES, questTemplate,
  type QuestCopy, type QuestGoal, type QuestGoalKind, type QuestTemplate,
} from "./templates.js";
export { QuestError, type QuestErrorCode } from "./errors.js";
export {
  assignClassQuest, cancelClassQuest, committedDamage, daysLeft, getStudentQuestCard, getTeacherQuestCard,
  weekStart, type ResolveGameCapability,
} from "./season.js";
export { awardPowerUps, goalMet, mcCounts, readGoalFacts, type GoalFacts } from "./goals.js";
export type { AssignClassQuestInput, ClassQuest, QuestPowerUpRow, StudentQuestCard, TeacherQuestCard } from "@reading-advantage/game-contracts";
