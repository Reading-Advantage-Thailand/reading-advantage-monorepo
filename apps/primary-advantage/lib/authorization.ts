import { z } from "zod";
import { ActivityType, UserXpEarned } from "@/types/enum";
import { ROLES } from "@reading-advantage/auth";
import { STAFF_ROLES } from "./permissions";

/** Session roles allowed to manage other users. */
export const USER_MANAGEMENT_ROLES = ["ADMIN", "SYSTEM"] as const;

/** Session roles allowed to run bulk content tooling. */
export const CONTENT_TOOLING_ROLES = ["ADMIN", "SYSTEM"] as const;

/** Session roles allowed to search users across their school. */
export const USER_SEARCH_ROLES: readonly string[] = STAFF_ROLES;

/**
 * Normalizes a session role for comparison.
 * @param role The raw role value from the session.
 * @returns The uppercased role string, or an empty string.
 */
export function normalizeRole(role: unknown): string {
  return String(role ?? "").toUpperCase();
}

/**
 * Checks whether a session user manages other users.
 * @param user The session user, or null for anonymous callers.
 * @returns True when the caller holds ADMIN or SYSTEM.
 */
export function isAdminOrSystem(
  user: { role?: unknown } | null | undefined,
): boolean {
  const role = normalizeRole(user?.role);
  return (USER_MANAGEMENT_ROLES as readonly string[]).includes(role);
}

/**
 * Checks whether a session user runs bulk content tooling.
 * @param user The session user, or null for anonymous callers.
 * @returns True when the caller holds ADMIN or SYSTEM.
 */
export function canRunContentTooling(
  user: { role?: unknown } | null | undefined,
): boolean {
  const role = normalizeRole(user?.role);
  return (CONTENT_TOOLING_ROLES as readonly string[]).includes(role);
}

/**
 * Checks whether a caller may read another user's data.
 * @param caller The session user with id and school assignment.
 * @param target The resource owner with id and school assignment.
 * @returns True for self reads, SYSTEM callers, and same-school staff.
 */
export function canReadUserResource(
  caller: { id?: unknown; role?: unknown; schoolId?: unknown },
  target: { id?: unknown; schoolId?: unknown },
): boolean {
  if (!caller?.id || !target?.id) return false;
  if (caller.id === target.id) return true;
  return canAccessSchoolResource(caller, target.schoolId);
}

/**
 * Checks whether a staff caller may access a school-scoped resource.
 * @param caller The session user with role and school assignment.
 * @param targetSchoolId The school that owns the resource.
 * @returns True for SYSTEM callers and same-school staff; false otherwise.
 */
export function canAccessSchoolResource(
  caller: { role?: unknown; schoolId?: unknown },
  targetSchoolId: unknown,
): boolean {
  const role = normalizeRole(caller?.role);
  if (role === "SYSTEM") return true;
  if (role !== "TEACHER" && role !== "ADMIN") return false;
  // Fail closed: staff without a school cannot access any school resource.
  if (caller?.schoolId == null || targetSchoolId == null) return false;
  return caller.schoolId === targetSchoolId;
}

/**
 * Server-authoritative XP award per activity type.
 * Mirrors the UserXpEarned table; question activities share one award.
 */
export const XP_AWARD_BY_ACTIVITY: Record<ActivityType, number> = {
  [ActivityType.ARTICLE_RATING]: UserXpEarned.ARTICLE_RATING,
  [ActivityType.ARTICLE_READ]: 5,
  [ActivityType.STORIES_RATING]: UserXpEarned.ARTICLE_RATING,
  [ActivityType.STORIES_READ]: 5,
  [ActivityType.CHAPTER_RATING]: UserXpEarned.CHAPTER_RATING,
  [ActivityType.CHAPTER_READ]: 5,
  [ActivityType.LEVEL_TEST]: 10,
  [ActivityType.MC_QUESTION]: UserXpEarned.MCQuestion,
  [ActivityType.SA_QUESTION]: UserXpEarned.MCQuestion,
  [ActivityType.LA_QUESTION]: UserXpEarned.MCQuestion,
  [ActivityType.SENTENCE_FLASHCARDS]: UserXpEarned.SENTENCE_FLASHCARDS,
  [ActivityType.SENTENCE_MATCHING]: UserXpEarned.SENTENCE_MATCHING,
  [ActivityType.SENTENCE_ORDERING]: UserXpEarned.SENTENCE_ORDERING,
  [ActivityType.SENTENCE_WORD_ORDERING]:
    UserXpEarned.SENTENCE_WORD_ORDERING,
  [ActivityType.SENTENCE_CLOZE_TEST]: UserXpEarned.SENTENCE_CLOZE_TEST,
  [ActivityType.VOCABULARY_FLASHCARDS]: UserXpEarned.VOCABULARY_FLASHCARDS,
  [ActivityType.VOCABULARY_MATCHING]: UserXpEarned.VOCABULARY_MATCHING,
};

