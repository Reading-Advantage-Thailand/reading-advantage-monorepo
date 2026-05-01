import { PrismaClient, StandardsAlignment, LessonType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { validateLessonsFile } from './validate-json';
import { validateLessonsSeedFile, formatValidationErrors } from '../../lib/schemas/seed-validation';

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
  const seedDataDir = path.join(__dirname, '..', 'seed-data', 'lessons');
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
  prisma: PrismaClient,
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
      const slug = lessonData.slug || lessonData.id.toLowerCase().replace(/\s+/g, '-');
      await prisma.lesson.upsert({
        where: { id: lessonData.id },
        update: {
          title: lessonData.title,
          titleThai: lessonData.titleThai ?? null,
          description: lessonData.description,
          descriptionThai: lessonData.descriptionThai ?? null,
          content: lessonData.content,
          lessonType: lessonData.lessonType,
          order: lessonData.order,
          structuredContent: lessonData.structuredContent ?? undefined,
          standards: {
            connect: lessonData.standards.map(code => ({
              framework_code: {
                framework: data.framework,
                code,
              },
            })),
          },
        },
        create: {
          id: lessonData.id,
          slug,
          title: lessonData.title,
          titleThai: lessonData.titleThai ?? null,
          description: lessonData.description,
          descriptionThai: lessonData.descriptionThai ?? null,
          content: lessonData.content,
          lessonType: lessonData.lessonType,
          gradeLevel: data.gradeLevel,
          order: lessonData.order,
          structuredContent: lessonData.structuredContent ?? undefined,
          standards: {
            connect: lessonData.standards.map(code => ({
              framework_code: {
                framework: data.framework,
                code,
              },
            })),
          },
        },
      });
      lessonsCount++;
    }

    console.log(`  ✓ Seeded ${data.lessons.length} lessons from ${path.basename(filePath)}`);
  }

  console.log(`✓ Total lessons seeded: ${lessonsCount}\n`);
}
