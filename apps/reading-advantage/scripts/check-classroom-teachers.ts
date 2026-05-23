import { db, users, classroomTeachers, classrooms, eq } from "@reading-advantage/db";

async function checkClassroomTeachers() {
  console.log("\n🔍 Checking ClassroomTeacher records...\n");

  try {
    const [teacher] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, "demo-teacher@reading-advantage.com"))
      .limit(1);

    if (!teacher) {
      console.log("❌ Demo teacher not found");
      return;
    }

    console.log(`👨‍🏫 Teacher: ${teacher.name} (${teacher.id})\n`);

    // Check ClassroomTeacher records
    const ctRows = await db
      .select({
        classroomId: classroomTeachers.classroomId,
        role: classroomTeachers.role,
        classroomName: classrooms.name,
        archived: classrooms.archived,
      })
      .from(classroomTeachers)
      .innerJoin(classrooms, eq(classroomTeachers.classroomId, classrooms.id))
      .where(eq(classroomTeachers.teacherId, teacher.id));

    console.log(`📚 ClassroomTeacher records: ${ctRows.length}\n`);
    ctRows.forEach((ct) => {
      console.log(`  - ${ct.classroomName}`);
      console.log(`    Role: ${ct.role}`);
      console.log(`    Classroom ID: ${ct.classroomId}`);
      console.log(`    Archived: ${ct.archived}\n`);
    });

    // Also check via teacherClassrooms relation (same data, joined the other direction)
    const viaRelation = await db
      .select()
      .from(classroomTeachers)
      .where(eq(classroomTeachers.teacherId, teacher.id));

    console.log(
      `📋 Via teacherClassrooms relation: ${viaRelation.length} classrooms\n`
    );

    console.log("✅ Check completed!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkClassroomTeachers();
