import { isDeepStrictEqual } from "node:util";
import { and, count, eq } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  classrooms,
  gameChallengeContributions,
  gameChallengeDefinitions,
  gameChallengeRuns,
} from "@reading-advantage/db/schema";
import { classChallengeDefinitionSchema, classChallengePublicSummarySchema } from "@reading-advantage/game-contracts";
import { studentChallengeRunLaunchSchema } from "@reading-advantage/game-contracts";
import type { ClassChallengePublicSummary, StudentChallengeRunLaunch } from "@reading-advantage/game-contracts";

import type { TenantDB } from "../db-contract.js";
import { createClassChallengeInputSchema, type CreateClassChallengeInput } from "./schema.js";
import { startClassChallengeRunInputSchema, type StartClassChallengeRunInput } from "./schema.js";
import { requireClassChallengeAccess } from "./access.js";
import "./permissions.js";

/** Installed cartridge facts used to validate a stored challenge before launch. */
export interface ChallengeGameCapability {
  /** Installed cartridge version. */
  readonly version: string;
  /** Educational input mode accepted by the cartridge. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Learning modalities supported by the authenticated host. */
  readonly modalities: readonly ("reading" | "read-to-select-audio")[];
}

/** Conflict caused by reuse of a challenge creation key with different settings. */
export class ChallengeCreationConflictError extends Error {
  readonly code = "CONFLICT";

  constructor() {
    super("Challenge creation key already belongs to different settings");
    this.name = "ChallengeCreationConflictError";
  }
}

function sameChallengeRequest(
  stored: typeof gameChallengeDefinitions.$inferSelect,
  parsed: ReturnType<typeof createClassChallengeInputSchema.parse>,
): boolean {
  return stored.classId === parsed.classId
    && stored.title === parsed.title
    && stored.gameId === parsed.gameId
    && stored.gameVersion === parsed.gameVersion
    && stored.contentMode === parsed.content.mode
    && stored.contentLocale === parsed.contentLocale
    && isDeepStrictEqual(stored.contentJson, parsed.content)
    && stored.seed === parsed.seed
    && stored.difficulty === parsed.difficulty
    && isDeepStrictEqual(stored.modalityJson, parsed.modality)
    && stored.startsAt.getTime() === new Date(parsed.startsAt).getTime()
    && stored.expiresAt.getTime() === new Date(parsed.expiresAt).getTime()
    && stored.target === parsed.target
    && stored.teacherParticipationEnabled === parsed.teacherParticipationEnabled;
}

function publicChallengeSummary(
  saved: typeof gameChallengeDefinitions.$inferSelect,
): ClassChallengePublicSummary {
  const definition = classChallengeDefinitionSchema.parse({
    id: saved.id,
    schoolId: saved.schoolId,
    classId: saved.classId,
    createdByUserId: saved.createdByUserId,
    title: saved.title,
    gameId: saved.gameId,
    gameVersion: saved.gameVersion,
    contentLocale: saved.contentLocale,
    content: saved.contentJson,
    seed: saved.seed,
    difficulty: saved.difficulty,
    modality: saved.modalityJson,
    startsAt: saved.startsAt.toISOString(),
    expiresAt: saved.expiresAt.toISOString(),
    target: saved.target,
    teacherParticipationEnabled: saved.teacherParticipationEnabled,
  });
  return classChallengePublicSummarySchema.parse({
    id: definition.id,
    classId: definition.classId,
    title: definition.title,
    gameId: definition.gameId,
    gameVersion: definition.gameVersion,
    contentMode: definition.content.mode,
    contentLocale: definition.contentLocale,
    contentItemCount: definition.content.items.length,
    seed: definition.seed,
    difficulty: definition.difficulty,
    modality: definition.modality,
    startsAt: definition.startsAt,
    expiresAt: definition.expiresAt,
    target: definition.target,
    contributionCount: 0,
  });
}

/**
 * Creates one server-owned challenge for a teacher-owned class.
 * The transaction checks current ownership before insertion. A concurrent ownership change can require stronger row locking in a later persistence adapter.
 * @param db Tenant-scoped database.
 * @param user Authenticated teacher or administrator.
 * @param tenant Authenticated school tenant.
 * @param input Validated challenge settings without server identity fields.
 * @returns A public summary of the saved challenge.
 * @throws When permission, validation, tenant, class ownership, or persistence checks fail.
 */
