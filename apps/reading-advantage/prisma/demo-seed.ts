import { PrismaClient, Role, ActivityType, LicenseType } from "@prisma/client";

const prisma = new PrismaClient();

// Demo configuration constants
const DEMO_CONFIG = {
  school: {
    name: "Reading Advantage Academy",
    district: "Demo District",
    province: "Bangkok",
    country: "Thailand",
  },
  license: {
    type: LicenseType.ENTERPRISE,
    maxUsers: 100,
    featureFlags: {
      dashboardEnabled: true,
      velocityMetrics: true,
      assignmentFunnel: true,
      srsHealth: true,
      genreRecommendations: true,
      activityHeatmap: true,
      cefrAlignment: true,
    },
  },
  students: [
    {
      level: "A1",
      raLevel: 2,
      email: "demo-student-a1@reading-advantage.com",
      name: "Alex Anderson (A1)",
    },
    {
      level: "A2",
      raLevel: 5,
      email: "demo-student-a2@reading-advantage.com",
      name: "Beth Brown (A2)",
    },
    {
      level: "B1",
      raLevel: 8,
      email: "demo-student-b1@reading-advantage.com",
      name: "Chris Chen (B1)",
    },
    {
      level: "B2",
      raLevel: 11,
      email: "demo-student-b2@reading-advantage.com",
      name: "Diana Davis (B2)",
    },
    {
      level: "C1",
      raLevel: 14,
      email: "demo-student-c1@reading-advantage.com",
      name: "Emma Evans (C1)",
    },
    {
      level: "C2",
      raLevel: 17,
      email: "demo-student-c2@reading-advantage.com",
      name: "Frank Foster (C2)",
    },
  ],
  teacher: {
    level: "C2+",
    raLevel: 18,
    email: "demo-teacher@reading-advantage.com",
    name: "Teacher Demo",
  },
  admin: {
    level: "C2+",
    raLevel: 18,
    email: "demo-admin@reading-advantage.com",
    name: "Admin Demo",
  },
  password: "demo123", // Simple password for demo purposes
  classrooms: [
    { name: "Beginner Class", grade: 7, studentIndices: [0, 1, 2] }, // A1, A2, B1
    { name: "Advanced Class", grade: 9, studentIndices: [3, 4, 5] }, // B2, C1, C2
  ],
};

// RA to CEFR mapping for demo students
const RA_CEFR_MAPPINGS: { [key: number]: string } = {
  2: "A1",
  5: "A2",
  8: "B1",
  11: "B2",
  14: "C1",
  17: "C2",
};

/**
 * Create demo school
 */
async function createDemoSchool() {
  console.log("🏫 Creating demo school...");

  // Check if school already exists
  const existingSchool = await prisma.school.findFirst({
    where: { name: DEMO_CONFIG.school.name },
  });

  if (existingSchool) {
    console.log(
      `✅ Demo school already exists: ${existingSchool.name} (ID: ${existingSchool.id})`,
    );
    return existingSchool;
  }

  const school = await prisma.school.create({
    data: DEMO_CONFIG.school,
  });

  console.log(`✅ Created demo school: ${school.name} (ID: ${school.id})`);
  return school;
}

/**
 * Create demo license
 */
