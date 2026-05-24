#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

import { db } from '@reading-advantage/db';
import { scienceStandards } from '@reading-advantage/db/schema';

import type { StandardsAlignment } from '@/lib/enums';
import { validateStandardsFile } from './validate-json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  options?: {
    framework?: StandardsAlignment;
    gradeLevel?: number;
  }
): Promise<void> {
  console.log('📚 Seeding standards...');

  const dataDir = path.join(__dirname, '..', '..', 'prisma', 'seed-data', 'standards');
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
      await db
        .insert(scienceStandards)
        .values({
          framework: data.framework,
          code: standardData.code,
          description: standardData.description,
          gradeLevel: data.gradeLevel,
        })
        .onConflictDoUpdate({
          target: [scienceStandards.framework, scienceStandards.code],
          set: {
            description: standardData.description,
          },
        });
      standardsCount++;
    }

    console.log(`  ✓ Seeded ${data.standards.length} standards from ${file}`);
  }

  console.log(`✓ Total standards seeded: ${standardsCount}\n`);
}

const isDirectExecution = process.argv[1]?.includes('seed-standards');
if (isDirectExecution) {
  seedStandards()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ seedStandards failed:', err);
      process.exit(1);
    });
}
