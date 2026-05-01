import { PrismaClient, Prisma, QuestionType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeQuestionType, isValidQuestionType } from '../../lib/grade4-normalization';
import { validateQuizQuestionsSeedFile, formatValidationErrors } from '../../lib/schemas/seed-validation';

interface QuestionData {
  slug?: string;
  type: string;
  text: string;
  options?: Prisma.InputJsonValue;
  correctAnswer: Prisma.InputJsonValue;
  points: number;
  standards: string[];
}

interface QuestionsFile {
  lessonId: string;
  questions: QuestionData[];
}

function collectQuestionFiles(gradeLevel?: number): string[] {
  const seedDataDir = path.join(__dirname, '..', 'seed-data', 'questions');
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
  prisma: PrismaClient,
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
          console.log(`  ⚠ Warning: Unknown question type "${q.type}" in ${path.basename(filePath)} (normalized to "${normalizedType}")`);
        }
        return { ...q, type: normalizedType };
      }),
    };

    // Skip if filtering by lessonId and this isn't the one
    if (options?.lessonId && questionData.lessonId !== options.lessonId) {
      continue;
    }

    // Find the lesson
    const lesson = await prisma.lesson.findFirst({
      where: { id: questionData.lessonId }
    });

    if (!lesson) {
      console.log(`  ⚠ Warning: Lesson ${questionData.lessonId} not found - skipping ${file}`);
      continue;
    }

    let questionsCreated = 0;
    let questionsSkipped = 0;

    for (let i = 0; i < questionData.questions.length; i++) {
      const q = questionData.questions[i];

      // Create a unique identifier for this question based on lesson, order, and text
      // This helps with idempotency
      const questionIdentifier = `${lesson.id}-${i}-${q.text.substring(0, 50)}`;

      try {
        // Check if question already exists (for idempotency)
        const existingQuestion = await prisma.quizQuestion.findFirst({
          where: {
            lessonId: lesson.id,
            order: i + 1,
            text: q.text
          }
        });

        if (existingQuestion) {
          questionsSkipped++;
          continue;
        }

        // Find the standards for this question
        const standardRecords = await prisma.standard.findMany({
          where: {
            code: {
              in: q.standards
            }
          }
        });

        if (standardRecords.length === 0) {
          console.log(`  ⚠ Warning: No standards found for question in ${file} (order ${i + 1})`);
          console.log(`    Standards requested: ${q.standards.join(', ')}`);
        }

        // Create the question
        const questionSlug = q.slug || `${lesson.slug}-q${i + 1}`;
        await prisma.quizQuestion.create({
          data: {
            slug: questionSlug,
            lessonId: lesson.id,
            type: q.type as QuestionType,
            text: q.text,
            options: q.options ?? undefined,
            correctAnswer: q.correctAnswer,
            points: q.points,
            order: i + 1,
            version: 1,
            standards: {
              connect: standardRecords.map(s => ({ id: s.id }))
            }
          }
        });

        questionsCreated++;
      } catch (error) {
        console.log(`  ⚠ Error creating question ${i + 1} in ${file}:`, error);
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