async function createDemoLicense(schoolId: string) {
  console.log("📜 Creating demo license...");

  // Use a fixed license key for demo data to prevent creating new licenses every day
  const licenseKey = `DEMO-${DEMO_CONFIG.school.name.replace(/\s+/g, "-").toUpperCase()}`;

  const license = await prisma.license.upsert({
    where: { key: licenseKey },
    update: {
      // Update expiration date to extend it
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
    create: {
      key: licenseKey,
      schoolName: DEMO_CONFIG.school.name,
      schoolId,
      licenseType: DEMO_CONFIG.license.type,
      maxUsers: DEMO_CONFIG.license.maxUsers,
      usedLicenses: 0,
      featureFlags: DEMO_CONFIG.license.featureFlags,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  });

  console.log(`✅ Created demo license: ${license.key} (ID: ${license.id})`);
  return license;
}

/**
 * Create demo users (students, teacher, admin)
 */
async function createDemoUsers(schoolId: string, licenseId: string) {
  console.log("👥 Creating demo users...");

  const users: any[] = [];

  // Delete existing demo users first (to ensure fresh data)
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          ...DEMO_CONFIG.students.map((s) => s.email),
          DEMO_CONFIG.teacher.email,
          DEMO_CONFIG.admin.email,
        ],
      },
    },
  });

  // Create demo students
  for (const studentConfig of DEMO_CONFIG.students) {
    const student = await prisma.user.upsert({
      where: { email: studentConfig.email },
      update: {},
      create: {
        email: studentConfig.email,
        name: studentConfig.name,
        role: Role.STUDENT,
        password: DEMO_CONFIG.password, // In production, this should be hashed
        schoolId,
        licenseId,
        // Calculate XP based on raLevel using actual level table
        // raLevel 1 = 0-4999, raLevel 2 = 5000-10999, etc.
        xp: (() => {
          const levelTable = [
            { raLevel: 1, min: 0, max: 4999 },
            { raLevel: 2, min: 5000, max: 10999 },
            { raLevel: 3, min: 11000, max: 17999 },
            { raLevel: 4, min: 18000, max: 25999 },
            { raLevel: 5, min: 26000, max: 34999 },
            { raLevel: 6, min: 35000, max: 44999 },
            { raLevel: 7, min: 45000, max: 55999 },
            { raLevel: 8, min: 56000, max: 67999 },
            { raLevel: 9, min: 68000, max: 80999 },
            { raLevel: 10, min: 81000, max: 94999 },
            { raLevel: 11, min: 95000, max: 109999 },
            { raLevel: 12, min: 110000, max: 125999 },
            { raLevel: 13, min: 126000, max: 142999 },
            { raLevel: 14, min: 143000, max: 160999 },
            { raLevel: 15, min: 161000, max: 179999 },
            { raLevel: 16, min: 180000, max: 199999 },
            { raLevel: 17, min: 200000, max: 220999 },
            { raLevel: 18, min: 221000, max: 242999 },
          ];
          const level = levelTable.find(
            (l) => l.raLevel === studentConfig.raLevel,
          );
          if (level) {
            // Random XP within the level range
            return Math.floor(
              level.min + Math.random() * (level.max - level.min),
            );
          }
          return 0;
        })(),
        // Use raLevel directly as level
        level: studentConfig.raLevel,
        cefrLevel: studentConfig.level,
      },
    });

    // Associate student with license
    await prisma.licenseOnUser.upsert({
      where: {
        userId_licenseId: {
          userId: student.id,
          licenseId,
        },
      },
      update: {},
      create: {
        userId: student.id,
        licenseId,
      },
    });

    users.push({ ...student, raLevel: studentConfig.raLevel });
    console.log(
      `  ✓ Created student: ${student.name} (${studentConfig.level})`,
    );
  }

  // Create demo teacher
  const teacher = await prisma.user.upsert({
    where: { email: DEMO_CONFIG.teacher.email },
    update: {},
    create: {
      email: DEMO_CONFIG.teacher.email,
      name: DEMO_CONFIG.teacher.name,
      role: Role.TEACHER,
      password: DEMO_CONFIG.password,
      schoolId,
      licenseId,
      xp: 221000,
      level: 18,
    },
  });

  await prisma.licenseOnUser.upsert({
    where: {
      userId_licenseId: {
        userId: teacher.id,
        licenseId,
      },
    },
    update: {},
    create: {
      userId: teacher.id,
      licenseId,
    },
  });

  users.push(teacher);
  console.log(`  ✓ Created teacher: ${teacher.name}`);

  // Create demo admin
  const admin = await prisma.user.upsert({
    where: { email: DEMO_CONFIG.admin.email },
    update: {},
    create: {
      email: DEMO_CONFIG.admin.email,
      name: DEMO_CONFIG.admin.name,
      role: Role.ADMIN,
      password: DEMO_CONFIG.password,
      schoolId,
      licenseId,
      xp: 221000,
      level: 18,
    },
  });

  await prisma.licenseOnUser.upsert({
    where: {
      userId_licenseId: {
        userId: admin.id,
        licenseId,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      licenseId,
    },
  });

  users.push(admin);
  console.log(`  ✓ Created admin: ${admin.name}`);

  console.log(`✅ Created ${users.length} demo users`);
  return { students: users.slice(0, 6), teacher, admin };
}

