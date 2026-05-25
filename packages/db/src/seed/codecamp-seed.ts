// Uses a dedicated direct (session-mode) DB client, not the shared `db` from
// `../index.js`. Reason: seeding wraps many writes in a single transaction
// (`db.transaction(...)` below), which can hold a backend session for several
// seconds; running that through a transaction-mode pooler pins a pooler slot
// for the duration and breaks if the pooler reassigns mid-transaction.
// DIRECT_DATABASE_URL (Phase 3, FR-3 of connection_pooling_20260522) is the
// direct connection; fall back to DATABASE_URL for backward compatibility.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../schema/index.js";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "../connection-options.js";
import {
  codecampModules,
  codecampLessons,
  codecampExercises,
  codecampQuizQuestions,
  codecampExerciseRepos,
} from "../schema/codecamp.js";
import { getPhaseACurriculumData, getPhaseBCurriculumData, getPhaseCCurriculumData, getPhaseDCurriculumData, MODULE_REPO_MAP } from "./codecamp-curriculum-data.js";

const seedConnectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!process.env.DIRECT_DATABASE_URL && process.env.DATABASE_URL) {
  console.warn(
    "[codecamp-seed] DIRECT_DATABASE_URL is not set; falling back to DATABASE_URL. " +
      "Set DIRECT_DATABASE_URL to a direct (session-mode) Postgres connection to " +
      "avoid running the seed transaction through a transaction-mode pooler."
  );
}

const seedClient = postgres(
  normalizePostgresConnectionString(seedConnectionString),
  buildPostgresOptions(seedConnectionString)
);

const db = drizzle(seedClient, { schema });

/**
 * Identifies which DB module slugs are stale (not in the canonical curriculum).
 * Exported for unit testing.
 */
export function findStaleModuleSlugs(canonicalSlugs: Set<string>, dbSlugs: string[]): string[] {
  return dbSlugs.filter((slug) => !canonicalSlugs.has(slug));
}

