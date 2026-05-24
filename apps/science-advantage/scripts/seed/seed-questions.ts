#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

import { db, and, eq, inArray } from '@reading-advantage/db';
import {
  scienceLessons,
  scienceQuizQuestions,
  scienceQuestionStandards,
  scienceStandards,
} from '@reading-advantage/db/schema';

import {
  normalizeQuestionType,
  isValidQuestionType,
} from '@/lib/grade4-normalization';
import {
  validateQuizQuestionsSeedFile,
  formatValidationErrors,
} from '@/lib/schemas/seed-validation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuestionData {
  slug?: string;
  type: string;
  text: string;
  options?: unknown;
  correctAnswer: unknown;
  points: number;
  standards: string[];
}

interface QuestionsFile {
  lessonId: string;
  questions: QuestionData[];
}

function collectQuestionFiles(gradeLevel?: number): string[] {
  const seedDataDir = path.join(__dirname, '..', '..', 'prisma', 'seed-data', 'questions');
  const files: string[] = [];

  if (fs.existsSync(seedDataDir)) {
    files.push(
      ...fs.readdirSync(seedDataDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(seedDataDir, f))
    );
  }

  if (gradeLevel === 4) {
    const contentDir = path.join(__dirname, '..', '..', 'data', 'content', 'grade-4', 'questions');
    if (fs.existsSync(contentDir)) {
      files.push(
        ...fs.readdirSync(contentDir)
          .filter(f => f.endsWith('.json'))
          .map(f => path.join(contentDir, f))
      );
    }
  }

  return files;
}

export async function seedQuestions(
  options?: {
    lessonId?: string;
    gradeLevel?: number;
  }
): Promise<void> {
  console.log('❓ Seeding questions...');

  const files = collectQuestionFiles(options?.gradeLevel);

  if (files.length === 0) {
    console.log('  ℹ No question files found - skipping question seeding\n');
    return;
  }

  let totalQuestionsSeeded = 0;
  let filesProcessed = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rawQuestionData: QuestionsFile = JSON.parse(fileContent);

    // Validate with Zod schemas
    const validationErrors = validateQuizQuestionsSeedFile(rawQuestionData, filePath);
    if (validationErrors.length > 0) {
      console.error(formatValidationErrors(validationErrors));
      process.exit(1);
    }

    // Normalize question types (handles lowercase/snake_case variants)
    const questionData: QuestionsFile = {
      lessonId: rawQuestionData.lessonId,
      questions: rawQuestionData.questions.map(q => {
        const normalizedType = normalizeQuestionType(q.type);
        if (!isValidQuestionType(normalizedType)) {
          console.log(`  ⚠ Warning: Unknown question type "${q.type}" in ${fileName} (normalized to "${normalizedType}")`);
        }
        return { ...q, type: normalizedType };
      }),
    };

    // Skip if filtering by lessonId and this isn't the one
    if (options?.lessonId && questionData.lessonId !== options.lessonId) {
      continue;
    }

    // Resolve the lesson by slug (seed JSON lessonId == schema slug).
    const [lesson] = await db
      .select({ id: scienceLessons.id, slug: scienceLessons.slug })
      .from(scienceLessons)
      .where(eq(scienceLessons.slug, questionData.lessonId))
      .limit(1);

    if (!lesson) {
      console.log(`  ⚠ Warning: Lesson ${questionData.lessonId} not found - skipping ${fileName}`);
      continue;
    }

    let questionsCreated = 0;
    let questionsSkipped = 0;

    for (let i = 0; i < questionData.questions.length; i++) {
      const q = questionData.questions[i];
      const order = i + 1;

      try {
        // Idempotency: skip if (lessonId, order, text) already exists.
        const [existing] = await db
          .select({ id: scienceQuizQuestions.id })
          .from(scienceQuizQuestions)
          .where(
            and(
              eq(scienceQuizQuestions.lessonId, lesson.id),
              eq(scienceQuizQuestions.order, order),
              eq(scienceQuizQuestions.text, q.text),
            ),
          )
          .limit(1);

        if (existing) {
          questionsSkipped++;
          continue;
        }

        const standardRecords = await db
          .select({ id: scienceStandards.id, code: scienceStandards.code })
          .from(scienceStandards)
          .where(inArray(scienceStandards.code, q.standards));

        if (standardRecords.length === 0) {
          console.log(`  ⚠ Warning: No standards found for question in ${fileName} (order ${order})`);
          console.log(`    Standards requested: ${q.standards.join(', ')}`);
        }

        const questionSlug = q.slug || `${lesson.slug}-q${order}`;

        await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(scienceQuizQuestions)
            .values({
              slug: questionSlug,
              lessonId: lesson.id,
              type: q.type,
              text: q.text,
              options: q.options ?? null,
              correctAnswer: q.correctAnswer,
              points: q.points,
              order,
              version: 1,
            })
            .returning({ id: scienceQuizQuestions.id });

          if (!created) {
            throw new Error(`Failed to insert question ${questionSlug}`);
          }

          if (standardRecords.length > 0) {
            await tx.insert(scienceQuestionStandards).values(
              standardRecords.map((s) => ({
                questionId: created.id,
                standardId: s.id,
              })),
            );
          }
        });

        questionsCreated++;
      } catch (error) {
        console.log(`  ⚠ Error creating question ${order} in ${fileName}:`, error);
      }
    }

    console.log(`  ✓ Lesson: ${questionData.lessonId}`);
    console.log(`    - Created: ${questionsCreated} questions`);
    if (questionsSkipped > 0) {
      console.log(`    - Skipped: ${questionsSkipped} (already exist)`);
    }

    totalQuestionsSeeded += questionsCreated;
    filesProcessed++;
  }

  console.log(`\n  ✅ Total: ${totalQuestionsSeeded} questions seeded from ${filesProcessed} files\n`);
}

const isDirectExecution = process.argv[1]?.includes('seed-questions');
if (isDirectExecution) {
  seedQuestions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ seedQuestions failed:', err);
      process.exit(1);
    });
}