export async function createClassChallenge({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: CreateClassChallengeInput;
}): Promise<ClassChallengePublicSummary> {
  assertCan(user, "challenges:create", tenant);
  const parsed = createClassChallengeInputSchema.parse(input);
  if (!tenant.schoolId) throw new Error("Challenge creation requires a school tenant");

  const saved = await db.transaction(async (rawTx) => {
    const tx = rawTx as unknown as TenantDB;
    const [classroom] = await tx.select({ teacherId: classrooms.teacherId })
      .from(classrooms)
      .where(eq(classrooms.id, parsed.classId))
      .limit(1);
    if (!classroom) throw new Error("Class not found");
    if (user.role === "TEACHER" && classroom.teacherId !== user.id) throw new Error("Forbidden");
    const values = {
      schoolId: tenant.schoolId!,
      classId: parsed.classId,
      createdByUserId: user.id,
      creationKey: parsed.creationKey ?? null,
      title: parsed.title,
      gameId: parsed.gameId,
      gameVersion: parsed.gameVersion,
      contentMode: parsed.content.mode,
      contentLocale: parsed.contentLocale,
      contentJson: parsed.content,
      seed: parsed.seed,
      difficulty: parsed.difficulty,
      modalityJson: parsed.modality,
      startsAt: new Date(parsed.startsAt),
      expiresAt: new Date(parsed.expiresAt),
      target: parsed.target,
      teacherParticipationEnabled: parsed.teacherParticipationEnabled,
    };
    if (!parsed.creationKey) {
      const [definition] = await tx.insert(gameChallengeDefinitions).values(values).returning();
      return definition;
    }
    const [inserted] = await tx.insert(gameChallengeDefinitions)
      .values(values)
      .onConflictDoNothing({
        target: [
          gameChallengeDefinitions.schoolId,
          gameChallengeDefinitions.createdByUserId,
          gameChallengeDefinitions.creationKey,
        ],
      })
      .returning();
    if (inserted) return inserted;
    const [existing] = await tx.select().from(gameChallengeDefinitions).where(and(
      eq(gameChallengeDefinitions.schoolId, tenant.schoolId!),
      eq(gameChallengeDefinitions.createdByUserId, user.id),
      eq(gameChallengeDefinitions.creationKey, parsed.creationKey),
    )).limit(1);
    if (!existing) throw new Error("Challenge creation retry did not find its definition");
    if (!sameChallengeRequest(existing, parsed)) throw new ChallengeCreationConflictError();
    return existing;
  });
  if (!saved) throw new Error("Challenge creation did not return a saved definition");
  return publicChallengeSummary(saved);
}

/**
 * Starts one active challenge run from server-owned settings.
 * @param db Tenant-scoped database.
 * @param user Authenticated class student or participating teacher.
 * @param tenant Authenticated school tenant.
 * @param input Opaque challenge identity only.
 * @param now Server clock used for the eligibility decision.
 * @param resolveGameCapability Resolves trusted installed cartridge facts.
 * @returns A validated launch with server-owned content and settings.
 * @throws When permission, membership, timing, participation, or stored data checks fail.
 */
export async function startClassChallengeRun({
  db,
  user,
  tenant,
  input,
  now = () => new Date(),
  resolveGameCapability,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: StartClassChallengeRunInput;
  now?: () => Date;
  resolveGameCapability: (gameId: string) => ChallengeGameCapability | undefined | Promise<ChallengeGameCapability | undefined>;
}): Promise<StudentChallengeRunLaunch> {
  assertCan(user, "challenges:start", tenant);
  const parsedInput = startClassChallengeRunInputSchema.parse(input);
  if (!tenant.schoolId) throw new Error("Challenge runs require a school tenant");
  const [stored] = await db.select().from(gameChallengeDefinitions)
    .where(eq(gameChallengeDefinitions.id, parsedInput.challengeId))
    .limit(1);
  if (!stored) throw new Error("Challenge not found");
  const definition = classChallengeDefinitionSchema.parse({
    id: stored.id,
    schoolId: stored.schoolId,
    classId: stored.classId,
    createdByUserId: stored.createdByUserId,
    title: stored.title,
    gameId: stored.gameId,
    gameVersion: stored.gameVersion,
    contentLocale: stored.contentLocale,
    content: stored.contentJson,
    seed: stored.seed,
    difficulty: stored.difficulty,
    modality: stored.modalityJson,
    startsAt: stored.startsAt.toISOString(),
    expiresAt: stored.expiresAt.toISOString(),
    target: stored.target,
    teacherParticipationEnabled: stored.teacherParticipationEnabled,
  });
  await requireClassChallengeAccess({ db, user, tenant, classId: definition.classId });
  if (user.role === "TEACHER" && !definition.teacherParticipationEnabled) {
    throw new Error("Teacher participation is disabled");
  }
  const capability = await resolveGameCapability(definition.gameId);
  if (!capability
    || capability.version !== definition.gameVersion
    || capability.inputMode !== definition.content.mode
    || !capability.modalities.includes(definition.modality.modality)) {
    throw new Error("Challenge game configuration is unavailable");
  }
  const issuedAt = now();
  if (issuedAt < stored.startsAt) throw new Error("Challenge has not started");
  if (issuedAt >= stored.expiresAt) throw new Error("Challenge has expired");

  const [savedRun] = await db.insert(gameChallengeRuns).values({
    schoolId: tenant.schoolId,
    challengeId: definition.id,
    userId: user.id,
    expiresAt: stored.expiresAt,
  }).returning();
  if (!savedRun) throw new Error("Challenge run creation failed");
  const [aggregate] = await db.select({ contributionCount: count(gameChallengeContributions.id) })
    .from(gameChallengeContributions)
    .where(eq(gameChallengeContributions.challengeId, definition.id));

  return studentChallengeRunLaunchSchema.parse({
    runId: savedRun.id,
    challengeId: definition.id,
    userId: user.id,
    challenge: {
      id: definition.id,
      classId: definition.classId,
      title: definition.title,
      gameId: definition.gameId,
      gameVersion: definition.gameVersion,
      contentMode: definition.content.mode,
      contentLocale: definition.contentLocale,
      contentItemCount: definition.content.items.length,
      seed: definition.seed,
      difficulty: definition.difficulty,
      modality: definition.modality,
      startsAt: definition.startsAt,
      expiresAt: definition.expiresAt,
      target: definition.target,
      contributionCount: aggregate?.contributionCount ?? 0,
    },
    content: definition.content,
    issuedAt: issuedAt.toISOString(),
    expiresAt: savedRun.expiresAt.toISOString(),
  });
}