async function seed() {
  console.log("Seeding codecamp curriculum...");

  const phaseA = getPhaseACurriculumData();
  const phaseB = getPhaseBCurriculumData();
  const phaseC = getPhaseCCurriculumData();
  const phaseD = getPhaseDCurriculumData();
  const modules = [...phaseA.modules, ...phaseB.modules, ...phaseC.modules, ...phaseD.modules];
  const exerciseRepos = [...phaseA.exerciseRepos, ...phaseB.exerciseRepos, ...phaseC.exerciseRepos, ...phaseD.exerciseRepos];

  let newModules = 0;
  let updatedModules = 0;
  let seededLessons = 0;

  await db.transaction(async (tx) => {
    for (const mod of modules) {
      // Check existence before upsert so we can report new vs updated
      const existingModule = await tx
        .select({ id: codecampModules.id })
        .from(codecampModules)
        .where(eq(codecampModules.slug, mod.slug))
        .limit(1);

      const isExisting = existingModule.length > 0;

      const [insertedModule] = await tx
        .insert(codecampModules)
        .values({
          title: mod.title,
          description: mod.description,
          slug: mod.slug,
          order: mod.order,
          phase: mod.phase,
          status: mod.status,
        })
        .onConflictDoUpdate({
          target: codecampModules.slug,
          set: {
            title: mod.title,
            description: mod.description,
            order: mod.order,
            phase: mod.phase,
            status: mod.status,
          },
        })
        .returning();

      if (isExisting) {
        console.log(`  ✏️  Module "${mod.slug}" already exists, updated metadata.`);
        updatedModules++;
        // Skip lessons/exercises/quizzes for existing modules to avoid disrupting student progress
        continue;
      }

      newModules++;

      for (const lesson of mod.lessons) {
        const [insertedLesson] = await tx
          .insert(codecampLessons)
          .values({
            moduleId: insertedModule.id,
            title: lesson.title,
            description: lesson.description,
            order: lesson.order,
            type: lesson.type,
            contentJson: lesson.contentJson,
          })
          .returning();

        seededLessons++;

        if (lesson.exercises && lesson.exercises.length > 0) {
          for (const ex of lesson.exercises) {
            await tx.insert(codecampExercises).values({
              lessonId: insertedLesson.id,
              title: ex.title,
              instructions: ex.instructions,
              starterCode: ex.starterCode,
              expectedOutput: ex.expectedOutput,
              hintsJson: ex.hintsJson,
              order: ex.order,
            });
          }
        }

        if (lesson.questions && lesson.questions.length > 0) {
          for (const q of lesson.questions) {
            await tx.insert(codecampQuizQuestions).values({
              lessonId: insertedLesson.id,
              question: q.question,
              optionsJson: q.optionsJson,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              order: q.order,
            });
          }
        }
      }
    }

    // Seed exercise repo entries (idempotent — updates URL/description on re-run)
    for (const repo of exerciseRepos) {
      const moduleRow = await tx
        .select({ id: codecampModules.id })
        .from(codecampModules)
        .where(eq(codecampModules.slug, repo.moduleSlug))
        .limit(1);

      if (moduleRow.length === 0) {
        console.warn(`No module found for repo slug: ${repo.moduleSlug}`);
        continue;
      }

      const existingRepo = await tx
        .select({ id: codecampExerciseRepos.id })
        .from(codecampExerciseRepos)
        .where(eq(codecampExerciseRepos.moduleId, moduleRow[0].id))
        .limit(1);

      if (existingRepo.length > 0) {
        await tx
          .update(codecampExerciseRepos)
          .set({
            repoUrl: repo.repoUrl,
            description: repo.description,
            order: repo.order,
          })
          .where(eq(codecampExerciseRepos.id, existingRepo[0].id));
      } else {
        await tx.insert(codecampExerciseRepos).values({
          moduleId: moduleRow[0].id,
          repoUrl: repo.repoUrl,
          description: repo.description,
          order: repo.order,
        });
      }
    }

    // Clean up orphaned exercise-repo rows for modules no longer in MODULE_REPO_MAP
    // (e.g. M1 dev-environment and M16 monorepo-packages were removed from the map)
    const validSlugs = new Set(Object.keys(MODULE_REPO_MAP));
    const allModules = await tx
      .select({ id: codecampModules.id, slug: codecampModules.slug })
      .from(codecampModules);

    let deletedOrphans = 0;
    for (const mod of allModules) {
      if (!validSlugs.has(mod.slug)) {
        const deleted = await tx
          .delete(codecampExerciseRepos)
          .where(eq(codecampExerciseRepos.moduleId, mod.id))
          .returning({ id: codecampExerciseRepos.id });
        if (deleted.length > 0) {
          console.log(`  🗑️  Removed orphaned exercise-repo row for module "${mod.slug}"`);
          deletedOrphans += deleted.length;
        }
      }
    }

    // Unpublish stale modules (slugs not in the canonical curriculum)
    const canonicalSlugs = new Set(modules.map((m) => m.slug));
    const allDbModules = await tx
      .select({ id: codecampModules.id, slug: codecampModules.slug, status: codecampModules.status })
      .from(codecampModules);

    let unpublishedStale = 0;
    for (const dbMod of allDbModules) {
      if (!canonicalSlugs.has(dbMod.slug) && dbMod.status === "published") {
        await tx
          .update(codecampModules)
          .set({ status: "draft" })
          .where(eq(codecampModules.id, dbMod.id));
        console.log(`  📦 Unpublished stale module "${dbMod.slug}"`);
        unpublishedStale++;
      }
    }
    if (unpublishedStale > 0) {
      console.log(`   ${unpublishedStale} stale module(s) unpublished.`);
    }

    console.log(
      `✅ Seeded ${newModules} new module(s) with ${seededLessons} lessons, exercises, and quizzes.`
    );
    if (updatedModules > 0) {
      console.log(`   ${updatedModules} existing module(s) had metadata updated.`);
    }
    if (deletedOrphans > 0) {
      console.log(`   ${deletedOrphans} orphaned exercise-repo row(s) removed.`);
    }
  });
}

// Run the seed only when this module is executed directly (e.g. `tsx
// src/seed/codecamp-seed.ts` or `pnpm seed:codecamp`). When imported by a
// test (`import { findStaleModuleSlugs } from ...`), do nothing -- this
// prevents the test from accidentally connecting to a DB and prevents the
// pre-existing import-time `seed()` invocation from leaking across tests.
const isMain =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  seed()
    .then(() => seedClient.end({ timeout: 5 }))
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error(err);
      await seedClient.end({ timeout: 5 }).catch(() => undefined);
      process.exit(1);
    });
}
