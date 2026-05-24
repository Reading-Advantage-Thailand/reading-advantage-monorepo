#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

import { db, eq, inArray } from '@reading-advantage/db';
import {
  scienceCurriculumUnits,
  scienceLessons,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';

import type { StandardsAlignment } from '@/lib/enums';
import { validateCurriculumUnitsFile } from './validate-json';

interface CurriculumUnitData {
  id: string;
  slug?: string;
  title: string;
  description: string;
  order: number;
  lessonIds: string[];
}

interface CurriculumUnitsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  units: CurriculumUnitData[];
}

export async function seedCurriculumUnits(
  options: {
    framework?: StandardsAlignment;
    gradeLevel?: number;
    classId: string;
  }
): Promise<void> {
  console.log('📚 Seeding curriculum units...');

  if (!options.classId) {
    throw new Error('seedCurriculumUnits requires a classId (science_curriculum_units.class_id is NOT NULL)');
  }

  const dataDir = path.join(__dirname, '..', '..', 'prisma', 'seed-data', 'curriculum-units');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  let unitsCount = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data: CurriculumUnitsFile = JSON.parse(fileContent);

    // Validate JSON structure
    validateCurriculumUnitsFile(data);

    // Apply filters if provided
    if (options.framework && data.framework !== options.framework) {
      continue;
    }
    if (options.gradeLevel && data.gradeLevel !== options.gradeLevel) {
      continue;
    }

    console.log(`  Processing ${data.framework} Grade ${data.gradeLevel} curriculum units...`);

    for (const unitData of data.units) {
      // Original Prisma used the JSON `id` as the primary key. Drizzle schema
      // uses UUID PK + unique `slug`. Use the JSON slug field if present,
      // else fall back to the JSON id (which historically doubled as a slug).
      // Prepend the classId to match the original "scope unit to class" intent.
      const baseSlug = unitData.slug ?? unitData.id;
      const unitSlug = `${options.classId}__${baseSlug}`;

      await db.transaction(async (tx) => {
        const [unit] = await tx
          .insert(scienceCurriculumUnits)
          .values({
            slug: unitSlug,
            title: unitData.title,
            description: unitData.description,
            framework: data.framework,
            gradeLevel: data.gradeLevel,
            order: unitData.order,
            classId: options.classId,
          })
          .onConflictDoUpdate({
            target: scienceCurriculumUnits.slug,
            set: {
              title: unitData.title,
              description: unitData.description,
              framework: data.framework,
              gradeLevel: data.gradeLevel,
              order: unitData.order,
              classId: options.classId,
              updatedAt: new Date(),
            },
          })
          .returning({ id: scienceCurriculumUnits.id });

        if (!unit) {
          throw new Error(`Failed to upsert curriculum unit ${unitSlug}`);
        }

        // Resolve lesson slugs → UUIDs and re-link in the junction table.
        // Seed JSON references lessons by string identifier (used as slug in
        // Drizzle schema). Clear existing links then insert.
        await tx
          .delete(scienceUnitLessons)
          .where(eq(scienceUnitLessons.unitId, unit.id));

        if (unitData.lessonIds.length > 0) {
          const lessonRows = await tx
            .select({ id: scienceLessons.id, slug: scienceLessons.slug })
            .from(scienceLessons)
            .where(inArray(scienceLessons.slug, unitData.lessonIds));

          const missing = unitData.lessonIds.filter(
            (slug) => !lessonRows.some((l) => l.slug === slug)
          );
          if (missing.length > 0) {
            console.log(`  ⚠ Warning: lessons not found for unit ${unitSlug}: ${missing.join(', ')}`);
          }

          if (lessonRows.length > 0) {
            await tx.insert(scienceUnitLessons).values(
              lessonRows.map((l) => ({ unitId: unit.id, lessonId: l.id }))
            );
          }
        }
      });

      unitsCount++;
    }

    console.log(`  ✓ Seeded ${data.units.length} curriculum units from ${file}`);
  }

  console.log(`✓ Total curriculum units seeded: ${unitsCount}\n`);
}

const isDirectExecution = process.argv[1]?.includes('seed-curriculum-units');
if (isDirectExecution) {
  const classId = process.env.SEED_CLASS_ID;
  if (!classId) {
    console.error('SEED_CLASS_ID env var is required for standalone execution');
    process.exit(1);
  }
  seedCurriculumUnits({ classId })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ seedCurriculumUnits failed:', err);
      process.exit(1);
    });
}