/**
 * Create demo classrooms
 */
async function createDemoClassrooms(
  schoolId: string,
  teacherId: string,
  students: any[],
) {
  console.log("🎓 Creating demo classrooms...");

  // Delete existing demo classrooms first
  await prisma.classroom.deleteMany({
    where: {
      schoolId,
      classroomName: {
        in: ["Beginner Class", "Advanced Class"],
      },
    },
  });

  const classrooms = [];

  for (const classroomConfig of DEMO_CONFIG.classrooms) {
    const classroom = await prisma.classroom.create({
      data: {
        classroomName: classroomConfig.name,
        teacherId,
        schoolId,
        createdBy: teacherId,
        grade: classroomConfig.grade,
        archived: false, // Explicitly set to false
        classCode: `DEMO-${classroomConfig.name.replace(/\s+/g, "-").toUpperCase()}`,
      },
    });

    // Add students to classroom
    for (const studentIndex of classroomConfig.studentIndices) {
      await prisma.classroomStudent.create({
        data: {
          classroomId: classroom.id,
          studentId: students[studentIndex].id,
        },
      });
    }

    // Add teacher to ClassroomTeacher relation (for teacher overview)
    await prisma.classroomTeacher.create({
      data: {
        classroomId: classroom.id,
        teacherId,
        role: "OWNER",
      },
    });

    classrooms.push(classroom);
    console.log(
      `  ✓ Created classroom: ${classroom.classroomName} with ${classroomConfig.studentIndices.length} students`,
    );
  }

  console.log(`✅ Created ${classrooms.length} demo classrooms`);
  return classrooms;
}

/**
 * Generate SRS flashcards for demo students (based on profile)
 */
