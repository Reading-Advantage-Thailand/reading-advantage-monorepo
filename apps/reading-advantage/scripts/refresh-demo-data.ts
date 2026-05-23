import {
  db,
  users,
  classrooms,
  classroomStudents,
  eq,
  and,
  asc,
} from "@reading-advantage/db";
import {
  getDemoIds,
  runAllIsolationChecks,
} from "../server/services/demo-isolation-service";
import { generateDailyActivities } from "../server/services/demo-activity-generator";

/**
 * Refresh demo data - Daily job
 *
 * This script:
 * 1. Verifies demo license and school exist
 * 2. Runs isolation checks
 * 3. Rebuilds demo classrooms
 * 4. Re-assigns students to classes
 * 5. Generates new daily activities
 */
async function refreshDemoData() {
  console.log("\n🔄 Starting demo data refresh job...\n");
  console.log(`⏰ Timestamp: ${new Date().toISOString()}\n`);

  try {
    // ========================================
    // PHASE 1: VERIFICATION
    // ========================================
    console.log("📋 PHASE 1: Verification\n");

    // Get demo IDs
    const demoIds = await getDemoIds();
    if (!demoIds) {
      throw new Error(
        "❌ Demo license or school not found. Please run demo seed first."
      );
    }

    const { licenseId: demoLicenseId, schoolId: demoSchoolId } = demoIds;
    console.log(`✓ Demo License ID: ${demoLicenseId}`);
    console.log(`✓ Demo School ID: ${demoSchoolId}\n`);

    // Run isolation checks
    const isolationResult = await runAllIsolationChecks(
      demoLicenseId,
      demoSchoolId
    );
    if (!isolationResult.passed) {
      console.error("\n❌ ISOLATION CHECK FAILED!");
      console.error("Errors:");
      isolationResult.errors.forEach((err) => console.error(`  - ${err}`));
      throw new Error(
        "Isolation check failed. Aborting refresh to prevent data corruption."
      );
    }

    console.log("✅ Verification phase completed\n");

    // ========================================
    // PHASE 2: CLASSROOM RESET
    // ========================================
    console.log("📋 PHASE 2: Classroom Reset\n");

    // Get demo teacher
    const [teacher] = await db
      .select()
      .from(users)
      .where(and(eq(users.licenseId, demoLicenseId), eq(users.role, "TEACHER")))
      .limit(1);

    if (!teacher) {
      throw new Error("❌ Demo teacher not found");
    }

    // Get demo students
    const students = await db
      .select()
      .from(users)
      .where(and(eq(users.licenseId, demoLicenseId), eq(users.role, "STUDENT")))
      .orderBy(asc(users.email));

    console.log(`✓ Found ${students.length} demo students`);

    // Delete existing demo classrooms (cascade will delete classroom_students)
    const deletedClassrooms = await db
      .delete(classrooms)
      .where(eq(classrooms.schoolId, demoSchoolId))
      .returning({ id: classrooms.id });

    console.log(`✓ Deleted ${deletedClassrooms.length} existing classrooms`);

    // Recreate classrooms
    const classroomConfigs = [
      { name: "Beginner Class", grade: 7, studentIndices: [0, 1, 2] }, // A1, A2, B1
      { name: "Advanced Class", grade: 9, studentIndices: [3, 4, 5] }, // B2, C1, C2
    ];

    for (const config of classroomConfigs) {
      const [classroom] = await db
        .insert(classrooms)
        .values({
          name: config.name,
          teacherId: teacher.id,
          schoolId: demoSchoolId,
          createdBy: teacher.id,
          grade: config.grade,
          classCode: `DEMO-${config.name.replace(/\s+/g, "-").toUpperCase()}-${Date.now()}`,
        })
        .returning();

      // Add students to classroom
      for (const studentIndex of config.studentIndices) {
        if (studentIndex < students.length) {
          await db.insert(classroomStudents).values({
            classroomId: classroom.id,
            studentId: students[studentIndex].id,
          });
        }
      }

      console.log(
        `✓ Created classroom: ${classroom.name} with ${config.studentIndices.length} students`
      );
    }

    console.log("✅ Classroom reset phase completed\n");

    // ========================================
    // PHASE 3: ACTIVITY GENERATION
    // ========================================
    console.log("📋 PHASE 3: Activity Generation\n");

    const today = new Date();
    const result = await generateDailyActivities(
      demoLicenseId,
      demoSchoolId,
      today
    );

    console.log(`✓ Generated ${result.totalActivities} activities`);
    console.log(`✓ Total XP earned: ${result.totalXP}`);

    console.log("✅ Activity generation phase completed\n");

    // ========================================
    // PHASE 4: MATERIALIZED VIEWS REFRESH
    // ========================================
    console.log("📋 PHASE 4: Materialized Views Refresh\n");

    try {
      const { refreshAllMaterializedViews } =
        await import("../server/services/refresh-matviews-service");

      const matviewResult = await refreshAllMaterializedViews();

      console.log(`✓ ${matviewResult.success} views refreshed successfully`);
      if (matviewResult.failed > 0) {
        console.log(`⚠ ${matviewResult.failed} views failed`);
      }
      if (matviewResult.skipped > 0) {
        console.log(`⊘ ${matviewResult.skipped} views skipped`);
      }

      console.log(
        `✅ Materialized views refresh completed in ${matviewResult.duration}ms\n`
      );
    } catch (error) {
      console.error("⚠️  Failed to refresh materialized views:", error);
      // Don't throw error, just log warning
    }

    // ========================================
    // PHASE 5: FINAL VERIFICATION
    // ========================================
    console.log("📋 PHASE 5: Final Verification\n");

    const finalCheck = await runAllIsolationChecks(demoLicenseId, demoSchoolId);
    if (!finalCheck.passed) {
      console.error("\n⚠️  WARNING: Final isolation check failed!");
      console.error("Errors:");
      finalCheck.errors.forEach((err) => console.error(`  - ${err}`));
      // Don't throw error here, just log warning
    } else {
      console.log("✅ Final verification passed\n");
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log("═".repeat(60));
    console.log("✅ DEMO DATA REFRESH COMPLETED SUCCESSFULLY");
    console.log("═".repeat(60));
    console.log(`📅 Date: ${today.toISOString().split("T")[0]}`);
    console.log(`🏫 School: Reading Advantage Academy (${demoSchoolId})`);
    console.log(`📜 License: ${demoLicenseId}`);
    console.log(`👥 Students: ${students.length}`);
    console.log(`🎓 Classrooms: ${classroomConfigs.length}`);
    console.log(`📊 Activities: ${result.totalActivities}`);
    console.log(`⭐ Total XP: ${result.totalXP}`);
    console.log("═".repeat(60));
    console.log("\n");
  } catch (error) {
    console.error("\n❌ ERROR during demo data refresh:");
    console.error(error);
    console.error(
      "\n🚨 Refresh job FAILED. Please investigate and fix issues.\n"
    );
    throw error;
  }
}

// Run the refresh job
refreshDemoData().catch((e) => {
  console.error(e);
  process.exit(1);
});
