/**
 * Backfill script: Add missing `exercise` type lessons to codecamp modules.
 *
 * Problem: Only git-github has a proper `type: 'exercise'` lesson. The other 15
 * modules have exercises bundled into combined "Exercise + Quiz" lessons (type=quiz).
 * `completeApprovedPrReviewLesson` requires a `type='exercise'` lesson to exist.
 *
 * Solution: For each module missing an exercise lesson, create a standalone
 * exercise lesson with the exercise content from the combined lesson, and
 * insert associated codecamp_exercises records.
 *
 * Usage:
 *   pnpm tsx src/seed/codecamp-backfill-exercises.ts              # dry-run (default)
 *   pnpm tsx src/seed/codecamp-backfill-exercises.ts --apply      # write to DB
 */
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "../schema/index.js";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "../connection-options.js";
import {
  codecampModules,
  codecampLessons,
  codecampExercises,
  codecampExerciseRepos,
} from "../schema/codecamp.js";
import { getPhaseACurriculumData, getPhaseBCurriculumData, getPhaseCCurriculumData, getPhaseDCurriculumData, MODULE_REPO_MAP } from "./codecamp-curriculum-data.js";

const DRY_RUN = !process.argv.includes("--apply");

const seedConnectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!process.env.DIRECT_DATABASE_URL && process.env.DATABASE_URL) {
  console.warn(
    "[backfill] DIRECT_DATABASE_URL is not set; falling back to DATABASE_URL."
  );
}

const seedClient = postgres(
  normalizePostgresConnectionString(seedConnectionString),
  buildPostgresOptions(seedConnectionString)
);

const db = drizzle(seedClient, { schema });

interface BackfillResult {
  moduleSlug: string;
  action: "inserted" | "skipped" | "skipped_no_repo";
  exerciseLessonId?: string;
}

/**
 * Returns the set of module slugs that have exercise repos (and thus need exercise lessons).
 * Uses MODULE_REPO_MAP which explicitly excludes dev-environment and monorepo-packages.
 */
export function getModulesWithExerciseRepos(): Set<string> {
  return new Set(Object.keys(MODULE_REPO_MAP));
}

/**
 * Returns exercise lesson data for a given module slug from the curriculum data.
 * Extracts the exercise content from the combined "Exercise + Quiz" lesson.
 * Falls back to a generic exercise for modules without curriculum exercise data
 * (e.g., real-world-practice capstone module).
 */
export function getExerciseLessonData(moduleSlug: string): {
  title: string;
  description: string;
  contentJson: Record<string, unknown>;
  exercises: Array<{
    title: string;
    instructions: string;
    starterCode: string | null;
    expectedOutput: string | null;
    hintsJson: string[];
    order: number;
  }>;
} | null {
  const phaseA = getPhaseACurriculumData();
  const phaseB = getPhaseBCurriculumData();
  const phaseC = getPhaseCCurriculumData();
  const phaseD = getPhaseDCurriculumData();
  const allModules = [...phaseA.modules, ...phaseB.modules, ...phaseC.modules, ...phaseD.modules];

  const mod = allModules.find((m) => m.slug === moduleSlug);
  if (!mod) return null;

  // Find the lesson with exercises (the combined "Exercise + Quiz" lesson or standalone exercise)
  const exerciseLesson = mod.lessons.find(
    (l) => l.exercises && l.exercises.length > 0
  );

  if (exerciseLesson) {
    return {
      title: exerciseLesson.title.replace(" Exercise + Quiz", " Exercise"),
      description: exerciseLesson.description,
      contentJson: exerciseLesson.contentJson,
      exercises: exerciseLesson.exercises!,
    };
  }

  // Fallback for modules without curriculum exercise data (e.g., capstone module)
  const repoEntry = MODULE_REPO_MAP[moduleSlug];
  if (!repoEntry) return null;

  return {
    title: `${mod.title} Exercise`,
    description: `Practical exercise for ${mod.title}`,
    contentJson: {
      instructions: `Fork the exercise repository and work through the exercises for ${mod.title}. Follow the README instructions, complete each task, and submit a pull request when done.`,
    },
    exercises: [
      {
        title: `Complete ${mod.title} exercises`,
        instructions: `Fork the exercise repository and follow the README to complete all exercises. Submit a pull request when done.`,
        starterCode: null,
        expectedOutput: null,
        hintsJson: [
          "Read the README carefully before starting",
          "Commit frequently with descriptive messages",
          "Ask the AI tutor if you get stuck",
        ],
        order: 1,
      },
    ],
  };
}

/**
 * Main backfill logic. Exported for testing.
 */
