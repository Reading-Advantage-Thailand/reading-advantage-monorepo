import {
  db,
  users,
  schools,
  classrooms,
  classroomStudents,
  eq,
  count,
  sql,
} from "@reading-advantage/db";

async function checkTeacherClassrooms() {
  console.log("\n🔍 Checking Teacher Classrooms...\n");

  try {
    // Get demo teacher
    const [teacher] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, "demo-teacher@reading-advantage.com"))
      .limit(1);

    if (!teacher) {
      console.log("❌ Demo teacher not found");
      return;
    }

    console.log(`👨‍🏫 Teacher: ${teacher.name} (${teacher.email})`);
    console.log(`   ID: ${teacher.id}\n`);

    // Check classrooms where teacher is the teacher
    const teacherClassrooms = await db
      .select({
        id: classrooms.id,
        name: classrooms.name,
        studentCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${classroomStudents}
          WHERE ${classroomStudents.classroomId} = ${classrooms.id}
        )`,
      })
      .from(classrooms)
      .where(eq(classrooms.teacherId, teacher.id));

    console.log(`📚 Classrooms (teacherId = ${teacher.id}):`);
    if (teacherClassrooms.length === 0) {
      console.log("   ❌ No classrooms found!\n");
    } else {
      teacherClassrooms.forEach((classroom) => {
        console.log(
          `   ✓ ${classroom.name} - ${classroom.studentCount} students`
        );
      });
      console.log("");
    }

    // Check all classrooms in demo school
    const [demoSchool] = await db
      .select()
      .from(schools)
      .where(eq(schools.name, "Reading Advantage Academy"))
      .limit(1);

    if (demoSchool) {
      const allClassrooms = await db
        .select({
          id: classrooms.id,
          name: classrooms.name,
          teacherId: classrooms.teacherId,
          teacherName: users.name,
          teacherEmail: users.email,
        })
        .from(classrooms)
        .leftJoin(users, eq(classrooms.teacherId, users.id))
        .where(eq(classrooms.schoolId, demoSchool.id));

      console.log(`📋 All classrooms in demo school:`);
      for (const classroom of allClassrooms) {
        const [studentsAgg] = await db
          .select({ count: count() })
          .from(classroomStudents)
          .where(eq(classroomStudents.classroomId, classroom.id));

        console.log(`   - ${classroom.name}`);
        console.log(
          `     Teacher: ${classroom.teacherName || "None"} (${classroom.teacherEmail || "N/A"})`
        );
        console.log(`     Students: ${studentsAgg?.count ?? 0}`);
        console.log(`     Teacher ID: ${classroom.teacherId || "NULL"}\n`);
      }
    }

    console.log("✅ Check completed!\n");
  } catch (error) {
    console.error("❌ Error checking teacher classrooms:", error);
  }
}

checkTeacherClassrooms();
