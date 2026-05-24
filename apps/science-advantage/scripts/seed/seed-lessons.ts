#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

import { db, and, eq, inArray } from '@reading-advantage/db';
import {
  scienceLessons,
  scienceStandards,
  scienceLessonStandards,
} from '@reading-advantage/db/schema';

import type { StandardsAlignment, LessonType } from '@/lib/enums';
import { validateLessonsFile } from './validate-json';
import {
  validateLessonsSeedFile,
  formatValidationErrors,
} from '@/lib/schemas/seed-validation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LessonData {
  id: string;
  slug?: string;
  title: string;
  titleThai?: string;
  description: string;
  descriptionThai?: string;
  content: string;
  lessonType?: LessonType;
  order: number;
  standards: string[];
  structuredContent?: object;
}

interface LessonsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  unit: number;
  lessons: LessonData[];
}

function collectLessonFiles(gradeLevel?: number): string[] {
  const seedDataDir = path.join(__dirname, '..', '..', 'prisma', 'seed-data', 'lessons');
  const files: string[] = [];

  if (fs.existsSync(seedDataDir)) {
    files.push(
      ...fs.readdirSync(seedDataDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(seedDataDir, f))
    );
  }

  if (gradeLevel === 4) {
    const contentDir = path.join(__dirname, '..', '..', 'data', 'content', 'grade-4', 'lessons');
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

export async function seedLessons(
  options?: {
    framework?: StandardsAlignment;
    gradeLevel?: number;
  }
): Promise<void> {
  console.log('📖 Seeding lessons...');

  const files = collectLessonFiles(options?.gradeLevel);

  let lessonsCount = 0;

  for (const filePath of files) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data: LessonsFile = JSON.parse(fileContent);

    // Validate JSON structure (basic checks)
    validateLessonsFile(data);

    // Validate with Zod schemas (structured content validation)
    const validationErrors = validateLessonsSeedFile(data, filePath);
    if (validationErrors.length > 0) {
      console.error(formatValidationErrors(validationErrors));
      process.exit(1);
    }

    // Apply filters if provided
    if (options?.framework && data.framework !== options.framework) {
      continue;
    }
    if (options?.gradeLevel && data.gradeLevel !== options.gradeLevel) {
      continue;
    }

    console.log(`  Processing ${data.framework} Grade ${data.gradeLevel} Unit ${data.unit} lessons...`);

    for (const lessonData of data.lessons) {
      // Seed JSON `id` historically doubled as slug; prefer explicit `slug`
      // field if present, else fall back to id with whitespace normalisation
      // (matches the original prisma upsert's slug fallback).
      const slug = lessonData.slug || lessonData.id.toLowerCase().replace(/\s+/g, '-');
      const lessonType = lessonData.lessonType ?? 'LESSON';

      await db.transaction(async (tx) => {
        const [lesson] = await tx
          .insert(scienceLessons)
          .values({
            slug,
            title: lessonData.title,
            titleThai: lessonData.titleThai ?? null,
            description: lessonData.description,
            descriptionThai: lessonData.descriptionThai ?? null,
            content: lessonData.content,
            lessonType,
            gradeLevel: data.gradeLevel,
            order: lessonData.order,
            structuredContent: lessonData.structuredContent ?? null,
          })
          .onConflictDoUpdate({
            target: scienceLessons.slug,
            set: {
              title: lessonData.title,
              titleThai: lessonData.titleThai ?? null,
              description: lessonData.description,
              descriptionThai: lessonData.descriptionThai ?? null,
              content: lessonData.content,
              lessonType,
              order: lessonData.order,
              structuredContent: lessonData.structuredContent ?? null,
              updatedAt: new Date(),
            },
          })
          .returning({ id: scienceLessons.id });

        if (!lesson) {
          throw new Error(`Failed to upsert lesson ${slug}`);
        }

        // Re-link standards via the science_lesson_standards junction table.
        await tx
          .delete(scienceLessonStandards)
          .where(eq(scienceLessonStandards.lessonId, lesson.id));

        if (lessonData.standards.length > 0) {
          // Original Prisma used composite (framework, code) connect; we
          // emulate by filtering science_standards on both framework and
          // codes from the lesson JSON.
          const standardRows = await tx
            .select({ id: scienceStandards.id, code: scienceStandards.code })
            .from(scienceStandards)
            .where(
              and(
                eq(scienceStandards.framework, data.framework),
                inArray(scienceStandards.code, lessonData.standards),
              ),
            );

          if (standardRows.length > 0) {
            await tx.insert(scienceLessonStandards).values(
              standardRows.map((s) => ({ lessonId: lesson.id, standardId: s.id })),
            );
          }

          const missing = lessonData.standards.filter(
            (code) => !standardRows.some((r) => r.code === code),
          );
          if (missing.length > 0) {
            console.log(`  ⚠ Warning: standards not found for lesson ${slug}: ${missing.join(', ')}`);
          }
        }
      });

      lessonsCount++;
    }

    console.log(`  ✓ Seeded ${data.lessons.length} lessons from ${path.basename(filePath)}`);
  }

  console.log(`✓ Total lessons seeded: ${lessonsCount}\n`);
}

const isDirectExecution = process.argv[1]?.includes('seed-lessons');
if (isDirectExecution) {
  seedLessons()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ seedLessons failed:', err);
      process.exit(1);
    });
}