export async function backfillExerciseLessons(
  dbInstance: typeof db,
  dryRun: boolean
): Promise<BackfillResult[]> {
  const results: BackfillResult[] = [];
  const modulesWithRepos = getModulesWithExerciseRepos();

  // Get all modules from DB ordered by order
  const allDbModules = await dbInstance
    .select({
      id: codecampModules.id,
      slug: codecampModules.slug,
      title: codecampModules.title,
    })
    .from(codecampModules)
    .orderBy(codecampModules.order);

  for (const mod of allDbModules) {
    // Skip modules without exercise repos
    if (!modulesWithRepos.has(mod.slug)) {
      results.push({ moduleSlug: mod.slug, action: "skipped_no_repo" });
      continue;
    }

    // Check if module already has an exercise lesson
    const existingExercise = await dbInstance
      .select({ id: codecampLessons.id })
      .from(codecampLessons)
      .where(
        and(
          eq(codecampLessons.moduleId, mod.id),
          eq(codecampLessons.type, "exercise")
        )
      )
      .limit(1);

    if (existingExercise.length > 0) {
      results.push({ moduleSlug: mod.slug, action: "skipped" });
      continue;
    }

    // Get exercise data from curriculum
    const exerciseData = getExerciseLessonData(mod.slug);
    if (!exerciseData) {
      console.warn(`  ⚠️  No exercise data found for module "${mod.slug}"`);
      results.push({ moduleSlug: mod.slug, action: "skipped" });
      continue;
    }

    // Find the combined "Exercise + Quiz" lesson to determine ordering
    const combinedLesson = await dbInstance
      .select({
        id: codecampLessons.id,
        order: codecampLessons.order,
        title: codecampLessons.title,
      })
      .from(codecampLessons)
      .where(
        and(
          eq(codecampLessons.moduleId, mod.id),
          eq(codecampLessons.type, "quiz")
        )
      )
      .orderBy(codecampLessons.order)
      .limit(1);

    // Find the last theory lesson to determine insertion order
    const lastTheory = await dbInstance
      .select({ order: codecampLessons.order })
      .from(codecampLessons)
      .where(
        and(
          eq(codecampLessons.moduleId, mod.id),
          eq(codecampLessons.type, "theory")
        )
      )
      .orderBy(sql`${codecampLessons.order} DESC`)
      .limit(1);

    const exerciseOrder = lastTheory.length > 0
      ? lastTheory[0].order + 1
      : (combinedLesson.length > 0 ? combinedLesson[0].order : 1);

    if (dryRun) {
      console.log(
        `  [DRY-RUN] Would insert exercise lesson for "${mod.slug}": ` +
        `"${exerciseData.title}" at order ${exerciseOrder} ` +
        `with ${exerciseData.exercises.length} exercise(s)`
      );
      results.push({ moduleSlug: mod.slug, action: "inserted" });
      continue;
    }

    // Insert the exercise lesson
    const [insertedLesson] = await dbInstance
      .insert(codecampLessons)
      .values({
        moduleId: mod.id,
        title: exerciseData.title,
        description: exerciseData.description,
        order: exerciseOrder,
        type: "exercise",
        contentJson: exerciseData.contentJson,
      })
      .returning();

    // Insert associated codecamp_exercises records
    for (const ex of exerciseData.exercises) {
      await dbInstance.insert(codecampExercises).values({
        lessonId: insertedLesson.id,
        title: ex.title,
        instructions: ex.instructions,
        starterCode: ex.starterCode,
        expectedOutput: ex.expectedOutput,
        hintsJson: ex.hintsJson,
        order: ex.order,
      });
    }

    // Update the combined lesson's order to be after the exercise lesson
    if (combinedLesson.length > 0 && combinedLesson[0].order <= exerciseOrder) {
      await dbInstance
        .update(codecampLessons)
        .set({ order: exerciseOrder + 1 })
        .where(eq(codecampLessons.id, combinedLesson[0].id));
    }

    console.log(
      `  ✅ Inserted exercise lesson for "${mod.slug}": ` +
      `"${exerciseData.title}" (id: ${insertedLesson.id}) ` +
      `with ${exerciseData.exercises.length} exercise(s) at order ${exerciseOrder}`
    );

    results.push({
      moduleSlug: mod.slug,
      action: "inserted",
      exerciseLessonId: insertedLesson.id,
    });
  }

  return results;
}

async function main() {
  console.log(`\n🔧 Codecamp Exercise Lessons Backfill${DRY_RUN ? " (DRY-RUN)" : ""}\n`);

  const results = await backfillExerciseLessons(db, DRY_RUN);

  const inserted = results.filter((r) => r.action === "inserted");
  const skipped = results.filter((r) => r.action === "skipped");
  const skippedNoRepo = results.filter((r) => r.action === "skipped_no_repo");

  console.log(`\n📊 Summary:`);
  console.log(`  Inserted: ${inserted.length}`);
  console.log(`  Skipped (already has exercise): ${skipped.length}`);
  console.log(`  Skipped (no exercise repo): ${skippedNoRepo.length}`);

  if (DRY_RUN) {
    console.log(`\n  ℹ️  This was a dry-run. Run with --apply to write to the database.`);
  }
}

const isMain =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main()
    .then(() => seedClient.end({ timeout: 5 }))
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error(err);
      await seedClient.end({ timeout: 5 }).catch(() => undefined);
      process.exit(1);
    });
}
