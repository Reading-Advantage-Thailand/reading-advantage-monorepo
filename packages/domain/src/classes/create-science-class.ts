import { and, eq, exists } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessonStandards,
  scienceLessons,
  scienceStandards,
  scienceUnitLessons,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

function generateJoinCode(): string {
  const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

type DbClient = { select: typeof db.select };

async function generateUniqueJoinCode(client: DbClient): Promise<string> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const code = generateJoinCode();
    const [existing] = await client
      .select({ id: scienceClasses.id })
      .from(scienceClasses)
      .where(eq(scienceClasses.joinCode, code))
      .limit(1);
    if (!existing) return code;
    if (attempt === 5) throw new Error("Failed to generate unique join code after 5 attempts");
  }
  throw new Error("Unexpected error in join code generation");
}

/**
 * Creates a new science class with auto-generated join code and curriculum units.
 * Requires class:create permission.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Class creation fields (name, gradeLevel, standardsAlignment)
 * @returns The newly created class with studentCount: 0
 */
export async function createScienceClass({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { name: string; gradeLevel: number; standardsAlignment: string };
}) {
  assertCan(user, "class:create", tenant);
  const tenantDb = createTenantDB(db, tenant);

  return tenantDb.transaction(async (tx) => {
    const joinCode = await generateUniqueJoinCode(tx);

    const [newClass] = await tx
      .insert(scienceClasses)
      .values({
        schoolId: tenant.schoolId!,
        name: input.name,
        gradeLevel: input.gradeLevel,
        standardsAlignment: input.standardsAlignment,
        joinCode,
        teacherId: user.id,
      })
      .returning();

    const templateLessons = await tx
      .select({ id: scienceLessons.id })
      .from(scienceLessons)
      .where(
        and(
          eq(scienceLessons.gradeLevel, input.gradeLevel),
          exists(
            tx
              .select({ one: scienceLessonStandards.lessonId })
              .from(scienceLessonStandards)
              .innerJoin(scienceStandards, eq(scienceStandards.id, scienceLessonStandards.standardId))
              .where(
                and(
                  eq(scienceLessonStandards.lessonId, scienceLessons.id),
                  eq(scienceStandards.framework, input.standardsAlignment)
                )
              )
          )
        )
      )
      .orderBy(scienceLessons.order);

    if (templateLessons.length > 0) {
      const [unit] = await tx
        .insert(scienceCurriculumUnits)
        .values({
          schoolId: tenant.schoolId!,
          slug: `unit-1-intro-science-${newClass.id.slice(-8)}`,
          title: `Unit 1: Introduction to Science & Living Things`,
          description: "Explore what science is and learn about living things and their characteristics.",
          framework: input.standardsAlignment,
          gradeLevel: input.gradeLevel,
          order: 1,
          classId: newClass.id,
        })
        .returning();

      await tx.insert(scienceUnitLessons).values(
        templateLessons.map((lesson) => ({ schoolId: tenant.schoolId!, unitId: unit.id, lessonId: lesson.id }))
      );
    }

    return {
      success: true,
      data: {
        id: newClass.id,
        name: newClass.name,
        gradeLevel: newClass.gradeLevel,
        standardsAlignment: newClass.standardsAlignment,
        joinCode: newClass.joinCode,
        studentCount: 0,
        createdAt: newClass.createdAt,
      },
    };
  });
}
