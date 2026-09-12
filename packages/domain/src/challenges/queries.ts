import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  gameChallengeContributions,
  gameChallengeDefinitions,
  classrooms,
  classroomStudents,
  users,
} from "@reading-advantage/db/schema";
import { classChallengePublicSummarySchema, type ClassChallengePublicSummary } from "@reading-advantage/game-contracts";

import type { TenantDB } from "../db-contract.js";
import {
  listClassChallengesInputSchema,
  listStudentClassesInputSchema,
  studentChallengeClassPageSchema,
  type ListClassChallengesInput,
  type ListStudentClassesInput,
  type StudentChallengeClassPage,
} from "./schema.js";
import { requireClassChallengeAccess } from "./access.js";
import "./permissions.js";

/**
 * Lists a student's active tenant classes for challenge discovery.
 * @param db Tenant-scoped database.
 * @param user Authenticated student.
 * @param tenant Authenticated school tenant.
 * @param input Bounded page values.
 * @returns Public class identities and a continuation flag.
 * @throws When permission, role, tenant, or input validation fails.
 */
export async function listStudentChallengeClasses({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: ListStudentClassesInput;
}): Promise<StudentChallengeClassPage> {
  assertCan(user, "challenges:read", tenant);
  if (user.role !== "STUDENT") throw new Error("Forbidden");
  if (!tenant.schoolId || user.schoolId !== tenant.schoolId) throw new Error("Forbidden");
  const parsed = listStudentClassesInputSchema.parse(input);
  const rawDb = db.unscoped(
    "classroomStudents is REFERENTIAL; class and user school ownership bound student class discovery",
  );
  const rows = await rawDb.select({ id: classrooms.id, name: classrooms.name })
    .from(classroomStudents)
    .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .where(and(
      eq(classroomStudents.studentId, user.id),
      eq(classrooms.schoolId, tenant.schoolId),
      eq(users.schoolId, tenant.schoolId),
      eq(classrooms.archived, false),
    ))
    .orderBy(asc(classrooms.name), asc(classrooms.id))
    .limit(parsed.limit + 1)
    .offset(parsed.offset);
  return studentChallengeClassPageSchema.parse({
    classes: rows.slice(0, parsed.limit),
    hasMore: rows.length > parsed.limit,
  });
}

/**
 * Lists active tenant classes available for challenge creation.
 * @param db Tenant-scoped database.
 * @param user Authenticated teacher or administrator.
 * @param tenant Authenticated school tenant.
 * @param input Bounded page values.
 * @returns Public class identities and a continuation flag.
 * @throws When permission, role, tenant, or input validation fails.
 */
export async function listOwnedChallengeClasses({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: ListStudentClassesInput;
}): Promise<StudentChallengeClassPage> {
  assertCan(user, "challenges:create", tenant);
  if (user.role !== "TEACHER" && user.role !== "ADMIN") throw new Error("Forbidden");
  if (!tenant.schoolId || user.schoolId !== tenant.schoolId) throw new Error("Forbidden");
  const parsed = listStudentClassesInputSchema.parse(input);
  const rows = await db.select({ id: classrooms.id, name: classrooms.name })
    .from(classrooms)
    .where(and(
      eq(classrooms.archived, false),
      ...(user.role === "TEACHER" ? [eq(classrooms.teacherId, user.id)] : []),
    ))
    .orderBy(asc(classrooms.name), asc(classrooms.id))
    .limit(parsed.limit + 1)
    .offset(parsed.offset);
  return studentChallengeClassPageSchema.parse({
    classes: rows.slice(0, parsed.limit),
    hasMore: rows.length > parsed.limit,
  });
}

/**
 * Lists bounded public challenge summaries for an authorized class member.
 * @param db Tenant-scoped database.
 * @param user Authenticated class member, owner, or administrator.
 * @param tenant Authenticated school tenant.
 * @param input Class identity and bounded pagination values.
 * @returns Public summaries without stored learning content.
 * @throws When permission, validation, class access, or stored summary validation fails.
 */
export async function listClassChallenges({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: ListClassChallengesInput;
}): Promise<ClassChallengePublicSummary[]> {
  assertCan(user, "challenges:read", tenant);
  const parsed = listClassChallengesInputSchema.parse(input);
  await requireClassChallengeAccess({ db, user, tenant, classId: parsed.classId });

  const definitions = await db.select({
    id: gameChallengeDefinitions.id,
    classId: gameChallengeDefinitions.classId,
    title: gameChallengeDefinitions.title,
    gameId: gameChallengeDefinitions.gameId,
    gameVersion: gameChallengeDefinitions.gameVersion,
    contentMode: gameChallengeDefinitions.contentMode,
    contentLocale: gameChallengeDefinitions.contentLocale,
    contentItemCount: sql<number>`jsonb_array_length(${gameChallengeDefinitions.contentJson} -> 'items')`,
    seed: gameChallengeDefinitions.seed,
    difficulty: gameChallengeDefinitions.difficulty,
    modalityJson: gameChallengeDefinitions.modalityJson,
    startsAt: gameChallengeDefinitions.startsAt,
    expiresAt: gameChallengeDefinitions.expiresAt,
    target: gameChallengeDefinitions.target,
    contributionCount: count(gameChallengeContributions.id),
  }).from(gameChallengeDefinitions)
    .leftJoin(gameChallengeContributions, and(
      eq(gameChallengeContributions.schoolId, gameChallengeDefinitions.schoolId),
      eq(gameChallengeContributions.challengeId, gameChallengeDefinitions.id),
    ))
    .where(eq(gameChallengeDefinitions.classId, parsed.classId))
    .groupBy(
      gameChallengeDefinitions.id,
      gameChallengeDefinitions.schoolId,
      gameChallengeDefinitions.classId,
    )
    .orderBy(desc(gameChallengeDefinitions.startsAt), desc(gameChallengeDefinitions.id))
    .limit(parsed.limit)
    .offset(parsed.offset);
  if (definitions.length === 0) return [];

  return definitions.map((definition) => classChallengePublicSummarySchema.parse({
    id: definition.id,
    classId: definition.classId,
    title: definition.title,
    gameId: definition.gameId,
    gameVersion: definition.gameVersion,
    contentMode: definition.contentMode,
    contentLocale: definition.contentLocale,
    contentItemCount: definition.contentItemCount,
    seed: definition.seed,
    difficulty: definition.difficulty,
    modality: definition.modalityJson,
    startsAt: definition.startsAt.toISOString(),
    expiresAt: definition.expiresAt.toISOString(),
    target: definition.target,
    contributionCount: definition.contributionCount,
  }));
}
