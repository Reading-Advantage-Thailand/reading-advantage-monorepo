import { PrismaClient, StandardsAlignment } from '@prisma/client';
import { seedStandards } from './seed-functions/seed-standards';
import { seedLessons } from './seed-functions/seed-lessons';
import { seedQuestions } from './seed-functions/seed-questions';
import { seedDemoData } from './seed-functions/seed-demo-data';
import { seedActivityData } from './seed-functions/seed-activity-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed process...\n');

  // Parse command-line arguments for selective seeding
  const args = process.argv.slice(2);
  const options = {
    framework: args.find(arg => arg.startsWith('--framework='))?.split('=')[1] as StandardsAlignment | undefined,
    gradeLevel: args.find(arg => arg.startsWith('--grade='))?.split('=')[1]
      ? parseInt(args.find(arg => arg.startsWith('--grade='))!.split('=')[1])
      : undefined,
    skipDemo: args.includes('--skip-demo'),
    skipActivity: args.includes('--skip-activity'),
  };

  if (options.framework || options.gradeLevel) {
    console.log('🎯 Selective seeding mode:');
    if (options.framework) console.log(`  Framework: ${options.framework}`);
    if (options.gradeLevel) console.log(`  Grade Level: ${options.gradeLevel}`);
    console.log();
  }

  try {
    // 1. Seed standards from JSON files
    await seedStandards(prisma, {
      framework: options.framework,
      gradeLevel: options.gradeLevel,
    });

    // 2. Seed lessons from JSON files
    await seedLessons(prisma, {
      framework: options.framework,
      gradeLevel: options.gradeLevel,
    });

    // 3. Seed questions
    await seedQuestions(prisma, {
      gradeLevel: options.gradeLevel,
    });

    // 4. Seed demo users and classes (unless skipped)
    if (!options.skipDemo) {
      await seedDemoData(prisma);
    } else {
      console.log('ℹ Skipping demo data (--skip-demo flag provided)\n');
    }

    // 5. Seed activity data for demo class (unless skipped)
    if (!options.skipDemo && !options.skipActivity) {
      await seedActivityData(prisma);
    } else if (options.skipActivity) {
      console.log('ℹ Skipping activity data (--skip-activity flag provided)\n');
    }

    console.log('\n✅ Seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
