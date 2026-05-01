import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDemoData() {
  console.log("\n🔍 Checking Demo Data...\n");

  try {
    // Get demo students
    const demoStudents = await prisma.user.findMany({
      where: {
        email: {
          startsWith: "demo-student",
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        xp: true,
        level: true,
      },
    });

    console.log(`📊 Found ${demoStudents.length} demo students\n`);

    for (const student of demoStudents) {
      console.log(`\n👤 ${student.name} (${student.email})`);
      console.log(`   XP: ${student.xp}, Level: ${student.level}`);

      // Check UserActivity
      const activities = await prisma.userActivity.findMany({
        where: { userId: student.id },
      });
      console.log(`   ✓ UserActivity: ${activities.length} records`);

      // Check XPLog
      const xpLogs = await prisma.xPLog.findMany({
        where: { userId: student.id },
      });
      console.log(`   ✓ XPLog: ${xpLogs.length} records`);

      // Check LessonRecord
      const lessonRecords = await prisma.lessonRecord.findMany({
        where: { userId: student.id },
      });
      console.log(`   ✓ LessonRecord: ${lessonRecords.length} records`);

      // Check UserWordRecord
      const wordRecords = await prisma.userWordRecord.findMany({
        where: { userId: student.id },
      });
      console.log(`   ✓ UserWordRecord: ${wordRecords.length} records`);

      // Check UserSentenceRecord
      const sentenceRecords = await prisma.userSentenceRecord.findMany({
        where: { userId: student.id },
      });
      console.log(`   ✓ UserSentenceRecord: ${sentenceRecords.length} records`);

      // Check activity types
      const activityTypes = await prisma.userActivity.groupBy({
        by: ["activityType"],
        where: { userId: student.id },
        _count: true,
      });

      if (activityTypes.length > 0) {
        console.log(`   📋 Activity breakdown:`);
        activityTypes.forEach((type) => {
          console.log(`      - ${type.activityType}: ${type._count}`);
        });
      }
    }

    console.log("\n✅ Demo data check completed!\n");
  } catch (error) {
    console.error("❌ Error checking demo data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDemoData();
