/**
 * The Class Quest numbers (track primary_class_quest_20261005, FR-3, FR-6, FR-8).
 * Every tunable of the season and the battle lives here, so a calibration after the first
 * two seasons changes one file. The defaults come from the Forge plan
 * (`advantage-forge/docs/chibi-quest-progression.md`, "Guild Mode" and "The battle").
 */

/** Damage one student is expected to deal in the battle (correct answers x 2). */
export const EXPECTED_DAMAGE_PER_STUDENT = 20;
/** The share of the roster expected to play the battle. */
export const EXPECTED_PARTICIPATION = 0.7;
/** The boss target for a class of one student when the roster is empty or unknown. */
export const MIN_BOSS_TARGET = 1;

/** Hit points each student starts the battle with. */
export const STUDENT_HP = 5;
/** Hit points a wrong answer costs. */
export const HP_LOSS_PER_WRONG = 1;
/** Seconds a student rests at 0 HP before the return with half HP. */
export const REST_SECONDS = 10;
/** Damage per correct answer before power-ups. */
export const DAMAGE_PER_CORRECT = 2;

/** Power-ups one student can earn in one week. */
export const POWER_UP_CAP_PER_WEEK = 3;
/** Extra damage per correct answer with a sharp blade. */
export const SHARP_BLADE_BONUS = 1;
/** Damage multiplier bonus while a rally horn sounds. */
export const RALLY_HORN_BONUS = 0.25;
/** Seconds a rally horn sounds. */
export const RALLY_HORN_SECONDS = 60;

/** Battle timing (minutes) from the Forge plan: 1 + 5 + 2. */
export const RALLY_MINUTES = 1;
export const PLAY_MINUTES = 5;
export const RESULT_MINUTES = 2;
/** Seconds between phone heartbeats. */
export const HEARTBEAT_SECONDS = 10;
/** Seconds without a heartbeat after which a student's HP bar dims on the dashboard. */
export const HEARTBEAT_STALE_SECONDS = 60;
/** Seconds between dashboard polls (the plan says 3 to 5). */
export const DASHBOARD_POLL_SECONDS = 4;

/** GP for every battle participant, and the extra when the boss falls (placeholders until calibrated). */
export const BATTLE_GP = 50;
export const BOSS_FALLEN_GP = 25;

/** The three power-ups (FR-6). */
export const POWER_UPS = ["shield", "sharp-blade", "rally-horn"] as const;
export type PowerUp = (typeof POWER_UPS)[number];

/**
 * Computes the fixed boss target for one season.
 * Roster size x expected damage per student x expected participation, rounded to a whole
 * number and never below the minimum. The target never changes during the week.
 * @param rosterSize Students in the class at assignment time.
 * @returns The boss hit points for the week.
 */
export function bossTarget(rosterSize: number): number {
  const roster = Number.isFinite(rosterSize) ? Math.max(0, Math.floor(rosterSize)) : 0;
  return Math.max(MIN_BOSS_TARGET, Math.round(roster * EXPECTED_DAMAGE_PER_STUDENT * EXPECTED_PARTICIPATION));
}

/**
 * Computes the damage of one correct answer with the active power-ups.
 * The sharp blade adds a flat bonus; the rally horn multiplies the result; the total rounds up.
 * @param active The power-ups in effect for this answer.
 * @returns The damage dealt to the boss.
 */
export function hitDamage(active: { sharpBlade?: boolean; rallyHorn?: boolean } = {}): number {
  const base = DAMAGE_PER_CORRECT + (active.sharpBlade ? SHARP_BLADE_BONUS : 0);
  return Math.ceil(base * (active.rallyHorn ? 1 + RALLY_HORN_BONUS : 1));
}

/** The student's HP state after a wrong answer. */
export interface WrongAnswerResult {
  hp: number;
  /** True when a shield absorbed the loss. */
  shieldUsed: boolean;
  /** True when HP reached 0: the student rests `REST_SECONDS` and returns with `restHp`. */
  rests: boolean;
  /** The HP after the rest, when `rests` is true. */
  restHp: number;
}

/**
 * Applies a wrong answer to a student's HP.
 * A shield absorbs the loss once. At 0 HP the student rests and returns with half HP, rounded
 * up, so a setback is a rest and never a game over.
 * @param hp The HP before the answer, clamped to 0..STUDENT_HP.
 * @param shield True when the student has an unused shield.
 * @returns The HP after the answer and the rest decision.
 */
export function applyWrongAnswer(hp: number, shield = false): WrongAnswerResult {
  const before = Math.min(STUDENT_HP, Math.max(0, Math.floor(hp)));
  if (shield) return { hp: before, shieldUsed: true, rests: false, restHp: before };
  const after = Math.max(0, before - HP_LOSS_PER_WRONG);
  const rests = after === 0;
  return { hp: after, shieldUsed: false, rests, restHp: rests ? Math.ceil(STUDENT_HP / 2) : after };
}

/**
 * Caps the power-ups a student earns in one week.
 * @param earnedCount Power-ups already earned this week.
 * @returns True when one more power-up may be earned.
 */
export function canEarnPowerUp(earnedCount: number): boolean {
  return earnedCount < POWER_UP_CAP_PER_WEEK;
}
