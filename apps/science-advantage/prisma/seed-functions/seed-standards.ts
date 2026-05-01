import { PrismaClient, StandardsAlignment } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { validateStandardsFile } from './validate-json';

interface StandardData {
  code: string;
  description: string;
}

interface StandardsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  standards: StandardData[];
}

export async function seedStandards(
  prisma: PrismaClient,
  options?: {
    framework?: StandardsAlignment;
    gradeLevel?: number;
  }
): Promise<void> {
  console.log('📚 Seeding standards...');

  const dataDir = path.join(__dirname, '..', 'seed-data', 'standards');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  let standardsCount = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data: StandardsFile = JSON.parse(fileContent);

    // Validate JSON structure
    validateStandardsFile(data);

    // Apply filters if provided
    if (options?.framework && data.framework !== options.framework) {
      continue;
    }
    if (options?.gradeLevel && data.gradeLevel !== options.gradeLevel) {
      continue;
    }

    console.log(`  Processing ${data.framework} Grade ${data.gradeLevel} standards...`);

    for (const standardData of data.standards) {
      await prisma.standard.upsert({
        where: {
          framework_code: {
            framework: data.framework,
            code: standardData.code,
          },
        },
        update: {
          description: standardData.description,
        },
        create: {
          framework: data.framework,
          code: standardData.code,
          description: standardData.description,
          gradeLevel: data.gradeLevel,
        },
      });
      standardsCount++;
    }

    console.log(`  ✓ Seeded ${data.standards.length} standards from ${file}`);
  }

  console.log(`✓ Total standards seeded: ${standardsCount}\n`);
}
