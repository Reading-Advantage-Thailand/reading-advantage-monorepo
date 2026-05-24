#!/usr/bin/env tsx

/**
 * Backfill Thai titles from the "English / ไทย" convention.
 * For each lesson with a title containing " / ", splits on first occurrence
 * and stores english in `title`, thai in `titleThai`.
 * Lessons without the delimiter keep their title and get titleThai = null.
 */

import { db, eq } from '@reading-advantage/db';
import { scienceLessons } from '@reading-advantage/db/schema';

import { parseBilingualTitle } from '@/lib/bilingual';

async function backfillThaiTitles(): Promise<void> {
  console.log('🔄 Backfilling Thai titles from bilingual convention...\n');

  const lessons = await db
    .select({
      id: scienceLessons.id,
      slug: scienceLessons.slug,
      title: scienceLessons.title,
      titleThai: scienceLessons.titleThai,
    })
    .from(scienceLessons);

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

    await db
      .update(scienceLessons)
      .set({
        title: english,
        titleThai: thai,
      })
      .where(eq(scienceLessons.id, lesson.id));

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
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  });
