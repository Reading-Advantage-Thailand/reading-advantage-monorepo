#!/usr/bin/env tsx
/**
 * Backfill script for schoolId on science_* tables (Track 2: TenantDB Adoption).
 *
 * Derives schoolId for each row from the related users.schoolId via FK chains.
 * Idempotent: re-running produces the same result.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-school-id.ts
 *
 * Requires DATABASE_URL or DIRECT_DATABASE_URL env var.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL or DIRECT_DATABASE_URL must be set");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

interface BackfillResult {
  table: string;
  updated: number;
  skipped: number;
}

/**
 * Backfill schoolId from a direct user FK (userId/studentId/teacherId/assignedBy).
 */
async function backfillFromUserFK(
  table: string,
  userFKColumn: string
): Promise<BackfillResult> {
  const result = await db.execute(sql`
    UPDATE ${sql.identifier(table)} t
    SET school_id = u.school_id
    FROM users u
    WHERE t.${sql.identifier(userFKColumn)} = u.id
      AND t.school_id IS NULL
      AND u.school_id IS NOT NULL
  `);
  const updated = result.rowCount ?? 0;

  const remaining = await db.execute(sql`
    SELECT count(*) as cnt FROM ${sql.identifier(table)}
    WHERE school_id IS NULL
  `);
  const skipped = Number((remaining[0] as Record<string, unknown>).cnt);

  return { table, updated, skipped };
}

/**
 * Backfill schoolId from a class FK (classId → scienceClasses.teacherId → users.schoolId).
 */
async function backfillFromClassFK(
  table: string,
  classFKColumn: string
): Promise<BackfillResult> {
  const result = await db.execute(sql`
    UPDATE ${sql.identifier(table)} t
    SET school_id = u.school_id
    FROM science_classes c
    JOIN users u ON c.teacher_id = u.id
    WHERE t.${sql.identifier(classFKColumn)} = c.id
      AND t.school_id IS NULL
      AND u.school_id IS NOT NULL
  `);
  const updated = result.rowCount ?? 0;

  const remaining = await db.execute(sql`
    SELECT count(*) as cnt FROM ${sql.identifier(table)}
    WHERE school_id IS NULL
  `);
  const skipped = Number((remaining[0] as Record<string, unknown>).cnt);

  return { table, updated, skipped };
}

/**
 * Backfill schoolId from an attempt FK (attemptId → scienceAttempts.studentId → users.schoolId).
 */
async function backfillFromAttemptFK(
  table: string,
  attemptFKColumn: string
): Promise<BackfillResult> {
  const result = await db.execute(sql`
    UPDATE ${sql.identifier(table)} t
    SET school_id = u.school_id
    FROM science_attempts a
    JOIN users u ON a.student_id = u.id
    WHERE t.${sql.identifier(attemptFKColumn)} = a.id
      AND t.school_id IS NULL
      AND u.school_id IS NOT NULL
  `);
  const updated = result.rowCount ?? 0;

  const remaining = await db.execute(sql`
    SELECT count(*) as cnt FROM ${sql.identifier(table)}
    WHERE school_id IS NULL
  `);
  const skipped = Number((remaining[0] as Record<string, unknown>).cnt);

  return { table, updated, skipped };
}

/**
 * Backfill schoolId from a lesson FK (lessonId → scienceLessons.schoolId).
 * Note: scienceLessons are content tables; their schoolId is set by
 * backfillFromLessonSchoolId or defaults to the first available school.
 */
async function backfillFromLessonFK(
  table: string,
  lessonFKColumn: string
): Promise<BackfillResult> {
  const result = await db.execute(sql`
    UPDATE ${sql.identifier(table)} t
    SET school_id = l.school_id
    FROM science_lessons l
    WHERE t.${sql.identifier(lessonFKColumn)} = l.id
      AND t.school_id IS NULL
      AND l.school_id IS NOT NULL
  `);
  const updated = result.rowCount ?? 0;

  const remaining = await db.execute(sql`
    SELECT count(*) as cnt FROM ${sql.identifier(table)}
    WHERE school_id IS NULL
  `);
  const skipped = Number((remaining[0] as Record<string, unknown>).cnt);

  return { table, updated, skipped };
}