async function generateSRSFlashcards(students: any[]) {
  console.log("📚 Generating SRS flashcards...");

  // Get some sample articles
  const articles = await prisma.article.findMany({
    where: { isPublic: true },
    take: 10,
  });

  if (articles.length === 0) {
    console.log("⚠️  No public articles found. Skipping SRS generation.");
    return;
  }

  let totalWordRecords = 0;
  let totalSentenceRecords = 0;

  for (const student of students) {
    // Determine student profile based on email
    const profile =
      student.email.includes("a1") || student.email.includes("a2")
        ? "LAZY"
        : student.email.includes("b1") || student.email.includes("b2")
          ? "AVERAGE"
          : "HARDWORKING";

    // Word flashcards based on profile
    const wordCount =
      profile === "LAZY"
        ? Math.floor(Math.random() * 4) + 3 // 3-6
        : profile === "AVERAGE"
          ? Math.floor(Math.random() * 6) + 8 // 8-13
          : Math.floor(Math.random() * 8) + 12; // 12-19

    for (let i = 0; i < wordCount; i++) {
      const article = articles[Math.floor(Math.random() * articles.length)];

      // Sample words for flashcards
      const sampleWords = [
        { word: "example", translation: "ตัวอย่าง" },
        { word: "important", translation: "สำคัญ" },
        { word: "understand", translation: "เข้าใจ" },
        { word: "knowledge", translation: "ความรู้" },
        { word: "practice", translation: "ฝึกฝน" },
        { word: "improve", translation: "ปรับปรุง" },
        { word: "develop", translation: "พัฒนา" },
        { word: "achieve", translation: "บรรลุ" },
        { word: "success", translation: "ความสำเร็จ" },
        { word: "challenge", translation: "ความท้าทาย" },
      ];

      const wordData = sampleWords[i % sampleWords.length];

      // Random SRS state (0=new, 1=learning, 2+=mastered)
      const state = Math.random() < 0.3 ? 0 : Math.random() < 0.5 ? 1 : 2;
      const reps = state === 0 ? 0 : Math.floor(Math.random() * 5) + 1;
      const lapses = Math.floor(Math.random() * 2);
      const stability = state === 0 ? 0 : Math.random() * 10 + 1;

      // Calculate due date based on state
      const dueDate = new Date();
      if (state === 0) {
        dueDate.setDate(dueDate.getDate() - Math.floor(Math.random() * 3)); // Due soon
      } else if (state === 1) {
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 3)); // Due in 0-3 days
      } else {
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7) + 3); // Due in 3-10 days
      }

      try {
        await prisma.userWordRecord.create({
          data: {
            userId: student.id,
            articleId: article.id,
            word: wordData,
            saveToFlashcard: true,
            difficulty: Math.random() * 5,
            due: dueDate,
            state,
            reps,
            lapses,
            stability,
            elapsedDays: reps,
            scheduledDays: Math.floor(stability),
          },
        });
        totalWordRecords++;
      } catch (error) {
        // Skip if duplicate
      }
    }

    // Sentence flashcards based on profile
    const sentenceCount =
      profile === "LAZY"
        ? Math.floor(Math.random() * 3) + 2 // 2-4
        : profile === "AVERAGE"
          ? Math.floor(Math.random() * 4) + 4 // 4-7
          : Math.floor(Math.random() * 6) + 6; // 6-11

    for (let i = 0; i < sentenceCount; i++) {
      const article = articles[Math.floor(Math.random() * articles.length)];

      const sampleSentences = [
        {
          sentence: "This is an example sentence.",
          translation: { th: "นี่คือประโยคตัวอย่าง" },
        },
        {
          sentence: "Learning is important.",
          translation: { th: "การเรียนรู้เป็นสิ่งสำคัญ" },
        },
        {
          sentence: "Practice makes perfect.",
          translation: { th: "การฝึกฝนทำให้สมบูรณ์แบบ" },
        },
        {
          sentence: "Knowledge is power.",
          translation: { th: "ความรู้คืออำนาจ" },
        },
        { sentence: "Never give up.", translation: { th: "อย่ายอมแพ้" } },
      ];

      const sentenceData = sampleSentences[i % sampleSentences.length];

      const state = Math.random() < 0.3 ? 0 : Math.random() < 0.5 ? 1 : 2;
      const reps = state === 0 ? 0 : Math.floor(Math.random() * 5) + 1;
      const lapses = Math.floor(Math.random() * 2);
      const stability = state === 0 ? 0 : Math.random() * 10 + 1;

      const dueDate = new Date();
      if (state === 0) {
        dueDate.setDate(dueDate.getDate() - Math.floor(Math.random() * 3));
      } else if (state === 1) {
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 3));
      } else {
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7) + 3);
      }

      await prisma.userSentenceRecord.create({
        data: {
          userId: student.id,
          articleId: article.id,
          sentence: sentenceData.sentence,
          translation: sentenceData.translation,
          sn: i + 1,
          timepoint: Math.random() * 100,
          endTimepoint: Math.random() * 100 + 100,
          saveToFlashcard: true,
          difficulty: Math.random() * 5,
          due: dueDate,
          state,
          reps,
          lapses,
          stability,
          elapsedDays: reps,
          scheduledDays: Math.floor(stability),
        },
      });
      totalSentenceRecords++;
    }
  }

  console.log(
    `✅ Generated ${totalWordRecords} word flashcards and ${totalSentenceRecords} sentence flashcards`,
  );
}

/**
 * Generate LessonRecord for demo students (for AI Insight)
 */
