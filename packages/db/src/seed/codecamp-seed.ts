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
import { getPhaseACurriculumData, getPhaseBCurriculumData } from "./codecamp-curriculum-data.js";

async function seed() {
  console.log("Seeding codecamp curriculum...");

  const phaseA = getPhaseACurriculumData();
  const phaseB = getPhaseBCurriculumData();
  const modules = [...phaseA.modules, ...phaseB.modules];
  const exerciseRepos = [...phaseA.exerciseRepos, ...phaseB.exerciseRepos];

  await db.transaction(async (tx) => {
    for (const mod of modules) {
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

      if (moduleRow.length > 0) {
        await tx.insert(codecampExerciseRepos).values({
          moduleId: moduleRow[0].id,
          repoUrl: repo.repoUrl,
          description: repo.description,
          order: repo.order,
        });
      } else {
        console.warn(`No module found for repo slug: ${repo.moduleSlug}`);
      }
    }

    const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
    console.log(
      `✅ Seeded ${modules.length} modules with ${totalLessons} lessons, exercises, and quizzes.`
    );
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
