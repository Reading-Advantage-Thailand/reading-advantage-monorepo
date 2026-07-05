import { z } from "zod";

/**
 * Canonical game-type vocabulary frozen from `apps/advantage-games/src/lib/gameCards.ts`.
 *
 * The three `astral-mage` / `babel-architect` / `sorcerer-ziggurat` placeholders
 * are excluded because they have no implementation and cannot complete. Phase 5+
 * may add them when their game logic lands.
 */
export const gameTypeEnum = z.enum([
  "castle-defense",
  "dragon-rider",
  "magic-defense",
  "rpg-battle",
  "dragon-flight",
  "wizard-vs-zombie",
  "enchanted-library",
  "rune-match",
  "alchemists-synthesis",
  "potion-rush",
  "dungeon-liberator",
  "spellweavers-run",
  "shadow-gate-dungeon",
  "rune-forge-chamber",
  "village-guardian",
  "labyrinth-goblin-king",
  "abyssal-well",
  "archers-revenge",
  "storm-castle-tower",
  "griffin-sky-joust",
  "realm-carver",
  "paladins-twin-soul",
  "griffin-riders-escape",
  "devourer-slime",
  "haunted-library",
  "gryphon-patrol",
]);

/**
 * Canonical difficulty vocabulary. `medium` (not `normal`) is the canonical
 * default — Phase 1B of the Wave 0 advantage-games audit surfaced a `normal` vs
 * `medium` mismatch across games (B21-018). `extreme` is included for forward
 * compatibility with games that already use it in their RankingDialog UI.
 */
export const gameDifficultyEnum = z.enum([
  "easy",
  "medium",
  "hard",
  "extreme",
]);

/**
 * Canonical game-completion input contract.
 *
 * The schema is `.strict()` so unknown keys (e.g. client-supplied `xp`,
 * `dragonCount`, `bossPower`) are rejected — this is the primary defense
 * against the D-02/B25-001 client-trusted-XP finding.
 *
 * Field semantics (Decision 3.2):
 * - `accuracy`: fractional 0..1 (canonical unit; rejects ×100 percent).
 * - `score`: game's internal score (informational; not XP).
 * - `duration`: gameplay milliseconds.
 * - `idempotencyKey`: client-supplied UUID; the fire-once key for D-04/B28-017.
 * - `clientTimestamp`: client clock milliseconds (for skew detection).
 * - `metadata`: optional string-keyed record for game-specific context.
 */
export const gameCompletionInputSchema = z
  .object({
    gameType: gameTypeEnum,
    difficulty: gameDifficultyEnum,
    score: z.number().int().min(0),
    accuracy: z.number().min(0).max(1),
    correctAnswers: z.number().int().min(0),
    totalAttempts: z.number().int().min(0),
    duration: z.number().int().min(0),
    victory: z.boolean(),
    idempotencyKey: z.string().uuid(),
    clientTimestamp: z.number().int(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/**
 * Server-completed game-completion result. Returned by `recordGameCompletion`
 * and by the standalone mock `completeRoute.ts`.
 *
 * - `xpEarned`: server-computed (never client-supplied).
 * - `activityId`: stable across retries (= `game:<gameType>:<idempotencyKey>`).
 * - `duplicate`: true if a prior completion was found with the same key.
 * - `status`: always 200 — duplicates are not errors to the student.
 */
export const gameCompletionResultSchema = z.object({
  xpEarned: z.number().int().min(0),
  activityId: z.string(),
  duplicate: z.boolean(),
  status: z.literal(200),
});

/**
 * Phase 4 — Leaderboard entry shape, returned by `getSchoolLeaderboard` and
 * used as the response unit for the shared `LeaderboardResponseSchema`.
 *
 * - `userId`: opaque ID (caller-rendered; no PII leakage).
 * - `totalXp`: aggregated from `gameCompletions.xpEarned`.
 * - `bestScore`: aggregated MAX over `gameCompletions.score`.
 * - `bestAccuracy`: aggregated MAX over `gameCompletions.accuracy` (0..1).
 * - `attempts`: COUNT(*) over `gameCompletions`.
 */
export const leaderboardEntrySchema = z.object({
  userId: z.string(),
  totalXp: z.number().int().min(0),
  bestScore: z.number().int().min(0),
  bestAccuracy: z.number().min(0).max(1),
  attempts: z.number().int().min(0),
});

/**
 * Phase 4 — Shared leaderboard response schema. Validates the standalone
 * `apps/advantage-games/src/lib/games/api/rankingRoute.ts` mock response
 * (and any future host-app route handler) to a single canonical shape.
 *
 * `schoolScoped: true` is an honest marker — this is NOT a global
 * leaderboard. TenantDB injects `eq(gameCompletions.schoolId, tenant.schoolId)`
 * on the read, so the response is per-school by construction.
 */
export const leaderboardResponseSchema = z.object({
  rankings: z.array(leaderboardEntrySchema),
  schoolScoped: z.literal(true),
});