/**
 * Derives the XP award for an activity on the server.
 * @param activityType The completed activity type.
 * @returns The XP award from the server table.
 */
export function resolveXpAward(activityType: ActivityType): number {
  return XP_AWARD_BY_ACTIVITY[activityType];
}

/** XP per correct multiple-choice answer; restores the pre-fix MC economy. */
export const XP_PER_CORRECT_MC_ANSWER = 1;

/** Maximum short-answer award; the SAQ grader scores 1-5. */
export const XP_SA_MAX = 5;

/**
 * Maximum long-answer award. The LAQ grader returns five 1-5 dimension
 * scores (vocabularyUse, grammarAccuracy, clarityAndCoherence,
 * complexityAndStructure, contentAndDevelopment) and the client pays their
 * sum, so the honest maximum is 5 x 5 = 25.
 */
export const XP_LA_MAX = 25;

/** XP per correct item in flashcard deck games; restores the pre-fix x2 economy. */
export const XP_PER_FLASHCARD_GAME_POINT = 2;

/**
 * Clamps a client-submitted score into a server-side range.
 * @param score The client-submitted score value.
 * @param max The server-side maximum award.
 * @returns The floored score clamped to [0, max]; 0 for missing values.
 */
function clampSubmittedScore(score: unknown, max: number): number {
  const parsed =
    typeof score === "number" && Number.isFinite(score)
      ? Math.floor(score)
      : 0;
  return Math.min(Math.max(parsed, 0), max);
}

/**
 * Derives the XP award for a question activity on the server. Amounts and
 * caps are server-side constants; callers cannot set XP.
 * @param activityType The completed question activity type.
 * @param data The submitted quiz payload with score and responses.
 * @returns The proportional award for question types, else the table award.
 */
export function resolveQuestionXpAward(
  activityType: ActivityType,
  data: { score?: unknown; responses?: unknown } | null | undefined,
): number {
  switch (activityType) {
    case ActivityType.MC_QUESTION: {
      // Responses carry { question, answer, isCorrect } where isCorrect
      // holds the correct answer text; a response is correct when the two
      // match. Malformed entries never count and never throw.
      const responses = Array.isArray(data?.responses) ? data.responses : [];
      const correctCount = responses.filter((response) => {
        if (response === null || typeof response !== "object") return false;
        const { answer, isCorrect } = response as {
          answer?: unknown;
          isCorrect?: unknown;
        };
        return answer != null && isCorrect != null && answer === isCorrect;
      }).length;
      return correctCount * XP_PER_CORRECT_MC_ANSWER;
    }
    case ActivityType.SA_QUESTION:
      return clampSubmittedScore(data?.score, XP_SA_MAX);
    case ActivityType.LA_QUESTION:
      return clampSubmittedScore(data?.score, XP_LA_MAX);
    default:
      return resolveXpAward(activityType);
  }
}

/**
 * Derives the XP award for a flashcard deck game on the server. The award
 * stays proportional to the reported correct-item count, bounded by the
 * server-known deck size so callers cannot mint XP beyond the deck.
 * @param score The client-reported correct-item count.
 * @param maxScore The server-known upper bound (deck card count).
 * @returns The clamped score times the per-point award, never NaN.
 */
export function resolveFlashcardGameXpAward(
  score: unknown,
  maxScore: unknown,
): number {
  const cap =
    typeof maxScore === "number" && Number.isFinite(maxScore)
      ? Math.max(Math.floor(maxScore), 0)
      : 0;
  return clampSubmittedScore(score, cap) * XP_PER_FLASHCARD_GAME_POINT;
}

/**
 * Checks whether a file name is a plain basename without directories.
 * @param fileName The attacker-supplied file name.
 * @returns True when the name carries no path separator or traversal.
 */
export function isPlainBasename(fileName: string): boolean {
  if (typeof fileName !== "string") return false;
  if (fileName.length === 0 || fileName.length > 255) return false;
  if (fileName === "." || fileName === "..") return false;
  if (fileName.includes("/") || fileName.includes("\\")) return false;
  if (fileName.includes("\0")) return false;
  return true;
}

/** Canonical role names accepted for assignment. */
const ROLE_NAMES = Object.values(ROLES) as readonly string[];

/** Validated body for PATCH /api/users/[id]. */
export const patchUserBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  role: z
    .string()
    .min(1)
    .max(64)
    .refine(
      (value) => ROLE_NAMES.includes(value.toUpperCase()),
      { message: "Role must be a known role" },
    )
    .optional(),
  xp: z.number().int().min(0).optional(),
  level: z.number().int().min(1).optional(),
  cefrLevel: z.string().min(1).max(16).optional(),
  password: z.string().min(8).max(256).optional(),
});

/** Bounded article generation amount per genre. */
export const amountPerGenreSchema = z.coerce.number().int().min(1).max(10);

/** File name for temp cleanup; rejects directory traversal. */
export const cleanupFileNameSchema = z
  .string()
  .min(1)
  .max(255)
  .refine(isPlainBasename, { message: "File name must be a plain basename" });