async function generateLessonRecords(students: any[]) {
  console.log("📖 Generating lesson records...");

  // Get some sample articles
  const articles = await prisma.article.findMany({
    where: { isPublic: true },
    take: 20,
  });

  if (articles.length === 0) {
    console.log(
      "⚠️  No public articles found. Skipping lesson record generation.",
    );
    return;
  }

  let totalRecords = 0;

  for (const student of students) {
    // Determine student profile
    const profile =
      student.email.includes("a1") || student.email.includes("a2")
        ? "LAZY"
        : student.email.includes("b1") || student.email.includes("b2")
          ? "AVERAGE"
          : "HARDWORKING";

    // Lesson records based on profile
    const recordCount =
      profile === "LAZY"
        ? Math.floor(Math.random() * 3) + 2 // 2-4 articles
        : profile === "AVERAGE"
          ? Math.floor(Math.random() * 4) + 4 // 4-7 articles
          : Math.floor(Math.random() * 5) + 6; // 6-10 articles

    // Select random articles for this student
    const selectedArticles = [];
    for (let i = 0; i < recordCount && i < articles.length; i++) {
      const randomIndex = Math.floor(Math.random() * articles.length);
      selectedArticles.push(articles[randomIndex]);
    }

    for (const article of selectedArticles) {
      // Create a lesson record with some completed phases
      const completedPhases = Math.floor(Math.random() * 10) + 5; // 5-14 phases completed

      const lessonData: any = {
        userId: student.id,
        articleId: article.id,
      };

      // Add phase data (simplified - just marking as completed)
      for (let phase = 1; phase <= completedPhases; phase++) {
        lessonData[`phase${phase}`] = {
          status: 2, // completed
          elapsedTime: Math.floor(Math.random() * 30000) + 5000, // 5-35 seconds
        };
      }

      try {
        await prisma.lessonRecord.create({
          data: lessonData,
        });
        totalRecords++;
      } catch (error) {
        // Skip if duplicate
      }
    }
  }

  console.log(`✅ Generated ${totalRecords} lesson records`);
}

/**
 * Generate initial activities for demo students (7 days history)
 */
async function generateInitialActivities(students: any[]) {
  console.log("📊 Generating initial activities (7 days history)...");

  // Get some sample articles
  const articles = await prisma.article.findMany({
    where: { isPublic: true },
    take: 20,
  });

  if (articles.length === 0) {
    console.log("⚠️  No public articles found. Skipping activity generation.");
    return;
  }

  let totalActivities = 0;
  let totalXPLogs = 0;

  // Generate activities for the past 7 days
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const activityDate = new Date();
    activityDate.setDate(activityDate.getDate() - dayOffset);
    activityDate.setHours(
      Math.floor(Math.random() * 12) + 8,
      Math.floor(Math.random() * 60),
      0,
      0,
    );

    for (const student of students) {
      // Determine student profile (lazy/average/hardworking)
      const studentIndex = students.indexOf(student);
      let activitiesPerDay: number;
      let xpPerActivity: number;

      if (studentIndex < 2) {
        // Lazy students (A1, A2)
        activitiesPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 activities
        xpPerActivity = Math.floor(Math.random() * 20) + 20; // 20-40 XP
      } else if (studentIndex < 5) {
        // Average students (B1, B2, C1)
        activitiesPerDay = Math.floor(Math.random() * 4) + 3; // 3-6 activities
        xpPerActivity = Math.floor(Math.random() * 40) + 40; // 40-80 XP
      } else {
        // Hardworking student (C2)
        activitiesPerDay = Math.floor(Math.random() * 7) + 6; // 6-12 activities
        xpPerActivity = Math.floor(Math.random() * 70) + 80; // 80-150 XP
      }

      // Generate activities for this day
      for (let i = 0; i < activitiesPerDay; i++) {
        const article = articles[Math.floor(Math.random() * articles.length)];
        const activityTypes = [
          ActivityType.ARTICLE_READ,
          ActivityType.MC_QUESTION,
          ActivityType.SA_QUESTION,
          ActivityType.VOCABULARY_FLASHCARDS,
        ];
        const activityType =
          activityTypes[Math.floor(Math.random() * activityTypes.length)];

        // Create user activity (use upsert to avoid unique constraint error)
        const activity = await prisma.userActivity.upsert({
          where: {
            userId_activityType_targetId: {
              userId: student.id,
              activityType,
              targetId: article.id,
            },
          },
          update: {
            timer: Math.floor(Math.random() * 300) + 60,
            completed: true,
            createdAt: new Date(activityDate.getTime() + i * 1000 * 60 * 15),
          },
          create: {
            userId: student.id,
            activityType,
            targetId: article.id,
            timer: Math.floor(Math.random() * 300) + 60, // 60-360 seconds
            completed: true,
            createdAt: new Date(activityDate.getTime() + i * 1000 * 60 * 15), // Spread activities throughout the day
          },
        });
        totalActivities++;

        // Create XP log
        await prisma.xPLog.create({
          data: {
            userId: student.id,
            xpEarned: xpPerActivity,
            activityType,
            activityId: article.id,
            createdAt: activity.createdAt,
          },
        });
        totalXPLogs++;
      }
    }
  }

  console.log(
    `✅ Generated ${totalActivities} activities and ${totalXPLogs} XP logs`,
  );
}

