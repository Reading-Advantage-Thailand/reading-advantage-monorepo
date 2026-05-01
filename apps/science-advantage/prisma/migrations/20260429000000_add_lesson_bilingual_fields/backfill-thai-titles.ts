import { PrismaClient } from '@prisma/client';
import { parseBilingualTitle } from '../../lib/bilingual';

const prisma = new PrismaClient();

/**
 * Backfill Thai titles from the "English / ไทย" convention.
 * For each lesson with a title containing " / ", splits on first occurrence
 * and stores english in `title`, thai in `titleThai`.
 * Lessons without the delimiter keep their title and get titleThai = null.
 */
async function backfillThaiTitles(): Promise<void> {
  console.log('🔄 Backfilling Thai titles from bilingual convention...\n');

  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      titleThai: true,
    },
  });

  let updated = 0;
  let skipped = 0;
  let alreadySplit = 0;

  for (const lesson of lessons) {
    if (lesson.titleThai !== null) {
      alreadySplit++;
      continue;
    }

    const { english, thai } = parseBilingualTitle(lesson.title);

    if (thai === null) {
      skipped++;
      continue;
    }

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        title: english,
        titleThai: thai,
      },
    });

    updated++;
    console.log(`  ✓ ${lesson.slug}: "${english}" / "${thai}"`);
  }

  console.log(`\n📊 Backfill complete:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Already split: ${alreadySplit}`);
  console.log(`   No Thai portion (skipped): ${skipped}`);
  console.log(`   Total lessons: ${lessons.length}`);
}

backfillThaiTitles()
  .then(() => {
    console.log('\n✅ Done.');
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    return prisma.$disconnect().then(() => process.exit(1));
  });
