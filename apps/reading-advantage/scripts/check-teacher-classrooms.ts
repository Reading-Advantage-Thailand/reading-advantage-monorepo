import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTeacherClassrooms() {
  console.log("\n🔍 Checking Teacher Classrooms...\n");

  try {
    // Get demo teacher
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

    console.log(`👨‍🏫 Teacher: ${teacher.name} (${teacher.email})`);
    console.log(`   ID: ${teacher.id}\n`);

    // Check classrooms where teacher is the teacher
    const classrooms = await prisma.classroom.findMany({
      where: {
        teacherId: teacher.id,
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    console.log(`📚 Classrooms (teacherId = ${teacher.id}):`);
    if (classrooms.length === 0) {
      console.log("   ❌ No classrooms found!\n");
    } else {
      classrooms.forEach((classroom) => {
        console.log(
          `   ✓ ${classroom.classroomName} - ${classroom._count.students} students`
        );
      });
      console.log("");
    }

    // Check all classrooms in demo school
    const demoSchool = await prisma.school.findFirst({
      where: {
        name: "Reading Advantage Academy",
      },
    });

    if (demoSchool) {
      const allClassrooms = await prisma.classroom.findMany({
        where: {
          schoolId: demoSchool.id,
        },
        include: {
          teacher: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              students: true,
            },
          },
        },
      });

      console.log(`📋 All classrooms in demo school:`);
      allClassrooms.forEach((classroom) => {
        console.log(`   - ${classroom.classroomName}`);
        console.log(
          `     Teacher: ${classroom.teacher?.name || "None"} (${classroom.teacher?.email || "N/A"})`
        );
        console.log(`     Students: ${classroom._count.students}`);
        console.log(`     Teacher ID: ${classroom.teacherId || "NULL"}\n`);
      });
    }

    console.log("✅ Check completed!\n");
  } catch (error) {
    console.error("❌ Error checking teacher classrooms:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeacherClassrooms();