async function main() {
  console.log("=== Backfill schoolId for science_* tables ===\n");

  // Pre-migration audit: check for NULL users.schoolId
  const nullUsers = await db.execute(sql`
    SELECT count(*) as cnt FROM users WHERE school_id IS NULL
  `);
  const nullUserCount = Number((nullUsers[0] as Record<string, unknown>).cnt);
  if (nullUserCount > 0) {
    console.warn(
      `WARNING: ${nullUserCount} users have NULL school_id. ` +
      `Rows depending on these users will NOT be backfilled.`
    );
  }

  // Get the first available schoolId for content tables without user FK
  const firstSchool = await db.execute(sql`
    SELECT id FROM schools ORDER BY created_at LIMIT 1
  `);
  if (firstSchool.length === 0) {
    console.error("ERROR: No schools exist in the database. Cannot backfill.");
    process.exit(1);
  }
  const defaultSchoolId = (firstSchool[0] as Record<string, unknown>).id;
  console.log(`Using default school_id ${defaultSchoolId} for content tables without user FK\n`);

  const results: BackfillResult[] = [];

  // 1. Content tables with no user FK — set to default school
  // scienceLessons: content table, assign to default school
  {
    const r = await db.execute(sql`
      UPDATE science_lessons SET school_id = ${defaultSchoolId} WHERE school_id IS NULL
    `);
    results.push({
      table: "science_lessons",
      updated: r.rowCount ?? 0,
      skipped: 0,
    });
  }

  // scienceStandards: content table, assign to default school
  {
    const r = await db.execute(sql`
      UPDATE science_standards SET school_id = ${defaultSchoolId} WHERE school_id IS NULL
    `);
    results.push({
      table: "science_standards",
      updated: r.rowCount ?? 0,
      skipped: 0,
    });
  }

  // 2. User-scoped tables (direct user FK)
  results.push(await backfillFromUserFK("gamification_profiles", "user_id"));
  results.push(await backfillFromUserFK("achievements", "user_id"));
  results.push(await backfillFromUserFK("science_classes", "teacher_id"));
  results.push(await backfillFromUserFK("science_standard_mastery", "student_id"));
  results.push(await backfillFromUserFK("science_attempts", "student_id"));
  results.push(await backfillFromUserFK("science_lesson_completions", "student_id"));
  results.push(await backfillFromUserFK("science_mastery_runs", "student_id"));
  results.push(await backfillFromUserFK("science_assignments", "assigned_by"));
  results.push(await backfillFromUserFK("science_class_students", "student_id"));

  // 3. Class-scoped tables (classId → scienceClasses.teacherId → users.schoolId)
  results.push(await backfillFromClassFK("science_curriculum_units", "class_id"));

  // 4. Attempt-scoped tables (attemptId → scienceAttempts.studentId → users.schoolId)
  results.push(await backfillFromAttemptFK("science_question_responses", "attempt_id"));

  // 5. Lesson-scoped tables (lessonId → scienceLessons.schoolId)
  results.push(await backfillFromLessonFK("science_quiz_questions", "lesson_id"));
  results.push(await backfillFromLessonFK("science_lesson_standards", "lesson_id"));
  results.push(await backfillFromLessonFK("science_unit_lessons", "lesson_id"));

  // 6. Question-scoped tables (questionId → scienceQuizQuestions.schoolId)
  {
    const r = await db.execute(sql`
      UPDATE science_question_standards t
      SET school_id = q.school_id
      FROM science_quiz_questions q
      WHERE t.question_id = q.id
        AND t.school_id IS NULL
        AND q.school_id IS NOT NULL
    `);
    const updated = r.rowCount ?? 0;
    const remaining = await db.execute(sql`
      SELECT count(*) as cnt FROM science_question_standards WHERE school_id IS NULL
    `);
    const skipped = Number((remaining[0] as Record<string, unknown>).cnt);
    results.push({ table: "science_question_standards", updated, skipped });
  }

  // Print results
  console.log("Backfill Results:");
  console.log("─".repeat(60));
  console.log("Table".padEnd(35) + "Updated".padStart(10) + "Skipped".padStart(10));
  console.log("─".repeat(60));
  for (const r of results) {
    console.log(
      r.table.padEnd(35) +
      String(r.updated).padStart(10) +
      String(r.skipped).padStart(10)
    );
  }
  console.log("─".repeat(60));

  const totalUpdated = results.reduce((s, r) => s + r.updated, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
  console.log("TOTAL".padEnd(35) + String(totalUpdated).padStart(10) + String(totalSkipped).padStart(10));

  if (totalSkipped > 0) {
    console.warn(
      `\nWARNING: ${totalSkipped} rows still have NULL school_id. ` +
      `These rows depend on users with NULL school_id and need manual attention.`
    );
  }

  console.log("\nBackfill complete.");
  await client.end();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
