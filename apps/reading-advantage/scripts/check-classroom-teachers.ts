import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkClassroomTeachers() {
  console.log("\n🔍 Checking ClassroomTeacher records...\n");

  try {
    const teacher = await prisma.user.findUnique({
      where: {
        email: "demo-teacher@reading-advantage.com",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!teacher) {
      console.log("❌ Demo teacher not found");
      return;
    }

    console.log(`👨‍🏫 Teacher: ${teacher.name} (${teacher.id})\n`);

    // Check ClassroomTeacher records
    const classroomTeachers = await prisma.classroomTeacher.findMany({
      where: {
        teacherId: teacher.id,
      },
      include: {
        classroom: {
          select: {
            id: true,
            classroomName: true,
            archived: true,
          },
        },
      },
    });

    console.log(`📚 ClassroomTeacher records: ${classroomTeachers.length}\n`);
    classroomTeachers.forEach((ct) => {
      console.log(`  - ${ct.classroom.classroomName}`);
      console.log(`    Role: ${ct.role}`);
      console.log(`    Classroom ID: ${ct.classroomId}`);
      console.log(`    Archived: ${ct.classroom.archived}\n`);
    });

    // Also check via teacherClassrooms relation
    const teacherWithClassrooms = await prisma.user.findUnique({
      where: {
        email: "demo-teacher@reading-advantage.com",
      },
      include: {
        teacherClassrooms: {
          include: {
            classroom: true,
          },
        },
      },
    });

    console.log(
      `📋 Via teacherClassrooms relation: ${teacherWithClassrooms?.teacherClassrooms.length || 0} classrooms\n`
    );

    console.log("✅ Check completed!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClassroomTeachers();
