import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkArchivedField() {
  console.log("\n🔍 Checking archived field...\n");

  try {
    const classrooms = await prisma.classroom.findMany({
      where: {
        classroomName: {
          in: ["Beginner Class", "Advanced Class"],
        },
      },
      select: {
        id: true,
        classroomName: true,
        archived: true,
        teacherId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    console.log(`Found ${classrooms.length} classrooms:\n`);
    classrooms.forEach((c) => {
      console.log(`- ${c.classroomName}`);
      console.log(`  archived: ${c.archived} (type: ${typeof c.archived})`);
      console.log(`  teacherId: ${c.teacherId}\n`);
    });

    console.log("✅ Check completed!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkArchivedField();
