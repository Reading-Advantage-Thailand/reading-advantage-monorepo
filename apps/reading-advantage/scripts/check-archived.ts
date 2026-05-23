import { db, classrooms, desc, inArray } from "@reading-advantage/db";

async function checkArchivedField() {
  console.log("\n🔍 Checking archived field...\n");

  try {
    const rows = await db
      .select({
        id: classrooms.id,
        name: classrooms.name,
        archived: classrooms.archived,
        teacherId: classrooms.teacherId,
      })
      .from(classrooms)
      .where(inArray(classrooms.name, ["Beginner Class", "Advanced Class"]))
      .orderBy(desc(classrooms.createdAt))
      .limit(5);

    console.log(`Found ${rows.length} classrooms:\n`);
    rows.forEach((c) => {
      console.log(`- ${c.name}`);
      console.log(`  archived: ${c.archived} (type: ${typeof c.archived})`);
      console.log(`  teacherId: ${c.teacherId}\n`);
    });

    console.log("✅ Check completed!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkArchivedField();
