import {
  db,
  users,
  userActivity,
  xpLogs,
  lessonRecords,
  userWordRecords,
  userSentenceRecords,
  eq,
  like,
  count,
  sql,
} from "@reading-advantage/db";

async function checkDemoData() {
  console.log("\n🔍 Checking Demo Data...\n");

  try {
    // Get demo students
    const demoStudents = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        xp: users.xp,
        level: users.level,
      })
      .from(users)
      .where(like(users.email, "demo-student%"));

    console.log(`📊 Found ${demoStudents.length} demo students\n`);

    for (const student of demoStudents) {
      console.log(`\n👤 ${student.name} (${student.email})`);
      console.log(`   XP: ${student.xp}, Level: ${student.level}`);

      // Check UserActivity
      const [activitiesCount] = await db
        .select({ count: count() })
        .from(userActivity)
        .where(eq(userActivity.userId, student.id));
      console.log(`   ✓ UserActivity: ${activitiesCount?.count ?? 0} records`);

      // Check XPLog
      const [xpCount] = await db
        .select({ count: count() })
        .from(xpLogs)
        .where(eq(xpLogs.userId, student.id));
      console.log(`   ✓ XPLog: ${xpCount?.count ?? 0} records`);

      // Check LessonRecord
      const [lessonCount] = await db
        .select({ count: count() })
        .from(lessonRecords)
        .where(eq(lessonRecords.userId, student.id));
      console.log(`   ✓ LessonRecord: ${lessonCount?.count ?? 0} records`);

      // Check UserWordRecord
      const [wordCount] = await db
        .select({ count: count() })
        .from(userWordRecords)
        .where(eq(userWordRecords.userId, student.id));
      console.log(`   ✓ UserWordRecord: ${wordCount?.count ?? 0} records`);

      // Check UserSentenceRecord
      const [sentenceCount] = await db
        .select({ count: count() })
        .from(userSentenceRecords)
        .where(eq(userSentenceRecords.userId, student.id));
      console.log(`   ✓ UserSentenceRecord: ${sentenceCount?.count ?? 0} records`);

      // Check activity types
      const activityTypes = await db
        .select({
          activityType: userActivity.activityType,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(userActivity)
        .where(eq(userActivity.userId, student.id))
        .groupBy(userActivity.activityType);

      if (activityTypes.length > 0) {
        console.log(`   📋 Activity breakdown:`);
        activityTypes.forEach((type) => {
          console.log(`      - ${type.activityType}: ${type.count}`);
        });
      }
    }

    console.log("\n✅ Demo data check completed!\n");
  } catch (error) {
    console.error("❌ Error checking demo data:", error);
  }
}

checkDemoData();
