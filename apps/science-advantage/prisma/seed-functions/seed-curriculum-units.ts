import { PrismaClient, StandardsAlignment } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { validateCurriculumUnitsFile } from './validate-json';

interface CurriculumUnitData {
  id: string;
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
  prisma: PrismaClient,
  options?: {
    framework?: StandardsAlignment;
    gradeLevel?: number;
    classId?: string;
  }
): Promise<void> {
  console.log('📚 Seeding curriculum units...');

  const dataDir = path.join(__dirname, '..', 'seed-data', 'curriculum-units');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  let unitsCount = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data: CurriculumUnitsFile = JSON.parse(fileContent);

    // Validate JSON structure
    validateCurriculumUnitsFile(data);

    // Apply filters if provided
    if (options?.framework && data.framework !== options.framework) {
      continue;
    }
    if (options?.gradeLevel && data.gradeLevel !== options.gradeLevel) {
      continue;
    }

    console.log(`  Processing ${data.framework} Grade ${data.gradeLevel} curriculum units...`);

    for (const unitData of data.units) {
      // If classId is provided, create unit for that class
      // Otherwise create standalone framework unit
      const unitId = options?.classId
        ? `${options.classId}_${unitData.id}`
        : unitData.id;

      const unitPayload: any = {
        title: unitData.title,
        description: unitData.description,
        framework: data.framework,
        gradeLevel: data.gradeLevel,
        order: unitData.order,
        lessons: {
          connect: unitData.lessonIds.map(id => ({ id })),
        },
      };

      if (options?.classId) {
        unitPayload.classId = options.classId;
      }

      await prisma.curriculumUnit.upsert({
        where: { id: unitId },
        update: unitPayload,
        create: {
          id: unitId,
          ...unitPayload,
        },
      });
      unitsCount++;
    }

    console.log(`  ✓ Seeded ${data.units.length} curriculum units from ${file}`);
  }

  console.log(`✓ Total curriculum units seeded: ${unitsCount}\n`);
}
