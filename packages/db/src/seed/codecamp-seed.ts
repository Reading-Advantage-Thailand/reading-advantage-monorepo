// Uses raw `db` (not tenant-scoped) because seeding is an admin operation
// that writes global curriculum data with no user/tenant context.
import { db } from "../index.js";
import { eq } from "drizzle-orm";
import {
  codecampModules,
  codecampLessons,
  codecampExercises,
  codecampQuizQuestions,
  codecampExerciseRepos,
} from "../schema/codecamp.js";
import { getPhaseACurriculumData, getPhaseBCurriculumData, getPhaseCCurriculumData } from "./codecamp-curriculum-data.js";

async function seed() {
  console.log("Seeding codecamp curriculum...");

  const phaseA = getPhaseACurriculumData();
  const phaseB = getPhaseBCurriculumData();
  const phaseC = getPhaseCCurriculumData();
  const modules = [...phaseA.modules, ...phaseB.modules, ...phaseC.modules];
  const exerciseRepos = [...phaseA.exerciseRepos, ...phaseB.exerciseRepos, ...phaseC.exerciseRepos];

  let seededModules = 0;
  let seededLessons = 0;
  let skippedModules = 0;

  await db.transaction(async (tx) => {
    for (const mod of modules) {
      const existingModule = await tx
        .select({ id: codecampModules.id })
        .from(codecampModules)
        .where(eq(codecampModules.slug, mod.slug))
        .limit(1);

      if (existingModule.length > 0) {
        console.log(`  ⏭️  Module "${mod.slug}" already exists, skipping.`);
        skippedModules++;
        continue;
      }

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
        .returning();

      seededModules++;

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

    // Seed placeholder exercise repo entries
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
        continue;
      }

      await tx.insert(codecampExerciseRepos).values({
        moduleId: moduleRow[0].id,
        repoUrl: repo.repoUrl,
        description: repo.description,
        order: repo.order,
      });
    }

    console.log(
      `✅ Seeded ${seededModules} modules with ${seededLessons} lessons, exercises, and quizzes.`
    );
    if (skippedModules > 0) {
      console.log(`   ${skippedModules} module(s) were already present and skipped.`);
    }
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