/**
 * Refresh materialized views for reports
 */
async function refreshMaterializedViews() {
  console.log("🔄 Refreshing materialized views...");

  try {
    const { refreshAllMaterializedViews } =
      await import("../server/services/refresh-matviews-service");

    const result = await refreshAllMaterializedViews();

    console.log(`  ✓ ${result.success} views refreshed successfully`);
    if (result.failed > 0) {
      console.log(`  ⚠ ${result.failed} views failed`);
    }
    if (result.skipped > 0) {
      console.log(`  ⊘ ${result.skipped} views skipped`);
    }

    console.log(
      `✅ Materialized views refresh completed in ${result.duration}ms`,
    );
  } catch (error) {
    console.error("⚠️  Failed to refresh materialized views:", error);
    // Don't throw error, just log warning
  }
}

/**
 * Main seed function
 */
async function main() {
  console.log("\n🌱 Starting demo data seed process...\n");

  try {
    // Step 1: Create demo school
    const school = await createDemoSchool();

    // Step 2: Create demo license
    const license = await createDemoLicense(school.id);

    // Step 3: Create demo users
    const { students, teacher, admin } = await createDemoUsers(
      school.id,
      license.id,
    );

    // Step 4: Create demo classrooms
    await createDemoClassrooms(school.id, teacher.id, students);

    // Step 5: Generate SRS flashcards
    await generateSRSFlashcards(students);

    // Step 6: Generate lesson records
    await generateLessonRecords(students);

    // Step 7: Generate initial activities
    await generateInitialActivities(students);

    // Step 8: Refresh materialized views
    await refreshMaterializedViews();

    console.log("\n✅ Demo data seed completed successfully!\n");
    console.log("📋 Demo Accounts Summary:");
    console.log("─".repeat(60));
    console.log("\n👨‍🎓 Students:");
    DEMO_CONFIG.students.forEach((s, i) => {
      console.log(
        `  ${i + 1}. ${s.name} - ${s.email} / ${DEMO_CONFIG.password}`,
      );
    });
    console.log("\n👨‍🏫 Teacher:");
    console.log(
      `  ${DEMO_CONFIG.teacher.name} - ${DEMO_CONFIG.teacher.email} / ${DEMO_CONFIG.password}`,
    );
    console.log("\n👨‍💼 Admin:");
    console.log(
      `  ${DEMO_CONFIG.admin.name} - ${DEMO_CONFIG.admin.email} / ${DEMO_CONFIG.password}`,
    );
    console.log("\n" + "─".repeat(60));
    console.log(`\n🏫 School: ${school.name}`);
    console.log(`📜 License: ${license.key}`);
    console.log(`🆔 License ID: ${license.id}`);
    console.log(`🆔 School ID: ${school.id}\n`);
  } catch (error) {
    console.error("❌ Error during demo seed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
