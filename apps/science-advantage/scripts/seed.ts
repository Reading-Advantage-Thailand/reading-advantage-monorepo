import type { StandardsAlignment } from '@/lib/enums';

import { seedActivityData } from './seed/seed-activity-data';
import { seedDemoData } from './seed/seed-demo-data';
import { seedLessons } from './seed/seed-lessons';
import { seedQuestions } from './seed/seed-questions';
import { seedStandards } from './seed/seed-standards';

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
    await seedStandards({
      framework: options.framework,
      gradeLevel: options.gradeLevel,
    });

    // 2. Seed lessons from JSON files
    await seedLessons({
      framework: options.framework,
      gradeLevel: options.gradeLevel,
    });

    // 3. Seed questions
    await seedQuestions({
      gradeLevel: options.gradeLevel,
    });

    // 4. Seed demo users and classes (unless skipped)
    if (!options.skipDemo) {
      await seedDemoData();
    } else {
      console.log('ℹ Skipping demo data (--skip-demo flag provided)\n');
    }

    // 5. Seed activity data for demo class (unless skipped)
    if (!options.skipDemo && !options.skipActivity) {
      await seedActivityData();
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
  });
